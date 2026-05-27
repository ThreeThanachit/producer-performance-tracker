// ============================================================
//  WEB APP BACKEND — Producer Performance Dashboard
//
//  ติดตั้งใน: Producer Performance Dashboard (Apps Script project)
//
//  Files needed:
//    - WebApp_AppsScript.gs   (this file)
//    - WebApp.html            (frontend — separate HTML file)
//
//  Deploy:
//    1. Apps Script editor → Deploy → New deployment
//    2. Type: Web app
//    3. Description: Producer Dashboard v1
//    4. Execute as: Me (your account)
//    5. Who has access: Anyone with the link (or Anyone in your org)
//    6. Click Deploy → copy URL → share with team
//
//  หลัง deploy: เปิด URL → เห็น dashboard live data
//  Auto-updates ทุกครั้งที่เปิด (refresh button manual)
// ============================================================

var WEBAPP_PERF_TAB = '📋 Performance Data';
var WEBAPP_SKIP_PRODUCERS = ['', 'tbcp', 'cancel', 'brand'];
var WEBAPP_SKIP_MCS = ['', 'tbcp', 'cancel', 'brand', 'n/a', 'na', '-'];


// ============================================================
//  HTTP entry point
// ============================================================
function doGet(e) {
  return HtmlService.createTemplateFromFile('WebApp')
    .evaluate()
    .setTitle('📊 Producer Performance Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ============================================================
//  Data API — called from frontend via google.script.run
// ============================================================

// Returns all sessions (parsed + date-fixed) as array of objects
function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var perfSheet = ss.getSheetByName(WEBAPP_PERF_TAB);
  if (!perfSheet) throw new Error('Tab "' + WEBAPP_PERF_TAB + '" not found');

  var data = perfSheet.getDataRange().getValues();
  if (data.length < 2) return { sessions: [], meta: {} };

  var sessions = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    var prod = String(r[5] || '').trim();
    if (!prod || WEBAPP_SKIP_PRODUCERS.indexOf(prod.toLowerCase()) > -1) continue;

    var date = webAppNormDate_(r[2]);
    if (!date) continue;

    sessions.push({
      brand:    String(r[0]).trim(),
      channel:  String(r[1] || '').trim(),
      date:     date.toISOString().slice(0, 10),  // "2026-05-15"
      ym:       date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2),
      slot:     String(r[3] || ''),
      dur:      Number(r[4]) || 0,
      producer: prod,
      mc:       String(r[6] || '').trim(),
      gmv:      Number(r[7]) || 0,
      orders:   Number(r[8]) || 0,
      units:    Number(r[9]) || 0,
      coR:      Number(r[10]) || 0,
      ctr:      Number(r[11]) || 0,
      viewers:  Number(r[12]) || 0,
      engaged:  Number(r[13]) || 0,
      comments: Number(r[14]) || 0,
    });
  }

  // Metadata for filters
  var monthsSet = {}, brandsSet = {}, channelsSet = {}, producersSet = {}, mcsSet = {};
  sessions.forEach(function(s) {
    monthsSet[s.ym] = true;
    if (s.brand) brandsSet[s.brand] = true;
    if (s.channel) channelsSet[s.channel] = true;
    if (s.producer) producersSet[s.producer] = true;
    if (s.mc && WEBAPP_SKIP_MCS.indexOf(s.mc.toLowerCase()) === -1) mcsSet[s.mc] = true;
  });

  return {
    sessions: sessions,
    meta: {
      months:    Object.keys(monthsSet).sort(),
      brands:    Object.keys(brandsSet).sort(),
      channels:  Object.keys(channelsSet).sort(),
      producers: Object.keys(producersSet).sort(),
      mcs:       Object.keys(mcsSet).sort(),
      lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm'),
      totalRows: sessions.length,
    }
  };
}


// Date normalize with swap fix
function webAppNormDate_(d) {
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


// Optional: include another HTML file (for templates)
function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
