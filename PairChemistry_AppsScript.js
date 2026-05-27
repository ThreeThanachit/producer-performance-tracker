// ============================================================
//  PAIR CHEMISTRY — Producer × MC pairing analysis
//
//  ติดตั้งใน: Producer Performance Dashboard
//  สร้าง tab: 💑 Producer × MC Pair
//
//  ตอบคำถาม:
//    1. คู่ไหน chemistry ดีสุด? (pair GMV/Hr > expected = synergy)
//    2. คู่ไหนควรหลีกเลี่ยง?
//    3. Producer X ทำงานกับ MC Y → ดีกว่าเฉลี่ยกี่ %?
//
//  Chemistry formula:
//    expected = avg(producer_overall_GMVHr, mc_overall_GMVHr)
//    chemistry = pair_GMVHr / expected − 1
//    +30% = pair ดีกว่า expected 30% → synergy
//    −20% = pair ต่ำกว่า expected → anti-synergy
//
//  เมนู: 💑 Pair Chemistry
// ============================================================

// ---------- CONFIG ----------
var PAIR_PERF_TAB = '📋 Performance Data';
var PAIR_TAB      = '💑 Producer × MC Pair';

var PAIR_MIN_SESSIONS = 3;     // ต้องคู่กันอย่างน้อย N ครั้ง ถึงจะเอามาคำนวณ chemistry
var PAIR_TOP_N        = 30;    // top N pairs ใน leaderboard
var PAIR_BOTTOM_N     = 20;    // bottom N pairs (ของที่ qualify)
var PAIR_MATRIX_PROD  = 20;    // top N producers in matrix
var PAIR_MATRIX_MC    = 20;    // top N MCs in matrix

var PAIR_SKIP_LOWER = ['', 'tbcp', 'cancel', 'brand', 'n/a', 'na', '-'];
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addPairChemistryMenu(SpreadsheetApp.getUi());
}

function addPairChemistryMenu(ui) {
  ui.createMenu('💑 Pair Chemistry')
    .addItem('▶ Build Pair Chemistry', 'buildPairChemistry')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (9:00am)', 'setupPairTrigger')
    .addItem('🗑 ลบ Pair Trigger',              'removePairTrigger')
    .addToUi();
}


// ============================================================
//  MAIN
// ============================================================
function buildPairChemistry() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perfSheet = ss.getSheetByName(PAIR_PERF_TAB);
  if (!perfSheet) { pairAlert_('❌ ไม่พบ "' + PAIR_PERF_TAB + '"'); return; }

  var data = perfSheet.getDataRange().getValues();
  if (data.length < 2) { pairAlert_('⚠️ Performance Data ว่าง'); return; }

  // Parse rows
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var producer = String(r[5] || '').trim();
    var mc       = String(r[6] || '').trim();
    if (!producer || PAIR_SKIP_LOWER.indexOf(producer.toLowerCase()) > -1) continue;
    if (!mc       || PAIR_SKIP_LOWER.indexOf(mc.toLowerCase()) > -1)       continue;

    var date = pairNormDate_(r[2]);
    if (!date) continue;

    rows.push({
      brand:    String(r[0]).trim(),
      date:     date,
      dur:      Number(r[4]) || 0,
      producer: producer,
      mc:       mc,
      gmv:      Number(r[7]) || 0,
    });
  }

  if (rows.length === 0) { pairAlert_('⚠️ ไม่มี valid row'); return; }

  // Aggregate by Producer alone, MC alone, and Pair
  var prodStats = {};   // producer → {gmv, hours, sessions}
  var mcStats   = {};   // mc → same
  var pairStats = {};   // "producer|mc" → {producer, mc, gmv, hours, sessions, brands{}}

  rows.forEach(function(r) {
    // Producer
    if (!prodStats[r.producer]) prodStats[r.producer] = { gmv: 0, hours: 0, sessions: 0 };
    prodStats[r.producer].gmv += r.gmv;
    prodStats[r.producer].hours += r.dur;
    prodStats[r.producer].sessions++;

    // MC
    if (!mcStats[r.mc]) mcStats[r.mc] = { gmv: 0, hours: 0, sessions: 0 };
    mcStats[r.mc].gmv += r.gmv;
    mcStats[r.mc].hours += r.dur;
    mcStats[r.mc].sessions++;

    // Pair
    var key = r.producer + '|' + r.mc;
    if (!pairStats[key]) pairStats[key] = {
      producer: r.producer, mc: r.mc,
      gmv: 0, hours: 0, sessions: 0, brands: {}
    };
    pairStats[key].gmv += r.gmv;
    pairStats[key].hours += r.dur;
    pairStats[key].sessions++;
    pairStats[key].brands[r.brand] = (pairStats[key].brands[r.brand] || 0) + 1;
  });

  // Compute per-entity GMV/Hr
  var prodGmvHr = {};
  Object.keys(prodStats).forEach(function(p) {
    var s = prodStats[p];
    prodGmvHr[p] = s.hours > 0 ? s.gmv / s.hours : 0;
  });
  var mcGmvHr = {};
  Object.keys(mcStats).forEach(function(m) {
    var s = mcStats[m];
    mcGmvHr[m] = s.hours > 0 ? s.gmv / s.hours : 0;
  });

  // Compute chemistry for each pair
  var pairs = [];
  Object.keys(pairStats).forEach(function(key) {
    var p = pairStats[key];
    var pairGmvHr = p.hours > 0 ? p.gmv / p.hours : 0;
    var pAvg = prodGmvHr[p.producer] || 0;
    var mAvg = mcGmvHr[p.mc] || 0;
    var expected = (pAvg + mAvg) / 2;
    var chemistry = expected > 0 ? pairGmvHr / expected - 1 : 0;

    // Top brand for this pair
    var topBrand = Object.keys(p.brands).sort(function(a, b) { return p.brands[b] - p.brands[a]; })[0] || '';

    pairs.push({
      producer: p.producer, mc: p.mc,
      sessions: p.sessions, hours: p.hours, gmv: p.gmv,
      pairGmvHr: pairGmvHr, pAvg: pAvg, mAvg: mAvg,
      expected: expected, chemistry: chemistry,
      topBrand: topBrand
    });
  });

  // Filter qualifying pairs (≥ min sessions)
  var qualifying = pairs.filter(function(p) { return p.sessions >= PAIR_MIN_SESSIONS; });
  qualifying.sort(function(a, b) { return b.chemistry - a.chemistry; });

  var topPairs    = qualifying.slice(0, PAIR_TOP_N);
  var bottomPairs = qualifying.slice(-PAIR_BOTTOM_N).reverse();  // worst first

  // Matrix: top producers × top MCs (by total GMV)
  var topProducers = Object.keys(prodStats).sort(function(a, b) {
    return prodStats[b].gmv - prodStats[a].gmv;
  }).slice(0, PAIR_MATRIX_PROD);
  var topMCs = Object.keys(mcStats).sort(function(a, b) {
    return mcStats[b].gmv - mcStats[a].gmv;
  }).slice(0, PAIR_MATRIX_MC);

  writePairTab_(ss, {
    totalPairs:      pairs.length,
    qualifyingPairs: qualifying.length,
    topPairs:        topPairs,
    bottomPairs:     bottomPairs,
    pairStats:       pairStats,
    prodGmvHr:       prodGmvHr,
    mcGmvHr:         mcGmvHr,
    topProducers:    topProducers,
    topMCs:          topMCs,
  });

  pairAlert_(
    '✅ Pair Chemistry สร้างเสร็จ!\n\n' +
    'Total unique pairs: ' + pairs.length + '\n' +
    'Qualifying (≥' + PAIR_MIN_SESSIONS + ' sessions): ' + qualifying.length + '\n' +
    'Top chemistry: +' + (topPairs[0] ? Math.round(topPairs[0].chemistry * 100) : 0) + '%\n' +
    'Worst chemistry: ' + (bottomPairs[0] ? Math.round(bottomPairs[0].chemistry * 100) : 0) + '%'
  );
}


// ============================================================
//  WRITE TAB
// ============================================================
function writePairTab_(ss, ctx) {
  var sheet = ss.getSheetByName(PAIR_TAB) || ss.insertSheet(PAIR_TAB);
  pairSheetClear_(sheet);

  var TOTAL_COLS = 11;
  var row = 1;
  var tz = Session.getScriptTimeZone();

  // ── TITLE ──
  sheet.setRowHeight(row, 44);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💑 PRODUCER × MC PAIR CHEMISTRY')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;

  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('Chemistry = pair GMV/Hr ÷ expected(avg of P+MC) − 1   |   Min ' + PAIR_MIN_SESSIONS + ' sessions   |   Refreshed: ' + Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm'))
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9).setHorizontalAlignment('center');
  row += 2;

  // ── KPI ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ OVERVIEW ━━━━')
    .setBackground('#6B2C91').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var bestPair = ctx.topPairs[0];
  var worstPair = ctx.bottomPairs[0];
  var kpis = [
    { label: '🤝  Total Unique Pairs',          value: ctx.totalPairs,                                     bg: '#1E3A5F', fg: '#7FB3E8' },
    { label: '✅  Qualifying (≥' + PAIR_MIN_SESSIONS + ' sess)', value: ctx.qualifyingPairs,             bg: '#3D2E08', fg: '#FAC775' },
    { label: '🚀  Best Chemistry',             value: bestPair ? '+' + Math.round(bestPair.chemistry*100) + '%' : '—', bg: '#0F3D2B', fg: '#76C59E' },
    { label: '⚠️  Worst Chemistry',            value: worstPair ? Math.round(worstPair.chemistry*100) + '%' : '—',     bg: '#3D1212', fg: '#F09251' },
  ];
  pairDrawKpis_(sheet, row, kpis, TOTAL_COLS);
  row += 3;

  // ── SECTION 1: TOP PAIRS ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🚀 TOP ' + PAIR_TOP_N + ' BEST CHEMISTRY PAIRS  (pair ดีกว่า expected) ━━━━')
    .setBackground('#0F3D2B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var hdrs = ['#', 'Producer', 'MC', 'Sessions', 'Hours', 'Pair GMV', 'Pair GMV/Hr', 'P Avg GMV/Hr', 'MC Avg GMV/Hr', 'Chemistry', 'Top Brand'];
  sheet.getRange(row, 1, 1, hdrs.length).setValues([hdrs])
    .setBackground('#1A7A5E').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  if (ctx.topPairs.length > 0) {
    var topData = ctx.topPairs.map(function(p, i) {
      return [
        i + 1, p.producer, p.mc,
        p.sessions, Math.round(p.hours * 10) / 10,
        Math.round(p.gmv), Math.round(p.pairGmvHr),
        Math.round(p.pAvg), Math.round(p.mAvg),
        p.chemistry, p.topBrand
      ];
    });
    sheet.getRange(row, 1, topData.length, hdrs.length).setValues(topData);
    sheet.getRange(row, 6, topData.length, 4).setNumberFormat('#,##0');
    sheet.getRange(row, 10, topData.length, 1).setNumberFormat('+0%;-0%;0%');

    // Heatmap on chemistry column
    for (var i = 0; i < topData.length; i++) {
      var c = topData[i][9];
      var bg = c >= 0.5 ? '#1A7A5E' : c >= 0.2 ? '#76C59E' : c >= 0 ? '#D4EDDA' : '#F8D7DA';
      var fg = c >= 0.2 ? '#FFFFFF' : '#0F3D2B';
      sheet.getRange(row + i, 10).setBackground(bg).setFontColor(fg).setFontWeight('bold');
    }
    sheet.getRange(row, 1, topData.length, hdrs.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    row += topData.length;
  } else {
    sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
      .setValue('ไม่มี pair ที่ qualify (ต้อง ≥' + PAIR_MIN_SESSIONS + ' sessions)')
      .setFontColor('#888').setHorizontalAlignment('center');
    row++;
  }
  row += 2;

  // ── SECTION 2: BOTTOM PAIRS ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ ⚠️ BOTTOM ' + PAIR_BOTTOM_N + ' WORST CHEMISTRY  (avoid pairing) ━━━━')
    .setBackground('#3D1212').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  sheet.getRange(row, 1, 1, hdrs.length).setValues([hdrs])
    .setBackground('#C72C2C').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  if (ctx.bottomPairs.length > 0) {
    var botData = ctx.bottomPairs.map(function(p, i) {
      return [
        i + 1, p.producer, p.mc,
        p.sessions, Math.round(p.hours * 10) / 10,
        Math.round(p.gmv), Math.round(p.pairGmvHr),
        Math.round(p.pAvg), Math.round(p.mAvg),
        p.chemistry, p.topBrand
      ];
    });
    sheet.getRange(row, 1, botData.length, hdrs.length).setValues(botData);
    sheet.getRange(row, 6, botData.length, 4).setNumberFormat('#,##0');
    sheet.getRange(row, 10, botData.length, 1).setNumberFormat('+0%;-0%;0%');

    for (var i = 0; i < botData.length; i++) {
      var c = botData[i][9];
      var bg = c <= -0.5 ? '#D65A3B' : c <= -0.2 ? '#F09251' : c < 0 ? '#FAC775' : '#D4EDDA';
      var fg = c <= -0.2 ? '#FFFFFF' : '#412402';
      sheet.getRange(row + i, 10).setBackground(bg).setFontColor(fg).setFontWeight('bold');
    }
    sheet.getRange(row, 1, botData.length, hdrs.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    row += botData.length;
  }
  row += 2;

  // ── SECTION 3: PAIR MATRIX ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🎯 PAIR MATRIX  (Top ' + PAIR_MATRIX_PROD + ' Producers × Top ' + PAIR_MATRIX_MC + ' MCs — chemistry %) ━━━━')
    .setBackground('#6B2C91').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  // Matrix needs more cols — use up to PAIR_MATRIX_MC + 1 cols
  var matrixCols = ctx.topMCs.length + 1;
  var matHdrs = ['Producer \\ MC'].concat(ctx.topMCs);
  sheet.getRange(row, 1, 1, matrixCols).setValues([matHdrs])
    .setBackground('#6B2C91').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(8)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(row, 44);
  row++;

  var matrixData = [], matrixColors = [];
  ctx.topProducers.forEach(function(p) {
    var rowVals = [p];
    var cols = [null];
    ctx.topMCs.forEach(function(m) {
      var key = p + '|' + m;
      var ps = ctx.pairStats[key];
      if (!ps || ps.sessions < PAIR_MIN_SESSIONS) {
        rowVals.push('');
        cols.push(null);
      } else {
        var pairGmvHr = ps.hours > 0 ? ps.gmv / ps.hours : 0;
        var expected = ((ctx.prodGmvHr[p] || 0) + (ctx.mcGmvHr[m] || 0)) / 2;
        var chem = expected > 0 ? pairGmvHr / expected - 1 : 0;
        rowVals.push(chem);
        cols.push({ chem: chem, sess: ps.sessions });
      }
    });
    matrixData.push(rowVals);
    matrixColors.push(cols);
  });

  if (matrixData.length > 0) {
    sheet.getRange(row, 1, matrixData.length, matrixCols).setValues(matrixData);
    sheet.getRange(row, 2, matrixData.length, ctx.topMCs.length).setNumberFormat('+0%;-0%;""');

    for (var i = 0; i < matrixColors.length; i++) {
      for (var j = 1; j <= ctx.topMCs.length; j++) {
        var meta = matrixColors[i][j];
        if (meta === null) continue;
        var c = meta.chem;
        var bg, fg;
        if (c >= 0.5)       { bg = '#1A7A5E'; fg = '#FFFFFF'; }
        else if (c >= 0.2)  { bg = '#76C59E'; fg = '#FFFFFF'; }
        else if (c >= 0)    { bg = '#D4EDDA'; fg = '#0F3D2B'; }
        else if (c >= -0.2) { bg = '#FFF3CD'; fg = '#856404'; }
        else if (c >= -0.5) { bg = '#F09251'; fg = '#FFFFFF'; }
        else                { bg = '#D65A3B'; fg = '#FFFFFF'; }
        sheet.getRange(row + i, 1 + j).setBackground(bg).setFontColor(fg);
      }
    }
    row += matrixData.length;
  }
  row += 1;

  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💡 Chemistry Legend:  🟩 ≥+50% synergy   🟢 +20-50%   ⚪ 0-20% (neutral)   🟡 -20% to 0   🟠 -20 to -50%   🟥 < -50% (avoid)   blank = < ' + PAIR_MIN_SESSIONS + ' sessions')
    .setBackground('#F5F5F5').setFontColor('#555').setFontSize(9).setFontStyle('italic')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(3);
  // sheet.setFrozenColumns(3); // disabled — conflicts with title-row merge
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  for (var c = 4; c <= Math.max(TOTAL_COLS, matrixCols); c++) sheet.setColumnWidth(c, 90);
}


// ============================================================
//  HELPERS
// ============================================================
function pairDrawKpis_(sheet, startRow, kpis, totalCols) {
  var n = kpis.length;
  var width = Math.floor(totalCols / n);
  var leftover = totalCols - width * n;
  sheet.setRowHeight(startRow, 28);
  sheet.setRowHeight(startRow + 1, 58);
  var col = 1;
  for (var i = 0; i < n; i++) {
    var span = width + (i === n - 1 ? leftover : 0);
    var kpi = kpis[i];
    sheet.getRange(startRow, col, 1, span).merge().setValue(kpi.label)
      .setBackground(kpi.bg).setFontColor(kpi.fg).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(startRow + 1, col, 1, span).merge().setValue(kpi.value)
      .setBackground(kpi.bg).setFontColor(kpi.fg).setFontWeight('bold').setFontSize(20)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    col += span;
  }
}

function pairNormDate_(d) {
  if (!d) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    if (day <= 12) { var t = day; day = m; m = t; }
    return new Date(y, m - 1, day);
  }
  var s = String(d).trim();
  var mm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mm) {
    var y = parseInt(mm[3]); if (y < 100) y += 2000;
    return new Date(y, parseInt(mm[2]) - 1, parseInt(mm[1]));
  }
  var p = new Date(s);
  if (isNaN(p.getTime())) return null;
  var py = p.getFullYear(), pm = p.getMonth() + 1, pd = p.getDate();
  if (pd <= 12) { var t = pd; pd = pm; pm = t; }
  return new Date(py, pm - 1, pd);
}

function setupPairTrigger() {
  removePairTrigger();
  ScriptApp.newTrigger('buildPairChemistry').timeBased().atHour(9).everyDays(1).create();
  pairAlert_('✅ ตั้ง trigger รัน Pair Chemistry ทุกวัน 9:00am');
}

function removePairTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildPairChemistry') {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  pairAlert_('🗑 ลบ trigger ' + n + ' รายการ');
}

function pairAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function pairSheetClear_(sheet) {
  var f = sheet.getFilter(); if (f) f.remove();
  sheet.clear();
  var r = sheet.getConditionalFormatRules();
  if (r.length) sheet.setConditionalFormatRules([]);
}
