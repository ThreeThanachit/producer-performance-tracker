// ============================================================
//  ENGAGEMENT FUNNEL — Diagnose where each producer drops off
//
//  ติดตั้งใน: Producer Performance Dashboard
//  สร้าง tab: 🔄 Engagement Funnel
//
//  Funnel: Viewers → Engaged → Comments → Orders → GMV
//
//  ตอบคำถาม:
//    1. Producer คนนี้ติดตรงไหนของ funnel?
//    2. คนนี้ไม่เก่งเรียกคน (viewers) / engage / convert / upsell?
//    3. ควร coach เรื่องอะไร?
//
//  Metrics:
//    - Engagement Rate    = Engaged / Viewers
//    - Comments per 1K    = Comments / Viewers × 1000
//    - Order CR           = Orders / Viewers
//    - AOV (Avg Order Value) = GMV / Orders
//    - Rev per Viewer     = GMV / Viewers
//
//  "Coach Focus" = metric ที่ producer ห่างจาก team avg มากสุด (negative)
// ============================================================

// ---------- CONFIG ----------
var FUNNEL_PERF_TAB = '📋 Performance Data';
var FUNNEL_TAB      = '🔄 Engagement Funnel';

var FUNNEL_SKIP_LOWER = ['', 'tbcp', 'cancel', 'brand'];
var FUNNEL_MIN_SESSIONS = 3;  // ตัด producer ที่ session น้อยเกินไป
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addEngagementFunnelMenu(SpreadsheetApp.getUi());
}

function addEngagementFunnelMenu(ui) {
  ui.createMenu('🔄 Engagement Funnel')
    .addItem('▶ Build Engagement Funnel', 'buildEngagementFunnel')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (9:15am)', 'setupFunnelTrigger')
    .addItem('🗑 ลบ Funnel Trigger',           'removeFunnelTrigger')
    .addToUi();
}


// ============================================================
//  MAIN
// ============================================================
function getFunnelSelectedMonth_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(FUNNEL_TAB);
  if (!s) return null;
  var v = s.getRange('B3').getValue();
  if (!v) return null;
  var sv = String(v).trim();
  var names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (var i = 0; i < names.length; i++) {
    if (sv.indexOf(names[i]) > -1) {
      var ym = sv.match(/20\d{2}/);
      if (ym) return ym[0] + '-' + ('0' + (i + 1)).slice(-2);
    }
  }
  if (/^\d{4}-\d{2}$/.test(sv)) return sv;
  return null;
}

function buildEngagementFunnel() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perfSheet = ss.getSheetByName(FUNNEL_PERF_TAB);
  if (!perfSheet) { funnelAlert_('❌ ไม่พบ "' + FUNNEL_PERF_TAB + '"'); return; }

  var selectedMonth = getFunnelSelectedMonth_();
  var data = perfSheet.getDataRange().getValues();
  if (data.length < 2) { funnelAlert_('⚠️ Performance Data ว่าง'); return; }

  // Parse
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var prod = String(r[5] || '').trim();
    if (!prod || FUNNEL_SKIP_LOWER.indexOf(prod.toLowerCase()) > -1) continue;

    var date = funnelNormDate_(r[2]);
    if (!date) continue;

    rows.push({
      date:     date,
      ym:       date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2),
      producer: prod,
      gmv:      Number(r[7]) || 0,
      orders:   Number(r[8]) || 0,
      viewers:  Number(r[12]) || 0,
      engaged:  Number(r[13]) || 0,
      comments: Number(r[14]) || 0,
    });
  }

  if (rows.length === 0) { funnelAlert_('⚠️ ไม่มี row valid'); return; }

  var ymSet = {};
  rows.forEach(function(r) { ymSet[r.ym] = true; });
  var allYms = Object.keys(ymSet).sort();
  var targetMonth = selectedMonth && ymSet[selectedMonth] ? selectedMonth : allYms[allYms.length - 1];

  // Filter to selected month
  var monthRows = rows.filter(function(r) { return r.ym === targetMonth; });

  // Aggregate per producer
  var prodStats = {};
  monthRows.forEach(function(r) {
    if (!prodStats[r.producer]) prodStats[r.producer] = {
      sessions: 0, viewers: 0, engaged: 0, comments: 0, orders: 0, gmv: 0
    };
    var p = prodStats[r.producer];
    p.sessions++;
    p.viewers  += r.viewers;
    p.engaged  += r.engaged;
    p.comments += r.comments;
    p.orders   += r.orders;
    p.gmv      += r.gmv;
  });

  // Compute funnel metrics per producer (only ≥ MIN_SESSIONS)
  var producers = [];
  Object.keys(prodStats).forEach(function(name) {
    var s = prodStats[name];
    if (s.sessions < FUNNEL_MIN_SESSIONS) return;
    producers.push({
      name:      name,
      sessions:  s.sessions,
      viewers:   s.viewers,
      engaged:   s.engaged,
      comments:  s.comments,
      orders:    s.orders,
      gmv:       s.gmv,
      engRate:   s.viewers > 0 ? s.engaged / s.viewers : 0,
      cmt1K:     s.viewers > 0 ? s.comments / s.viewers * 1000 : 0,
      orderCR:   s.viewers > 0 ? s.orders / s.viewers : 0,
      aov:       s.orders > 0 ? s.gmv / s.orders : 0,
      revPerV:   s.viewers > 0 ? s.gmv / s.viewers : 0,
    });
  });

  if (producers.length === 0) { funnelAlert_('⚠️ ไม่มี producer ที่ qualify (ต้อง ≥' + FUNNEL_MIN_SESSIONS + ' sessions)'); return; }

  // Team averages
  var teamTotal = { viewers: 0, engaged: 0, comments: 0, orders: 0, gmv: 0, sessions: 0 };
  producers.forEach(function(p) {
    teamTotal.viewers  += p.viewers;
    teamTotal.engaged  += p.engaged;
    teamTotal.comments += p.comments;
    teamTotal.orders   += p.orders;
    teamTotal.gmv      += p.gmv;
    teamTotal.sessions += p.sessions;
  });
  var teamAvg = {
    engRate: teamTotal.viewers > 0 ? teamTotal.engaged / teamTotal.viewers : 0,
    cmt1K:   teamTotal.viewers > 0 ? teamTotal.comments / teamTotal.viewers * 1000 : 0,
    orderCR: teamTotal.viewers > 0 ? teamTotal.orders / teamTotal.viewers : 0,
    aov:     teamTotal.orders > 0 ? teamTotal.gmv / teamTotal.orders : 0,
    revPerV: teamTotal.viewers > 0 ? teamTotal.gmv / teamTotal.viewers : 0,
  };

  // Compute "Coach Focus" — producer's worst metric vs team
  producers.forEach(function(p) {
    var metrics = [
      { name: '🧲 ดึง viewers',         metric: 'viewers',  prodVal: p.viewers / p.sessions, teamVal: teamTotal.viewers / teamTotal.sessions },
      { name: '💗 Engagement rate',     metric: 'engRate',  prodVal: p.engRate,  teamVal: teamAvg.engRate },
      { name: '💬 Comments/1K viewers', metric: 'cmt1K',    prodVal: p.cmt1K,    teamVal: teamAvg.cmt1K },
      { name: '🛒 Order conversion',    metric: 'orderCR',  prodVal: p.orderCR,  teamVal: teamAvg.orderCR },
      { name: '💎 AOV (upsell)',        metric: 'aov',      prodVal: p.aov,      teamVal: teamAvg.aov },
    ];
    var worst = null, worstGap = 0;
    metrics.forEach(function(m) {
      if (m.teamVal === 0) return;
      var gap = m.prodVal / m.teamVal - 1;  // negative = below avg
      if (gap < worstGap) { worstGap = gap; worst = m.name; }
    });
    p.coachFocus = worst ? worst + ' (' + Math.round(worstGap * 100) + '% vs team)' : '—';
    p.coachGap   = worstGap;
  });

  // Sort by revenue per viewer desc (overall efficiency)
  producers.sort(function(a, b) { return b.revPerV - a.revPerV; });

  writeFunnelTab_(ss, {
    targetMonth: targetMonth,
    allYms:      allYms,
    producers:   producers,
    teamTotal:   teamTotal,
    teamAvg:     teamAvg,
  });

  funnelAlert_(
    '✅ Engagement Funnel สร้างเสร็จ!\n\n' +
    'Month: ' + targetMonth + '\n' +
    'Producers analyzed: ' + producers.length + '\n' +
    'Total viewers: ' + teamTotal.viewers.toLocaleString() + '\n' +
    'Team avg engagement rate: ' + (teamAvg.engRate * 100).toFixed(2) + '%\n' +
    'Team avg order CR: ' + (teamAvg.orderCR * 100).toFixed(2) + '%'
  );
}


// ============================================================
//  WRITE
// ============================================================
function writeFunnelTab_(ss, ctx) {
  var sheet = ss.getSheetByName(FUNNEL_TAB) || ss.insertSheet(FUNNEL_TAB);
  funnelSheetClear_(sheet);

  var TOTAL_COLS = 12;
  var row = 1;
  var tz = Session.getScriptTimeZone();

  var monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p = ctx.targetMonth.split('-');
  var latestLabel = monthNames[parseInt(p[1])] + ' ' + p[0];

  // TITLE
  sheet.setRowHeight(row, 44);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('🔄 ENGAGEMENT FUNNEL — Where Each Producer Drops Off')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;

  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('Funnel: Viewers → Engaged → Comments → Orders → GMV   |   Min ' + FUNNEL_MIN_SESSIONS + ' sessions   |   Refreshed: ' + Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm'))
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9).setHorizontalAlignment('center');
  row++;

  // MONTH SELECTOR
  sheet.setRowHeight(row, 32);
  sheet.getRange(row, 1).setValue('📅 Month:')
    .setBackground('#E8F0FE').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  var dropdown = ctx.allYms.map(function(ym) {
    var pp = ym.split('-');
    return monthNames[parseInt(pp[1])] + ' ' + pp[0];
  });
  var dv = SpreadsheetApp.newDataValidation().requireValueInList(dropdown, true).setAllowInvalid(true).build();
  sheet.getRange(row, 2).setValue(latestLabel).setDataValidation(dv)
    .setBackground('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#8B5A2B', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(row, 3, 1, TOTAL_COLS - 2).merge()
    .setValue('  ⤴ เปลี่ยนเดือน แล้วกด menu "🔄 Engagement Funnel → ▶ Build" ใหม่')
    .setFontColor('#666').setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  row += 2;

  // TEAM FUNNEL KPI
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ ' + latestLabel + ' TEAM FUNNEL OVERVIEW ━━━━')
    .setBackground('#8B5A2B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var kpis = [
    { label: '👀 Viewers (avg/sess)', value: Math.round(ctx.teamTotal.viewers / ctx.teamTotal.sessions).toLocaleString(),  bg: '#1E3A5F', fg: '#7FB3E8' },
    { label: '💗 Engagement Rate',    value: (ctx.teamAvg.engRate * 100).toFixed(2) + '%',                                  bg: '#3D2E08', fg: '#FAC775' },
    { label: '🛒 Order CR',           value: (ctx.teamAvg.orderCR * 100).toFixed(2) + '%',                                  bg: '#0F3D2B', fg: '#76C59E' },
    { label: '💎 AOV (avg)',          value: '฿' + Math.round(ctx.teamAvg.aov).toLocaleString(),                            bg: '#6B2C91', fg: '#D6A6E8' },
  ];
  funnelDrawKpis_(sheet, row, kpis, TOTAL_COLS);
  row += 3;

  // PRODUCER FUNNEL TABLE
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ PRODUCER FUNNEL — sorted by Revenue/Viewer ━━━━')
    .setBackground('#8B5A2B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var hdrs = ['#', 'Producer', 'Sess', 'Viewers', 'Engaged %', 'Cmt/1K', 'Order CR %', 'Orders', 'AOV (฿)', 'Rev/Viewer', 'GMV', '🎯 Coach Focus'];
  sheet.getRange(row, 1, 1, hdrs.length).setValues([hdrs])
    .setBackground('#5C3818').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 32);
  row++;

  // Build percentile thresholds for each metric (for color coding)
  function pctTier(val, sorted) {
    if (sorted.length === 0) return 0;
    var p25 = sorted[Math.floor(sorted.length * 0.25)];
    var p50 = sorted[Math.floor(sorted.length * 0.5)];
    var p75 = sorted[Math.floor(sorted.length * 0.75)];
    var p90 = sorted[Math.floor(sorted.length * 0.9)];
    if (val >= p90) return 4;
    if (val >= p75) return 3;
    if (val >= p50) return 2;
    if (val >= p25) return 1;
    return 0;
  }
  var sViewers = ctx.producers.map(function(p) { return p.viewers / p.sessions; }).sort(function(a,b){return a-b;});
  var sEng     = ctx.producers.map(function(p) { return p.engRate; }).sort(function(a,b){return a-b;});
  var sCmt     = ctx.producers.map(function(p) { return p.cmt1K; }).sort(function(a,b){return a-b;});
  var sOrderCR = ctx.producers.map(function(p) { return p.orderCR; }).sort(function(a,b){return a-b;});
  var sAOV     = ctx.producers.map(function(p) { return p.aov; }).sort(function(a,b){return a-b;});
  var sRevV    = ctx.producers.map(function(p) { return p.revPerV; }).sort(function(a,b){return a-b;});

  var tierColors = ['#F8D7DA', '#FFF3CD', '#FFFFFF', '#D1ECF1', '#D4EDDA'];  // 0-4
  var tierText   = ['#721C24', '#856404', '#2C2C2A', '#0C5460', '#155724'];

  var rows = [];
  var tierData = [];
  ctx.producers.forEach(function(p, idx) {
    var viewersPerSess = p.viewers / p.sessions;
    var rowVals = [
      idx + 1, p.name,
      p.sessions, Math.round(viewersPerSess),
      p.engRate, p.cmt1K, p.orderCR, Math.round(p.orders),
      Math.round(p.aov), Math.round(p.revPerV),
      Math.round(p.gmv),
      p.coachFocus
    ];
    rows.push(rowVals);
    tierData.push([
      pctTier(viewersPerSess, sViewers),
      pctTier(p.engRate, sEng),
      pctTier(p.cmt1K, sCmt),
      pctTier(p.orderCR, sOrderCR),
      pctTier(p.aov, sAOV),
      pctTier(p.revPerV, sRevV),
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(row, 1, rows.length, hdrs.length).setValues(rows);
    sheet.getRange(row, 4, rows.length, 1).setNumberFormat('#,##0');     // viewers
    sheet.getRange(row, 5, rows.length, 1).setNumberFormat('0.00%');     // eng rate
    sheet.getRange(row, 6, rows.length, 1).setNumberFormat('0.0');       // cmt/1k
    sheet.getRange(row, 7, rows.length, 1).setNumberFormat('0.00%');     // order CR
    sheet.getRange(row, 8, rows.length, 1).setNumberFormat('#,##0');     // orders
    sheet.getRange(row, 9, rows.length, 2).setNumberFormat('#,##0');     // AOV, Rev/V
    sheet.getRange(row, 11, rows.length, 1).setNumberFormat('#,##0');    // GMV

    // Apply percentile colors per metric column (cols 4-10 = indices 3-9 in tierData mapping)
    var metricCols = [4, 5, 6, 7, 9, 10];  // sheet column numbers
    for (var i = 0; i < rows.length; i++) {
      for (var k = 0; k < 6; k++) {
        var tier = tierData[i][k];
        sheet.getRange(row + i, metricCols[k]).setBackground(tierColors[tier]).setFontColor(tierText[tier]);
      }
    }

    // Coach Focus column — bold red text
    sheet.getRange(row, 12, rows.length, 1).setFontColor('#C72C2C').setFontWeight('bold').setFontSize(10);

    sheet.getRange(row, 1, rows.length, hdrs.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    row += rows.length;
  }
  row += 1;

  // Legend
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💡 Cell color = percentile vs team this month  |  🟩 top 10%  🟢 top 25%  ⚪ median  🟡 bottom 25%  🟥 bottom 10%')
    .setBackground('#F5F5F5').setFontColor('#555').setFontSize(9).setFontStyle('italic')
    .setHorizontalAlignment('center');
  row++;

  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💡 Coach Focus = metric ที่ห่างจาก team avg มากสุด → ใช้เป็น 1:1 coaching topic')
    .setBackground('#F5F5F5').setFontColor('#555').setFontSize(9).setFontStyle('italic')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(3);
  // sheet.setFrozenColumns(2); // disabled — conflicts with title-row merge
  sheet.setColumnWidth(1, 40);
  sheet.setColumnWidth(2, 100);
  for (var c = 3; c <= 11; c++) sheet.setColumnWidth(c, 85);
  sheet.setColumnWidth(12, 230);  // coach focus needs space
}


// ============================================================
//  HELPERS
// ============================================================
function funnelDrawKpis_(sheet, startRow, kpis, totalCols) {
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

function funnelNormDate_(d) {
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

function setupFunnelTrigger() {
  removeFunnelTrigger();
  ScriptApp.newTrigger('buildEngagementFunnel').timeBased().atHour(9).nearMinute(15).everyDays(1).create();
  funnelAlert_('✅ ตั้ง trigger รัน Engagement Funnel ทุกวัน 9:15am');
}

function removeFunnelTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildEngagementFunnel') {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  funnelAlert_('🗑 ลบ trigger ' + n + ' รายการ');
}

function funnelAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function funnelSheetClear_(sheet) {
  var f = sheet.getFilter(); if (f) f.remove();
  sheet.clear();
  var r = sheet.getConditionalFormatRules();
  if (r.length) sheet.setConditionalFormatRules([]);
}
