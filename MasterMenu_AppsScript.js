// ============================================================
//  MASTER MENU — รวมทุก analytics เป็น dropdown เดียว
//
//  แทนที่ menu calls เดิม 6 ตัวใน Code.gs onOpen ด้วย 1 บรรทัด:
//    buildMasterMenu_(SpreadsheetApp.getUi());
//
//  ผลลัพธ์: 1 menu "📊 Team Analytics" แทน 6 menus ด้านบน
//
//  ⚠️ ต้องลบ addXxxMenu(...) calls อื่นใน onOpen เดิมออกทั้งหมด
//     เหลือแค่ buildMasterMenu_(ui) อันเดียว
// ============================================================

function buildMasterMenu_(ui) {
  var menu = ui.createMenu('📊 Team Analytics');

  // ── Performance Analytics submenu ──
  menu.addSubMenu(ui.createMenu('📈 Performance')
    .addItem('📊 Producer Insights',       'buildProducerInsights')
    .addItem('🎤 MC Insights',             'buildMCInsights')
    .addItem('💑 Pair Chemistry',          'buildPairChemistry')
    .addItem('🔄 Engagement Funnel',       'buildEngagementFunnel')
    .addSeparator()
    .addItem('▶ Build ALL Performance tabs', 'buildAllPerformanceTabs_'));

  // ── Data Quality submenu ──
  menu.addSubMenu(ui.createMenu('🔍 Data Quality')
    .addItem('🔍 Smart Audit',             'buildSmartAudit')
    .addItem('🔗 Unified Scorecard (legacy)', 'buildUnifiedAll'));

  // ── Triggers submenu ──
  menu.addSubMenu(ui.createMenu('⚙️ Triggers')
    .addItem('✅ Setup ALL daily triggers',  'setupAllTeamTriggers')
    .addItem('🗑 Remove ALL team triggers',  'removeAllTeamTriggers')
    .addSeparator()
    .addItem('📋 List all triggers',         'listAllTeamTriggers'));

  menu.addToUi();
}


// ============================================================
//  Combined run-all-performance
// ============================================================
function buildAllPerformanceTabs_() {
  var ui = SpreadsheetApp.getUi();
  var results = [];

  function tryRun(fn, label) {
    try { fn(); results.push('✅ ' + label); }
    catch (e) { results.push('❌ ' + label + ': ' + e.message); }
  }

  tryRun(buildProducerInsights,    'Producer Insights');
  tryRun(buildMCInsights,          'MC Insights');
  tryRun(buildPairChemistry,       'Pair Chemistry');
  tryRun(buildEngagementFunnel,    'Engagement Funnel');

  try {
    ui.alert('Build All Results:\n\n' + results.join('\n'));
  } catch (e) { /* trigger context */ }
}


// ============================================================
//  Trigger management — all in one place
// ============================================================
var TEAM_TRIGGER_FUNCTIONS = [
  { fn: 'buildSmartAudit',       hour: 7, minute: 30 },
  { fn: 'buildUnifiedAll',       hour: 8, minute: 0  },
  { fn: 'buildProducerInsights', hour: 8, minute: 30 },
  { fn: 'buildMCInsights',       hour: 8, minute: 45 },
  { fn: 'buildPairChemistry',    hour: 9, minute: 0  },
  { fn: 'buildEngagementFunnel', hour: 9, minute: 15 },
];

function setupAllTeamTriggers() {
  removeAllTeamTriggers_silent();
  var log = [];
  TEAM_TRIGGER_FUNCTIONS.forEach(function(t) {
    try {
      ScriptApp.newTrigger(t.fn).timeBased().atHour(t.hour).nearMinute(t.minute).everyDays(1).create();
      log.push('✅ ' + t.fn + ' @ ' + t.hour + ':' + ('0' + t.minute).slice(-2));
    } catch (e) {
      log.push('❌ ' + t.fn + ': ' + e.message);
    }
  });
  try {
    SpreadsheetApp.getUi().alert('Triggers Setup:\n\n' + log.join('\n'));
  } catch (e) {}
}

function removeAllTeamTriggers() {
  var n = removeAllTeamTriggers_silent();
  try {
    SpreadsheetApp.getUi().alert('🗑 ลบ team triggers ' + n + ' รายการ');
  } catch (e) {}
}

function removeAllTeamTriggers_silent() {
  var teamFns = TEAM_TRIGGER_FUNCTIONS.map(function(t) { return t.fn; });
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (teamFns.indexOf(t.getHandlerFunction()) > -1) {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  return n;
}

function listAllTeamTriggers() {
  var teamFns = TEAM_TRIGGER_FUNCTIONS.map(function(t) { return t.fn; });
  var rows = [];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    var marker = teamFns.indexOf(fn) > -1 ? '📊' : '  ';
    rows.push(marker + ' ' + fn);
  });
  if (rows.length === 0) rows.push('(no triggers)');
  try {
    SpreadsheetApp.getUi().alert('All Triggers in Project:\n\n' + rows.join('\n'));
  } catch (e) {}
}
