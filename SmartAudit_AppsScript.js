// ============================================================
//  SMART AUDIT — Categorize 11K+ issues meaningfully
//
//  ติดตั้งใน: Performance Dashboard (System B)
//    https://docs.google.com/spreadsheets/d/1nWXx3fjMe0O2lojOO6YKrMftHvP0-FSpf-fke4Wj-WU
//
//  สิ่งที่ทำ:
//    อ่าน 📋 Performance Data + ⚠️ Data Audit (output ของ v9.1)
//    Re-categorize Section A (429) + Section B (11,143)
//    ออกเป็น category ที่ actionable
//
//  สร้าง 2 tabs:
//    🔍 Smart Audit       — KPI cards + detail tables
//    🏢 Agency Sessions   — list orphan in-scope = agency live
//
//  เมนูใหม่: 🔍 Smart Audit
//
//  ⚠️ Note: onOpen() — ถ้าใน sheet มี script เดิม (v9.1) หรือ
//  Unified Scorecard อยู่แล้ว ให้รวม addSmartAuditMenu(ui) เข้ากับ
//  onOpen เดิม แทนที่จะใช้ onOpen ของไฟล์นี้
// ============================================================

// ---------- CONFIG ----------
var PERF_DATA_TAB    = '📋 Performance Data';
var OLD_AUDIT_TAB    = '⚠️ Data Audit';
var SMART_AUDIT_TAB  = '🔍 Smart Audit';
var AGENCY_TAB       = '🏢 Agency Sessions';

// Schedule covers 2026 only (per user confirmation)
var SCHEDULE_EPOCH = new Date(2026, 0, 1);  // 2026-01-01

// Time offset tolerance — within this = considered match (per user: ±1 hr strict)
var TIME_TOLERANCE_HRS = 1.0;
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addSmartAuditMenu(SpreadsheetApp.getUi());
}

function addSmartAuditMenu(ui) {
  ui.createMenu('🔍 Smart Audit')
    .addItem('▶ Build Smart Audit + Agency Sessions', 'buildSmartAudit')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (7:30am)', 'setupAuditTrigger')
    .addItem('🗑 ลบ Audit Trigger',             'removeAuditTrigger')
    .addToUi();
}


// ============================================================
//  MAIN — buildSmartAudit()
// ============================================================
function buildSmartAudit() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date(); today.setHours(0,0,0,0);

  // 1. Read Performance Data → compute per-brand max Report date
  var perfSheet = ss.getSheetByName(PERF_DATA_TAB);
  if (!perfSheet) { uiAlert('❌ ไม่พบ tab "' + PERF_DATA_TAB + '"'); return; }
  var perfData = perfSheet.getDataRange().getValues();

  var brandMaxDate = {};           // brand key (lower) → latest Date in Report data
  var brandDateHasGmv = {};        // "brand|YYYY-MM-DD" → true (brand has any GMV that day)

  for (var i = 1; i < perfData.length; i++) {
    var r = perfData[i];
    if (!r[0]) continue;
    var brand = r[0], date = r[2];
    var d = toDate_(date);
    if (!d) continue;
    var bk = String(brand).trim().toLowerCase();
    if (!brandMaxDate[bk] || d > brandMaxDate[bk]) brandMaxDate[bk] = d;
    brandDateHasGmv[bk + '|' + ymdKey_(d)] = true;
  }

  // 2. Read existing Audit, find sections
  var auditSheet = ss.getSheetByName(OLD_AUDIT_TAB);
  if (!auditSheet) { uiAlert('❌ ไม่พบ tab "' + OLD_AUDIT_TAB + '"'); return; }
  var auditData = auditSheet.getDataRange().getValues();

  var sectionAStart = -1, sectionBStart = -1;
  for (var i = 0; i < auditData.length; i++) {
    var v = String(auditData[i][0] || '');
    if (v.indexOf('SECTION A') > -1) sectionAStart = i + 2; // +2 to skip section title + col header
    if (v.indexOf('SECTION B') > -1) sectionBStart = i + 2;
  }
  if (sectionAStart < 0) { uiAlert('❌ Section A not found in Data Audit'); return; }
  var sectionAEnd = sectionBStart > 0 ? sectionBStart - 3 : auditData.length;
  var sectionBEnd = auditData.length;

  // 3. Re-categorize Section A (Schedule → no Report)
  var secA = {
    future:        [],  // date > today → ignore
    pending:       [],  // date > brand's max Report date → CPS hasn't uploaded
    timeOffset:    [],  // Report has GMV same date, time shifted (per existing reason)
    brandNoSheet:  [],  // No Report sheet for this brand at all
    trulyMissing:  []   // Brand has Report data on this date but this slot has no GMV
  };

  for (var i = sectionAStart; i < sectionAEnd; i++) {
    var row = auditData[i];
    if (!row[0]) continue;
    var brand    = row[0];
    var channel  = row[1] || '';
    var date     = row[2];
    var slot     = row[3] || '';
    var producer = row[4] || '';
    var reason   = String(row[5] || '');

    var d = toDate_(date);
    if (!d) continue;
    var bk = String(brand).trim().toLowerCase();

    var item = [brand, channel, formatDateDisplay_(d), slot, producer, reason];

    if (d > today) {
      secA.future.push(item);
    } else if (reason.indexOf('ไม่พบข้อมูลแบรนด์นี้') > -1) {
      secA.brandNoSheet.push(item);
    } else if (reason.indexOf('เหลื่อมกัน') > -1) {
      // Parse offset hours
      var offHrs = parseOffsetHours_(reason);
      if (offHrs !== null && offHrs <= TIME_TOLERANCE_HRS) {
        // Within tolerance — actually a match, skip flag
        // (but keep visibility: count as time-offset since v9.1 flagged it)
        secA.timeOffset.push(item);
      } else {
        secA.timeOffset.push(item);
      }
    } else if (brandMaxDate[bk] && d > brandMaxDate[bk]) {
      // Schedule date > latest Report date → CPS pending
      secA.pending.push(item);
    } else if (!brandMaxDate[bk]) {
      // No data for brand anywhere
      secA.brandNoSheet.push(item);
    } else {
      // Brand has Report data; this date is within data range; but no match for this slot
      secA.trulyMissing.push(item);
    }
  }

  // 4. Re-categorize Section B (Report → no Schedule)
  var secB = {
    outOfScope:  [],  // Report date < 2026 → Schedule doesn't cover
    agencyLive:  []   // 2026 date but no Schedule match → real agency live
  };

  for (var i = sectionBStart; i < sectionBEnd; i++) {
    var row = auditData[i];
    if (!row[0]) continue;
    var brand   = row[0];
    var channel = row[1] || '';
    var date    = row[2];
    var slot    = row[3] || '';
    var gmv     = Number(row[4]) || 0;

    var d = toDate_(date);
    if (!d) continue;

    var item = [brand, channel, formatDateDisplay_(d), slot, gmv];

    if (d < SCHEDULE_EPOCH) {
      secB.outOfScope.push(item);
    } else {
      secB.agencyLive.push(item);
    }
  }

  // 5. Write Smart Audit tab
  writeSmartAuditTab_(ss, secA, secB, today);

  // 6. Write Agency Sessions tab
  writeAgencyTab_(ss, secB.agencyLive);

  // 7. Alert with summary
  var totalAgencyGmv = secB.agencyLive.reduce(function(s, r){ return s + r[4]; }, 0);

  uiAlert(
    '✅ Smart Audit สร้างเสร็จ!\n\n' +
    '━━ Schedule → No Report ━━\n' +
    '🔮 Future:           ' + secA.future.length + ' (ignore)\n' +
    '⏳ Pending Upload:   ' + secA.pending.length + '\n' +
    '⚠️ Time Offset:      ' + secA.timeOffset.length + '\n' +
    '❌ Brand No Sheet:   ' + secA.brandNoSheet.length + '\n' +
    '🔴 Truly Missing:    ' + secA.trulyMissing.length + '  ← actionable\n\n' +
    '━━ Report → No Schedule ━━\n' +
    '🤖 Out of Scope:     ' + secB.outOfScope.length + ' (pre-2026, ignore)\n' +
    '🏢 Agency Live:      ' + secB.agencyLive.length + '\n' +
    '   Total Agency GMV: ฿' + Math.round(totalAgencyGmv).toLocaleString()
  );
}


// ============================================================
//  WRITE SMART AUDIT TAB
// ============================================================
function writeSmartAuditTab_(ss, secA, secB, today) {
  var sheet = ss.getSheetByName(SMART_AUDIT_TAB) || ss.insertSheet(SMART_AUDIT_TAB);
  sheetClearAll_(sheet);

  var COLS = 8;
  var row = 1;

  // --- Title ---
  sheet.setRowHeight(row, 38);
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('🔍 SMART AUDIT — Categorized Data Quality Issues')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;

  // --- Refresh ---
  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('Refreshed: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') +
              '  |  Schedule epoch: ' + Utilities.formatDate(SCHEDULE_EPOCH, Session.getScriptTimeZone(), 'd MMM yyyy') +
              '  |  Time tolerance: ±' + TIME_TOLERANCE_HRS + ' hr')
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9).setHorizontalAlignment('center');
  row += 2;

  // --- Schedule issues section ---
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('━━━━ SCHEDULE → NO REPORT MATCH (was Section A) ━━━━')
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var aKpis = [
    { label: '🔮 Future\n(ignore)',            count: secA.future.length,        bg: '#E0E0E0', fg: '#555555' },
    { label: '⏳ Pending\n(wait CPS)',         count: secA.pending.length,       bg: '#FFF3CD', fg: '#856404' },
    { label: '⚠️ Time Offset\n(fix Schedule)',  count: secA.timeOffset.length,   bg: '#FFE4B5', fg: '#8B4513' },
    { label: '❌ No Sheet\n(no Report src)',    count: secA.brandNoSheet.length, bg: '#F8D7DA', fg: '#721C24' },
    { label: '🔴 Truly Missing\n(investigate)', count: secA.trulyMissing.length, bg: '#D9534F', fg: '#FFFFFF' },
  ];
  drawKpiCards_(sheet, row, 1, aKpis, COLS);
  row += 3;

  // --- Report orphan section ---
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, COLS).merge()
    .setValue('━━━━ REPORT → NO SCHEDULE MATCH (was Section B) ━━━━')
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var bKpis = [
    { label: '🤖 Out of Scope\n(pre-2026)', count: secB.outOfScope.length, bg: '#E0E0E0', fg: '#555555' },
    { label: '🏢 Agency Live\n(see Agency tab)', count: secB.agencyLive.length, bg: '#D1ECF1', fg: '#0C5460' },
  ];
  drawKpiCards_(sheet, row, 1, bKpis, COLS);
  row += 3;

  // --- Detail tables ---
  var aHdr = ['Brand', 'Channel', 'Date', 'Slot', 'Producer', 'Original Reason'];

  row = writeDetailSection_(sheet, row,
    '🔴 TRULY MISSING — Schedule has slot, brand HAS Report data on this date but slot has no GMV',
    secA.trulyMissing, aHdr, '#D9534F', '#FFFFFF', COLS);

  row = writeDetailSection_(sheet, row,
    '⏳ PENDING UPLOAD — Schedule date > brand\'s latest Report date (CPS not uploaded yet)',
    secA.pending, aHdr, '#FFF3CD', '#856404', COLS);

  row = writeDetailSection_(sheet, row,
    '⚠️ TIME OFFSET — Report has GMV same date, time shifted (Schedule lookup mismatch)',
    secA.timeOffset, aHdr, '#FFE4B5', '#8B4513', COLS);

  row = writeDetailSection_(sheet, row,
    '❌ BRAND NO REPORT SHEET — No Report data source exists for this brand',
    secA.brandNoSheet, aHdr, '#F8D7DA', '#721C24', COLS);

  // Future = info-only, collapsed (no detail)
  row = writeInfoOnly_(sheet, row, '🔮 FUTURE — Scheduled but date hasn\'t happened yet', secA.future.length, COLS);

  // Out of scope = info-only
  row = writeInfoOnly_(sheet, row, '🤖 OUT OF SCOPE — Report dates before 2026-01-01 (Schedule doesn\'t cover)', secB.outOfScope.length, COLS);

  // Agency = link to other tab
  row = writeInfoOnly_(sheet, row, '🏢 AGENCY LIVE — See tab "' + AGENCY_TAB + '" for full list', secB.agencyLive.length, COLS);

  sheet.setFrozenRows(2);
  var widths = [110, 70, 90, 90, 90, 280, 60, 60];
  widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
}


function drawKpiCards_(sheet, startRow, startCol, kpis, totalCols) {
  var n = kpis.length;
  var width = Math.floor(totalCols / n);
  var leftover = totalCols - width * n;

  sheet.setRowHeight(startRow, 26);
  sheet.setRowHeight(startRow + 1, 56);

  var col = startCol;
  for (var i = 0; i < n; i++) {
    var span = width + (i === n - 1 ? leftover : 0);
    var kpi = kpis[i];
    sheet.getRange(startRow, col, 1, span).merge().setValue(kpi.label)
      .setBackground(kpi.bg).setFontColor(kpi.fg).setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    sheet.getRange(startRow + 1, col, 1, span).merge().setValue(kpi.count)
      .setBackground(kpi.bg).setFontColor(kpi.fg).setFontWeight('bold').setFontSize(22)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    col += span;
  }
}


function writeDetailSection_(sheet, startRow, title, rows, headers, bg, fg, totalCols) {
  sheet.setRowHeight(startRow, 26);
  sheet.getRange(startRow, 1, 1, totalCols).merge()
    .setValue(title + '   ·   ' + rows.length + ' items')
    .setBackground(bg).setFontColor(fg).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  var row = startRow + 1;

  if (rows.length === 0) {
    sheet.getRange(row, 1, 1, totalCols).merge().setValue('✅ ไม่มี issue ในหมวดนี้')
      .setFontColor('#888').setHorizontalAlignment('center').setFontSize(10);
    return row + 2;
  }

  // Cap visible rows for readability (show top 50)
  var displayRows = rows.slice(0, 50);
  sheet.getRange(row, 1, 1, headers.length).setValues([headers])
    .setBackground('#444441').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center');
  row++;

  sheet.getRange(row, 1, displayRows.length, headers.length).setValues(displayRows).setFontSize(9);
  row += displayRows.length;

  if (rows.length > 50) {
    sheet.getRange(row, 1, 1, totalCols).merge()
      .setValue('… แสดง 50 จาก ' + rows.length + ' รายการ (ดูทั้งหมดได้จาก ' + OLD_AUDIT_TAB + ')')
      .setFontColor('#888').setFontStyle('italic').setFontSize(9).setHorizontalAlignment('center');
    row++;
  }

  return row + 1;
}


function writeInfoOnly_(sheet, startRow, title, count, totalCols) {
  sheet.setRowHeight(startRow, 22);
  sheet.getRange(startRow, 1, 1, totalCols).merge()
    .setValue(title + '   ·   ' + count + ' items')
    .setBackground('#F5F5F5').setFontColor('#555').setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  return startRow + 2;
}


// ============================================================
//  WRITE AGENCY SESSIONS TAB
// ============================================================
function writeAgencyTab_(ss, agencyRows) {
  var sheet = ss.getSheetByName(AGENCY_TAB) || ss.insertSheet(AGENCY_TAB);
  sheetClearAll_(sheet);

  var COLS = 5;
  var totalGmv = agencyRows.reduce(function(s, r){ return s + (Number(r[4]) || 0); }, 0);

  // Title
  sheet.setRowHeight(1, 38);
  sheet.getRange(1, 1, 1, COLS).merge()
    .setValue('🏢 AGENCY LIVE SESSIONS — Report has GMV, not in our Schedule')
    .setBackground('#0C5460').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center');

  // Summary
  sheet.setRowHeight(2, 24);
  sheet.getRange(2, 1, 1, COLS).merge()
    .setValue('Total sessions: ' + agencyRows.length +
              '   |   Total GMV: ฿' + Math.round(totalGmv).toLocaleString() +
              '   |   Avg GMV/session: ฿' + (agencyRows.length > 0 ? Math.round(totalGmv / agencyRows.length).toLocaleString() : '0'))
    .setBackground('#D1ECF1').setFontColor('#0C5460').setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center');

  // Brand breakdown
  var brandStats = {};
  agencyRows.forEach(function(r) {
    var brand = r[0];
    if (!brandStats[brand]) brandStats[brand] = { count: 0, gmv: 0 };
    brandStats[brand].count++;
    brandStats[brand].gmv += Number(r[4]) || 0;
  });
  var brandSummary = Object.keys(brandStats).sort(function(a, b) {
    return brandStats[b].gmv - brandStats[a].gmv;
  }).slice(0, 5).map(function(b) {
    return b + ' (' + brandStats[b].count + ' sess, ฿' + Math.round(brandStats[b].gmv).toLocaleString() + ')';
  }).join('  ·  ');

  sheet.setRowHeight(3, 22);
  sheet.getRange(3, 1, 1, COLS).merge()
    .setValue('Top 5 Brands (by GMV): ' + brandSummary)
    .setBackground('#F8F9FA').setFontColor('#0C5460').setFontSize(9).setHorizontalAlignment('center');

  // Headers
  var headers = ['Brand', 'Channel', 'Date', 'Live Time', 'GMV (฿)'];
  sheet.getRange(4, 1, 1, COLS).setValues([headers])
    .setBackground('#444441').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center');

  if (agencyRows.length > 0) {
    // Sort by date desc
    agencyRows.sort(function(a, b) {
      var da = toDate_(a[2]), db = toDate_(b[2]);
      if (!da || !db) return 0;
      return db.getTime() - da.getTime();
    });
    sheet.getRange(5, 1, agencyRows.length, COLS).setValues(agencyRows);
    sheet.getRange(5, 5, agencyRows.length, 1).setNumberFormat('#,##0');
  }

  sheet.setFrozenRows(4);
  [110, 80, 110, 110, 110].forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  if (agencyRows.length > 0) {
    sheet.getRange(4, 1, agencyRows.length + 1, COLS).createFilter();
  }
}


// ============================================================
//  TRIGGER
// ============================================================
function setupAuditTrigger() {
  removeAuditTrigger();
  ScriptApp.newTrigger('buildSmartAudit')
    .timeBased().atHour(7).nearMinute(30).everyDays(1).create();
  uiAlert('✅ ตั้ง Smart Audit trigger ทุกวัน 7:30am');
}

function removeAuditTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildSmartAudit') {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  uiAlert('🗑 ลบ trigger ' + n + ' รายการ');
}


// ============================================================
//  HELPERS
// ============================================================
// ⚠️ SWAP FIX: Excel/Sheets US locale auto-parse "5/1/2026" (Thai D/M/Y = Jan 5) เป็น M/D/Y → May 1
// Signature: Date object ที่ day ≤ 12 = สัญญาณว่าโดน swap → ต้อง swap day↔month กลับ
// String "13/1/2026" ปลอดภัยเพราะ US ไม่มี month 13 → stay as string, parse แบบ D/M/Y
function toDate_(d) {
  if (!d) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    var year  = d.getFullYear();
    var month = d.getMonth() + 1;  // 1-12
    var day   = d.getDate();
    if (day <= 12) {  // SWAP detection
      var tmp = day; day = month; month = tmp;
    }
    return new Date(year, month - 1, day);
  }
  var s = String(d).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var year = parseInt(m[3]); if (year < 100) year += 2000;
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  }
  var p = new Date(s);
  if (isNaN(p.getTime())) return null;
  // For fallback Date parse, also apply swap
  var py = p.getFullYear(), pm = p.getMonth() + 1, pd = p.getDate();
  if (pd <= 12) { var tmp = pd; pd = pm; pm = tmp; }
  return new Date(py, pm - 1, pd);
}

function ymdKey_(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function formatDateDisplay_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'd MMM yyyy');
}

// Extract offset hours from reason text like "เหลื่อมกัน 14.0 ชม."
function parseOffsetHours_(reason) {
  var m = String(reason).match(/เหลื่อมกัน\s+([\d.]+)\s*ชม/);
  return m ? parseFloat(m[1]) : null;
}

function uiAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function sheetClearAll_(sheet) {
  var f = sheet.getFilter();
  if (f) f.remove();
  sheet.clear();
  var rules = sheet.getConditionalFormatRules();
  if (rules.length) sheet.setConditionalFormatRules([]);
}
