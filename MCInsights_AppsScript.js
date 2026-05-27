// ============================================================
//  MC INSIGHTS — Hard performance scorecard per MC
//
//  ติดตั้งใน: Producer Performance Dashboard
//  สร้าง tab: 🎤 MC Insights
//
//  Read:   📋 Performance Data (apply date swap fix)
//  Output: 1 tab with 4 sections:
//    1. Current month KPI summary
//    2. MC leaderboard (selectable month + sparkline + status)
//    3. MC × Month heatmap (GMV/Hr)
//    4. MC × Brand heatmap (vs brand benchmark %)
//
//  Menu: 🎤 MC Insights
//
//  ⚠️ onOpen — ลบ onOpen ของไฟล์นี้ทิ้งถ้ามี v9.1/อื่นๆ
//  แล้วเรียก addMCInsightsMenu(ui) จาก onOpen เดิม
// ============================================================

// ---------- CONFIG ----------
var MC_PERF_DATA_TAB = '📋 Performance Data';
var MC_INSIGHTS_TAB  = '🎤 MC Insights';

// MC names ที่ไม่ใช่คนจริง — กรองออก (เพิ่มได้)
var MC_SKIP_LOWER = ['', 'tbcp', 'cancel', 'brand', 'n/a', 'na', '-'];

var MC_MONTHS_TO_SHOW = 5;
var MC_TOP_BRANDS_N   = 15;
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addMCInsightsMenu(SpreadsheetApp.getUi());
}

function addMCInsightsMenu(ui) {
  ui.createMenu('🎤 MC Insights')
    .addItem('▶ Build MC Insights', 'buildMCInsights')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (8:45am)', 'setupMCInsightsTrigger')
    .addItem('🗑 ลบ MC Trigger',                'removeMCInsightsTrigger')
    .addToUi();
}


// ============================================================
//  MAIN
// ============================================================
function getMCSelectedMonth_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(MC_INSIGHTS_TAB);
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

function buildMCInsights() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perfSheet = ss.getSheetByName(MC_PERF_DATA_TAB);
  if (!perfSheet) { mcAlert_('❌ ไม่พบ "' + MC_PERF_DATA_TAB + '"'); return; }

  var selectedMonth = getMCSelectedMonth_();
  var data = perfSheet.getDataRange().getValues();
  if (data.length < 2) { mcAlert_('⚠️ Performance Data ว่าง'); return; }

  // Parse rows — note: MC is col index 6 (col G)
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var mc = String(r[6] || '').trim();
    if (!mc || MC_SKIP_LOWER.indexOf(mc.toLowerCase()) > -1) continue;

    var date = mcNormDate_(r[2]);
    if (!date) continue;

    rows.push({
      brand:   String(r[0]).trim(),
      channel: String(r[1] || '').trim(),
      date:    date,
      ym:      date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2),
      dur:     Number(r[4]) || 0,
      producer: String(r[5] || '').trim(),
      mc:      mc,
      gmv:     Number(r[7]) || 0,
      orders:  Number(r[8]) || 0,
      coR:     Number(r[10]) || 0,
      ctr:     Number(r[11]) || 0,
      viewers: Number(r[12]) || 0,
      engaged: Number(r[13]) || 0,
    });
  }

  if (rows.length === 0) { mcAlert_('⚠️ ไม่มี row ที่มี MC valid'); return; }

  // Months
  var ymSet = {};
  rows.forEach(function(r) { ymSet[r.ym] = true; });
  var allYms = Object.keys(ymSet).sort();
  var monthsToShow = allYms.slice(-MC_MONTHS_TO_SHOW);
  var leaderboardMonth = selectedMonth && ymSet[selectedMonth] ? selectedMonth : monthsToShow[monthsToShow.length - 1];
  var idx = allYms.indexOf(leaderboardMonth);
  var prevMonth = idx > 0 ? allYms[idx - 1] : null;

  // Aggregations
  var mcMonth = {}, mcBrand = {}, brandTotal = {}, mcs = {}, brandsAll = {};

  rows.forEach(function(r) {
    mcs[r.mc] = true;
    brandsAll[r.brand] = true;

    if (!mcMonth[r.mc]) mcMonth[r.mc] = {};
    if (!mcMonth[r.mc][r.ym]) mcMonth[r.mc][r.ym] = {
      sessions: 0, hours: 0, gmv: 0, orders: 0,
      ctrSum: 0, ctrN: 0, coRSum: 0, coRN: 0,
      viewers: 0, engaged: 0, producers: {}
    };
    var mm = mcMonth[r.mc][r.ym];
    mm.sessions++;
    mm.hours += r.dur;
    mm.gmv += r.gmv;
    mm.orders += r.orders;
    if (r.ctr > 0) { mm.ctrSum += r.ctr; mm.ctrN++; }
    if (r.coR > 0) { mm.coRSum += r.coR; mm.coRN++; }
    mm.viewers += r.viewers;
    mm.engaged += r.engaged;
    if (r.producer) mm.producers[r.producer] = (mm.producers[r.producer] || 0) + 1;

    if (!mcBrand[r.mc]) mcBrand[r.mc] = {};
    if (!mcBrand[r.mc][r.brand]) mcBrand[r.mc][r.brand] = { gmv: 0, hours: 0, sessions: 0 };
    var mb = mcBrand[r.mc][r.brand];
    mb.gmv += r.gmv;
    mb.hours += r.dur;
    mb.sessions++;

    if (!brandTotal[r.brand]) brandTotal[r.brand] = { gmv: 0, hours: 0 };
    brandTotal[r.brand].gmv += r.gmv;
    brandTotal[r.brand].hours += r.dur;
  });

  // Brand benchmark
  var brandBench = {};
  Object.keys(brandTotal).forEach(function(b) {
    brandBench[b] = brandTotal[b].hours > 0 ? brandTotal[b].gmv / brandTotal[b].hours : 0;
  });

  // Sort MCs by latest month GMV
  var mcList = Object.keys(mcs).sort(function(a, b) {
    var ag = (mcMonth[a] && mcMonth[a][leaderboardMonth]) ? mcMonth[a][leaderboardMonth].gmv : 0;
    var bg = (mcMonth[b] && mcMonth[b][leaderboardMonth]) ? mcMonth[b][leaderboardMonth].gmv : 0;
    if (ag !== bg) return bg - ag;
    var aT = 0, bT = 0;
    Object.keys(mcMonth[a] || {}).forEach(function(m) { aT += mcMonth[a][m].gmv; });
    Object.keys(mcMonth[b] || {}).forEach(function(m) { bT += mcMonth[b][m].gmv; });
    return bT - aT;
  });

  // Top brands
  var topBrands = Object.keys(brandsAll).sort(function(a, b) {
    return brandTotal[b].gmv - brandTotal[a].gmv;
  }).slice(0, MC_TOP_BRANDS_N);

  writeMCInsightsTab_(ss, {
    monthsToShow: monthsToShow,
    latestMonth:  leaderboardMonth,
    prevMonth:    prevMonth,
    mcs:          mcList,
    mcMonth:      mcMonth,
    mcBrand:      mcBrand,
    brandBench:   brandBench,
    topBrands:    topBrands,
    allYms:       allYms,
  });

  mcAlert_(
    '✅ MC Insights สร้างเสร็จ!\n\n' +
    'Sessions analyzed: ' + rows.length + '\n' +
    'MCs: ' + mcList.length + '\n' +
    'Brands: ' + Object.keys(brandsAll).length + '\n' +
    'Leaderboard month: ' + leaderboardMonth + '\n\n' +
    '⚠️ Date swap fix applied'
  );
}


// ============================================================
//  WRITE
// ============================================================
function writeMCInsightsTab_(ss, ctx) {
  var sheet = ss.getSheetByName(MC_INSIGHTS_TAB) || ss.insertSheet(MC_INSIGHTS_TAB);
  mcSheetClear_(sheet);

  var TOTAL_COLS = 13;
  var row = 1;
  var tz = Session.getScriptTimeZone();

  // ── TITLE ──
  sheet.setRowHeight(row, 44);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('🎤 MC INSIGHTS — Hard Performance Analysis')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;

  var monthLabels = ctx.monthsToShow.map(function(m) {
    var p = m.split('-');
    var names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[parseInt(p[1])] + ' ' + p[0].slice(2);
  });
  var lbParts = ctx.latestMonth.split('-');
  var monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var latestLabel = monthNames[parseInt(lbParts[1])] + ' ' + lbParts[0];

  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('Heatmap months: ' + monthLabels.join(' · ') + '   |   Refreshed: ' + Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm'))
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9).setHorizontalAlignment('center');
  row++;

  // ── MONTH SELECTOR (B3) ──
  sheet.setRowHeight(row, 32);
  sheet.getRange(row, 1).setValue('📅 Leaderboard month:')
    .setBackground('#FCE8E6').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  var dropdownLabels = ctx.allYms.map(function(ym) {
    var p = ym.split('-');
    return monthNames[parseInt(p[1])] + ' ' + p[0];
  });
  var dv = SpreadsheetApp.newDataValidation()
    .requireValueInList(dropdownLabels, true).setAllowInvalid(true).build();
  sheet.getRange(row, 2).setValue(latestLabel).setDataValidation(dv)
    .setBackground('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#C72C2C', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(row, 3, 1, TOTAL_COLS - 2).merge()
    .setValue('  ⤴ เปลี่ยนเดือนแล้วกด menu "🎤 MC Insights → ▶ Build MC Insights" ใหม่')
    .setFontColor('#666').setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  row += 2;

  // ── SECTION 1: KPI ──
  var totalGmv = 0, totalSessions = 0, totalHours = 0;
  ctx.mcs.forEach(function(m) {
    var mm = ctx.mcMonth[m] && ctx.mcMonth[m][ctx.latestMonth];
    if (mm) { totalGmv += mm.gmv; totalSessions += mm.sessions; totalHours += mm.hours; }
  });

  var upMovers = 0, downMovers = 0;
  ctx.mcs.forEach(function(m) {
    var cur = ctx.mcMonth[m] && ctx.mcMonth[m][ctx.latestMonth];
    var prev = ctx.mcMonth[m] && ctx.mcMonth[m][ctx.prevMonth];
    if (cur && prev && prev.gmv > 0) {
      var ch = (cur.gmv - prev.gmv) / prev.gmv;
      if (ch >= 0.30) upMovers++;
      else if (ch <= -0.30) downMovers++;
    }
  });

  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ ' + latestLabel + ' SUMMARY ━━━━')
    .setBackground('#8B2B33').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var kpis = [
    { label: '📋  Sessions',            value: totalSessions,                                bg: '#1E3A5F', fg: '#7FB3E8' },
    { label: '💰  Total GMV',           value: '฿' + Math.round(totalGmv).toLocaleString(), bg: '#0F3D2B', fg: '#76C59E' },
    { label: '⏱  Hours · GMV/Hr',       value: Math.round(totalHours) + ' · ฿' + (totalHours > 0 ? Math.round(totalGmv / totalHours).toLocaleString() : '0'), bg: '#3D2E08', fg: '#FAC775' },
    { label: '🚀 ↑Movers / ↓Decliners', value: upMovers + ' ↑  /  ' + downMovers + ' ↓',  bg: '#3D1212', fg: '#F09251' },
  ];
  mcDrawKpis_(sheet, row, kpis, TOTAL_COLS);
  row += 3;

  // ── SECTION 2: LEADERBOARD ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🏆 MC LEADERBOARD — ' + latestLabel + ' ━━━━')
    .setBackground('#8B2B33').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var lbHdrs = ['#', 'MC', 'Sessions', 'Hours', 'GMV', 'GMV/Hr', 'CTR avg', 'Co_R avg', 'Orders', 'vs Team Avg', 'MoM Change', 'Trend', 'Status'];
  sheet.getRange(row, 1, 1, lbHdrs.length).setValues([lbHdrs])
    .setBackground('#C72C2C').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  var teamAvg = totalHours > 0 ? totalGmv / totalHours : 0;
  var lbData = [], lbBadges = [];

  ctx.mcs.forEach(function(m, idx) {
    var mm = ctx.mcMonth[m] && ctx.mcMonth[m][ctx.latestMonth];
    if (!mm) return;
    var gmvHr = mm.hours > 0 ? mm.gmv / mm.hours : 0;
    var ctr   = mm.ctrN > 0 ? mm.ctrSum / mm.ctrN : 0;
    var coR   = mm.coRN > 0 ? mm.coRSum / mm.coRN : 0;
    var vsAvg = teamAvg > 0 ? gmvHr / teamAvg - 1 : 0;

    var prev = ctx.mcMonth[m] && ctx.mcMonth[m][ctx.prevMonth];
    var momText = '—';
    if (prev && prev.gmv > 0) {
      var ch = (mm.gmv - prev.gmv) / prev.gmv;
      var arrow = ch > 0.01 ? '↑' : ch < -0.01 ? '↓' : '→';
      momText = arrow + ' ' + (ch >= 0 ? '+' : '') + Math.round(ch * 100) + '%';
    }

    var sparkVals = ctx.monthsToShow.map(function(mo) {
      var mmm = ctx.mcMonth[m] && ctx.mcMonth[m][mo];
      return mmm ? mmm.gmv : 0;
    });
    var spark = '=SPARKLINE({' + sparkVals.join(',') + '}, {"charttype","line";"color1","#8B2B33";"linewidth",2})';

    var ratio = teamAvg > 0 ? gmvHr / teamAvg : 0;
    var badge = ratio >= 1.5 ? '🏆 Top'
              : ratio >= 1.0 ? '✅ Above'
              : ratio >= 0.5 ? '⚠️ Below'
              : '🔴 At Risk';

    lbData.push([
      idx + 1, m,
      mm.sessions, Math.round(mm.hours * 10) / 10,
      Math.round(mm.gmv), Math.round(gmvHr),
      ctr, coR, Math.round(mm.orders),
      vsAvg, momText, spark, badge
    ]);
    lbBadges.push(badge);
  });

  if (lbData.length > 0) {
    sheet.getRange(row, 1, lbData.length, lbHdrs.length).setValues(lbData);
    sheet.getRange(row, 5, lbData.length, 2).setNumberFormat('#,##0');
    sheet.getRange(row, 7, lbData.length, 2).setNumberFormat('0.00%');
    sheet.getRange(row, 9, lbData.length, 1).setNumberFormat('#,##0');
    sheet.getRange(row, 10, lbData.length, 1).setNumberFormat('+0%;-0%;0%');

    for (var k = 0; k < lbBadges.length; k++) {
      var b = lbBadges[k];
      var bg = b.indexOf('Top') > -1   ? '#D4EDDA'
             : b.indexOf('Above') > -1 ? '#D1ECF1'
             : b.indexOf('Below') > -1 ? '#FFF3CD'
             : '#F8D7DA';
      sheet.getRange(row + k, 13).setBackground(bg);
    }
    sheet.getRange(row, 1, lbData.length, lbHdrs.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    row += lbData.length;
  } else {
    sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
      .setValue('ไม่มี data ในเดือนล่าสุด').setFontColor('#888').setHorizontalAlignment('center');
    row++;
  }
  row += 2;

  // ── SECTION 3: MC × MONTH HEATMAP ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 📈 MC × MONTH  (GMV per Hour, ฿) ━━━━')
    .setBackground('#8B2B33').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var pmHdrs = ['MC'].concat(monthLabels).concat(['Trend']);
  sheet.getRange(row, 1, 1, pmHdrs.length).setValues([pmHdrs])
    .setBackground('#C72C2C').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center');
  row++;

  var allVals = [];
  ctx.mcs.forEach(function(m) {
    ctx.monthsToShow.forEach(function(mo) {
      var mm = ctx.mcMonth[m] && ctx.mcMonth[m][mo];
      if (mm && mm.hours > 0) allVals.push(mm.gmv / mm.hours);
    });
  });
  allVals.sort(function(a, b) { return a - b; });
  var p50 = allVals[Math.floor(allVals.length * 0.5)] || 0;
  var p75 = allVals[Math.floor(allVals.length * 0.75)] || 0;
  var p90 = allVals[Math.floor(allVals.length * 0.9)] || 0;

  var pmData = [], pmColors = [];
  ctx.mcs.forEach(function(m) {
    var vals = [m], spark = [], colors = [null];
    ctx.monthsToShow.forEach(function(mo) {
      var mm = ctx.mcMonth[m] && ctx.mcMonth[m][mo];
      var gh = mm && mm.hours > 0 ? mm.gmv / mm.hours : 0;
      vals.push(gh); spark.push(gh); colors.push(gh);
    });
    vals.push('=SPARKLINE({' + spark.join(',') + '}, {"charttype","line";"color1","#8B2B33";"linewidth",2})');
    colors.push(null);
    pmData.push(vals); pmColors.push(colors);
  });

  if (pmData.length > 0) {
    sheet.getRange(row, 1, pmData.length, pmHdrs.length).setValues(pmData);
    sheet.getRange(row, 2, pmData.length, ctx.monthsToShow.length).setNumberFormat('#,##0');

    for (var i = 0; i < pmColors.length; i++) {
      for (var j = 1; j <= ctx.monthsToShow.length; j++) {
        var v = pmColors[i][j];
        var bg, fg;
        if (v === 0)       { bg = '#F5F5F5'; fg = '#888888'; }
        else if (v >= p90) { bg = '#1A7A5E'; fg = '#FFFFFF'; }
        else if (v >= p75) { bg = '#76C59E'; fg = '#FFFFFF'; }
        else if (v >= p50) { bg = '#FAC775'; fg = '#412402'; }
        else               { bg = '#F09251'; fg = '#FFFFFF'; }
        sheet.getRange(row + i, 1 + j).setBackground(bg).setFontColor(fg);
      }
    }
    row += pmData.length;
  }
  row += 2;

  // ── SECTION 4: MC × BRAND HEATMAP ──
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🏷️ MC × BRAND  (GMV/Hr vs Brand Benchmark, top ' + MC_TOP_BRANDS_N + ') ━━━━')
    .setBackground('#8B2B33').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var pbHdrs = ['MC'].concat(ctx.topBrands);
  sheet.getRange(row, 1, 1, pbHdrs.length).setValues([pbHdrs])
    .setBackground('#C72C2C').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(8)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(row, 44);
  row++;

  var pbData = [], pbColors = [];
  ctx.mcs.forEach(function(m) {
    var vals = [m], cols = [null];
    ctx.topBrands.forEach(function(b) {
      var mb = ctx.mcBrand[m] && ctx.mcBrand[m][b];
      if (!mb || mb.hours === 0) { vals.push(''); cols.push(null); }
      else {
        var gh = mb.gmv / mb.hours;
        var bench = ctx.brandBench[b] || 0;
        var pct = bench > 0 ? gh / bench - 1 : 0;
        vals.push(pct); cols.push(pct);
      }
    });
    pbData.push(vals); pbColors.push(cols);
  });

  if (pbData.length > 0) {
    sheet.getRange(row, 1, pbData.length, pbHdrs.length).setValues(pbData);
    sheet.getRange(row, 2, pbData.length, ctx.topBrands.length).setNumberFormat('+0%;-0%;""');

    for (var i = 0; i < pbColors.length; i++) {
      for (var j = 1; j <= ctx.topBrands.length; j++) {
        var v = pbColors[i][j];
        if (v === null) continue;
        var bg, fg;
        if (v >= 0.5)       { bg = '#1A7A5E'; fg = '#FFFFFF'; }
        else if (v >= 0.1)  { bg = '#76C59E'; fg = '#FFFFFF'; }
        else if (v >= -0.1) { bg = '#FAC775'; fg = '#412402'; }
        else if (v >= -0.5) { bg = '#F09251'; fg = '#FFFFFF'; }
        else                { bg = '#D65A3B'; fg = '#FFFFFF'; }
        sheet.getRange(row + i, 1 + j).setBackground(bg).setFontColor(fg);
      }
    }
    row += pbData.length;
  }
  row += 1;

  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💡 vs Bench Legend:  🟩 ≥+50%   🟢 +10 to +50%   🟡 ±10%   🟠 -10 to -50%   🟥 <-50%   blank = no sessions')
    .setBackground('#F5F5F5').setFontColor('#555').setFontSize(9).setFontStyle('italic')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(3);
  // sheet.setFrozenColumns(2); // disabled — conflicts with title-row merge
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 110);
  for (var c = 3; c <= TOTAL_COLS; c++) sheet.setColumnWidth(c, 88);
}


// ============================================================
//  HELPERS
// ============================================================
function mcDrawKpis_(sheet, startRow, kpis, totalCols) {
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

function mcNormDate_(d) {
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

function setupMCInsightsTrigger() {
  removeMCInsightsTrigger();
  ScriptApp.newTrigger('buildMCInsights').timeBased().atHour(8).nearMinute(45).everyDays(1).create();
  mcAlert_('✅ ตั้ง trigger รัน MC Insights ทุกวัน 8:45am');
}

function removeMCInsightsTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildMCInsights') {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  mcAlert_('🗑 ลบ trigger ' + n + ' รายการ');
}

function mcAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function mcSheetClear_(sheet) {
  var f = sheet.getFilter(); if (f) f.remove();
  sheet.clear();
  var r = sheet.getConditionalFormatRules();
  if (r.length) sheet.setConditionalFormatRules([]);
}
