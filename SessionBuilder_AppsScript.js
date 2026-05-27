// ============================================================
//  SESSION BUILDER — Google Apps Script
//
//  ติดตั้งใน: Moderator Performance Tracker (ไม่ใช่ Raw data)
//  วาง code นี้ที่ Extensions > Apps Script
//
//  การทำงาน:
//    1. อ่าน Sheet ID + Tab Name จาก Tab "Config" ของไฟล์นี้
//    2. เปิด Raw data Sheet ภายนอกด้วย Sheet ID นั้น
//    3. Group hourly rows → Sessions (Producer + Brand + Channel + ชั่วโมงต่อเนื่อง)
//    4. เขียนผลลัพธ์ลง Tab "Sessions" ของไฟล์นี้ (Date | Time | Producer | Brand)
// ============================================================

// ---------- CONFIG ----------
var CONFIG_SHEET_NAME  = 'Config';
var CONFIG_ID_COL      = 'Sheet ID';
var CONFIG_TAB_COL     = 'Tab Name';
var OUTPUT_SHEET_NAME  = 'Sessions';
var TRACKER_SHEET_NAME = 'Daily Tracker';   // (legacy — replaced by Option B)
var MASTER_LOG_NAME    = 'Master Log';      // ถัง data ถาวร
var TODAY_VIEW_NAME    = 'Today';           // แสดงเฉพาะวันนี้
var OVERDUE_VIEW_NAME  = 'Overdue';         // session ค้างที่ยังไม่กรอก
var START_YEAR  = 2026;
var START_MONTH = 5;
var START_DAY   = 18;

// Senior Producer list (แก้ตรงนี้เมื่อมีคนเพิ่ม)
var SENIOR_PRODUCERS = ['Mink', 'Peet', 'Nine'];

// Producer names ที่ต้องกรอง — เป็น status/account code ไม่ใช่ชื่อคน
// BUG FIX: 'TBCP'=524 sessions, 'Cancel'=29, 'Brand'=8 ถูกดึงมาจาก Raw data
var EXCLUDED_PRODUCERS = ['TBCP', 'Cancel', 'Brand'];

// Dashboard tab names
var WEEKLY_DASH_NAME  = 'Weekly Dashboard';
var MONTHLY_DASH_NAME = 'Monthly Dashboard';
var HISTORY_TAB_NAME  = 'History';
var SCORECARD_PREFIX  = 'Scorecard: ';

// Performance threshold — below this = alert (0.60 = 60%)
var ALERT_THRESHOLD   = 0.60;
// ----------------------------


// ============================================================
//  Custom Menu
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Session Builder')
    .addItem('▶ 1. Build Sessions (Raw → Sessions tab)', 'buildSessionsSheet')
    .addItem('📋 2. Build Master Log + Views',           'buildAllTabs')
    .addItem('🔄 Refresh Today & Overdue views',         'refreshViews')
    .addItem('💾 Sync Today → Master Log',               'syncTodayToMasterLog')
    .addItem('🧹 Dedup Master Log (ลบ session ซ้ำ)',     'dedupMasterLog')
    .addSeparator()
    .addItem('📊 Build Weekly Dashboard',    'buildWeeklyDashboard')
    .addItem('📅 Build Monthly Dashboard',   'buildMonthlyDashboard')
    .addSeparator()
    .addItem('📸 Capture History Snapshot',  'captureHistorySnapshot')
    .addItem('🃏 Build Producer Score Cards','buildProducerScoreCards')
    .addSeparator()
    .addItem('⚙️ ตั้ง Triggers ทั้งหมด (แนะนำ)', 'setupAllTriggers')
    .addItem('🗑 ลบ Triggers ทั้งหมด',           'deleteTriggers')
    .addToUi();
}


// ============================================================
//  onEdit(e) — Auto-sync Today edits → Master Log
//  (Simple trigger — ทำงานอัตโนมัติเมื่อ user แก้ไข cell)
// ============================================================
function onEdit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TODAY_VIEW_NAME) return;
  var row = e.range.getRow();
  var col = e.range.getColumn();
  // Editable zone: row >= 4 (data rows), col 6–22 (Senior PIC + checklist)
  if (row < 4 || col < 6 || col > 22) return;
  // FIX: pass col + value → sync เฉพาะ cell ที่แก้จริง (กัน race กับ WebApp)
  var newValue = e.range.getValue();
  var result = syncCellToMasterLog_(sheet, row, col, newValue);
  if (!result.ok && result.reason) {
    try {
      var cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
      if (cfg) {
        cfg.getRange('H3').setValue('⚠️ onEdit sync fail @ ' + new Date().toLocaleString() + ': ' + result.reason);
      }
    } catch (err) { /* ignore */ }
  }
}


// ============================================================
//  UTILITY HELPERS
// ============================================================

// BUG FIX #1: SpreadsheetApp.getUi() throws in trigger context (no UI)
// ใช้ uiAlert() แทน getUi().alert() ทุกที่ — จะ silent ถ้าเรียกจาก trigger
function uiAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* trigger context — no UI, skip */ }
}

// BUG FIX: sheet.clear() ไม่ลบ Filter / Merged cells / CF rules
// ต้องลบทั้งหมดก่อนเสมอ ไม่งั้น setValues จะ silent fail บน merged area
function sheetClearAll(sheet) {
  // 1. Remove filter (เพื่อไม่ให้ error "already has a filter" ตอน createFilter ใหม่)
  var f = sheet.getFilter();
  if (f) f.remove();

  // 2. Break ALL merged cells (sheet.clear() ไม่ทำ — ค้างไว้ทำให้ setValues เพี้ยน)
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 0 && lastCol > 0) {
    sheet.getRange(1, 1, lastRow, lastCol).breakApart();
  }

  // 3. Clear content + formatting
  sheet.clear();

  // 4. Remove conditional formatting rules
  var rules = sheet.getConditionalFormatRules();
  if (rules.length) sheet.setConditionalFormatRules([]);
}

// ============================================================
//  อ่าน Config
// ============================================================
function readConfig() {
  var thisSS      = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = thisSS.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) throw new Error('❌ ไม่พบ Tab "' + CONFIG_SHEET_NAME + '"');

  var data = configSheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('❌ Config sheet ต้องมีอย่างน้อย 2 rows (header + data)');

  var headers = data[0].map(function(h) { return h.toString().trim(); });
  var idIdx   = headers.indexOf(CONFIG_ID_COL);
  var tabIdx  = headers.indexOf(CONFIG_TAB_COL);
  if (idIdx  === -1) throw new Error('❌ ไม่พบ column "' + CONFIG_ID_COL  + '" ใน Config');
  if (tabIdx === -1) throw new Error('❌ ไม่พบ column "' + CONFIG_TAB_COL + '" ใน Config');

  var sheetId = data[1][idIdx].toString().trim();
  var tabName = data[1][tabIdx].toString().trim();
  if (!sheetId) throw new Error('❌ Sheet ID ว่างเปล่า');
  if (!tabName) throw new Error('❌ Tab Name ว่างเปล่า');

  return { sheetId: sheetId, tabName: tabName };
}


// ============================================================
//  MAIN FUNCTION
// ============================================================
function buildSessionsSheet() {

  // 1. อ่าน Config
  var config;
  try { config = readConfig(); }
  catch (e) { uiAlert(e.message); return; }

  // 2. เปิด Raw data Sheet ภายนอก
  var rawSS;
  try { rawSS = SpreadsheetApp.openById(config.sheetId); }
  catch (e) {
    uiAlert('❌ เปิด Raw data Sheet ไม่ได้\nSheet ID: ' + config.sheetId +
            '\n\nตรวจสอบ:\n 1. Sheet ID ถูกต้อง\n 2. Share กับ Account นี้แล้ว');
    return;
  }

  var rawSheet = rawSS.getSheetByName(config.tabName);
  if (!rawSheet) {
    uiAlert('❌ ไม่พบ Tab "' + config.tabName + '" ใน Raw data Sheet');
    return;
  }

  // 3. อ่านข้อมูล Raw
  var data    = rawSheet.getDataRange().getValues();
  var headers = data[0];

  // Map header → column index (trim spaces)
  var col = {};
  headers.forEach(function(h, i) { col[h.toString().trim()] = i; });

  var required = ['year', 'Month', 'Day', 'Producer', 'Brand', 'Channel',
                  'Start Time', 'End Time'];
  var missing = required.filter(function(c) { return col[c] === undefined; });
  if (missing.length > 0) {
    uiAlert('❌ ไม่พบ Column: ' + missing.join(', '));
    return;
  }

  // 4. Filter & แปลงข้อมูลแต่ละ row
  var rows = [];
  var excludedCount = 0;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];

    var year     = Number(r[col['year']]);
    var monthRaw = r[col['Month']];
    var monthNum = parseMonthNum(monthRaw.toString());
    var day      = Number(r[col['Day']]);

    if (isNaN(year) || isNaN(monthNum) || isNaN(day)) continue;
    if (!isOnOrAfter(year, monthNum, day, START_YEAR, START_MONTH, START_DAY)) continue;

    var producer = r[col['Producer']].toString().trim();
    var brand    = r[col['Brand']].toString().trim();
    var channel  = r[col['Channel']].toString().trim();
    if (!producer || !brand || !channel) continue;

    // DATA FIX: กรอง EXCLUDED_PRODUCERS (TBCP / Cancel / Brand / etc.)
    // ชื่อเหล่านี้เป็น status/account code ไม่ใช่ Producer จริงใน Raw data
    if (EXCLUDED_PRODUCERS.indexOf(producer) > -1) { excludedCount++; continue; }

    // --- FIX 2: แปลง Start/End Time ให้เป็น "นาทีนับจาก 00:00" เสมอ ---
    // Google Sheets อาจส่ง: number (18), fraction (0.75), Date object, string ("18:00:00")
    var startMin = toMinutes(r[col['Start Time']]);
    var endMin   = toMinutes(r[col['End Time']]);
    if (isNaN(startMin) || isNaN(endMin)) continue;

    rows.push({
      year:     year,
      monthNum: monthNum,   // FIX 1: เก็บ monthNum ไว้ใช้ใน formatDate
      day:      day,
      producer: producer,
      brand:    brand,
      channel:  channel,
      startMin: startMin,   // หน่วย: นาที เช่น 18:00 = 1080
      endMin:   endMin,
    });
  }

  if (rows.length === 0) {
    uiAlert('⚠️ ไม่พบข้อมูลตั้งแต่ ' + START_DAY + '/' + START_MONTH + '/' + START_YEAR);
    return;
  }

  // 5. Sort: year → monthNum → day → producer → brand → channel → startMin
  rows.sort(function(a, b) {
    var fields = ['year','monthNum','day','producer','brand','channel','startMin'];
    for (var f = 0; f < fields.length; f++) {
      var k = fields[f];
      if (a[k] < b[k]) return -1;
      if (a[k] > b[k]) return  1;
    }
    return 0;
  });

  // 6. Group rows → Sessions
  //    Session ใหม่ = key เปลี่ยน หรือ ชั่วโมงไม่ต่อเนื่อง (endMin ≠ startMin ถัดไป)
  var sessions = [];
  var cur = null;

  rows.forEach(function(r) {
    var isNew = !cur
      || cur.year     !== r.year
      || cur.monthNum !== r.monthNum
      || cur.day      !== r.day
      || cur.producer !== r.producer
      || cur.brand    !== r.brand
      || cur.channel  !== r.channel
      || cur.endMin   !== r.startMin;  // ← FIX 2: เปรียบเทียบด้วย integer นาที

    if (isNew) {
      if (cur) sessions.push(cur);
      cur = {
        year:     r.year,
        monthNum: r.monthNum,  // FIX 1: เก็บไว้ใช้ใน formatDate
        day:      r.day,
        producer: r.producer,
        brand:    r.brand,
        channel:  r.channel,
        startMin: r.startMin,
        endMin:   r.endMin,
      };
    } else {
      cur.endMin = r.endMin;  // ขยาย session
    }
  });
  if (cur) sessions.push(cur);

  // 7. เขียน Output (4 คอลัมน์) ลง Tab "Sessions"
  var thisSS   = SpreadsheetApp.getActiveSpreadsheet();
  var outSheet = thisSS.getSheetByName(OUTPUT_SHEET_NAME);
  if (!outSheet) {
    outSheet = thisSS.insertSheet(OUTPUT_SHEET_NAME);
  } else {
    outSheet.clearContents();
    var f = outSheet.getFilter();
    if (f) f.remove();
  }

  var outputHeaders = ['Date', 'Time', 'Producer', 'Brand'];
  var outputData    = [outputHeaders];

  sessions.forEach(function(s) {
    outputData.push([
      formatDate(s.day, s.monthNum, s.year),                    // "18 May 2026"
      minutesToTime(s.startMin) + '-' + minutesToTime(s.endMin), // "20:00-22:00"
      s.producer,
      s.brand,
    ]);
  });

  outSheet.getRange(1, 1, outputData.length, 4).setValues(outputData);

  // จัด format
  var hdr = outSheet.getRange(1, 1, 1, 4);
  hdr.setFontWeight('bold');
  hdr.setBackground('#4A90D9');
  hdr.setFontColor('#FFFFFF');
  outSheet.setFrozenRows(1);
  outSheet.autoResizeColumns(1, 4);
  outSheet.getRange(1, 1, outputData.length, 4).createFilter();

  uiAlert(
    '✅ เสร็จแล้ว!\n' +
    'Raw rows (≥ ' + START_DAY + '/' + START_MONTH + '/' + START_YEAR + '): ' + rows.length + '\n' +
    'Sessions: ' + sessions.length + '\n' +
    (excludedCount > 0 ? '⚠️ กรอง EXCLUDED_PRODUCERS ออก: ' + excludedCount + ' rows' : '')
  );
}


// ============================================================
//  TRIGGER
// ============================================================
// ============================================================
//  setupAllTriggers() — ตั้ง trigger ทั้งหมดที่แนะนำ (ลบของเดิมก่อน)
//  เรียกครั้งเดียวจาก menu
// ============================================================
function setupAllTriggers() {
  deleteTriggers();

  // 7am — Full rebuild (Sessions + Master Log + Views)
  ScriptApp.newTrigger('dailyFullUpdate')
    .timeBased().atHour(7).everyDays(1).create();

  // ทุกชั่วโมง — Safe refresh (sync Today→ML + refresh views เท่านั้น)
  ScriptApp.newTrigger('nightlySafeUpdate')
    .timeBased().everyHours(1).create();

  // วันอาทิตย์ 10pm — History snapshot
  ScriptApp.newTrigger('captureHistorySnapshot')
    .timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(22).create();

  // วันจันทร์ 8am — Weekly dashboard
  ScriptApp.newTrigger('buildWeeklyDashboard')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();

  uiAlert(
    '✅ ตั้ง Triggers เรียบร้อย!\n\n' +
    '• 7am ทุกวัน → dailyFullUpdate (rebuild ทั้งหมด)\n' +
    '• ทุกชั่วโมง → nightlySafeUpdate (sync + refresh)\n' +
    '• อาทิตย์ 10pm → captureHistorySnapshot\n' +
    '• จันทร์ 8am → buildWeeklyDashboard'
  );
}

function setupHourlyTrigger() {
  // Legacy — แนะนำให้ใช้ setupAllTriggers() แทน
  deleteTriggers();
  ScriptApp.newTrigger('nightlySafeUpdate').timeBased().everyHours(1).create();
  uiAlert('✅ ตั้ง Auto-Refresh ทุกชั่วโมง (nightlySafeUpdate)\nแนะนำให้ใช้ "ตั้ง Triggers ทั้งหมด" เพื่อครบทุก function');
}

function setupNightlyTrigger() {
  // Legacy alias — ชี้ไปที่ setupAllTriggers
  setupAllTriggers();
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
}


// ============================================================
//  nightlySafeUpdate() — ปลอดภัยรัน ทุกชั่วโมง รวมถึงกลางคืน
//
//  ❌ ไม่แตะ Master Log content (ไม่ rebuild, ไม่ clear)
//  ❌ ไม่ clear/rebuild Today (เพราะจะกวน user ที่กรอกอยู่)
//  ✅ Sync Today → ML (safety net เผื่อ onEdit ไม่ทำงาน)
//  ✅ Refresh Overdue เท่านั้น
//
//  หมายเหตุ: Today refresh เฉพาะตอน 7am (ใน dailyFullUpdate)
//  หรือ user กดเอง — ไม่ refresh ระหว่างวันเพื่อกันข้อมูลหาย
// ============================================================
function nightlySafeUpdate() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  var syncedCount = 0;
  var failedCount = 0;

  try {
    var result = syncTodayToMasterLog_(false);
    syncedCount = (result && result.synced) || 0;
    failedCount = (result && result.failed) || 0;
    log.push('✅ Synced: ' + syncedCount + (failedCount ? ' (⚠️ failed: ' + failedCount + ')' : ''));
  } catch (e) {
    log.push('❌ Sync: ' + e.message);
  }

  try {
    refreshOverdueView();
    log.push('✅ Overdue refreshed');
  } catch (e) {
    log.push('❌ Overdue: ' + e.message);
  }

  // บันทึก log ลง Config!H1-H2
  try {
    var cfg = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (cfg) {
      cfg.getRange('H1').setValue('Last safe-refresh: ' + new Date().toLocaleString());
      cfg.getRange('H2').setValue(log.join(' | '));
    }
  } catch (e) { /* ignore */ }
}


// ============================================================
//  dailyFullUpdate() — ใช้กับ Time-driven Trigger (7am daily)
//
//  BUG FIX: แก้จาก buildSessionsSheet_silent (not defined)
//  ตอนนี้ buildSessionsSheet() ปลอดภัยใน trigger แล้วเพราะ uiAlert()
//  จะ silent โดยอัตโนมัติเมื่อไม่มี UI (trigger context)
//
//  Flow: Sessions → Master Log (preserve Pass/Fail) → Today + Overdue
// ============================================================
function dailyFullUpdate() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  try {
    buildSessionsSheet();   // ดึง Raw → Sessions (uiAlert silent ใน trigger)
    log.push('✅ Sessions rebuilt');
  } catch (e) {
    log.push('❌ Sessions: ' + e.message);
  }

  try {
    buildMasterLog();       // Sessions → Master Log (preserve Pass/Fail)
    log.push('✅ Master Log rebuilt');
  } catch (e) {
    log.push('❌ Master Log: ' + e.message);
  }

  try {
    refreshViews();         // Master Log → Today + Overdue
    log.push('✅ Today + Overdue refreshed');
  } catch (e) {
    log.push('❌ Views: ' + e.message);
  }

  // บันทึก log ลง Config!G1-G2 เพื่อ debug
  try {
    var cfg = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (cfg) {
      cfg.getRange('G1').setValue('Last auto-run: ' + new Date().toLocaleString());
      cfg.getRange('G2').setValue(log.join(' | '));
    }
  } catch (e) { /* ignore */ }
}


// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// --- FIX 2: แปลงค่า time ทุกรูปแบบให้เป็น "จำนวนนาทีนับจากเที่ยงคืน" (integer) ---
// รองรับ:
//   - Number  18 or 18.5           → ชั่วโมง (raw data แบบ CSV)
//   - Number  0.75                 → Google Sheets fraction of day (18:00 = 18/24)
//   - Date object                  → Google Sheets time-formatted cell
//   - String "18:00:00" / "18:00"  → text
function toMinutes(val) {
  if (val === null || val === undefined || val === '') return NaN;

  // Date object (Google Sheets time cell อ่านมาเป็น Date)
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes();
  }

  var n = Number(val);

  if (!isNaN(n)) {
    // Fraction of day: 0 < n < 1  เช่น 0.75 = 18:00
    if (n > 0 && n < 1) {
      return Math.round(n * 24 * 60);  // แปลงเป็นนาที
    }
    // เลขชั่วโมงตรง: 18, 19, 20 หรือ 18.5 (= 18:30)
    var h = Math.floor(n);
    var m = Math.round((n - h) * 60);
    return h * 60 + m;
  }

  // String เช่น "18:00:00" หรือ "18:00"
  var parts = val.toString().trim().split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  return NaN;
}

// นาที → "18:00"
function minutesToTime(totalMin) {
  var h = Math.floor(totalMin / 60);
  var m = totalMin % 60;
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
}

// "(05)May" → 5
function parseMonthNum(monthStr) {
  var match = monthStr.match(/\((\d+)\)/);
  return match ? parseInt(match[1]) : NaN;
}

// --- FIX 1: ใช้ monthNum (integer) แทน s.month ที่ undefined ---
// (18, 5, 2026) → "18 May 2026"
function formatDate(day, monthNum, year) {
  var names = ['','January','February','March','April','May','June',
               'July','August','September','October','November','December'];
  return day + ' ' + (names[monthNum] || '?') + ' ' + year;
}

// เช็ค date >= start date
function isOnOrAfter(y, m, d, sy, sm, sd) {
  if (y !== sy) return y > sy;
  if (m !== sm) return m > sm;
  return d >= sd;
}


// ============================================================
//  DEDUP MASTER LOG
//
//  สาเหตุของ dup: buildMasterLog เก่า (ก่อน append-only fix) clear+rebuild
//                 แต่ preserve logic fail (locale issue) → สะสม dup ทุกครั้งรัน
//
//  Logic:
//    1. Group rows by key (Date|Time|Producer|Brand)
//    2. สำหรับแต่ละ group คำนวณ "score" = จำนวน non-N/A cell ใน col E-U
//    3. เก็บ row ที่ score สูงสุด (= data ครบที่สุด)
//    4. ถ้า tie → เก็บ row index สูงสุด (= ล่าสุด)
//    5. Delete row อื่นๆ จากล่างขึ้นบน (ไม่ให้ index shift)
//
//  Safety: snapshot ML ไปที่ tab "Master Log Backup [timestamp]" ก่อนลบ
// ============================================================
function dedupMasterLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ml = ss.getSheetByName(MASTER_LOG_NAME);
  if (!ml) { uiAlert('❌ ไม่พบ Master Log'); return; }

  var data = ml.getDataRange().getValues();
  if (data.length < 3) { uiAlert('✅ ML ว่าง — ไม่มี dup ให้ลบ'); return; }

  // ── Step 1: group by key, score each row
  var groups = {}; // key → [{ rowIdx (1-indexed), score }]
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var d = row[0] instanceof Date ? row[0] : new Date(row[0].toString());
    var key = formatDate(d.getDate(), d.getMonth() + 1, d.getFullYear())
            + '|' + row[1] + '|' + row[2] + '|' + row[3];

    // Score = count non-N/A non-empty in col idx 4-20 (Senior + 16 items)
    var score = 0;
    for (var c = 4; c <= 20; c++) {
      var v = (row[c] || '').toString().trim();
      if (v && v !== 'N/A') score++;
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push({ rowIdx: i + 1, score: score });
  }

  // ── Step 2: identify rows to delete
  var toDelete = [];
  var unique = 0, dupGroups = 0, rowsDeleted = 0;
  Object.keys(groups).forEach(function(key) {
    var rows = groups[key];
    unique++;
    if (rows.length === 1) return;
    dupGroups++;

    // Sort: highest score first, then highest rowIdx (latest)
    rows.sort(function(a, b) {
      if (a.score !== b.score) return b.score - a.score;
      return b.rowIdx - a.rowIdx;
    });

    // Keep rows[0], delete the rest
    for (var i = 1; i < rows.length; i++) {
      toDelete.push(rows[i].rowIdx);
      rowsDeleted++;
    }
  });

  if (toDelete.length === 0) {
    uiAlert('✅ ไม่มี duplicate ใน Master Log — ' + unique + ' unique sessions');
    return;
  }

  // ── Step 3: SAFETY — backup ML to timestamped tab
  var tz = Session.getScriptTimeZone();
  var ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HHmmss');
  var backupName = 'ML_Backup_' + ts;
  var existing = ss.getSheetByName(backupName);
  if (existing) ss.deleteSheet(existing);
  var backup = ml.copyTo(ss);
  backup.setName(backupName);
  ss.setActiveSheet(ml); // กลับมาที่ ML

  // ── Step 4: delete rows bottom-up (กัน index shift)
  toDelete.sort(function(a, b) { return b - a; });
  toDelete.forEach(function(rowIdx) {
    ml.deleteRow(rowIdx);
  });

  uiAlert(
    '✅ Dedup เสร็จ\n\n' +
    'Unique sessions: ' + unique + '\n' +
    'Sessions ที่มี dup: ' + dupGroups + '\n' +
    'Rows ที่ลบ: ' + rowsDeleted + '\n\n' +
    '📦 Backup: Tab "' + backupName + '"\n' +
    '(ลบ tab นี้เมื่อยืนยันว่าทุกอย่างปกติ)'
  );
}


// ============================================================
//  BUILD DAILY TRACKER
//  ดึง sessions จาก "Sessions" tab → สร้าง "Daily Tracker" tab
//  พร้อม checklist Pass/Fail/N/A แยก Pre / During / Post
// ============================================================
function buildDailyTracker() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- ดึง Sessions ---
  var sessSheet = ss.getSheetByName(OUTPUT_SHEET_NAME);
  if (!sessSheet) {
    uiAlert('❌ ไม่พบ Tab "' + OUTPUT_SHEET_NAME + '"\nกรุณากด "Build Sessions Now" ก่อน');
    return;
  }
  var sessData = sessSheet.getDataRange().getValues();
  if (sessData.length < 2) {
    uiAlert('⚠️ Sessions tab ว่างเปล่า');
    return;
  }

  var sessHeaders = sessData[0].map(function(h) { return h.toString().trim(); });
  var sc = {};
  sessHeaders.forEach(function(h, i) { sc[h] = i; });
  var sessionRows = sessData.slice(1);
  var nRows = sessionRows.length;

  // --- เตรียม / ล้าง Daily Tracker sheet ---
  var sheet = ss.getSheetByName(TRACKER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TRACKER_SHEET_NAME);
  } else {
    sheetClearAll(sheet); // BUG FIX: removes filter before clear (prevents "already has a filter" error)
  }

  // ============================================================
  //  COLUMN LAYOUT (1-based)
  //  A=1  Date
  //  B=2  Time
  //  C=3  Producer
  //  D=4  Brand
  //  E=5  Senior PIC        ← dropdown: SENIOR_PRODUCERS
  //  F-K  (6-11)  Pre-live  6 base items
  //  L-O  (12-15) During    4 base items
  //  P=16         ★ Creativity (Bonus)
  //  Q-T  (17-20) Post      4 base items
  //  U=21         ★ Feedback (Bonus)
  //  V=22  Base Score  (0-14)
  //  W=23  Bonus Score (0-2)
  // ============================================================
  var C = {
    DATE:10, TIME:2, PROD:3, BRAND:4, SENIOR:5,
    PRE_S:6,  PRE_E:11,
    DUR_S:12, DUR_E:15,
    DUR_BONUS:16,
    POST_S:17, POST_E:20,
    POST_BONUS:21,
    SCORE_BASE:22,
    SCORE_BONUS:23,
    TOTAL:23
  };
  // fix DATE typo
  C.DATE = 1;

  // ============================================================
  //  COLORS
  // ============================================================
  var CLR = {
    headerDark:    '#2C2C2A',
    headerText:    '#FFFFFF',
    infoBg:        '#F1EFE8',
    infoText:      '#2C2C2A',
    preHdr:        '#B5D4F4',
    preBg:         '#E6F1FB',
    preText:       '#0C447C',
    durHdr:        '#FAC775',
    durBg:         '#FAEEDA',
    durText:       '#412402',
    postHdr:       '#C0DD97',
    postBg:        '#EAF3DE',
    postText:      '#173404',
    bonusBg:       '#EEEDFE',
    bonusText:     '#3C3489',
    scoreBaseBg:   '#D3D1C7',
    scoreBaseText: '#2C2C2A',
    naText:        '#888780',
    passText:      '#0F6E56',
    passBg:        '#E1F5EE',
    failText:      '#993C1D',
    failBg:        '#FAECE7',
  };

  // ============================================================
  //  ROW 1 — Section headers (merged)
  // ============================================================
  sheet.setRowHeight(1, 32);

  var r1 = sheet.getRange(1, 1, 1, C.TOTAL);
  r1.setBackground(CLR.headerDark).setFontColor(CLR.headerText)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Session Info (A-E merged)
  sheet.getRange(1,1,1,5).merge().setValue('Session Info');

  // Pre-live (F-K merged)
  sheet.getRange(1, C.PRE_S, 1, 6).merge().setValue('PRE-LIVE CHECK')
    .setBackground(CLR.preHdr).setFontColor(CLR.preText).setFontWeight('bold');

  // During-live (L-P merged)
  sheet.getRange(1, C.DUR_S, 1, 5).merge().setValue('DURING-LIVE CHECK')
    .setBackground(CLR.durHdr).setFontColor(CLR.durText).setFontWeight('bold');

  // Post-live (Q-U merged)
  sheet.getRange(1, C.POST_S, 1, 5).merge().setValue('POST-LIVE CHECK')
    .setBackground(CLR.postHdr).setFontColor(CLR.postText).setFontWeight('bold');

  // Score headers
  sheet.getRange(1, C.SCORE_BASE).setValue('Base\nScore (/14)')
    .setBackground(CLR.scoreBaseBg).setFontColor(CLR.scoreBaseText)
    .setFontWeight('bold').setFontSize(9).setWrap(true)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  sheet.getRange(1, C.SCORE_BONUS).setValue('Bonus\nScore (/2)')
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setWrap(true)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ============================================================
  //  ROW 2 — Sub-headers (item labels)
  // ============================================================
  sheet.setRowHeight(2, 56);

  var subHdrs = [
    // Info
    ['Date','Time','Producer','Brand','Senior\nPIC'],
    // Pre (F-K)
    ['Artwork\ncorrect','Brief:\nPromotion','Brief:\nHero SKU',
     'Brief:\nKey msg','Technical:\nVisual','Technical:\nAudio'],
    // During base (L-O) + bonus (P)
    ['ปักตะกร้าทัน\n(MC/ผู้ชม)','กดถูกใจ\n>1K/15min',
     'Comment\nEngagement','ส่งข้อมูล\nDashboard','★ Creativity\n& Innovation'],
    // Post base (Q-T) + bonus (U)
    ['กรอก\nForm','ส่ง Dashboard\n→ GChat',
     'จัดระเบียบ\nห้อง Live','ปิดอุปกรณ์\nทั้งหมด','★ Feedback\nwith Team'],
  ];

  var subStyle = function(range, bg, fg) {
    range.setBackground(bg).setFontColor(fg).setFontWeight('bold')
      .setFontSize(9).setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  };

  subHdrs[0].forEach(function(h, i) {
    subStyle(sheet.getRange(2, 1+i), CLR.infoBg, CLR.infoText);
    sheet.getRange(2, 1+i).setValue(h);
  });
  subHdrs[1].forEach(function(h, i) {
    subStyle(sheet.getRange(2, C.PRE_S+i), CLR.preBg, CLR.preText);
    sheet.getRange(2, C.PRE_S+i).setValue(h);
  });
  subHdrs[2].forEach(function(h, i) {
    var isBonus = (i === 4);
    subStyle(sheet.getRange(2, C.DUR_S+i), isBonus ? CLR.bonusBg : CLR.durBg, isBonus ? CLR.bonusText : CLR.durText);
    sheet.getRange(2, C.DUR_S+i).setValue(h);
  });
  subHdrs[3].forEach(function(h, i) {
    var isBonus = (i === 4);
    subStyle(sheet.getRange(2, C.POST_S+i), isBonus ? CLR.bonusBg : CLR.postBg, isBonus ? CLR.bonusText : CLR.postText);
    sheet.getRange(2, C.POST_S+i).setValue(h);
  });
  // Score sub-headers (ใส่ "-" เพื่อไม่ให้ว่าง)
  sheet.getRange(2, C.SCORE_BASE).setValue('Pass/14')
    .setBackground(CLR.scoreBaseBg).setFontColor(CLR.scoreBaseText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2, C.SCORE_BONUS).setValue('Bonus/2')
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ============================================================
  //  DATA ROWS — batch write ก่อน แล้วค่อย format
  // ============================================================
  var DATA_START = 3;

  // สร้าง 2D array ของค่า (info + 16 N/A + 2 placeholder สำหรับ formula)
  var blankRow = Array(C.TOTAL).fill('');
  var dataValues = sessionRows.map(function(s) {
    var row = blankRow.slice();
    row[0] = s[sc['Date']]     || '';
    row[1] = s[sc['Time']]     || '';
    row[2] = s[sc['Producer']] || '';
    row[3] = s[sc['Brand']]    || '';
    row[4] = '';  // Senior PIC — กรอกเอง
    // ตั้ง N/A สำหรับ checklist columns index 5-20 (F-U)
    for (var i = 5; i <= 20; i++) row[i] = 'N/A';
    // Score columns จะใส่ formula ทีหลัง
    return row;
  });

  sheet.getRange(DATA_START, 1, nRows, C.TOTAL).setValues(dataValues);

  // ============================================================
  //  SECTION BACKGROUND COLORS (batch by column range)
  // ============================================================
  // Info columns (A-D) — ไม่ใส่ bg พิเศษ ใช้ขาว
  // Senior PIC (E) — info bg
  sheet.getRange(DATA_START, C.SENIOR, nRows, 1).setBackground(CLR.infoBg);

  // Pre-live (F-K)
  sheet.getRange(DATA_START, C.PRE_S, nRows, 6).setBackground(CLR.preBg)
    .setHorizontalAlignment('center').setFontColor(CLR.naText);

  // During base (L-O)
  sheet.getRange(DATA_START, C.DUR_S, nRows, 4).setBackground(CLR.durBg)
    .setHorizontalAlignment('center').setFontColor(CLR.naText);

  // During bonus (P)
  sheet.getRange(DATA_START, C.DUR_BONUS, nRows, 1).setBackground(CLR.bonusBg)
    .setHorizontalAlignment('center').setFontColor(CLR.naText);

  // Post base (Q-T)
  sheet.getRange(DATA_START, C.POST_S, nRows, 4).setBackground(CLR.postBg)
    .setHorizontalAlignment('center').setFontColor(CLR.naText);

  // Post bonus (U)
  sheet.getRange(DATA_START, C.POST_BONUS, nRows, 1).setBackground(CLR.bonusBg)
    .setHorizontalAlignment('center').setFontColor(CLR.naText);

  // Score columns
  sheet.getRange(DATA_START, C.SCORE_BASE, nRows, 1)
    .setBackground(CLR.scoreBaseBg).setFontWeight('bold')
    .setHorizontalAlignment('center').setFontSize(11);
  sheet.getRange(DATA_START, C.SCORE_BONUS, nRows, 1)
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);

  // ============================================================
  //  SCORE FORMULAS (batch ด้วย setFormulas)
  // ============================================================
  var scoreFormulas = sessionRows.map(function(_, idx) {
    var r = DATA_START + idx;
    var base  = '=COUNTIF(F'+r+':K'+r+',"Pass")+COUNTIF(L'+r+':O'+r+',"Pass")+COUNTIF(Q'+r+':T'+r+',"Pass")';
    var bonus = '=COUNTIF(P'+r+',"Pass")+COUNTIF(U'+r+',"Pass")';
    return [base, bonus];
  });
  sheet.getRange(DATA_START, C.SCORE_BASE, nRows, 2).setFormulas(scoreFormulas);

  // ============================================================
  //  DATA VALIDATION
  // ============================================================
  var passFail = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pass', 'Fail', 'N/A'], true)
    .setAllowInvalid(false).build();

  var seniorDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(SENIOR_PRODUCERS, true)
    .setAllowInvalid(false).build();

  // Pass/Fail/N/A: F-U (cols 6-21, width 16)
  sheet.getRange(DATA_START, C.PRE_S, nRows, 16).setDataValidation(passFail);

  // Senior PIC dropdown: E
  sheet.getRange(DATA_START, C.SENIOR, nRows, 1).setDataValidation(seniorDV);

  // ============================================================
  //  CONDITIONAL FORMATTING — Pass (green) / Fail (red) / N/A (section color restored)
  //  ใช้ single range F-U ครอบทั้งหมด
  // ============================================================
  var checkRange = sheet.getRange(DATA_START, C.PRE_S, nRows, 16);

  var cfPass = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Pass')
    .setBackground(CLR.passBg).setFontColor(CLR.passText).setBold(true)
    .setRanges([checkRange]).build();

  var cfFail = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Fail')
    .setBackground(CLR.failBg).setFontColor(CLR.failText).setBold(true)
    .setRanges([checkRange]).build();

  sheet.setConditionalFormatRules([cfPass, cfFail]);

  // ============================================================
  //  COLUMN WIDTHS
  // ============================================================
  sheet.setColumnWidth(C.DATE,   95);
  sheet.setColumnWidth(C.TIME,   105);
  sheet.setColumnWidth(C.PROD,   85);
  sheet.setColumnWidth(C.BRAND,  105);
  sheet.setColumnWidth(C.SENIOR, 85);
  for (var i = C.PRE_S;   i <= C.PRE_E;    i++) sheet.setColumnWidth(i, 60);
  for (var i = C.DUR_S;   i <= C.DUR_BONUS; i++) sheet.setColumnWidth(i, 66);
  for (var i = C.POST_S;  i <= C.POST_BONUS; i++) sheet.setColumnWidth(i, 64);
  sheet.setColumnWidth(C.SCORE_BASE,  62);
  sheet.setColumnWidth(C.SCORE_BONUS, 62);

  // ROW HEIGHTS (data rows)
  sheet.setRowHeights(DATA_START, nRows, 28);

  // ============================================================
  //  FREEZE & FILTER
  // ============================================================
  sheet.setFrozenRows(2);    // header rows ไม่เลื่อน
  sheet.setFrozenColumns(5); // A-E (Date/Time/Producer/Brand/Senior PIC) — ต้อง ≥5 เพราะ row1 merge A:E // Date/Time/Producer/Brand ไม่เลื่อน

  // Filter bar บน row 2
  sheet.getRange(2, 1, nRows + 1, C.TOTAL).createFilter();

  // ============================================================
  //  DONE
  // ============================================================
  uiAlert(
    '✅ Daily Tracker สร้างเรียบร้อย!\n' +
    'Sessions: ' + nRows + '\n' +
    'Base checklist items: 14 | Bonus: 2\n' +
    'Tab: "' + TRACKER_SHEET_NAME + '"'
  );
}


// ============================================================
//  OPTION B — MASTER LOG + TODAY VIEW + OVERDUE VIEW
// ============================================================

function buildAllTabs() {
  buildMasterLog();
  refreshViews();
}

function refreshViews() {
  // Sync Today edits → Master Log ก่อนเสมอ (ไม่ให้ข้อมูลหาย)
  syncTodayToMasterLog_(false);
  refreshTodayView();
  refreshOverdueView();
}


// ============================================================
//  buildMasterLog() — APPEND-ONLY dispatcher
//
//  Architecture: Master Log is APPEND-ONLY data store.
//    - NEVER clears or rewrites existing rows
//    - Only appends NEW sessions (key not yet in ML)
//    - Existing Pass/Fail/Senior PIC data 100% safe
//
//  Flow:
//    1. sync Today → ML (persist current edits)
//    2. read existing keys from ML
//    3. if ML empty → _buildMasterLogFresh() (first-time setup)
//       else        → _appendNewSessionsToMasterLog() (safe append)
// ============================================================
function buildMasterLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // SAFETY: persist Today edits first
  syncTodayToMasterLog_(false);

  var sessSheet = ss.getSheetByName(OUTPUT_SHEET_NAME);
  if (!sessSheet) {
    uiAlert('❌ ไม่พบ Tab "' + OUTPUT_SHEET_NAME + '"\nกรุณากด "Build Sessions Now" ก่อน');
    return;
  }
  var sessData = sessSheet.getDataRange().getValues();
  if (sessData.length < 2) { uiAlert('⚠️ Sessions tab ว่างเปล่า'); return; }

  var sh = sessData[0].map(function(h){ return h.toString().trim(); });
  var sc = {};
  sh.forEach(function(h,i){ sc[h]=i; });
  var sessionRows = sessData.slice(1);

  // Decide path: fresh build (no ML yet) vs append-only
  var DATA_START = 3;
  var existingSheet = ss.getSheetByName(MASTER_LOG_NAME);
  var hasExistingData = false;
  if (existingSheet) {
    var lr = existingSheet.getLastRow();
    if (lr >= DATA_START && existingSheet.getRange(DATA_START, 1).getValue()) {
      hasExistingData = true;
    }
  }

  if (hasExistingData) {
    _appendNewSessionsToMasterLog(existingSheet, sessionRows, sc);
  } else {
    _buildMasterLogFresh(sessionRows, sc);
  }
}


// ============================================================
//  _buildMasterLogFresh(sessionRows, sc)
//  เรียกครั้งแรกเท่านั้น — สร้าง headers + ทุก section + data rows
//  (เรียกตอน ML ยังว่าง / ยังไม่เคยสร้าง)
// ============================================================
function _buildMasterLogFresh(sessionRows, sc) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MASTER_LOG_NAME) || ss.insertSheet(MASTER_LOG_NAME);
  sheetClearAll(sheet); // ปลอดภัย — sheet ว่างอยู่แล้ว

  var nRows = sessionRows.length;
  var DATA_START = 3;

  var C = {
    DATE:1, TIME:2, PROD:3, BRAND:4, SENIOR:5,
    PRE_S:6, PRE_E:11,
    DUR_S:12, DUR_E:15, DUR_BONUS:16,
    POST_S:17, POST_E:20, POST_BONUS:21,
    SCORE_BASE:22, SCORE_BONUS:23, STATUS:24,
    TOTAL:24
  };

  var CLR = {
    headerDark:'#2C2C2A', headerText:'#FFFFFF',
    infoBg:'#F1EFE8', infoText:'#2C2C2A',
    preHdr:'#B5D4F4', preBg:'#E6F1FB', preText:'#0C447C',
    durHdr:'#FAC775', durBg:'#FAEEDA', durText:'#412402',
    postHdr:'#C0DD97', postBg:'#EAF3DE', postText:'#173404',
    bonusBg:'#EEEDFE', bonusText:'#3C3489',
    scoreBaseBg:'#D3D1C7', naText:'#888780',
    passBg:'#E1F5EE', passText:'#0F6E56',
    failBg:'#FAECE7', failText:'#993C1D',
  };

  // --- ROW 1: Section headers ---
  sheet.setRowHeight(1, 32);
  sheet.getRange(1,1,1,C.TOTAL)
    .setBackground(CLR.headerDark).setFontColor(CLR.headerText)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(1,1,1,5).merge().setValue('Session Info');
  sheet.getRange(1,C.PRE_S,1,6).merge().setValue('PRE-LIVE CHECK')
    .setBackground(CLR.preHdr).setFontColor(CLR.preText).setFontWeight('bold');
  sheet.getRange(1,C.DUR_S,1,5).merge().setValue('DURING-LIVE CHECK')
    .setBackground(CLR.durHdr).setFontColor(CLR.durText).setFontWeight('bold');
  sheet.getRange(1,C.POST_S,1,5).merge().setValue('POST-LIVE CHECK')
    .setBackground(CLR.postHdr).setFontColor(CLR.postText).setFontWeight('bold');
  sheet.getRange(1,C.SCORE_BASE).setValue('Base\n(/14)')
    .setBackground(CLR.scoreBaseBg).setFontColor(CLR.infoText)
    .setFontWeight('bold').setFontSize(9).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(1,C.SCORE_BONUS).setValue('Bonus\n(/2)')
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(1,C.STATUS).setValue('Status')
    .setBackground('#444441').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // --- ROW 2: Sub-headers ---
  sheet.setRowHeight(2, 56);
  var subInfo = ['Date','Time','Producer','Brand','Senior\nPIC'];
  subInfo.forEach(function(h,i){
    sheet.getRange(2,1+i).setValue(h).setBackground(CLR.infoBg).setFontColor(CLR.infoText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var preItems = ['Artwork\ncorrect','Brief:\nPromotion','Brief:\nHero SKU','Brief:\nKey msg','Technical:\nVisual','Technical:\nAudio'];
  preItems.forEach(function(h,i){
    sheet.getRange(2,C.PRE_S+i).setValue(h).setBackground(CLR.preBg).setFontColor(CLR.preText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var durItems = ['ปักตะกร้าทัน\n(MC/ผู้ชม)','กดถูกใจ\n>1K/15min','Comment\nEngagement','ส่งข้อมูล\nDashboard','★ Creativity\n& Innovation'];
  durItems.forEach(function(h,i){
    var b=(i===4);
    sheet.getRange(2,C.DUR_S+i).setValue(h)
      .setBackground(b?CLR.bonusBg:CLR.durBg).setFontColor(b?CLR.bonusText:CLR.durText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var postItems = ['กรอก\nForm','ส่ง Dashboard\n→ GChat','จัดระเบียบ\nห้อง Live','ปิดอุปกรณ์\nทั้งหมด','★ Feedback\nwith Team'];
  postItems.forEach(function(h,i){
    var b=(i===4);
    sheet.getRange(2,C.POST_S+i).setValue(h)
      .setBackground(b?CLR.bonusBg:CLR.postBg).setFontColor(b?CLR.bonusText:CLR.postText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sheet.getRange(2,C.SCORE_BASE).setValue('Pass/14').setBackground(CLR.scoreBaseBg).setFontColor(CLR.infoText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2,C.SCORE_BONUS).setValue('Bonus/2').setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2,C.STATUS).setValue('Auto Status').setBackground('#444441').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // --- DATA ROWS (all N/A — first build, no existing data) ---
  var dataValues = sessionRows.map(function(s) {
    var dateStr  = (s[sc['Date']]     || '').toString().trim();
    var timeStr  = (s[sc['Time']]     || '').toString().trim();
    var producer = (s[sc['Producer']] || '').toString().trim();
    var brand    = (s[sc['Brand']]    || '').toString().trim();

    var dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) dateObj = dateStr;

    var row = new Array(C.TOTAL).fill('');
    row[0] = dateObj;
    row[1] = timeStr;
    row[2] = producer;
    row[3] = brand;
    row[4] = '';  // Senior PIC
    for (var ci = 1; ci <= 16; ci++) row[4 + ci] = 'N/A';
    return row;
  });

  sheet.getRange(DATA_START,1,nRows,C.TOTAL).setValues(dataValues);
  sheet.getRange(DATA_START,C.DATE,nRows,1).setNumberFormat('D MMMM YYYY');

  // --- SECTION COLORS ---
  sheet.getRange(DATA_START,C.SENIOR,nRows,1).setBackground(CLR.infoBg);
  sheet.getRange(DATA_START,C.PRE_S,nRows,6).setBackground(CLR.preBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(DATA_START,C.DUR_S,nRows,4).setBackground(CLR.durBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(DATA_START,C.DUR_BONUS,nRows,1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(DATA_START,C.POST_S,nRows,4).setBackground(CLR.postBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(DATA_START,C.POST_BONUS,nRows,1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(DATA_START,C.SCORE_BASE,nRows,1).setBackground(CLR.scoreBaseBg).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
  sheet.getRange(DATA_START,C.SCORE_BONUS,nRows,1).setBackground(CLR.bonusBg).setFontColor(CLR.bonusText).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);

  // --- SCORE + STATUS FORMULAS ---
  var formulas = sessionRows.map(function(_,idx){
    var r = DATA_START + idx;
    var base   = '=COUNTIF(F'+r+':K'+r+',"Pass")+COUNTIF(L'+r+':O'+r+',"Pass")+COUNTIF(Q'+r+':T'+r+',"Pass")';
    var bonus  = '=COUNTIF(P'+r+',"Pass")+COUNTIF(U'+r+',"Pass")';
    var status = '=IF(A'+r+'="","",IF(AND(E'+r+'<>"",V'+r+'>0),"Done ✅",IF(A'+r+'<TODAY(),"Overdue 🔴",IF(A'+r+'=TODAY(),"Pending 🟡","Upcoming ⬜"))))';
    return [base, bonus, status];
  });
  sheet.getRange(DATA_START,C.SCORE_BASE,nRows,3).setFormulas(formulas);
  sheet.getRange(DATA_START,C.STATUS,nRows,1).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);

  // --- DATA VALIDATION ---
  var passFail = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pass','Fail','N/A'],true).setAllowInvalid(false).build();
  var seniorDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(SENIOR_PRODUCERS,true).setAllowInvalid(false).build();
  sheet.getRange(DATA_START,C.PRE_S,nRows,16).setDataValidation(passFail);
  sheet.getRange(DATA_START,C.SENIOR,nRows,1).setDataValidation(seniorDV);

  // --- CONDITIONAL FORMATTING ---
  var checkRange = sheet.getRange(DATA_START,C.PRE_S,nRows,16);
  var cfPass = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Pass').setBackground(CLR.passBg).setFontColor(CLR.passText).setBold(true)
    .setRanges([checkRange]).build();
  var cfFail = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Fail').setBackground(CLR.failBg).setFontColor(CLR.failText).setBold(true)
    .setRanges([checkRange]).build();
  sheet.setConditionalFormatRules([cfPass, cfFail]);

  // --- COLUMN WIDTHS / FROZEN / FILTER ---
  sheet.setColumnWidth(C.DATE,100); sheet.setColumnWidth(C.TIME,105);
  sheet.setColumnWidth(C.PROD,85);  sheet.setColumnWidth(C.BRAND,105);
  sheet.setColumnWidth(C.SENIOR,85);
  for(var i=C.PRE_S;i<=C.PRE_E;i++) sheet.setColumnWidth(i,60);
  for(var i=C.DUR_S;i<=C.DUR_BONUS;i++) sheet.setColumnWidth(i,66);
  for(var i=C.POST_S;i<=C.POST_BONUS;i++) sheet.setColumnWidth(i,64);
  sheet.setColumnWidth(C.SCORE_BASE,58); sheet.setColumnWidth(C.SCORE_BONUS,58);
  sheet.setColumnWidth(C.STATUS,100);
  sheet.setRowHeights(DATA_START,nRows,28);
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(5);
  sheet.getRange(2,1,nRows+1,C.TOTAL).createFilter();

  uiAlert(
    '✅ Master Log สร้างเรียบร้อย (Fresh Build)!\n' +
    'Sessions: ' + nRows + '\n' +
    'กรอก Pass/Fail ได้ที่ Tab "' + MASTER_LOG_NAME + '"'
  );
}


// ============================================================
//  _appendNewSessionsToMasterLog(sheet, sessionRows, sc)
//  APPEND-ONLY — รับประกัน 0% data loss
//    - อ่าน keys ของ ML ที่มีอยู่
//    - เปรียบเทียบกับ Sessions tab
//    - append เฉพาะ session ใหม่ที่ไม่อยู่ใน ML
//    - ไม่แตะ row เดิมเลย (Pass/Fail/Senior PIC ปลอดภัย 100%)
// ============================================================
function _appendNewSessionsToMasterLog(sheet, sessionRows, sc) {
  var DATA_START = 3;
  var C = {
    DATE:1, TIME:2, PROD:3, BRAND:4, SENIOR:5,
    PRE_S:6, PRE_E:11,
    DUR_S:12, DUR_E:15, DUR_BONUS:16,
    POST_S:17, POST_E:20, POST_BONUS:21,
    SCORE_BASE:22, SCORE_BONUS:23, STATUS:24,
    TOTAL:24
  };

  var CLR = {
    infoBg:'#F1EFE8',
    preBg:'#E6F1FB', durBg:'#FAEEDA', postBg:'#EAF3DE',
    bonusBg:'#EEEDFE', bonusText:'#3C3489',
    scoreBaseBg:'#D3D1C7', naText:'#888780',
    passBg:'#E1F5EE', passText:'#0F6E56',
    failBg:'#FAECE7', failText:'#993C1D',
  };

  // อ่าน key เดิมทั้งหมดใน ML
  var existingKeys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= DATA_START) {
    var ex = sheet.getRange(DATA_START, 1, lastRow - DATA_START + 1, 4).getValues();
    ex.forEach(function(erow) {
      if (!erow[0]) return;
      var eDate = erow[0] instanceof Date
        ? formatDate(erow[0].getDate(), erow[0].getMonth() + 1, erow[0].getFullYear())
        : erow[0].toString().trim();
      var ekey = eDate + '|' + erow[1] + '|' + erow[2] + '|' + erow[3];
      existingKeys[ekey] = true;
    });
  }
  var existingCount = Object.keys(existingKeys).length;

  // คัดกรอง session ใหม่ที่ไม่อยู่ใน ML
  var newSessions = [];
  sessionRows.forEach(function(s) {
    var dateStr  = (s[sc['Date']]     || '').toString().trim();
    var timeStr  = (s[sc['Time']]     || '').toString().trim();
    var producer = (s[sc['Producer']] || '').toString().trim();
    var brand    = (s[sc['Brand']]    || '').toString().trim();
    if (!dateStr || !producer) return;

    var key = dateStr + '|' + timeStr + '|' + producer + '|' + brand;
    if (existingKeys[key]) return; // มีอยู่แล้ว — ข้าม

    newSessions.push({ dateStr: dateStr, timeStr: timeStr, producer: producer, brand: brand });
  });

  if (newSessions.length === 0) {
    uiAlert(
      '✅ Master Log ทันสมัยแล้ว — ไม่มี session ใหม่\n' +
      'Session เดิมทั้งหมด: ' + existingCount + ' (preserved 100%)'
    );
    return;
  }

  // ลบ filter เก่า (จะสร้างใหม่ครอบ range ที่ขยายแล้ว)
  var filter = sheet.getFilter();
  if (filter) filter.remove();

  // Append rows ต่อท้าย — Senior PIC ว่างไว้ ให้ Senior กรอกเองใน Today
  var appendStart = lastRow + 1;
  var nNew = newSessions.length;

  var appendValues = newSessions.map(function(s) {
    var dateObj = new Date(s.dateStr);
    if (isNaN(dateObj.getTime())) dateObj = s.dateStr;
    var row = new Array(C.TOTAL).fill('');
    row[0] = dateObj;
    row[1] = s.timeStr;
    row[2] = s.producer;
    row[3] = s.brand;
    row[4] = ''; // Senior PIC — Senior เลือกเองใน Today (Producer 1 คน Senior หลายคนได้)
    for (var ci = 1; ci <= 16; ci++) row[4 + ci] = 'N/A';
    return row;
  });

  sheet.getRange(appendStart, 1, nNew, C.TOTAL).setValues(appendValues);
  sheet.getRange(appendStart, C.DATE, nNew, 1).setNumberFormat('D MMMM YYYY');

  // Section colors เฉพาะ row ใหม่
  sheet.getRange(appendStart, C.SENIOR, nNew, 1).setBackground(CLR.infoBg);
  sheet.getRange(appendStart, C.PRE_S, nNew, 6).setBackground(CLR.preBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(appendStart, C.DUR_S, nNew, 4).setBackground(CLR.durBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(appendStart, C.DUR_BONUS, nNew, 1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(appendStart, C.POST_S, nNew, 4).setBackground(CLR.postBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(appendStart, C.POST_BONUS, nNew, 1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
  sheet.getRange(appendStart, C.SCORE_BASE, nNew, 1).setBackground(CLR.scoreBaseBg).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
  sheet.getRange(appendStart, C.SCORE_BONUS, nNew, 1).setBackground(CLR.bonusBg).setFontColor(CLR.bonusText).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);

  // Formulas เฉพาะ row ใหม่
  var formulas = newSessions.map(function(_, idx) {
    var r = appendStart + idx;
    var base   = '=COUNTIF(F'+r+':K'+r+',"Pass")+COUNTIF(L'+r+':O'+r+',"Pass")+COUNTIF(Q'+r+':T'+r+',"Pass")';
    var bonus  = '=COUNTIF(P'+r+',"Pass")+COUNTIF(U'+r+',"Pass")';
    var status = '=IF(A'+r+'="","",IF(AND(E'+r+'<>"",V'+r+'>0),"Done ✅",IF(A'+r+'<TODAY(),"Overdue 🔴",IF(A'+r+'=TODAY(),"Pending 🟡","Upcoming ⬜"))))';
    return [base, bonus, status];
  });
  sheet.getRange(appendStart, C.SCORE_BASE, nNew, 3).setFormulas(formulas);
  sheet.getRange(appendStart, C.STATUS, nNew, 1).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);

  // Data validation เฉพาะ row ใหม่
  var passFail = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pass','Fail','N/A'],true).setAllowInvalid(false).build();
  var seniorDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(SENIOR_PRODUCERS,true).setAllowInvalid(false).build();
  sheet.getRange(appendStart, C.PRE_S, nNew, 16).setDataValidation(passFail);
  sheet.getRange(appendStart, C.SENIOR, nNew, 1).setDataValidation(seniorDV);

  sheet.setRowHeights(appendStart, nNew, 28);

  // CF rules ครอบ range ทั้งหมด (รวม row ใหม่)
  var newLastRow = appendStart + nNew - 1;
  var totalDataRows = newLastRow - DATA_START + 1;
  var checkRange = sheet.getRange(DATA_START, C.PRE_S, totalDataRows, 16);
  var cfPass = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Pass').setBackground(CLR.passBg).setFontColor(CLR.passText).setBold(true)
    .setRanges([checkRange]).build();
  var cfFail = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Fail').setBackground(CLR.failBg).setFontColor(CLR.failText).setBold(true)
    .setRanges([checkRange]).build();
  sheet.setConditionalFormatRules([cfPass, cfFail]);

  // Recreate filter ครอบ range ที่ขยายแล้ว
  sheet.getRange(2, 1, totalDataRows + 1, C.TOTAL).createFilter();

  uiAlert(
    '✅ Master Log อัปเดต (APPEND-ONLY — ไม่ล้างข้อมูลเดิม)\n' +
    'Session ใหม่ที่ append: ' + nNew + '\n' +
    'Session เดิม preserve: ' + existingCount + ' (100%)'
  );
}


// ============================================================
//  refreshTodayView()
//  อ่าน Master Log → สร้าง Today sheet แบบ editable
//  Senior Producer กรอก Senior PIC + Pass/Fail ได้ที่นี่โดยตรง
//  onEdit จะ auto-sync กลับ Master Log ทันที
// ============================================================
function refreshTodayView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_LOG_NAME);
  if (!masterSheet) {
    uiAlert('❌ ไม่พบ Master Log\nกรุณากด "Build Master Log + Views" ก่อน');
    return;
  }

  var allData = masterSheet.getDataRange().getValues(); // formulas resolved
  var today   = new Date(); today.setHours(0,0,0,0);
  var tz      = Session.getScriptTimeZone();

  var todayRows = allData.slice(2).filter(function(row) {
    if (!row[0]) return false;
    var prod = (row[2] || '').toString().trim();
    if (EXCLUDED_PRODUCERS.indexOf(prod) > -1) return false;
    var d = row[0] instanceof Date ? new Date(row[0]) : new Date(row[0].toString());
    d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  });

  var sheet = ss.getSheetByName(TODAY_VIEW_NAME) || ss.insertSheet(TODAY_VIEW_NAME);
  sheetClearAll(sheet);

  var todayStr = Utilities.formatDate(today, tz, 'd MMMM yyyy');

  // Column layout (1-indexed):
  // 1=KEY(hidden) 2=Date 3=Time 4=Producer 5=Brand 6=Senior
  // 7-12=Pre6  13-16=DurBase4  17=DurBonus  18-21=PostBase4  22=PostBonus
  // 23=BaseScore  24=BonusScore  25=Status
  var TC = {
    KEY:1, DATE:2, TIME:3, PROD:4, BRAND:5, SENIOR:6,
    PRE_S:7,  PRE_E:12,
    DUR_S:13, DUR_E:16, DUR_BONUS:17,
    POST_S:18, POST_E:21, POST_BONUS:22,
    SCORE_BASE:23, SCORE_BONUS:24, STATUS:25,
    TOTAL:25
  };

  var CLR = {
    headerDark:'#2C2C2A', headerText:'#FFFFFF',
    infoBg:'#F1EFE8', infoText:'#2C2C2A',
    preHdr:'#B5D4F4', preBg:'#E6F1FB', preText:'#0C447C',
    durHdr:'#FAC775', durBg:'#FAEEDA', durText:'#412402',
    postHdr:'#C0DD97', postBg:'#EAF3DE', postText:'#173404',
    bonusBg:'#EEEDFE', bonusText:'#3C3489',
    scoreBaseBg:'#D3D1C7', naText:'#888780',
    passBg:'#E1F5EE', passText:'#0F6E56',
    failBg:'#FAECE7', failText:'#993C1D',
  };

  var DATA_START = 4; // rows 1-3 = headers, row 4+ = data

  // --- ROW 1: Title (ไม่ merge ข้ามทุก col — ป้องกัน setFrozenColumns error) ---
  sheet.setRowHeight(1, 38);
  sheet.getRange(1, 1, 1, TC.TOTAL)
    .setBackground(CLR.headerDark).setFontColor(CLR.headerText).setFontWeight('bold');
  sheet.getRange(1, 1)
    .setValue('🗓 Today — ' + todayStr + '   |   กรอก Senior PIC + Pass/Fail ได้ที่นี่โดยตรง (auto-sync → Master Log)')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');

  // --- ROW 2: Section headers ---
  sheet.setRowHeight(2, 30);
  sheet.getRange(2, 1, 1, TC.TOTAL)
    .setBackground(CLR.headerDark).setFontColor(CLR.headerText)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  // Session Info covers KEY+Date+Time+Producer+Brand+Senior (cols 1-6)
  sheet.getRange(2, TC.KEY, 1, 6).merge().setValue('Session Info');
  sheet.getRange(2, TC.PRE_S, 1, 6).merge().setValue('PRE-LIVE CHECK')
    .setBackground(CLR.preHdr).setFontColor(CLR.preText).setFontWeight('bold');
  sheet.getRange(2, TC.DUR_S, 1, 5).merge().setValue('DURING-LIVE CHECK')
    .setBackground(CLR.durHdr).setFontColor(CLR.durText).setFontWeight('bold');
  sheet.getRange(2, TC.POST_S, 1, 5).merge().setValue('POST-LIVE CHECK')
    .setBackground(CLR.postHdr).setFontColor(CLR.postText).setFontWeight('bold');
  sheet.getRange(2, TC.SCORE_BASE).setValue('Base\n(/14)')
    .setBackground(CLR.scoreBaseBg).setFontColor(CLR.infoText)
    .setFontWeight('bold').setFontSize(9).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2, TC.SCORE_BONUS).setValue('Bonus\n(/2)')
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(2, TC.STATUS).setValue('Status')
    .setBackground('#444441').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // --- ROW 3: Sub-headers ---
  sheet.setRowHeight(3, 52);
  var subInfo = ['Key','Date','Time','Producer','Brand','Senior\nPIC'];
  subInfo.forEach(function(h, i) {
    sheet.getRange(3, 1 + i).setValue(h)
      .setBackground(CLR.infoBg).setFontColor(CLR.infoText)
      .setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var preItems = ['Artwork\ncorrect','Brief:\nPromotion','Brief:\nHero SKU','Brief:\nKey msg','Technical:\nVisual','Technical:\nAudio'];
  preItems.forEach(function(h, i) {
    sheet.getRange(3, TC.PRE_S + i).setValue(h)
      .setBackground(CLR.preBg).setFontColor(CLR.preText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var durItems = ['ปักตะกร้าทัน\n(MC/ผู้ชม)','กดถูกใจ\n>1K/15min','Comment\nEngagement','ส่งข้อมูล\nDashboard','★ Creativity\n& Innovation'];
  durItems.forEach(function(h, i) {
    var isBonus = (i === 4);
    sheet.getRange(3, TC.DUR_S + i).setValue(h)
      .setBackground(isBonus ? CLR.bonusBg : CLR.durBg)
      .setFontColor(isBonus ? CLR.bonusText : CLR.durText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  var postItems = ['กรอก\nForm','ส่ง Dashboard\n→ GChat','จัดระเบียบ\nห้อง Live','ปิดอุปกรณ์\nทั้งหมด','★ Feedback\nwith Team'];
  postItems.forEach(function(h, i) {
    var isBonus = (i === 4);
    sheet.getRange(3, TC.POST_S + i).setValue(h)
      .setBackground(isBonus ? CLR.bonusBg : CLR.postBg)
      .setFontColor(isBonus ? CLR.bonusText : CLR.postText)
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  sheet.getRange(3, TC.SCORE_BASE).setValue('Pass/14')
    .setBackground(CLR.scoreBaseBg).setFontColor(CLR.infoText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(3, TC.SCORE_BONUS).setValue('Bonus/2')
    .setBackground(CLR.bonusBg).setFontColor(CLR.bonusText)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(3, TC.STATUS).setValue('Auto Status')
    .setBackground('#444441').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // --- DATA ROWS ---
  if (todayRows.length === 0) {
    sheet.getRange(DATA_START, 1, 1, TC.TOTAL).merge()
      .setValue('ไม่มี session สำหรับวันนี้')
      .setFontColor('#888780').setHorizontalAlignment('center').setFontSize(11);
  } else {
    var nRows = todayRows.length;

    // Build data values (cols 1-22; formulas added separately for 23-25)
    var dataValues = todayRows.map(function(r) {
      var dateVal = r[0] instanceof Date ? r[0] : new Date(r[0].toString());
      // FIX: ใช้ formatDate() helper (English names, locale-independent)
      // ให้ match กับ syncRowToMasterLog_ ที่ใช้ formatDate() เหมือนกัน
      var dateStr = r[0] instanceof Date
        ? formatDate(r[0].getDate(), r[0].getMonth() + 1, r[0].getFullYear())
        : r[0].toString().trim();
      var key = dateStr + '|' + r[1] + '|' + r[2] + '|' + r[3];
      var row = new Array(22).fill('');
      row[TC.KEY - 1]   = key;
      row[TC.DATE - 1]  = dateVal;
      row[TC.TIME - 1]  = r[1];
      row[TC.PROD - 1]  = r[2];
      row[TC.BRAND - 1] = r[3];
      row[TC.SENIOR - 1] = r[4];          // Senior PIC (preserved)
      for (var ci = 0; ci < 16; ci++) {
        row[TC.PRE_S - 1 + ci] = r[5 + ci]; // checklist 16 items (preserved)
      }
      return row;
    });
    sheet.getRange(DATA_START, 1, nRows, 22).setValues(dataValues);
    sheet.getRange(DATA_START, TC.DATE, nRows, 1).setNumberFormat('D MMMM YYYY');

    // Score + Status formulas
    var formulas = todayRows.map(function(_, idx) {
      var r = DATA_START + idx;
      var base   = '=COUNTIF(G' + r + ':L' + r + ',"Pass")+COUNTIF(M' + r + ':P' + r + ',"Pass")+COUNTIF(R' + r + ':U' + r + ',"Pass")';
      var bonus  = '=COUNTIF(Q' + r + ',"Pass")+COUNTIF(V' + r + ',"Pass")';
      var status = '=IF(B' + r + '="","",IF(AND(F' + r + '<>"",W' + r + '>0),"Done ✅",IF(B' + r + '<TODAY(),"Overdue 🔴",IF(B' + r + '=TODAY(),"Pending 🟡","Upcoming ⬜"))))';
      return [base, bonus, status];
    });
    sheet.getRange(DATA_START, TC.SCORE_BASE, nRows, 3).setFormulas(formulas);

    // Section colors
    sheet.getRange(DATA_START, TC.DATE,  nRows, 4).setBackground(CLR.infoBg);
    sheet.getRange(DATA_START, TC.SENIOR, nRows, 1).setBackground(CLR.infoBg);
    sheet.getRange(DATA_START, TC.PRE_S, nRows, 6).setBackground(CLR.preBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
    sheet.getRange(DATA_START, TC.DUR_S, nRows, 4).setBackground(CLR.durBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
    sheet.getRange(DATA_START, TC.DUR_BONUS, nRows, 1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
    sheet.getRange(DATA_START, TC.POST_S, nRows, 4).setBackground(CLR.postBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
    sheet.getRange(DATA_START, TC.POST_BONUS, nRows, 1).setBackground(CLR.bonusBg).setHorizontalAlignment('center').setFontColor(CLR.naText);
    sheet.getRange(DATA_START, TC.SCORE_BASE, nRows, 1).setBackground(CLR.scoreBaseBg).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
    sheet.getRange(DATA_START, TC.SCORE_BONUS, nRows, 1).setBackground(CLR.bonusBg).setFontColor(CLR.bonusText).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
    sheet.getRange(DATA_START, TC.STATUS, nRows, 1).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);

    // Data validation — Senior PIC + Pass/Fail dropdowns
    var passFail = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pass','Fail','N/A'], true).setAllowInvalid(false).build();
    var seniorDV = SpreadsheetApp.newDataValidation()
      .requireValueInList(SENIOR_PRODUCERS, true).setAllowInvalid(false).build();
    sheet.getRange(DATA_START, TC.SENIOR, nRows, 1).setDataValidation(seniorDV);
    sheet.getRange(DATA_START, TC.PRE_S, nRows, 16).setDataValidation(passFail);

    // Conditional formatting Pass/Fail
    var checkRange = sheet.getRange(DATA_START, TC.PRE_S, nRows, 16);
    var cfPass = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Pass').setBackground(CLR.passBg).setFontColor(CLR.passText).setBold(true)
      .setRanges([checkRange]).build();
    var cfFail = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Fail').setBackground(CLR.failBg).setFontColor(CLR.failText).setBold(true)
      .setRanges([checkRange]).build();
    sheet.setConditionalFormatRules([cfPass, cfFail]);

    // Row heights
    sheet.setRowHeights(DATA_START, nRows, 28);

    // Filter
    sheet.getRange(3, 1, nRows + 1, TC.TOTAL).createFilter();
  }

  // Column widths — พอดีตัวอักษร
  sheet.setColumnWidth(TC.KEY,    1);   // KEY hidden
  sheet.setColumnWidth(TC.DATE,   95);  // "17 May 2026"
  sheet.setColumnWidth(TC.TIME,   90);  // "10:00–13:00"
  sheet.setColumnWidth(TC.PROD,   90);  // ชื่อ Producer
  sheet.setColumnWidth(TC.BRAND,  100); // ชื่อ Brand
  sheet.setColumnWidth(TC.SENIOR, 80);  // Senior PIC dropdown
  // Pre-live 6 items (wrapped 2 lines)
  sheet.setColumnWidth(TC.PRE_S,     70);  // Artwork correct
  sheet.setColumnWidth(TC.PRE_S + 1, 72);  // Brief: Promotion
  sheet.setColumnWidth(TC.PRE_S + 2, 68);  // Brief: Hero SKU
  sheet.setColumnWidth(TC.PRE_S + 3, 68);  // Brief: Key msg
  sheet.setColumnWidth(TC.PRE_S + 4, 68);  // Technical: Visual
  sheet.setColumnWidth(TC.PRE_E,     68);  // Technical: Audio
  // During base 4 + bonus
  sheet.setColumnWidth(TC.DUR_S,     78);  // ปักตะกร้าทัน
  sheet.setColumnWidth(TC.DUR_S + 1, 74);  // กดถูกใจ >1K
  sheet.setColumnWidth(TC.DUR_S + 2, 74);  // Comment Engagement
  sheet.setColumnWidth(TC.DUR_E,     74);  // ส่งข้อมูล Dashboard
  sheet.setColumnWidth(TC.DUR_BONUS, 76);  // ★ Creativity
  // Post base 4 + bonus
  sheet.setColumnWidth(TC.POST_S,     64); // กรอก Form
  sheet.setColumnWidth(TC.POST_S + 1, 76); // ส่ง Dashboard → GChat
  sheet.setColumnWidth(TC.POST_S + 2, 74); // จัดระเบียบห้อง Live
  sheet.setColumnWidth(TC.POST_E,     72); // ปิดอุปกรณ์ทั้งหมด
  sheet.setColumnWidth(TC.POST_BONUS, 74); // ★ Feedback with Team
  // Summary
  sheet.setColumnWidth(TC.SCORE_BASE,  62);
  sheet.setColumnWidth(TC.SCORE_BONUS, 58);
  sheet.setColumnWidth(TC.STATUS,     105);

  // Row heights
  sheet.setRowHeight(3, 58); // sub-header row — ให้พอดี text 2 บรรทัด

  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(6); // freeze ถึง Senior PIC (cols 1-6 ไม่มี merge ข้าม → ไม่ error)
  sheet.hideColumns(TC.KEY, 1); // ซ่อน KEY column
}


// ============================================================
//  syncTodayToMasterLog()
//  Public — sync ทุก row ใน Today → Master Log (กด manual ได้)
// ============================================================
function syncTodayToMasterLog() {
  syncTodayToMasterLog_(true);
}

// ============================================================
//  syncTodayToMasterLog_(showAlert)
//  Private — sync ทุก row ใน Today → Master Log
//  Returns: { synced: N, failed: N, failedKeys: [...] }
// ============================================================
function syncTodayToMasterLog_(showAlert) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var todaySheet = ss.getSheetByName(TODAY_VIEW_NAME);
  if (!todaySheet) return { synced: 0, failed: 0, failedKeys: [] };
  var lastRow = todaySheet.getLastRow();
  if (lastRow < 4) return { synced: 0, failed: 0, failedKeys: [] };

  var synced = 0;
  var failedKeys = [];

  for (var r = 4; r <= lastRow; r++) {
    var result = syncRowToMasterLog_(todaySheet, r);
    if (result.ok) {
      synced++;
    } else if (result.reason) {
      failedKeys.push('row ' + r + ': ' + result.reason);
    }
  }

  if (showAlert) {
    var msg = '✅ Sync เสร็จ — อัปเดต ' + synced + ' sessions';
    if (failedKeys.length > 0) {
      msg += '\n\n⚠️ ไม่ได้ sync ' + failedKeys.length + ' row:\n' + failedKeys.slice(0, 5).join('\n');
      if (failedKeys.length > 5) msg += '\n... (อีก ' + (failedKeys.length - 5) + ' rows)';
    }
    uiAlert(msg);
  }

  return { synced: synced, failed: failedKeys.length, failedKeys: failedKeys };
}

// ============================================================
//  syncCellToMasterLog_(todaySheet, rowNum, todayCol, newValue)
//  ✨ NEW (race-safe): sync เฉพาะ cell ที่ user เพิ่งแก้จริง
//  → ไม่ทับ cell อื่นใน ML (เช่นที่ WebApp พึ่งบันทึก)
//
//  Today col → ML col mapping:
//    Today col 6 (Senior PIC) → ML col 5
//    Today col 7-22 (16 items) → ML col 6-21
// ============================================================
function syncCellToMasterLog_(todaySheet, rowNum, todayCol, newValue) {
  var key = todaySheet.getRange(rowNum, 1).getValue().toString().trim();
  if (!key) return { ok: false, reason: null };

  var mlCol = todayCol - 1; // Today col 6 → ML col 5, Today col 7 → ML col 6, …

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_LOG_NAME);
  if (!masterSheet) return { ok: false, reason: 'ML missing' };

  var mlData = masterSheet.getDataRange().getValues();
  for (var mi = 2; mi < mlData.length; mi++) {
    var mrow = mlData[mi];
    if (!mrow[0]) continue;
    var eDate = mrow[0] instanceof Date
      ? formatDate(mrow[0].getDate(), mrow[0].getMonth() + 1, mrow[0].getFullYear())
      : mrow[0].toString().trim();
    var mkey = eDate + '|' + mrow[1] + '|' + mrow[2] + '|' + mrow[3];
    if (mkey !== key) continue;

    // เขียน cell เดียว (mi+1 = sheet row, mlCol = sheet col)
    masterSheet.getRange(mi + 1, mlCol).setValue(newValue);
    return { ok: true, reason: null };
  }
  return { ok: false, reason: 'key not found in ML: ' + key.substring(0, 60) };
}


// ============================================================
//  syncRowToMasterLog_(todaySheet, rowNum)
//  (Legacy bulk sync — used by syncTodayToMasterLog_ manual button)
//  ✨ FIX: skip cells ที่ Today = N/A AND ML มีค่า Pass/Fail แล้ว
//  → กัน WebApp data หาย เมื่อ Today มี cache เก่า
// ============================================================
function syncRowToMasterLog_(todaySheet, rowNum) {
  var key = todaySheet.getRange(rowNum, 1).getValue().toString().trim();
  if (!key) return { ok: false, reason: null };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_LOG_NAME);
  if (!masterSheet) return { ok: false, reason: 'ML missing' };

  var mlData = masterSheet.getDataRange().getValues();

  for (var mi = 2; mi < mlData.length; mi++) {
    var mrow = mlData[mi];
    if (!mrow[0]) continue;
    var eDate = mrow[0] instanceof Date
      ? formatDate(mrow[0].getDate(), mrow[0].getMonth() + 1, mrow[0].getFullYear())
      : mrow[0].toString().trim();
    var mkey = eDate + '|' + mrow[1] + '|' + mrow[2] + '|' + mrow[3];
    if (mkey !== key) continue;

    // อ่าน Today col 6–22 (Senior + 16 items)
    var todayVals = todaySheet.getRange(rowNum, 6, 1, 17).getValues()[0];
    // อ่าน ML col 5–21 ปัจจุบัน
    var mlVals = mrow.slice(4, 21);

    // ✨ FIX: merge — keep ML value if Today value is N/A and ML has Pass/Fail
    var merged = todayVals.map(function(tVal, i) {
      var mVal = mlVals[i];
      var tStr = (tVal || '').toString();
      var mStr = (mVal || '').toString();
      // ถ้า Today = N/A และ ML = Pass/Fail → เก็บ ML ไว้ (อย่าทับ)
      if (tStr === 'N/A' && (mStr === 'Pass' || mStr === 'Fail')) {
        return mVal;
      }
      // ถ้า Today ว่างและ ML มีค่า → เก็บ ML
      if (!tStr && mStr) return mVal;
      return tVal;
    });

    masterSheet.getRange(mi + 1, 5, 1, 17).setValues([merged]);
    return { ok: true, reason: null };
  }

  return { ok: false, reason: 'key not found in ML: ' + key.substring(0, 60) };
}


// ============================================================
//  refreshOverdueView()
//  อ่าน Master Log → แสดง session ค้างที่ยังไม่กรอก
// ============================================================
function refreshOverdueView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_LOG_NAME);
  if (!masterSheet) return;

  var allData = masterSheet.getDataRange().getValues();
  var overdueRows = allData.slice(2).filter(function(row){
    var prod = (row[2] || '').toString().trim();
    if (EXCLUDED_PRODUCERS.indexOf(prod) > -1) return false; // ไม่แสดง TBCP/Cancel/Brand
    return (row[23] || '').toString().indexOf('Overdue') > -1;
  });

  var sheet = ss.getSheetByName(OVERDUE_VIEW_NAME) || ss.insertSheet(OVERDUE_VIEW_NAME);
  sheetClearAll(sheet);

  // Title
  sheet.setRowHeight(1, 36);
  var titleText = overdueRows.length > 0
    ? 'Overdue — ' + overdueRows.length + ' session ที่ยังไม่ได้กรอก  |  ไปกรอกที่ Tab "Master Log"'
    : 'Overdue Sessions';
  sheet.getRange(1,1,1,7).merge()
    .setValue(titleText)
    .setBackground('#A32D2D').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  // Header
  sheet.setRowHeight(2, 30);
  var headers = ['Date','Time','Producer','Brand','Senior PIC','Base Score (/14)','Status'];
  headers.forEach(function(h,i){
    sheet.getRange(2,1+i).setValue(h)
      .setBackground('#FAECE7').setFontColor('#712B13')
      .setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  if (overdueRows.length === 0) {
    sheet.getRange(3,1,1,7).merge()
      .setValue('ไม่มี session ค้าง 🎉')
      .setBackground('#EAF3DE').setFontColor('#0F6E56')
      .setFontWeight('bold').setHorizontalAlignment('center').setFontSize(13);
    sheet.setRowHeight(3, 50);
  } else {
    var tz = Session.getScriptTimeZone();
    var rowData = overdueRows.map(function(r){
      var dateDisp = r[0] instanceof Date
        ? Utilities.formatDate(r[0], tz, 'd MMMM yyyy') : r[0].toString();
      return [dateDisp, r[1], r[2], r[3], r[4], r[21], r[23]];
    });
    sheet.getRange(3,1,rowData.length,7).setValues(rowData);
    for(var ri=0;ri<rowData.length;ri++){
      var rowNum=3+ri;
      sheet.getRange(rowNum,1,1,7).setBackground('#FFF5F5').setFontSize(11).setHorizontalAlignment('center');
      sheet.getRange(rowNum,7).setBackground('#FAECE7').setFontColor('#712B13').setFontWeight('bold');
      sheet.setRowHeight(rowNum,30);
    }
    sheet.getRange(2,1,rowData.length+1,7).createFilter();
  }

  [100,110,90,110,90,110,105].forEach(function(w,i){ sheet.setColumnWidth(1+i,w); });
  sheet.setFrozenRows(2);
}


// ╔══════════════════════════════════════════════════════════════╗
// ║            DASHBOARD — WEEKLY & MONTHLY                     ║
// ╚══════════════════════════════════════════════════════════════╝

// ============================================================
//  DATE RANGE HELPERS
// ============================================================
function getWeekRange() {
  var today = new Date(); today.setHours(0,0,0,0);
  var day   = today.getDay();                   // 0=Sun, 1=Mon…
  var diff  = (day === 0) ? -6 : 1 - day;      // shift to Monday
  var mon   = new Date(today); mon.setDate(today.getDate() + diff);
  var sun   = new Date(mon);   sun.setDate(mon.getDate() + 6);
  sun.setHours(23,59,59,999);
  return { start: mon, end: sun };
}

function getPrevWeekRange() {
  var wr    = getWeekRange();
  var start = new Date(wr.start); start.setDate(start.getDate() - 7);
  var end   = new Date(wr.end);   end.setDate(end.getDate()   - 7);
  return { start: start, end: end };
}

function getMonthRange() {
  var today = new Date();
  var start = new Date(today.getFullYear(), today.getMonth(), 1);
  var end   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return { start: start, end: end };
}

function getPrevMonthRange() {
  var today = new Date();
  var start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  var end   = new Date(today.getFullYear(), today.getMonth(), 0);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return { start: start, end: end };
}

// 2 สัปดาห์ก่อนหน้า (ใช้เป็น trend comparison ของ Weekly)
function getPrevPrevWeekRange() {
  var pwr   = getPrevWeekRange();
  var start = new Date(pwr.start); start.setDate(start.getDate() - 7);
  var end   = new Date(pwr.end);   end.setDate(end.getDate()   - 7);
  return { start: start, end: end };
}

// 2 เดือนก่อนหน้า (ใช้เป็น trend comparison ของ Monthly)
function getPrevPrevMonthRange() {
  var today = new Date();
  var start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  var end   = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return { start: start, end: end };
}


// ============================================================
//  AGGREGATE DATA FROM MASTER LOG
//  Returns null if Master Log not found
//  Returns object: { producers, seniors, totalSessions,
//                    checklistNames, bonusNames }
// ============================================================
function aggregateFromMasterLog(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName(MASTER_LOG_NAME);
  if (!masterSheet) return null;

  var allData = masterSheet.getDataRange().getValues(); // formulas resolved
  var rows    = allData.slice(2);  // skip 2 header rows

  // Master Log column indices (0-based after getValues):
  // 0=Date, 1=Time, 2=Producer, 3=Brand, 4=Senior
  // 5-10 = Pre  6 items
  // 11-14 = During base 4 items
  // 15 = During bonus ★
  // 16-19 = Post base 4 items
  // 20 = Post bonus ★
  // 21=BaseScore, 22=BonusScore, 23=Status

  var BASE_IDX  = [5,6,7,8,9,10, 11,12,13,14, 16,17,18,19]; // 14 items
  var BONUS_IDX = [15, 20];

  var CHECKLIST_NAMES = [
    'Artwork','Brief:\nPromo','Brief:\nHero','Brief:\nKey Msg','Tech:\nVisual','Tech:\nAudio',
    'ปักตะกร้า','ถูกใจ\n>1K','Comment\nEngagement','ส่งข้อมูล\nDashboard',
    'กรอก\nForm','ส่ง Dashboard\n→GChat','จัดระเบียบ\nห้อง','ปิดอุปกรณ์',
  ];
  var BONUS_NAMES = ['★ Creativity','★ Feedback'];

  var producers     = {};
  var seniors       = {};
  var totalSessions = 0;

  rows.forEach(function(row) {
    if (!row[0] && !row[2]) return;

    var rowDate = row[0] instanceof Date ? new Date(row[0]) : new Date(row[0].toString());
    if (isNaN(rowDate.getTime())) return;
    rowDate.setHours(0,0,0,0);
    if (rowDate < startDate || rowDate > endDate) return;

    var producer = (row[2] || '').toString().trim();
    var senior   = (row[4] || '').toString().trim();
    if (!producer) return;
    if (EXCLUDED_PRODUCERS.indexOf(producer) > -1) return; // ไม่นับ TBCP/Cancel/Brand

    var status    = (row[23] || '').toString();
    var isDone    = status.indexOf('Done')    > -1;
    var isOverdue = status.indexOf('Overdue') > -1;
    var baseScore  = Number(row[21]) || 0;
    var bonusScore = Number(row[22]) || 0;

    totalSessions++;

    if (!producers[producer]) {
      producers[producer] = {
        sessions: 0, evaluated: 0, overdue: 0,
        baseScoreSum: 0, bonusScoreSum: 0,
        checkPass:  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        checkTotal: [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        bonusPass:  [0,0],
        bonusTotal: [0,0],
        prePasses: 0, preTotals: 0,
        durPasses: 0, durTotals: 0,
        postPasses: 0, postTotals: 0,
      };
    }
    var p = producers[producer];
    p.sessions++;
    if (senior)    p.evaluated++;
    if (isOverdue) p.overdue++;
    if (isDone || senior) {
      p.baseScoreSum  += baseScore;
      p.bonusScoreSum += bonusScore;
    }

    BASE_IDX.forEach(function(ci, i) {
      var v = (row[ci] || '').toString().trim();
      if (v === 'N/A') return;
      p.checkTotal[i]++;
      if (v === 'Pass') p.checkPass[i]++;
    });
    BONUS_IDX.forEach(function(ci, bi) {
      var v = (row[ci] || '').toString().trim();
      if (v === 'N/A') return;
      p.bonusTotal[bi]++;
      if (v === 'Pass') p.bonusPass[bi]++;
    });

    var pi; var pv;
    for (pi=0;pi<6;pi++){pv=(row[5+pi]||'').toString();if(pv!=='N/A'){p.preTotals++;if(pv==='Pass')p.prePasses++;}}
    for (pi=0;pi<4;pi++){pv=(row[11+pi]||'').toString();if(pv!=='N/A'){p.durTotals++;if(pv==='Pass')p.durPasses++;}}
    for (pi=0;pi<4;pi++){pv=(row[16+pi]||'').toString();if(pv!=='N/A'){p.postTotals++;if(pv==='Pass')p.postPasses++;}}

    // Senior accountability
    if (senior) {
      if (!seniors[senior]) seniors[senior] = { assigned: 0, evaluated: 0, overdue: 0 };
      seniors[senior].assigned++;
      if (isDone)    seniors[senior].evaluated++;
      if (isOverdue) seniors[senior].overdue++;
    }
  });

  return {
    producers:      producers,
    seniors:        seniors,
    totalSessions:  totalSessions,
    checklistNames: CHECKLIST_NAMES,
    bonusNames:     BONUS_NAMES,
  };
}


// ============================================================
//  DASHBOARD HELPERS
// ============================================================
function getAvgPassRate(pd) {
  var total  = pd.preTotals  + pd.durTotals  + pd.postTotals;
  var passes = pd.prePasses  + pd.durPasses  + pd.postPasses;
  return total > 0 ? passes / total : NaN;
}

function heatmapBg(rate) {
  if (rate === null || isNaN(rate)) return '#E8E8E8';
  if (rate >= 0.90) return '#1A7A5E';
  if (rate >= 0.75) return '#76C59E';
  if (rate >= 0.60) return '#FAC775';
  if (rate >= 0.45) return '#F09251';
  return '#D65A3B';
}

function heatmapFg(rate) {
  if (rate === null || isNaN(rate)) return '#888888';
  if (rate >= 0.75) return '#FFFFFF';
  if (rate >= 0.60) return '#2C2C2A';
  return '#FFFFFF';
}

function pct(rate) {
  return isNaN(rate) || rate === null ? 'N/A' : Math.round(rate * 100) + '%';
}


// ============================================================
//  buildWeeklyDashboard()
// ============================================================
function buildWeeklyDashboard() {
  // อ้างอิง "สัปดาห์ที่แล้ว" เสมอ → trigger วันจันทร์ก็ถูกต้อง ไม่ขึ้น 0 sessions
  var pwr  = getPrevWeekRange();      // main: สัปดาห์ที่แล้ว (จันทร์–อาทิตย์)
  var ppwr = getPrevPrevWeekRange();  // trend: 2 สัปดาห์ก่อน (เพื่อเปรียบเทียบ)
  var tz   = Session.getScriptTimeZone();
  var label = 'Week: ' +
    Utilities.formatDate(pwr.start, tz, 'd MMM') + ' – ' +
    Utilities.formatDate(pwr.end,   tz, 'd MMM yyyy');

  var agg     = aggregateFromMasterLog(pwr.start,  pwr.end);
  var prevAgg = aggregateFromMasterLog(ppwr.start, ppwr.end);
  if (!agg) { uiAlert('❌ ไม่พบ Master Log\nกรุณากด "Build Master Log + Views" ก่อน'); return; }

  buildDashboard(label, agg, prevAgg, WEEKLY_DASH_NAME);
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WEEKLY_DASH_NAME).activate();
  uiAlert('✅ Weekly Dashboard สร้างเรียบร้อย!\nTab: "' + WEEKLY_DASH_NAME + '"');
}


// ============================================================
//  buildMonthlyDashboard()
// ============================================================
function buildMonthlyDashboard() {
  // อ้างอิง "เดือนที่แล้ว" เสมอ → trigger วันที่ 1 ของเดือนใหม่ก็ถูกต้อง ไม่ขึ้น 0 sessions
  var pmr  = getPrevMonthRange();      // main: เดือนที่แล้ว
  var ppmr = getPrevPrevMonthRange();  // trend: 2 เดือนก่อน
  var tz   = Session.getScriptTimeZone();
  var label = Utilities.formatDate(pmr.start, tz, 'MMMM yyyy');

  var agg     = aggregateFromMasterLog(pmr.start,  pmr.end);
  var prevAgg = aggregateFromMasterLog(ppmr.start, ppmr.end);
  if (!agg) { uiAlert('❌ ไม่พบ Master Log\nกรุณากด "Build Master Log + Views" ก่อน'); return; }

  buildDashboard(label, agg, prevAgg, MONTHLY_DASH_NAME);
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MONTHLY_DASH_NAME).activate();
  uiAlert('✅ Monthly Dashboard สร้างเรียบร้อย!\nTab: "' + MONTHLY_DASH_NAME + '"');
}


// ============================================================
//  buildDashboard() — shared engine for weekly + monthly
//
//  Layout (rows):
//   1   Title bar
//   2   Period + refresh timestamp
//   3   [spacer]
//   4-5 KPI boxes (4 metrics, each 4 cols wide, 16 total)
//   6   [spacer]
//   7   Leaderboard section header
//   8   Leaderboard column headers
//   9+  Leaderboard data (1 row per producer)
//   +2  Heatmap section header
//   +1  Heatmap item labels
//   +N  Heatmap data rows
//   +1  Heatmap legend
//   +2  Senior Accountability section header + sub-header
//   +S  Senior rows (1 per senior)
//   +2  Threshold Alert section
//   +A  Alert rows (producers below threshold)
// ============================================================
function buildDashboard(periodLabel, agg, prevAgg, sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheetClearAll(sheet); // BUG FIX: removes filter + CF before clear

  var tz  = Session.getScriptTimeZone();
  var now = Utilities.formatDate(new Date(), tz, 'd MMM yyyy, HH:mm');

  // Total columns: 17
  // Leaderboard: cols A-K (11) → Rank|Producer|Sessions|Eval|AvgPass%|Pre%|Dur%|Post%|Bonus|Trend|Status
  // Heatmap:     cols A-Q (17) → Producer|Pre×6|Dur×4|DurBonus|Post×4|PostBonus
  var TOTAL_COLS = 17;

  // Sort producers by avg pass rate desc
  var prodList = Object.keys(agg.producers).sort(function(a, b) {
    var ra = getAvgPassRate(agg.producers[a]);
    var rb = getAvgPassRate(agg.producers[b]);
    if (isNaN(ra) && isNaN(rb)) return 0;
    if (isNaN(ra)) return 1;
    if (isNaN(rb)) return -1;
    return rb - ra;
  });
  var nProd = prodList.length;

  // Compute KPI values
  var totalSess    = agg.totalSessions;
  var overdueCount = 0, belowThreshold = 0;
  var passRateSum  = 0, passRateCount  = 0;
  prodList.forEach(function(p) {
    var pd   = agg.producers[p];
    var rate = getAvgPassRate(pd);
    overdueCount += pd.overdue;
    if (!isNaN(rate)) { passRateSum += rate; passRateCount++; }
    if (!isNaN(rate) && rate < ALERT_THRESHOLD) belowThreshold++;
  });
  var avgPassRate = passRateCount > 0 ? passRateSum / passRateCount : NaN;

  // ── Row positions ──
  var R_TITLE   = 1;
  var R_PERIOD  = 2;
  var R_KPI_H   = 4;
  var R_KPI_V   = 5;
  var R_LB_HDR  = 7;
  var R_LB_COL  = 8;
  var R_LB_DAT  = 9;
  var R_LB_END  = R_LB_DAT + Math.max(nProd, 1) - 1;
  var R_HM_HDR  = R_LB_END + 3;
  var R_HM_LBL  = R_HM_HDR + 1;
  var R_HM_DAT  = R_HM_LBL + 1;
  var R_HM_END  = R_HM_DAT + Math.max(nProd, 1) - 1;
  var R_LEGEND  = R_HM_END + 1;
  var R_SR_HDR  = R_LEGEND + 2;
  var R_SR_COL  = R_SR_HDR + 1;
  var R_SR_DAT  = R_SR_COL + 1;
  var R_AL_HDR  = R_SR_DAT + SENIOR_PRODUCERS.length + 2;
  var R_AL_COL  = R_AL_HDR + 1;
  var R_AL_DAT  = R_AL_COL + 1;

  // ──────────────────────────────────────────────
  //  TITLE + PERIOD
  // ──────────────────────────────────────────────
  sheet.setRowHeight(R_TITLE, 42);
  sheet.getRange(R_TITLE, 1, 1, TOTAL_COLS).merge()
    .setValue('📊  Moderator Performance Dashboard')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  sheet.setRowHeight(R_PERIOD, 26);
  sheet.getRange(R_PERIOD, 1, 1, TOTAL_COLS).merge()
    .setValue('📅  ' + periodLabel + '     |     🔄 Last refreshed: ' + now)
    .setBackground('#2C2C2A').setFontColor('#BBBBBB')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ──────────────────────────────────────────────
  //  KPI BOXES
  // ──────────────────────────────────────────────
  var apRate = isNaN(avgPassRate) ? 0 : avgPassRate;
  var kpis = [
    {
      label: '📋  Total Sessions',
      value: totalSess,
      bg:    '#1E3A5F', fg: '#7FB3E8',
    },
    {
      label: '🎯  Avg Pass Rate',
      value: isNaN(avgPassRate) ? 'N/A' : Math.round(avgPassRate * 100) + '%',
      bg:    apRate >= 0.75 ? '#0F3D2B' : apRate >= 0.60 ? '#3D2E08' : '#3D1212',
      fg:    apRate >= 0.75 ? '#76C59E' : apRate >= 0.60 ? '#FAC775' : '#F09251',
    },
    {
      label: '🔴  Overdue Sessions',
      value: overdueCount,
      bg:    overdueCount > 0 ? '#3D1212' : '#0F3D2B',
      fg:    overdueCount > 0 ? '#F09251' : '#76C59E',
    },
    {
      label: '⚠️  Producers Below 60%',
      value: belowThreshold,
      bg:    belowThreshold > 0 ? '#3D1212' : '#0F3D2B',
      fg:    belowThreshold > 0 ? '#F09251' : '#76C59E',
    },
  ];

  sheet.setRowHeight(R_KPI_H, 22);
  sheet.setRowHeight(R_KPI_V, 50);

  kpis.forEach(function(kpi, i) {
    var startCol = 1 + i * 4;
    var span     = (i < 3) ? 4 : TOTAL_COLS - 12; // last box fills remaining
    sheet.getRange(R_KPI_H, startCol, 1, span).merge()
      .setValue(kpi.label)
      .setBackground(kpi.bg).setFontColor(kpi.fg)
      .setFontSize(9).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(R_KPI_V, startCol, 1, span).merge()
      .setValue(kpi.value)
      .setBackground(kpi.bg).setFontColor(kpi.fg)
      .setFontSize(24).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  // ──────────────────────────────────────────────
  //  PRODUCER LEADERBOARD
  // ──────────────────────────────────────────────
  sheet.setRowHeight(R_LB_HDR, 30);
  sheet.getRange(R_LB_HDR, 1, 1, TOTAL_COLS).merge()
    .setValue('  📋  Producer Leaderboard — เรียงตาม Avg Pass Rate (สูง → ต่ำ)')
    .setBackground('#1E3A6E').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  // Column headers
  var lbHdrs   = ['#','Producer','Sessions','Eval','Avg Pass%','Pre %','Dur %','Post %','Bonus','Trend','Status'];
  var lbWidths = [32, 105, 68, 55, 82, 62, 62, 62, 55, 72, 100];
  sheet.setRowHeight(R_LB_COL, 26);
  lbHdrs.forEach(function(h, i) {
    sheet.getRange(R_LB_COL, 1+i)
      .setValue(h)
      .setBackground('#2E5CA8').setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setColumnWidth(1+i, lbWidths[i]);
  });

  if (nProd === 0) {
    sheet.setRowHeight(R_LB_DAT, 30);
    sheet.getRange(R_LB_DAT, 1, 1, 11).merge()
      .setValue('ไม่มีข้อมูลในช่วงเวลานี้ — กรอก Pass/Fail ใน Master Log ก่อนนะครับ')
      .setFontColor('#888780').setHorizontalAlignment('center').setFontSize(11);
  } else {
    sheet.setRowHeights(R_LB_DAT, nProd, 28);
    var lbValues   = [];
    var lbMetadata = [];

    prodList.forEach(function(pName, idx) {
      var pd      = agg.producers[pName];
      var rate    = getAvgPassRate(pd);
      var preRate = pd.preTotals  > 0 ? pd.prePasses  / pd.preTotals  : NaN;
      var durRate = pd.durTotals  > 0 ? pd.durPasses  / pd.durTotals  : NaN;
      var postRate= pd.postTotals > 0 ? pd.postPasses / pd.postTotals : NaN;

      // Trend vs previous period
      var trend = '—';
      if (prevAgg && prevAgg.producers[pName]) {
        var prevRate = getAvgPassRate(prevAgg.producers[pName]);
        if (!isNaN(rate) && !isNaN(prevRate)) {
          var diff = Math.round((rate - prevRate) * 100);
          trend = diff > 1 ? '↑ +' + diff + '%' : diff < -1 ? '↓ ' + diff + '%' : '→ 0%';
        }
      }

      // Status badge
      var badge = isNaN(rate) ? '❓ No Data'
        : rate >= 0.90 ? '🏆 Excellent'
        : rate >= 0.75 ? '✅ Good'
        : rate >= 0.60 ? '⚠️ At Risk'
        : '🔴 Below 60%';

      lbValues.push([
        idx + 1, pName,
        pd.sessions, pd.evaluated,
        pct(rate), pct(preRate), pct(durRate), pct(postRate),
        pd.bonusScoreSum,
        trend, badge,
      ]);
      lbMetadata.push({ rate: rate, trend: trend, badge: badge });
    });

    sheet.getRange(R_LB_DAT, 1, nProd, 11).setValues(lbValues)
      .setFontSize(10).setVerticalAlignment('middle');

    prodList.forEach(function(_, idx) {
      var meta   = lbMetadata[idx];
      var rowNum = R_LB_DAT + idx;
      var rowBg  = idx % 2 === 0 ? '#F0F4FB' : '#FFFFFF';
      sheet.getRange(rowNum, 1, 1, 11)
        .setBackground(rowBg).setHorizontalAlignment('center');
      sheet.getRange(rowNum, 2).setHorizontalAlignment('left');

      // Avg Pass Rate cell
      var r = meta.rate;
      if (!isNaN(r)) {
        var rb = r>=0.75?'#E1F5EE':r>=0.60?'#FAEEDA':'#FAECE7';
        var rf = r>=0.75?'#0F6E56':r>=0.60?'#633806':'#712B13';
        sheet.getRange(rowNum, 5).setBackground(rb).setFontColor(rf).setFontWeight('bold');
      }
      // Pre / Dur / Post cells
      [6,7,8].forEach(function(c, si) {
        var sRate = si===0?(agg.producers[prodList[idx]].preTotals>0?agg.producers[prodList[idx]].prePasses/agg.producers[prodList[idx]].preTotals:NaN)
                  :si===1?(agg.producers[prodList[idx]].durTotals>0?agg.producers[prodList[idx]].durPasses/agg.producers[prodList[idx]].durTotals:NaN)
                  :(agg.producers[prodList[idx]].postTotals>0?agg.producers[prodList[idx]].postPasses/agg.producers[prodList[idx]].postTotals:NaN);
        if (!isNaN(sRate)) {
          sheet.getRange(rowNum, c)
            .setBackground(heatmapBg(sRate))
            .setFontColor(heatmapFg(sRate));
        }
      });
      // Trend cell
      var tr = meta.trend;
      if (tr.indexOf('↑') > -1) sheet.getRange(rowNum,10).setFontColor('#0F6E56').setFontWeight('bold');
      else if (tr.indexOf('↓') > -1) sheet.getRange(rowNum,10).setFontColor('#993C1D').setFontWeight('bold');
      // Badge cell
      var bg2 = meta.badge.indexOf('🏆')>-1?'#E1F5EE':meta.badge.indexOf('✅')>-1?'#EAF3DE':meta.badge.indexOf('⚠️')>-1?'#FAEEDA':'#FAECE7';
      var fg2 = meta.badge.indexOf('🏆')>-1?'#0F3D2B':meta.badge.indexOf('✅')>-1?'#173404':meta.badge.indexOf('⚠️')>-1?'#412402':'#712B13';
      sheet.getRange(rowNum, 11).setBackground(bg2).setFontColor(fg2).setFontWeight('bold');
    });
  }

  // ──────────────────────────────────────────────
  //  CHECKLIST HEATMAP
  //  Col layout (1-based): 1=Producer, 2-7=Pre(6), 8-11=Dur(4), 12=DurBonus,
  //                        13-16=Post(4), 17=PostBonus
  // ──────────────────────────────────────────────
  sheet.setRowHeight(R_HM_HDR, 30);
  sheet.getRange(R_HM_HDR, 1, 1, TOTAL_COLS).merge()
    .setValue('  🔥  Checklist Heatmap — Pass Rate ต่อ Item (สี: 🟢≥90  🟩≥75  🟡≥60  🟠≥45  🔴<45  ⬜N/A)')
    .setBackground('#4A2D6B').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  // Heatmap column headers
  var hmNames = ['Producer'].concat(agg.checklistNames).concat(agg.bonusNames);
  // hmNames length = 1 + 14 + 2 = 17 ✓
  // But we need to insert DurBonus after index 10 (i.e., after 4 Dur items), and PostBonus at end
  // Actual order per col: [Producer, Pre×6, DurBase×4, DurBonus★, Post×4, PostBonus★]
  var hmSectionBgs = ['#F1EFE8',
    '#B5D4F4','#B5D4F4','#B5D4F4','#B5D4F4','#B5D4F4','#B5D4F4',   // Pre 6
    '#FAC775','#FAC775','#FAC775','#FAC775',                          // Dur base 4
    '#EEEDFE',                                                         // Dur bonus
    '#C0DD97','#C0DD97','#C0DD97','#C0DD97',                          // Post 4
    '#EEEDFE',                                                         // Post bonus
  ];
  var hmSectionFgs = ['#2C2C2A',
    '#0C447C','#0C447C','#0C447C','#0C447C','#0C447C','#0C447C',
    '#412402','#412402','#412402','#412402',
    '#3C3489',
    '#173404','#173404','#173404','#173404',
    '#3C3489',
  ];

  // Rearrange hmNames to match column order
  // checklistNames[0-5]=Pre, [6-9]=DurBase, [10-13]=PostBase; bonusNames[0]=DurBonus, [1]=PostBonus
  var hmLabels = [
    'Producer',
    agg.checklistNames[0], agg.checklistNames[1], agg.checklistNames[2],
    agg.checklistNames[3], agg.checklistNames[4], agg.checklistNames[5],
    agg.checklistNames[6], agg.checklistNames[7], agg.checklistNames[8], agg.checklistNames[9],
    agg.bonusNames[0],
    agg.checklistNames[10], agg.checklistNames[11], agg.checklistNames[12], agg.checklistNames[13],
    agg.bonusNames[1],
  ];

  sheet.setRowHeight(R_HM_LBL, 56);
  hmLabels.forEach(function(name, i) {
    var col = 1 + i;
    sheet.getRange(R_HM_LBL, col)
      .setValue(name)
      .setBackground(hmSectionBgs[i]).setFontColor(hmSectionFgs[i])
      .setFontWeight('bold').setFontSize(8)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    sheet.setColumnWidth(col, i === 0 ? 100 : 58);
  });

  if (nProd === 0) {
    sheet.setRowHeight(R_HM_DAT, 30);
    sheet.getRange(R_HM_DAT, 1, 1, TOTAL_COLS).merge()
      .setValue('ไม่มีข้อมูล').setFontColor('#888780').setHorizontalAlignment('center');
  } else {
    sheet.setRowHeights(R_HM_DAT, nProd, 28);
    prodList.forEach(function(pName, idx) {
      var pd     = agg.producers[pName];
      var rowNum = R_HM_DAT + idx;
      var rowBg  = idx % 2 === 0 ? '#F7F7F7' : '#FFFFFF';

      // Producer name
      sheet.getRange(rowNum, 1).setValue(pName)
        .setBackground(rowBg).setFontWeight('bold').setFontSize(10)
        .setHorizontalAlignment('left').setVerticalAlignment('middle');

      // Helper: fill a heatmap cell
      function fillHM(col, total, pass) {
        var rate  = total > 0 ? pass / total : null;
        var label = (rate === null) ? '—' : Math.round(rate * 100) + '%';
        sheet.getRange(rowNum, col).setValue(label)
          .setBackground(heatmapBg(rate)).setFontColor(heatmapFg(rate))
          .setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
      }

      // Pre items → cols 2-7 (checkPass[0-5], checkTotal[0-5])
      for (var i=0;i<6;i++)  fillHM(2+i,    pd.checkTotal[i],   pd.checkPass[i]);
      // Dur base → cols 8-11 (checkPass[6-9], checkTotal[6-9])
      for (var i=0;i<4;i++)  fillHM(8+i,    pd.checkTotal[6+i], pd.checkPass[6+i]);
      // Dur bonus → col 12
      fillHM(12, pd.bonusTotal[0], pd.bonusPass[0]);
      // Post base → cols 13-16 (checkPass[10-13], checkTotal[10-13])
      for (var i=0;i<4;i++)  fillHM(13+i,   pd.checkTotal[10+i],pd.checkPass[10+i]);
      // Post bonus → col 17
      fillHM(17, pd.bonusTotal[1], pd.bonusPass[1]);
    });
  }

  // Heatmap legend
  sheet.setRowHeight(R_LEGEND, 20);
  sheet.getRange(R_LEGEND, 1).setValue('Legend:')
    .setFontWeight('bold').setFontSize(8).setVerticalAlignment('middle');
  var legendItems = [
    {l:'≥90% Excellent',bg:'#1A7A5E',fg:'#FFFFFF'},
    {l:'75-89% Good',   bg:'#76C59E',fg:'#1A1A1A'},
    {l:'60-74% At Risk',bg:'#FAC775',fg:'#1A1A1A'},
    {l:'45-59% Weak',   bg:'#F09251',fg:'#FFFFFF'},
    {l:'<45% Critical', bg:'#D65A3B',fg:'#FFFFFF'},
    {l:'— No data',     bg:'#E8E8E8',fg:'#888888'},
  ];
  legendItems.forEach(function(item, i) {
    sheet.getRange(R_LEGEND, 2+i).setValue(item.l)
      .setBackground(item.bg).setFontColor(item.fg)
      .setFontSize(8).setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  // ──────────────────────────────────────────────
  //  SENIOR ACCOUNTABILITY
  // ──────────────────────────────────────────────
  sheet.setRowHeight(R_SR_HDR, 30);
  sheet.getRange(R_SR_HDR, 1, 1, TOTAL_COLS).merge()
    .setValue('  👤  Senior Producer Accountability — ความรับผิดชอบในการ Evaluate')
    .setBackground('#1A4A2C').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  var srHdrs = ['Senior PIC','Assigned\nSessions','Evaluated\n(Done ✅)','Overdue 🔴\n(ยังไม่กรอก)','Eval Rate','Remark'];
  var srBgH  = ['#1A4A2C','#1E3A5F','#0F3D2B','#3D1212','#2A3A1A','#3A3A2A'];
  sheet.setRowHeight(R_SR_COL, 30);
  srHdrs.forEach(function(h, i) {
    sheet.getRange(R_SR_COL, 1+i).setValue(h)
      .setBackground(srBgH[i]).setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });

  sheet.setRowHeights(R_SR_DAT, SENIOR_PRODUCERS.length, 34);
  SENIOR_PRODUCERS.forEach(function(sName, idx) {
    var sd       = agg.seniors[sName] || { assigned: 0, evaluated: 0, overdue: 0 };
    var evalRate = sd.assigned > 0 ? sd.evaluated / sd.assigned : NaN;
    var notEval  = sd.assigned - sd.evaluated;
    var remark   = isNaN(evalRate) ? 'ยังไม่มี session ที่ assign'
      : evalRate >= 0.90 ? '⭐ ดีมาก! ประเมินครบ'
      : evalRate >= 0.70 ? '✅ ดี ยังขาดอีก ' + notEval + ' sessions'
      : '⚠️ ขาดการประเมิน ' + notEval + ' sessions — ควรติดตาม';

    var rowNum = R_SR_DAT + idx;
    var rowBg  = idx % 2 === 0 ? '#EAF3DE' : '#F4FAF0';
    var rowData = [sName, sd.assigned, sd.evaluated, sd.overdue, pct(evalRate), remark];
    sheet.getRange(rowNum, 1, 1, 6).setValues([rowData])
      .setBackground(rowBg).setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(rowNum, 1).setFontWeight('bold').setHorizontalAlignment('left');
    sheet.getRange(rowNum, 6).setFontSize(9).setHorizontalAlignment('left');

    // Eval Rate color
    var erbg = isNaN(evalRate)?'#E8E8E8':evalRate>=0.90?'#E1F5EE':evalRate>=0.70?'#FAEEDA':'#FAECE7';
    var erfg = isNaN(evalRate)?'#888888':evalRate>=0.90?'#0F6E56':evalRate>=0.70?'#633806':'#712B13';
    sheet.getRange(rowNum, 5).setBackground(erbg).setFontColor(erfg).setFontWeight('bold');
    // Overdue color
    if (sd.overdue > 0) sheet.getRange(rowNum, 4).setFontColor('#993C1D').setFontWeight('bold');
  });

  // Senior col widths
  [100, 85, 90, 90, 75, 220].forEach(function(w,i){ sheet.setColumnWidth(1+i, w); });

  // ──────────────────────────────────────────────
  //  THRESHOLD ALERT
  // ──────────────────────────────────────────────
  var belowList = prodList.filter(function(p) {
    var r = getAvgPassRate(agg.producers[p]);
    return !isNaN(r) && r < ALERT_THRESHOLD;
  });

  sheet.setRowHeight(R_AL_HDR, 30);
  if (belowList.length > 0) {
    sheet.getRange(R_AL_HDR, 1, 1, TOTAL_COLS).merge()
      .setValue('  ⚠️  Performance Alert — Producer ที่ต่ำกว่าเกณฑ์ ' + Math.round(ALERT_THRESHOLD*100) + '%  (ควรได้รับ coaching ทันที)')
      .setBackground('#7A1515').setFontColor('#FFD0D0')
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    var alHdrs = ['Producer','Avg Pass%','Sessions','Pre%','During%','Post%','Weakest Item','Suggested Action'];
    var alBgH  = ['#5E1515','#5E1515','#3D1212','#3D1212','#3D1212','#3D1212','#5E1515','#1A1A1A'];
    sheet.setRowHeight(R_AL_COL, 26);
    alHdrs.forEach(function(h, i) {
      sheet.getRange(R_AL_COL, 1+i).setValue(h)
        .setBackground(alBgH[i]).setFontColor('#FFD0D0')
        .setFontWeight('bold').setFontSize(9)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
    });

    sheet.setRowHeights(R_AL_DAT, belowList.length, 30);
    belowList.forEach(function(pName, idx) {
      var pd     = agg.producers[pName];
      var rate   = getAvgPassRate(pd);
      var preR   = pd.preTotals  > 0 ? pd.prePasses  / pd.preTotals  : NaN;
      var durR   = pd.durTotals  > 0 ? pd.durPasses  / pd.durTotals  : NaN;
      var postR  = pd.postTotals > 0 ? pd.postPasses / pd.postTotals : NaN;

      // Find weakest checklist item
      var weakestItem = '—'; var weakestRate = 1;
      var checkLabels = agg.checklistNames;
      pd.checkTotal.forEach(function(t, i) {
        if (t > 0) {
          var r2 = pd.checkPass[i] / t;
          if (r2 < weakestRate) { weakestRate = r2; weakestItem = checkLabels[i]; }
        }
      });

      var action = rate < 0.45
        ? 'เร่ง coaching ทันที + ติดตามทุกวัน'
        : rate < 0.55
        ? 'นัด 1-on-1 เพื่อหาสาเหตุ'
        : 'ติดตาม 1-2 สัปดาห์ + ให้ feedback';

      var rowNum = R_AL_DAT + idx;
      sheet.getRange(rowNum, 1, 1, 8).setValues([[
        pName, pct(rate), pd.sessions,
        pct(preR), pct(durR), pct(postR),
        weakestItem.replace(/\n/g,' '), action,
      ]]).setBackground('#FFF5F5').setFontSize(10)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
      sheet.getRange(rowNum, 1).setFontWeight('bold').setHorizontalAlignment('left');
      sheet.getRange(rowNum, 2).setBackground('#FAECE7').setFontColor('#712B13').setFontWeight('bold');
      sheet.getRange(rowNum, 8).setHorizontalAlignment('left').setFontSize(9);
    });

    // Alert col widths
    [105,75,65,65,65,65,120,200].forEach(function(w,i){ sheet.setColumnWidth(1+i, w); });

  } else {
    sheet.getRange(R_AL_HDR, 1, 1, TOTAL_COLS).merge()
      .setValue('  ✅  ทุก Producer ผ่านเกณฑ์ 60% — ไม่มี Performance Alert สัปดาห์นี้ 🎉')
      .setBackground('#0F3D2B').setFontColor('#76C59E')
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  // ──────────────────────────────────────────────
  //  FREEZE TOP ROWS
  // ──────────────────────────────────────────────
  sheet.setFrozenRows(2);
  SpreadsheetApp.flush();
}


// ╔══════════════════════════════════════════════════════════════╗
// ║            HISTORY SNAPSHOT + PRODUCER SCORE CARDS          ║
// ╚══════════════════════════════════════════════════════════════╝

// ============================================================
//  captureHistorySnapshot()
//  บันทึก snapshot ของ week ปัจจุบัน ลง Tab "History"
//  เรียกทุกต้นสัปดาห์ หรือหลัง Weekly Dashboard เพื่อ track trend
// ============================================================
function captureHistorySnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var wr  = getWeekRange();
  var tz  = Session.getScriptTimeZone();
  var label = 'Week ' +
    Utilities.formatDate(wr.start, tz, 'd MMM') + '–' +
    Utilities.formatDate(wr.end,   tz, 'd MMM yyyy');

  var agg = aggregateFromMasterLog(wr.start, wr.end);
  if (!agg) { uiAlert('❌ ไม่พบ Master Log'); return; }

  var histSheet = ss.getSheetByName(HISTORY_TAB_NAME);
  var isNew     = !histSheet;
  if (isNew) histSheet = ss.insertSheet(HISTORY_TAB_NAME);

  var lastRow = histSheet.getLastRow();

  // Write headers if sheet is new or empty
  if (lastRow === 0) {
    var hdrs = [
      'Snapshot Date','Period','Producer',
      'Sessions','Evaluated','Overdue',
      'Avg Pass%','Pre%','During%','Post%',
      'Base Score Total','Bonus Total',
    ];
    histSheet.getRange(1, 1, 1, hdrs.length).setValues([hdrs])
      .setBackground('#2C2C2A').setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');
    lastRow = 1;
  }

  var snapDate  = Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm');
  var newRows   = [];

  Object.keys(agg.producers).sort().forEach(function(pName) {
    var pd      = agg.producers[pName];
    var rate    = getAvgPassRate(pd);
    var preRate = pd.preTotals  > 0 ? pd.prePasses  / pd.preTotals  : NaN;
    var durRate = pd.durTotals  > 0 ? pd.durPasses  / pd.durTotals  : NaN;
    var postRate= pd.postTotals > 0 ? pd.postPasses / pd.postTotals : NaN;
    newRows.push([
      snapDate, label, pName,
      pd.sessions, pd.evaluated, pd.overdue,
      pct(rate), pct(preRate), pct(durRate), pct(postRate),
      pd.baseScoreSum, pd.bonusScoreSum,
    ]);
  });

  if (newRows.length > 0) {
    var startRow = lastRow + 1;
    histSheet.getRange(startRow, 1, newRows.length, 12).setValues(newRows);
    // Stripe rows
    newRows.forEach(function(_, ri) {
      var bg = (startRow + ri) % 2 === 0 ? '#F7F7F7' : '#FFFFFF';
      histSheet.getRange(startRow + ri, 1, 1, 12).setBackground(bg).setFontSize(10);
    });
    // Column widths
    [130, 170, 90, 65, 75, 65, 70, 65, 70, 65, 90, 75].forEach(function(w,i){
      histSheet.setColumnWidth(1+i, w);
    });
    histSheet.setFrozenRows(1);
  }

  uiAlert(
    '✅ บันทึก History Snapshot เรียบร้อย!\n' +
    'Period: ' + label + '\n' +
    'Producers: ' + newRows.length + ' คน\n' +
    'Tab: "' + HISTORY_TAB_NAME + '"'
  );
}


// ============================================================
//  buildProducerScoreCards()
//  สร้าง Tab แยกต่อหาก per Producer (ดึงจาก History tab)
//  Tab ชื่อ "Scorecard: <ProducerName>"
// ============================================================
function buildProducerScoreCards() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var histSheet = ss.getSheetByName(HISTORY_TAB_NAME);
  if (!histSheet) {
    uiAlert(
      '❌ ไม่พบ Tab "' + HISTORY_TAB_NAME + '"\n' +
      'กรุณากด "Capture History Snapshot" อย่างน้อย 1 ครั้งก่อน');
    return;
  }

  var histData = histSheet.getDataRange().getValues();
  if (histData.length < 2) {
    uiAlert('⚠️ History tab ว่างเปล่า กรุณา Capture ก่อน');
    return;
  }

  // Group rows by producer name (col index 2)
  var byProducer = {};
  histData.slice(1).forEach(function(row) {
    var pName = (row[2] || '').toString().trim();
    if (!pName) return;
    if (!byProducer[pName]) byProducer[pName] = [];
    byProducer[pName].push(row);
  });

  var producers = Object.keys(byProducer).sort();
  var created   = [];

  producers.forEach(function(pName) {
    var tabName = SCORECARD_PREFIX + pName;
    var card    = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    card.clear();
    var oldRules = card.getConditionalFormatRules();
    if (oldRules.length) card.setConditionalFormatRules([]);

    var rows = byProducer[pName]; // sorted by insertion (oldest first)

    // Title
    card.setRowHeight(1, 38);
    card.getRange(1, 1, 1, 9).merge()
      .setValue('📊  Score Card: ' + pName + '  |  Performance History')
      .setBackground('#1A1A1A').setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(14)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Summary stats (latest snapshot)
    var latest = rows[rows.length - 1];
    card.setRowHeight(2, 24);
    var summaryText = '📅 Latest: ' + latest[1] +
      '   |   Sessions: ' + latest[3] +
      '   |   Avg Pass: ' + latest[6] +
      '   |   Pre: ' + latest[7] +
      '   |   During: ' + latest[8] +
      '   |   Post: ' + latest[9];
    card.getRange(2, 1, 1, 9).merge()
      .setValue(summaryText)
      .setBackground('#2C2C2A').setFontColor('#BBBBBB')
      .setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Column headers
    card.setRowHeight(3, 26);
    var hdrs = ['Period','Sessions','Eval','Overdue','Avg Pass%','Pre%','During%','Post%','Trend'];
    var hBgs = ['#2C4A7C','#1E3A5F','#0F3D2B','#3D1212','#1A3A1A','#0C447C','#412402','#173404','#2A2A3A'];
    hdrs.forEach(function(h, i) {
      card.getRange(3, 1+i).setValue(h)
        .setBackground(hBgs[i]).setFontColor('#FFFFFF')
        .setFontWeight('bold').setFontSize(9)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
    });

    // Data rows with trend calculation
    var DATA_START = 4;
    card.setRowHeights(DATA_START, rows.length, 28);

    var cardData = rows.map(function(row, ri) {
      var rateStr = (row[6] || '').toString();
      var rateNum = rateStr ? parseInt(rateStr) : null;
      var trend   = '—';
      if (ri > 0) {
        var prevStr = (rows[ri-1][6] || '').toString();
        var prevNum = prevStr ? parseInt(prevStr) : null;
        if (rateNum !== null && prevNum !== null) {
          var diff = rateNum - prevNum;
          trend = diff > 1 ? '↑ +' + diff + '%' : diff < -1 ? '↓ ' + diff + '%' : '→ 0%';
        }
      }
      return [row[1], row[3], row[4], row[5], row[6], row[7], row[8], row[9], trend];
    });

    card.getRange(DATA_START, 1, cardData.length, 9).setValues(cardData)
      .setFontSize(10).setVerticalAlignment('middle');

    cardData.forEach(function(row, ri) {
      var rowNum = DATA_START + ri;
      var bg     = ri % 2 === 0 ? '#F7F7F7' : '#FFFFFF';
      card.getRange(rowNum, 1, 1, 9).setBackground(bg).setHorizontalAlignment('center');

      // Avg Pass Rate color
      var rStr = (row[4] || '').toString();
      var rNum = rStr ? parseInt(rStr) : null;
      if (rNum !== null) {
        var rb = rNum>=75?'#E1F5EE':rNum>=60?'#FAEEDA':'#FAECE7';
        var rf = rNum>=75?'#0F6E56':rNum>=60?'#633806':'#712B13';
        card.getRange(rowNum, 5).setBackground(rb).setFontColor(rf).setFontWeight('bold');
      }
      // Trend color
      var tr = (row[8] || '').toString();
      if (tr.indexOf('↑') > -1) card.getRange(rowNum, 9).setFontColor('#0F6E56').setFontWeight('bold');
      else if (tr.indexOf('↓') > -1) card.getRange(rowNum, 9).setFontColor('#993C1D').setFontWeight('bold');
      // Overdue
      if (Number(row[3]) > 0) card.getRange(rowNum, 4).setFontColor('#993C1D').setFontWeight('bold');
    });

    // Column widths
    [170, 65, 55, 65, 80, 65, 75, 65, 75].forEach(function(w,i){
      card.setColumnWidth(1+i, w);
    });
    card.setFrozenRows(3);

    created.push(pName);
  });

  uiAlert(
    '✅ Score Cards สร้างเรียบร้อย!\n' +
    created.length + ' Producers: ' + created.join(', ') + '\n\n' +
    'Tab ชื่อ "' + SCORECARD_PREFIX + '<ชื่อ>"'
  );
}
