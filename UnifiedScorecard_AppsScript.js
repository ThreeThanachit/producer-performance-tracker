// ============================================================
//  UNIFIED PRODUCER SCORECARD — Senior Tracker × Performance Dashboard
//
//  ติดตั้งใน: Producer Performance Dashboard (System B)
//    ไฟล์: 1nWXx3fjMe0O2lojOO6YKrMftHvP0-FSpf-fke4Wj-WU
//    เปิด Extensions → Apps Script → สร้าง .gs file ใหม่ → paste code นี้
//
//  สร้าง 2 tabs:
//    🔗 Unified Sessions  → per-session join (hard + soft metrics)
//    🏆 Producer Scorecard → aggregated combined score ต่อ Producer
//
//  เมนูใหม่:  🔗 Unified
//
//  ⚠️ onOpen() — ถ้าไฟล์นี้มี Apps Script เดิม (v9.1) อยู่แล้ว
//  ให้รวม addUnifiedMenu(ui) เข้ากับ onOpen ของเดิม
//  หรือเอา onOpen ของไฟล์นี้ออก แล้วเรียก addUnifiedMenu() จาก onOpen เดิม
// ============================================================

// ---------- CONFIG ----------
var SENIOR_TRACKER_ID = '12lASdkxYREvXtu8rpcT1uW6Z63MnqEcvSJlXWMEX6SE';
var SENIOR_MASTER_TAB = 'Master Log';

var PERF_DATA_TAB     = '📋 Performance Data';
var UNIFIED_TAB       = '🔗 Unified Sessions';
var SCORECARD_TAB     = '🏆 Producer Scorecard';

// Producer names ที่ไม่ใช่คนจริง — กรองออก
var SKIP_PRODUCERS_LOWER = ['tbcp', 'cancel', 'brand', ''];

// Brands ที่ display เป็น UPPERCASE (preserve)
var BRAND_UPPERCASE = ['MAC', '3CE', 'VICHY', 'ANESSA', 'BOBBI BROWN'];

// Score weights (sum = 1.0)
var W_HARD   = 0.50;  // brand-normalized GMV/hr
var W_SOFT   = 0.30;  // Pre/Dur/Post pass rate
var W_VOLUME = 0.20;  // hours worked (normalized)
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addUnifiedMenu(SpreadsheetApp.getUi());
}

function addUnifiedMenu(ui) {
  ui.createMenu('🔗 Unified')
    .addItem('▶ Build Unified Sessions + Scorecard',  'buildUnifiedAll')
    .addSeparator()
    .addItem('  🔗 Unified Sessions only',             'buildUnifiedSessions')
    .addItem('  🏆 Producer Scorecard only',           'buildProducerScorecard')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (8am)',            'setupUnifiedTrigger')
    .addItem('🗑 ลบ Unified Trigger',                  'removeUnifiedTrigger')
    .addToUi();
}

function buildUnifiedAll() {
  buildUnifiedSessions();
  buildProducerScorecard();
}


// ============================================================
//  NORMALIZATION
//  - Key  = lowercase (สำหรับ match ข้าม case mismatch)
//  - Display = canonical case (สำหรับแสดงผล)
// ============================================================

function normProducerKey(name) {
  if (!name) return '';
  var s = String(name).trim().toLowerCase();
  if (SKIP_PRODUCERS_LOWER.indexOf(s) > -1) return '';
  return s;
}

function normProducerDisplay(name) {
  if (!name) return '';
  return String(name).trim().split(/\s+/).map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

function normBrandKey(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase();
}

function normBrandDisplay(name) {
  if (!name) return '';
  var s = String(name).trim();
  for (var i = 0; i < BRAND_UPPERCASE.length; i++) {
    if (s.toLowerCase() === BRAND_UPPERCASE[i].toLowerCase()) return BRAND_UPPERCASE[i];
  }
  // Title case fallback
  return s.split(/\s+/).map(function(w) {
    return w.length <= 2 ? w.toUpperCase()
                         : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// Date → "YYYY-MM-DD"
// ⚠️ SWAP FIX: CPS reports เก็บ date เป็น string "D/M/Y" (Thai)
// แต่ Google Sheets locale=US auto-parse เป็น M/D/Y → "5/1/2026" (5 Jan) กลายเป็น Date object datetime(2026, 5, 1) = May 1
// Pattern signature: Date object ที่ day ≤ 12 = สัญญาณว่าโดน swap → ต้อง swap กลับ
// (string "13/1/2026" ปลอดภัยเพราะ US ไม่มี month 13 → keep as string → parse แบบ D/M/Y ตรงๆ)
function normDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return '';
    var year  = d.getFullYear();
    var month = d.getMonth() + 1;  // 1-12
    var day   = d.getDate();
    // SWAP detection: day ≤ 12 = likely auto-swapped from D/M/Y intent
    // (เมื่อ day === month เช่น 3/3 → swap เป็น no-op, ปลอดภัย)
    if (day <= 12) {
      var tmp = day; day = month; month = tmp;
    }
    return year + '-' + ('0' + month).slice(-2) + '-' + ('0' + day).slice(-2);
  }
  var s = String(d).trim();
  // "13/1/2026" → D/M/YYYY (Thai convention)
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var day = parseInt(m[1]), mon = parseInt(m[2]), year = parseInt(m[3]);
    if (year < 100) year += 2000;
    return year + '-' + ('0' + mon).slice(-2) + '-' + ('0' + day).slice(-2);
  }
  // Fallback: try Date parse
  var p = new Date(s);
  if (!isNaN(p.getTime())) return normDate(p);
  return s;
}

// "08:00-10:00" / "8:00 - 10:00" / "20:00-22:00" → "HH:MM" start time
function normStartTime(slot) {
  if (!slot) return '';
  var s = String(slot).trim();
  var m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return ('0' + parseInt(m[1])).slice(-2) + ':' + ('0' + parseInt(m[2])).slice(-2);
}

function buildKey(date, producer, brand, slot) {
  var p = normProducerKey(producer);
  if (!p) return '';
  return [normDate(date), p, normBrandKey(brand), normStartTime(slot)].join('|');
}


// ============================================================
//  STEP 1 — BUILD UNIFIED SESSIONS
// ============================================================
function buildUnifiedSessions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  // --- Load Senior Tracker Master Log ---
  var softMap;
  try {
    softMap = loadSeniorTrackerMap_();
    log.push('✅ Loaded Master Log: ' + Object.keys(softMap).length + ' sessions');
  } catch (e) {
    uiAlert('❌ Load Senior Tracker fail: ' + e.message + '\n\nตรวจสอบ:\n• SENIOR_TRACKER_ID ถูกต้อง\n• คุณมีสิทธิ์เข้าถึงไฟล์นั้น');
    return;
  }

  // --- Load Performance Data (in this workbook) ---
  var perfSheet = ss.getSheetByName(PERF_DATA_TAB);
  if (!perfSheet) { uiAlert('❌ ไม่พบ tab "' + PERF_DATA_TAB + '"'); return; }
  var perfData = perfSheet.getDataRange().getValues();
  if (perfData.length < 2) { uiAlert('⚠️ Performance Data ว่าง'); return; }

  // Header order (verified): Brand, Channel, Date (Actual), Slot Schedule, Duration (Hrs),
  // Producer, MC, GMV (฿), Orders, Units, Co_R (%), CTR (%), Viewers, Engaged Views, Comments, Status
  var matched = 0, unmatched = 0, skipped = 0;
  var unifiedRows = [];

  for (var j = 1; j < perfData.length; j++) {
    var p = perfData[j];
    if (!p[0]) continue;
    var brand    = p[0];
    var channel  = p[1] || '';
    var date     = p[2];
    var slot     = p[3];
    var dur      = Number(p[4]) || 0;
    var producer = p[5];
    var mc       = p[6] || '';
    var gmv      = Number(p[7]) || 0;
    var orders   = Number(p[8]) || 0;
    var units    = Number(p[9]) || 0;
    var coR      = Number(p[10]) || 0;
    var ctr      = Number(p[11]) || 0;
    var viewers  = Number(p[12]) || 0;
    var engaged  = Number(p[13]) || 0;
    var comments = Number(p[14]) || 0;
    var pStatus  = p[15] || '';

    if (!producer || SKIP_PRODUCERS_LOWER.indexOf(String(producer).trim().toLowerCase()) > -1) {
      skipped++;
      continue;
    }

    var key = buildKey(date, producer, brand, slot);
    if (!key) { skipped++; continue; }

    var gmvPerHr = (gmv > 0 && dur > 0) ? gmv / dur : 0;
    var soft = softMap[key];

    var row;
    if (soft) {
      matched++;
      var preStats  = countPassFail_(soft.pre);
      var durStats  = countPassFail_(soft.durBase);
      var postStats = countPassFail_(soft.postBase);
      row = [
        normDate(date), normStartTime(slot),
        normProducerDisplay(producer), normBrandDisplay(brand),
        channel, dur,
        gmv, gmvPerHr, orders, units, coR, ctr, viewers, engaged, comments,
        soft.senior || '',
        formatPassFraction_(preStats),
        formatPassFraction_(durStats),
        formatPassFraction_(postStats),
        Number(soft.bonusScore) || 0,
        (Number(soft.baseScore) || 0) + '/14',
        soft.status || '',
        '✅ Matched'
      ];
    } else {
      unmatched++;
      row = [
        normDate(date), normStartTime(slot),
        normProducerDisplay(producer), normBrandDisplay(brand),
        channel, dur,
        gmv, gmvPerHr, orders, units, coR, ctr, viewers, engaged, comments,
        '', '-', '-', '-', '', '', '', '⚠️ No Soft Data'
      ];
    }
    unifiedRows.push(row);
  }

  // Sort: Date desc, Producer asc
  unifiedRows.sort(function(a, b) {
    if (a[0] !== b[0]) return a[0] < b[0] ? 1 : -1;
    if (a[2] !== b[2]) return a[2] < b[2] ? -1 : 1;
    return a[1] < b[1] ? -1 : 1;
  });

  writeUnifiedSheet_(ss, unifiedRows);

  log.push('Matched: ' + matched + ' | No Soft: ' + unmatched + ' | Skipped: ' + skipped);
  uiAlert(
    '✅ Unified Sessions สร้างเสร็จ!\n\n' +
    'Total rows: ' + unifiedRows.length + '\n' +
    '✅ Matched (hard+soft): ' + matched + ' (' + Math.round(matched / Math.max(unifiedRows.length, 1) * 100) + '%)\n' +
    '⚠️ No soft data: ' + unmatched + '\n' +
    'Skipped (TBCP/Cancel/etc): ' + skipped
  );
}


// --- Load Senior Tracker Master Log → map keyed by buildKey() ---
function loadSeniorTrackerMap_() {
  var srcSS = SpreadsheetApp.openById(SENIOR_TRACKER_ID);
  var srcSheet = srcSS.getSheetByName(SENIOR_MASTER_TAB);
  if (!srcSheet) throw new Error('ไม่พบ tab "' + SENIOR_MASTER_TAB + '"');

  var data = srcSheet.getDataRange().getValues();
  // Master Log: 2 header rows, data from row 3
  // Cols (0-based): 0=Date, 1=Time, 2=Producer, 3=Brand, 4=Senior PIC,
  //   5-10=Pre(6), 11-14=DurBase(4), 15=DurBonus, 16-19=PostBase(4), 20=PostBonus,
  //   21=BaseScore, 22=BonusScore, 23=Status

  var map = {};
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var key = buildKey(row[0], row[2], row[3], row[1]);
    if (!key) continue;
    map[key] = {
      senior:     row[4] || '',
      pre:        row.slice(5, 11),
      durBase:    row.slice(11, 15),
      durBonus:   row[15] || 'N/A',
      postBase:   row.slice(16, 20),
      postBonus:  row[20] || 'N/A',
      baseScore:  row[21] || 0,
      bonusScore: row[22] || 0,
      status:     row[23] || ''
    };
  }
  return map;
}

function countPassFail_(arr) {
  var pass = 0, fail = 0, na = 0;
  arr.forEach(function(v) {
    var s = String(v || '').trim();
    if (s === 'Pass') pass++;
    else if (s === 'Fail') fail++;
    else na++;
  });
  return { pass: pass, fail: fail, na: na, evaluated: pass + fail };
}

function formatPassFraction_(stats) {
  if (stats.evaluated === 0) return '-';
  return stats.pass + '/' + stats.evaluated;
}


// --- Write Unified Sessions tab ---
function writeUnifiedSheet_(ss, rows) {
  var sheet = ss.getSheetByName(UNIFIED_TAB) || ss.insertSheet(UNIFIED_TAB);
  sheetClearAll_(sheet);

  var headers = [
    'Date', 'Start', 'Producer', 'Brand', 'Channel', 'Hrs',
    'GMV (฿)', 'GMV/Hr', 'Orders', 'Units',
    'Co_R', 'CTR', 'Viewers', 'Engaged', 'Comments',
    'Senior PIC', 'Pre Pass', 'Dur Pass', 'Post Pass', 'Bonus',
    'Score', 'A-Status', 'Match'
  ];
  var TOTAL = headers.length;

  // Header row
  sheet.getRange(1, 1, 1, TOTAL).setValues([headers])
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 36);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, TOTAL).setValues(rows);
    // Number formats
    sheet.getRange(2, 6, rows.length, 1).setNumberFormat('0.0');         // Hrs
    sheet.getRange(2, 7, rows.length, 2).setNumberFormat('#,##0');       // GMV, GMV/Hr
    sheet.getRange(2, 9, rows.length, 2).setNumberFormat('#,##0');       // Orders, Units
    sheet.getRange(2, 11, rows.length, 2).setNumberFormat('0.00%');      // Co_R, CTR
    sheet.getRange(2, 13, rows.length, 3).setNumberFormat('#,##0');      // Viewers, Engaged, Comments

    // Highlight unmatched rows
    var rules = [];
    var matchRange = sheet.getRange(2, TOTAL, rows.length, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('No Soft')
      .setBackground('#FFF3CD').setFontColor('#856404')
      .setRanges([sheet.getRange(2, 1, rows.length, TOTAL)])
      .build());
    sheet.setConditionalFormatRules(rules);
  }

  // Column widths
  var widths = [90, 55, 90, 110, 65, 45, 90, 80, 65, 60, 60, 60, 75, 70, 75, 75, 65, 65, 65, 55, 60, 110, 90];
  widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);
  sheet.getRange(1, 1, Math.max(rows.length + 1, 2), TOTAL).createFilter();
}


// ============================================================
//  STEP 2 — BUILD PRODUCER SCORECARD
//  อ่านจาก Unified Sessions → aggregate ต่อ Producer
//  Combined Score = W_HARD × brand-normalized GMV + W_SOFT × pass rate + W_VOLUME × volume
// ============================================================
function buildProducerScorecard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var unifiedSheet = ss.getSheetByName(UNIFIED_TAB);
  if (!unifiedSheet) { uiAlert('❌ ต้องสร้าง Unified Sessions ก่อน'); return; }

  var data = unifiedSheet.getDataRange().getValues();
  if (data.length < 2) { uiAlert('⚠️ Unified Sessions ว่าง'); return; }

  // Pass 1: compute brand benchmark (avg GMV/hr per brand, all sessions)
  var brandSum = {}, brandN = {};
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var brand = r[3], hrs = Number(r[5]) || 0, gmv = Number(r[6]) || 0;
    if (!brand || hrs <= 0 || gmv <= 0) continue;
    var gmvHr = gmv / hrs;
    brandSum[brand] = (brandSum[brand] || 0) + gmvHr;
    brandN[brand]   = (brandN[brand]   || 0) + 1;
  }
  var brandBench = {};
  Object.keys(brandSum).forEach(function(b) { brandBench[b] = brandSum[b] / brandN[b]; });

  // Pass 2: aggregate per producer
  var producers = {};
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var prod = r[2];
    if (!prod) continue;
    var brand = r[3];
    var hrs = Number(r[5]) || 0;
    var gmv = Number(r[6]) || 0;
    var senior = r[15] || '';
    var matchStatus = r[22];
    var prePass = r[16], durPass = r[17], postPass = r[18];

    if (!producers[prod]) {
      producers[prod] = {
        sessions: 0, hours: 0, gmv: 0,
        brandNormSum: 0, brandNormN: 0,
        prePassSum: 0, preTotalSum: 0,
        durPassSum: 0, durTotalSum: 0,
        postPassSum: 0, postTotalSum: 0,
        bonusSum: 0,
        evaluated: 0,
        brands: {}, seniors: {}
      };
    }
    var p = producers[prod];
    p.sessions++;
    p.hours += hrs;
    p.gmv += gmv;
    p.brands[brand] = (p.brands[brand] || 0) + 1;

    // Brand-normalized GMV/hr
    var bench = brandBench[brand];
    if (bench > 0 && hrs > 0 && gmv > 0) {
      p.brandNormSum += (gmv / hrs) / bench;
      p.brandNormN++;
    }

    // Soft metrics — only if matched
    if (matchStatus === '✅ Matched') {
      p.evaluated++;
      if (senior) p.seniors[senior] = (p.seniors[senior] || 0) + 1;
      p.bonusSum += Number(r[19]) || 0;

      var preP = parsePassFraction_(prePass);
      var durP = parsePassFraction_(durPass);
      var postP = parsePassFraction_(postPass);
      p.prePassSum  += preP.pass;  p.preTotalSum  += preP.total;
      p.durPassSum  += durP.pass;  p.durTotalSum  += durP.total;
      p.postPassSum += postP.pass; p.postTotalSum += postP.total;
    }
  }

  // Find max hours for volume normalization
  var maxHours = 0;
  Object.keys(producers).forEach(function(n) { if (producers[n].hours > maxHours) maxHours = producers[n].hours; });

  // Compute scores
  var rows = [];
  Object.keys(producers).forEach(function(name) {
    var p = producers[name];
    var brandNormAvg = p.brandNormN > 0 ? p.brandNormSum / p.brandNormN : 0;
    var softTotalEval = p.preTotalSum + p.durTotalSum + p.postTotalSum;
    var softPassTotal = p.prePassSum + p.durPassSum + p.postPassSum;
    var softRate = softTotalEval > 0 ? softPassTotal / softTotalEval : 0;
    var volumeNorm = maxHours > 0 ? p.hours / maxHours : 0;

    // Hard score: 100% of benchmark = 0.5 score, 200%+ = 1.0 score
    var hardScore = Math.min(brandNormAvg / 2.0, 1.0);

    var combined = W_HARD * hardScore + W_SOFT * softRate + W_VOLUME * volumeNorm;
    var combined100 = Math.round(combined * 1000) / 10;

    var evalRate = p.sessions > 0 ? p.evaluated / p.sessions : 0;
    var topBrand = topKey_(p.brands);
    var topSenior = topKey_(p.seniors);
    var gmvHr = p.hours > 0 ? p.gmv / p.hours : 0;

    rows.push([
      name,
      p.sessions,
      Math.round(p.hours * 10) / 10,
      Math.round(p.gmv),
      Math.round(gmvHr),
      Math.round(brandNormAvg * 100),  // % vs benchmark
      Math.round(evalRate * 100),       // eval coverage %
      Math.round(softRate * 100),       // soft pass %
      p.bonusSum,
      topBrand || '-',
      topSenior || '-',
      combined100
    ]);
  });

  // Sort by combined score desc
  rows.sort(function(a, b) { return b[11] - a[11]; });

  // Prepend rank
  var rankedRows = rows.map(function(r, i) { return [i + 1].concat(r); });

  writeScorecardSheet_(ss, rankedRows);

  uiAlert(
    '🏆 Producer Scorecard สร้างเสร็จ!\n\n' +
    'Producers: ' + rows.length + '\n\n' +
    'Combined Score weighting:\n' +
    '  ' + (W_HARD * 100) + '% Hard (brand-normalized GMV/hr)\n' +
    '  ' + (W_SOFT * 100) + '% Soft (Pre/Dur/Post pass rate)\n' +
    '  ' + (W_VOLUME * 100) + '% Volume (hours worked)'
  );
}

function parsePassFraction_(s) {
  if (!s || s === '-') return { pass: 0, total: 0 };
  var parts = String(s).split('/');
  if (parts.length !== 2) return { pass: 0, total: 0 };
  return { pass: parseInt(parts[0]) || 0, total: parseInt(parts[1]) || 0 };
}

function topKey_(obj) {
  var keys = Object.keys(obj);
  if (keys.length === 0) return '';
  return keys.sort(function(a, b) { return obj[b] - obj[a]; })[0];
}

function writeScorecardSheet_(ss, rows) {
  var sheet = ss.getSheetByName(SCORECARD_TAB) || ss.insertSheet(SCORECARD_TAB);
  sheetClearAll_(sheet);

  var headers = ['#', 'Producer', 'Sessions', 'Hours', 'Total GMV (฿)', 'GMV/Hr',
    'vs Bench %', 'Eval Cov %', 'Soft Pass %', 'Bonus', 'Top Brand', 'Top Senior', 'Score /100'];
  var TOTAL = headers.length;

  // Title
  sheet.setRowHeight(1, 44);
  sheet.getRange(1, 1, 1, TOTAL).merge()
    .setValue('🏆 Producer Combined Scorecard  —  Hard ' + (W_HARD * 100) +
              '% + Soft ' + (W_SOFT * 100) + '% + Volume ' + (W_VOLUME * 100) + '%')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Sub-info
  sheet.setRowHeight(2, 22);
  sheet.getRange(2, 1, 1, TOTAL).merge()
    .setValue('Refreshed: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') +
              '  |  Benchmark = avg GMV/hr per Brand all sessions  |  Hard score: 100%bench=0.5, 200%bench=1.0')
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Header
  sheet.setRowHeight(3, 32);
  sheet.getRange(3, 1, 1, TOTAL).setValues([headers])
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  if (rows.length > 0) {
    sheet.getRange(4, 1, rows.length, TOTAL).setValues(rows);
    sheet.getRange(4, 5, rows.length, 2).setNumberFormat('#,##0');     // GMV, GMV/Hr
    sheet.getRange(4, 7, rows.length, 3).setNumberFormat('0"%"');      // vs Bench, Eval, Soft
    sheet.getRange(4, 13, rows.length, 1).setNumberFormat('0.0').setFontWeight('bold').setFontSize(11);

    // Color score column
    for (var k = 0; k < rows.length; k++) {
      var rowNum = 4 + k;
      var sc = rows[k][12];
      var bg = sc >= 70 ? '#D4EDDA' : sc >= 50 ? '#FFF3CD' : '#F8D7DA';
      var fg = sc >= 70 ? '#155724' : sc >= 50 ? '#856404' : '#721C24';
      sheet.getRange(rowNum, 13).setBackground(bg).setFontColor(fg);
    }

    // Row banding
    sheet.getRange(4, 1, rows.length, TOTAL).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  }

  // Widths
  var widths = [40, 110, 70, 70, 105, 80, 75, 75, 75, 55, 110, 90, 80];
  widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);
  sheet.getRange(3, 1, rows.length + 1, TOTAL).createFilter();
}


// ============================================================
//  TRIGGERS
// ============================================================
function setupUnifiedTrigger() {
  removeUnifiedTrigger();
  ScriptApp.newTrigger('buildUnifiedAll')
    .timeBased().atHour(8).everyDays(1).create();
  uiAlert('✅ ตั้ง trigger รัน buildUnifiedAll() ทุกวัน 8am-9am\n(หลัง Senior Tracker rebuild 7am)');
}

function removeUnifiedTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildUnifiedAll') {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  uiAlert('🗑 ลบ trigger ' + n + ' รายการ');
}


// ============================================================
//  UTILITIES
// ============================================================
function uiAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* trigger context */ }
}

function sheetClearAll_(sheet) {
  var f = sheet.getFilter();
  if (f) f.remove();
  sheet.clear();
  var rules = sheet.getConditionalFormatRules();
  if (rules.length) sheet.setConditionalFormatRules([]);
}
