// ============================================================
//  PRODUCER INSIGHTS — Hard performance scorecard
//
//  ติดตั้งใน: Producer Performance Dashboard
//  สร้าง tab: 📊 Producer Insights
//
//  Read:   📋 Performance Data (apply date swap fix automatically)
//  Output: 1 comprehensive tab with 4 sections:
//    1. Current month KPI summary
//    2. Producer leaderboard (latest month + sparkline + status)
//    3. Producer × Month heatmap (GMV/Hr)
//    4. Producer × Brand heatmap (vs brand benchmark %)
//
//  เมนูใหม่: 📊 Insights
//
//  ⚠️ onOpen — ถ้ามี script เดิม ให้ลบ onOpen ของไฟล์นี้ทิ้ง
//  แล้วเรียก addProducerInsightsMenu(ui) จาก onOpen เดิม
// ============================================================

// ---------- CONFIG ----------
var PERF_DATA_TAB  = '📋 Performance Data';
var INSIGHTS_TAB   = '📊 Producer Insights';

var SKIP_PRODUCERS_LOWER = ['tbcp', 'cancel', 'brand', ''];

var MONTHS_TO_SHOW = 5;   // last N months in matrix
var TOP_BRANDS_N   = 15;  // top N brands by GMV in brand matrix
// ----------------------------


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  addProducerInsightsMenu(SpreadsheetApp.getUi());
}

function addProducerInsightsMenu(ui) {
  ui.createMenu('📊 Insights')
    .addItem('▶ Build Producer Insights', 'buildProducerInsights')
    .addSeparator()
    .addItem('⚙️ ตั้ง Daily Trigger (8:30am)', 'setupInsightsTrigger')
    .addItem('🗑 ลบ Insights Trigger',          'removeInsightsTrigger')
    .addToUi();
}


// ============================================================
//  MAIN
// ============================================================
// อ่าน selected month จาก cell B3 ของ Insights tab — ถ้าว่าง ใช้ latest
function getSelectedMonth_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(INSIGHTS_TAB);
  if (!s) return null;
  var v = s.getRange('B3').getValue();
  if (!v) return null;
  // v format: "May 2026" or "2026-05"
  var sv = String(v).trim();
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (var i = 0; i < months.length; i++) {
    if (sv.indexOf(months[i]) > -1) {
      var yMatch = sv.match(/20\d{2}/);
      if (yMatch) return yMatch[0] + '-' + ('0' + (i + 1)).slice(-2);
    }
  }
  if (/^\d{4}-\d{2}$/.test(sv)) return sv;
  return null;
}

function buildProducerInsights() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perfSheet = ss.getSheetByName(PERF_DATA_TAB);
  if (!perfSheet) { uiAlert('❌ ไม่พบ "' + PERF_DATA_TAB + '"'); return; }

  // อ่าน selected month (ถ้ามี) ก่อน rebuild
  var selectedMonth = getSelectedMonth_();

  var data = perfSheet.getDataRange().getValues();
  if (data.length < 2) { uiAlert('⚠️ Performance Data ว่าง'); return; }

  // Parse rows with date swap normalization
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var prod = String(r[5] || '').trim();
    if (!prod || SKIP_PRODUCERS_LOWER.indexOf(prod.toLowerCase()) > -1) continue;

    var date = normalizeDate_(r[2]);
    if (!date) continue;

    rows.push({
      brand:    String(r[0]).trim(),
      channel:  String(r[1] || '').trim(),
      date:     date,
      ym:       date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2),
      dur:      Number(r[4]) || 0,
      producer: prod,
      gmv:      Number(r[7]) || 0,
      orders:   Number(r[8]) || 0,
      coR:      Number(r[10]) || 0,
      ctr:      Number(r[11]) || 0,
      viewers:  Number(r[12]) || 0,
      engaged:  Number(r[13]) || 0,
    });
  }

  if (rows.length === 0) { uiAlert('⚠️ ไม่มี row valid'); return; }

  // Latest N months
  var ymSet = {};
  rows.forEach(function(r) { ymSet[r.ym] = true; });
  var allYms = Object.keys(ymSet).sort();
  var monthsToShow = allYms.slice(-MONTHS_TO_SHOW);
  // leaderboard month = user-selected (B3) ถ้ามี, ไม่งั้น latest
  var leaderboardMonth = selectedMonth && ymSet[selectedMonth] ? selectedMonth : monthsToShow[monthsToShow.length - 1];
  var latestMonth  = leaderboardMonth;
  // prevMonth = month ก่อนหน้า leaderboardMonth
  var idx = allYms.indexOf(leaderboardMonth);
  var prevMonth = idx > 0 ? allYms[idx - 1] : null;

  // Aggregations
  var prodMonth = {};   // producer → month → stats
  var prodBrand = {};   // producer → brand → stats
  var brandTotal = {};  // brand → totals
  var producers = {};
  var brandsSeen = {};

  rows.forEach(function(r) {
    producers[r.producer] = true;
    brandsSeen[r.brand] = true;

    // Producer × Month
    if (!prodMonth[r.producer]) prodMonth[r.producer] = {};
    if (!prodMonth[r.producer][r.ym]) prodMonth[r.producer][r.ym] = {
      sessions: 0, hours: 0, gmv: 0, orders: 0,
      ctrSum: 0, ctrN: 0, coRSum: 0, coRN: 0,
      viewers: 0, engaged: 0
    };
    var pm = prodMonth[r.producer][r.ym];
    pm.sessions++;
    pm.hours += r.dur;
    pm.gmv += r.gmv;
    pm.orders += r.orders;
    if (r.ctr > 0) { pm.ctrSum += r.ctr; pm.ctrN++; }
    if (r.coR > 0) { pm.coRSum += r.coR; pm.coRN++; }
    pm.viewers += r.viewers;
    pm.engaged += r.engaged;

    // Producer × Brand
    if (!prodBrand[r.producer]) prodBrand[r.producer] = {};
    if (!prodBrand[r.producer][r.brand]) prodBrand[r.producer][r.brand] = { gmv: 0, hours: 0, sessions: 0 };
    var pb = prodBrand[r.producer][r.brand];
    pb.gmv += r.gmv;
    pb.hours += r.dur;
    pb.sessions++;

    // Brand total (for benchmark)
    if (!brandTotal[r.brand]) brandTotal[r.brand] = { gmv: 0, hours: 0, sessions: 0 };
    brandTotal[r.brand].gmv += r.gmv;
    brandTotal[r.brand].hours += r.dur;
    brandTotal[r.brand].sessions++;
  });

  // Brand benchmark = total GMV / total hours (all-time)
  var brandBench = {};
  Object.keys(brandTotal).forEach(function(b) {
    brandBench[b] = brandTotal[b].hours > 0 ? brandTotal[b].gmv / brandTotal[b].hours : 0;
  });

  // Sort: producers by latest month GMV (desc), brands by total GMV (desc)
  var producerList = Object.keys(producers).sort(function(a, b) {
    var ag = (prodMonth[a] && prodMonth[a][latestMonth]) ? prodMonth[a][latestMonth].gmv : 0;
    var bg = (prodMonth[b] && prodMonth[b][latestMonth]) ? prodMonth[b][latestMonth].gmv : 0;
    if (ag !== bg) return bg - ag;
    // tiebreaker: total all-time GMV
    var aTotal = 0, bTotal = 0;
    Object.keys(prodMonth[a] || {}).forEach(function(m) { aTotal += prodMonth[a][m].gmv; });
    Object.keys(prodMonth[b] || {}).forEach(function(m) { bTotal += prodMonth[b][m].gmv; });
    return bTotal - aTotal;
  });

  var topBrands = Object.keys(brandsSeen).sort(function(a, b) {
    return brandTotal[b].gmv - brandTotal[a].gmv;
  }).slice(0, TOP_BRANDS_N);

  writeInsightsTab_(ss, {
    monthsToShow: monthsToShow,
    latestMonth:  latestMonth,
    prevMonth:    prevMonth,
    producers:    producerList,
    prodMonth:    prodMonth,
    prodBrand:    prodBrand,
    brandBench:   brandBench,
    brandTotal:   brandTotal,
    topBrands:    topBrands,
    totalRows:    rows.length,
    allYms:       allYms,
  });

  uiAlert(
    '✅ Producer Insights สร้างเสร็จ!\n\n' +
    'Sessions: ' + rows.length + '\n' +
    'Producers: ' + producerList.length + '\n' +
    'Brands: ' + Object.keys(brandsSeen).length + ' (top ' + TOP_BRANDS_N + ' in matrix)\n' +
    'Months: ' + monthsToShow.join(', ') + '\n\n' +
    '⚠️ Date swap fix applied automatically'
  );
}


// ============================================================
//  WRITE THE INSIGHTS TAB
// ============================================================
function writeInsightsTab_(ss, ctx) {
  var sheet = ss.getSheetByName(INSIGHTS_TAB) || ss.insertSheet(INSIGHTS_TAB);
  sheetClearAll_(sheet);

  var TOTAL_COLS = 13;
  var row = 1;
  var tz = Session.getScriptTimeZone();

  // ─────────────────────────────────────────────
  //  TITLE
  // ─────────────────────────────────────────────
  sheet.setRowHeight(row, 44);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('📊 PRODUCER INSIGHTS — Hard Performance Analysis')
    .setBackground('#1A1A1A').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  row++;

  // Period subtitle
  var monthLabels = ctx.monthsToShow.map(function(m) {
    var parts = m.split('-');
    var names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[parseInt(parts[1])] + ' ' + parts[0].slice(2);
  });
  // label เดือนที่ leaderboard กำลังแสดง
  var lbParts = ctx.latestMonth.split('-');
  var monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var latestLabel = monthNames[parseInt(lbParts[1])] + ' ' + lbParts[0];

  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('Heatmap months: ' + monthLabels.join(' · ') + '   |   Refreshed: ' + Utilities.formatDate(new Date(), tz, 'd MMM yyyy HH:mm'))
    .setBackground('#2C2C2A').setFontColor('#BBBBBB').setFontSize(9).setHorizontalAlignment('center');
  row++;

  // ─────────────────────────────────────────────
  //  MONTH SELECTOR — cell B3 (read by next build)
  // ─────────────────────────────────────────────
  sheet.setRowHeight(row, 32);
  sheet.getRange(row, 1).setValue('📅 Leaderboard month:')
    .setBackground('#E8F0FE').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  // generate dropdown values: "May 2026" labels for all months
  var dropdownLabels = ctx.allYms.map(function(ym) {
    var p = ym.split('-');
    return monthNames[parseInt(p[1])] + ' ' + p[0];
  });
  var dv = SpreadsheetApp.newDataValidation()
    .requireValueInList(dropdownLabels, true).setAllowInvalid(true).build();
  sheet.getRange(row, 2).setValue(latestLabel).setDataValidation(dv)
    .setBackground('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#2E5CA8', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(row, 3, 1, TOTAL_COLS - 2).merge()
    .setValue('  ⤴ เปลี่ยนเดือนแล้วกด menu "📊 Insights → ▶ Build Producer Insights" ใหม่')
    .setFontColor('#666').setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  row += 2;

  // ─────────────────────────────────────────────
  //  SECTION 1 — CURRENT MONTH KPI
  // ─────────────────────────────────────────────
  var totalGmv = 0, totalSessions = 0, totalHours = 0;
  ctx.producers.forEach(function(p) {
    var pm = ctx.prodMonth[p] && ctx.prodMonth[p][ctx.latestMonth];
    if (pm) { totalGmv += pm.gmv; totalSessions += pm.sessions; totalHours += pm.hours; }
  });

  var upMovers = 0, downMovers = 0;
  ctx.producers.forEach(function(p) {
    var latest = ctx.prodMonth[p] && ctx.prodMonth[p][ctx.latestMonth];
    var prev   = ctx.prodMonth[p] && ctx.prodMonth[p][ctx.prevMonth];
    if (latest && prev && prev.gmv > 0) {
      var ch = (latest.gmv - prev.gmv) / prev.gmv;
      if (ch >= 0.30) upMovers++;
      else if (ch <= -0.30) downMovers++;
    }
  });

  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ ' + latestLabel + ' SUMMARY ━━━━')
    .setBackground('#1E3A6E').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var kpis = [
    { label: '📋  Sessions',           value: totalSessions,                                bg: '#1E3A5F', fg: '#7FB3E8' },
    { label: '💰  Total GMV',          value: '฿' + Math.round(totalGmv).toLocaleString(), bg: '#0F3D2B', fg: '#76C59E' },
    { label: '⏱  Total Hours',         value: Math.round(totalHours * 10) / 10,            bg: '#3D2E08', fg: '#FAC775' },
    { label: '🚀 ↑Movers / ↓Decliners', value: upMovers + ' ↑  /  ' + downMovers + ' ↓',  bg: '#3D1212', fg: '#F09251' },
  ];
  drawKpiCards_(sheet, row, kpis, TOTAL_COLS);
  row += 3;

  // ─────────────────────────────────────────────
  //  SECTION 2 — LEADERBOARD
  // ─────────────────────────────────────────────
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🏆 PRODUCER LEADERBOARD — ' + latestLabel + ' ━━━━')
    .setBackground('#1E3A6E').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var lbHdrs = ['#', 'Producer', 'Sessions', 'Hours', 'GMV', 'GMV/Hr', 'CTR avg', 'Co_R avg', 'Orders', 'vs Team Avg', 'MoM Change', 'Trend', 'Status'];
  sheet.getRange(row, 1, 1, lbHdrs.length).setValues([lbHdrs])
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(row, 30);
  row++;

  var teamAvgGmvHr = totalHours > 0 ? totalGmv / totalHours : 0;

  var lbData = [];
  var lbBadges = [];
  ctx.producers.forEach(function(p, idx) {
    var pm = ctx.prodMonth[p] && ctx.prodMonth[p][ctx.latestMonth];
    if (!pm) return;
    var gmvHr  = pm.hours > 0 ? pm.gmv / pm.hours : 0;
    var ctrAvg = pm.ctrN > 0 ? pm.ctrSum / pm.ctrN : 0;
    var coRAvg = pm.coRN > 0 ? pm.coRSum / pm.coRN : 0;
    var vsAvg  = teamAvgGmvHr > 0 ? gmvHr / teamAvgGmvHr - 1 : 0;

    var prev = ctx.prodMonth[p] && ctx.prodMonth[p][ctx.prevMonth];
    var momText = '—';
    if (prev && prev.gmv > 0) {
      var ch = (pm.gmv - prev.gmv) / prev.gmv;
      var arrow = ch > 0.01 ? '↑' : ch < -0.01 ? '↓' : '→';
      momText = arrow + ' ' + (ch >= 0 ? '+' : '') + Math.round(ch * 100) + '%';
    }

    var sparkVals = ctx.monthsToShow.map(function(m) {
      var pmm = ctx.prodMonth[p] && ctx.prodMonth[p][m];
      return pmm ? pmm.gmv : 0;
    });
    var sparkFormula = '=SPARKLINE({' + sparkVals.join(',') + '}, {"charttype","line";"color1","#1E3A6E";"linewidth",2})';

    var vsRatio = teamAvgGmvHr > 0 ? gmvHr / teamAvgGmvHr : 0;
    var badge = vsRatio >= 1.5 ? '🏆 Top'
              : vsRatio >= 1.0 ? '✅ Above'
              : vsRatio >= 0.5 ? '⚠️ Below'
              : '🔴 At Risk';

    lbData.push([
      idx + 1, p,
      pm.sessions, Math.round(pm.hours * 10) / 10,
      Math.round(pm.gmv), Math.round(gmvHr),
      ctrAvg, coRAvg, pm.orders,
      vsAvg, momText, sparkFormula, badge
    ]);
    lbBadges.push(badge);
  });

  if (lbData.length > 0) {
    sheet.getRange(row, 1, lbData.length, lbHdrs.length).setValues(lbData);
    sheet.getRange(row, 5, lbData.length, 2).setNumberFormat('#,##0');     // GMV, GMV/Hr
    sheet.getRange(row, 7, lbData.length, 2).setNumberFormat('0.00%');     // CTR, Co_R
    sheet.getRange(row, 9, lbData.length, 1).setNumberFormat('#,##0');     // Orders
    sheet.getRange(row, 10, lbData.length, 1).setNumberFormat('+0%;-0%;0%'); // vs avg

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
      .setValue('ไม่มี data ในเดือนล่าสุด')
      .setFontColor('#888').setHorizontalAlignment('center');
    row++;
  }
  row += 2;

  // ─────────────────────────────────────────────
  //  SECTION 3 — PRODUCER × MONTH HEATMAP (GMV/Hr)
  // ─────────────────────────────────────────────
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 📈 PRODUCER × MONTH  (GMV per Hour, ฿) ━━━━')
    .setBackground('#1E3A6E').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var pmHdrs = ['Producer'].concat(monthLabels).concat(['Trend']);
  sheet.getRange(row, 1, 1, pmHdrs.length).setValues([pmHdrs])
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center');
  row++;

  // Percentiles for heatmap color
  var allVals = [];
  ctx.producers.forEach(function(p) {
    ctx.monthsToShow.forEach(function(m) {
      var pm = ctx.prodMonth[p] && ctx.prodMonth[p][m];
      if (pm && pm.hours > 0) allVals.push(pm.gmv / pm.hours);
    });
  });
  allVals.sort(function(a, b) { return a - b; });
  var p50 = allVals[Math.floor(allVals.length * 0.5)] || 0;
  var p75 = allVals[Math.floor(allVals.length * 0.75)] || 0;
  var p90 = allVals[Math.floor(allVals.length * 0.9)] || 0;

  var pmData = [];
  var pmColors = [];
  ctx.producers.forEach(function(p) {
    var rowVals = [p];
    var sparkVals = [];
    var colors = [null];
    ctx.monthsToShow.forEach(function(m) {
      var pm = ctx.prodMonth[p] && ctx.prodMonth[p][m];
      var gmvHr = pm && pm.hours > 0 ? pm.gmv / pm.hours : 0;
      rowVals.push(gmvHr);
      sparkVals.push(gmvHr);
      colors.push(gmvHr);
    });
    rowVals.push('=SPARKLINE({' + sparkVals.join(',') + '}, {"charttype","line";"color1","#1E3A6E";"linewidth",2})');
    colors.push(null);
    pmData.push(rowVals);
    pmColors.push(colors);
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

  // ─────────────────────────────────────────────
  //  SECTION 4 — PRODUCER × BRAND HEATMAP (vs benchmark)
  // ─────────────────────────────────────────────
  sheet.setRowHeight(row, 26);
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('━━━━ 🏷️ PRODUCER × BRAND  (GMV/Hr vs Brand Benchmark, top ' + TOP_BRANDS_N + ' brands) ━━━━')
    .setBackground('#1E3A6E').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  row++;

  var pbHdrs = ['Producer'].concat(ctx.topBrands);
  var headerRange = sheet.getRange(row, 1, 1, pbHdrs.length);
  headerRange.setValues([pbHdrs])
    .setBackground('#2E5CA8').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(8)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(row, 44);
  row++;

  var pbData = [];
  var pbColors = [];
  ctx.producers.forEach(function(p) {
    var rowVals = [p];
    var colors = [null];
    ctx.topBrands.forEach(function(b) {
      var pb = ctx.prodBrand[p] && ctx.prodBrand[p][b];
      if (!pb || pb.hours === 0) {
        rowVals.push('');
        colors.push(null);
      } else {
        var gmvHr = pb.gmv / pb.hours;
        var bench = ctx.brandBench[b] || 0;
        var pct = bench > 0 ? gmvHr / bench - 1 : 0;
        rowVals.push(pct);
        colors.push(pct);
      }
    });
    pbData.push(rowVals);
    pbColors.push(colors);
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

  // Legend
  sheet.getRange(row, 1, 1, TOTAL_COLS).merge()
    .setValue('💡 vs Bench Legend:  🟩 ≥+50%   🟢 +10 to +50%   🟡 ±10% (avg)   🟠 -10 to -50%   🟥 <-50%   blank = no sessions for that brand')
    .setBackground('#F5F5F5').setFontColor('#555').setFontSize(9).setFontStyle('italic')
    .setHorizontalAlignment('center');

  // Layout
  sheet.setFrozenRows(3);
  // sheet.setFrozenColumns(2); // disabled — conflicts with title-row merge spanning all cols

  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 110);
  for (var c = 3; c <= TOTAL_COLS; c++) sheet.setColumnWidth(c, 88);
}


// ============================================================
//  HELPERS
// ============================================================
function drawKpiCards_(sheet, startRow, kpis, totalCols) {
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

// Date normalize with swap fix (for US locale auto-parse bug)
function normalizeDate_(d) {
  if (!d) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    var year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate();
    if (day <= 12) { var tmp = day; day = month; month = tmp; }
    return new Date(year, month - 1, day);
  }
  var s = String(d).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var y = parseInt(m[3]); if (y < 100) y += 2000;
    return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
  }
  var p = new Date(s);
  if (isNaN(p.getTime())) return null;
  var py = p.getFullYear(), pm = p.getMonth() + 1, pd = p.getDate();
  if (pd <= 12) { var t = pd; pd = pm; pm = t; }
  return new Date(py, pm - 1, pd);
}

function setupInsightsTrigger() {
  removeInsightsTrigger();
  ScriptApp.newTrigger('buildProducerInsights').timeBased().atHour(8).nearMinute(30).everyDays(1).create();
  uiAlert('✅ ตั้ง trigger รัน Producer Insights ทุกวัน 8:30am');
}

function removeInsightsTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'buildProducerInsights') {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  uiAlert('🗑 ลบ trigger ' + n + ' รายการ');
}

function uiAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function sheetClearAll_(sheet) {
  var f = sheet.getFilter(); if (f) f.remove();
  sheet.clear();
  var r = sheet.getConditionalFormatRules();
  if (r.length) sheet.setConditionalFormatRules([]);
}
