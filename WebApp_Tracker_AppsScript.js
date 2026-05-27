// ============================================================
//  WEB APP BACKEND — Producer Performance Tracker (Mobile Entry)
//
//  ติดตั้ง: ใน Apps Script project เดียวกับ SessionBuilder_AppsScript
//  Files needed:
//    - WebApp_Tracker_AppsScript.gs  (this file)
//    - WebApp_Tracker.html           (frontend)
//
//  Deploy:
//    1. Apps Script editor → Deploy → New deployment
//    2. Type: Web app
//    3. Execute as: Me
//    4. Who has access: Anyone in your organization
//    5. Copy URL → bookmark บนมือถือ Senior Producers
//
//  ใช้ MASTER_LOG_NAME + SENIOR_PRODUCERS + EXCLUDED_PRODUCERS
//  จาก SessionBuilder_AppsScript.js (วางอยู่ project เดียวกัน → share globals)
// ============================================================


// ============================================================
//  HTTP entry point
// ============================================================
function doGet(e) {
  return HtmlService.createTemplateFromFile('WebApp_Tracker')
    .evaluate()
    .setTitle('📋 Producer Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ============================================================
//  Data API — called from frontend via google.script.run
// ============================================================

/**
 * Returns sessions filtered by senior + date range
 * @param {string} filter - 'today' | 'overdue' | 'all-week'
 * @param {string} seniorName - senior PIC filter, '' = all
 */
function getSessions(filter, seniorName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ml = ss.getSheetByName('Master Log');
  if (!ml) throw new Error('Master Log tab not found');

  var data = ml.getDataRange().getValues();
  if (data.length < 3) return { sessions: [], meta: { user: getCurrentUser_() } };

  var today = new Date(); today.setHours(0,0,0,0);
  var todayTime = today.getTime();
  var excluded = ['TBCP', 'Cancel', 'Brand'];

  var sessions = [];
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    var prod = (row[2] || '').toString().trim();
    if (excluded.indexOf(prod) > -1) continue;

    var d = row[0] instanceof Date ? new Date(row[0]) : new Date(row[0].toString());
    d.setHours(0,0,0,0);
    var dTime = d.getTime();
    var status = (row[23] || '').toString();

    // Apply filter
    if (filter === 'today' && dTime !== todayTime) continue;
    if (filter === 'overdue' && status.indexOf('Overdue') === -1) continue;
    if (filter === 'all-week') {
      var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      if (dTime < weekAgo.getTime() || dTime > todayTime) continue;
    }

    // Apply senior filter
    var sen = (row[4] || '').toString().trim();
    if (seniorName && sen !== seniorName) continue;

    sessions.push({
      key:       _formatDateKey(d) + '|' + row[1] + '|' + row[2] + '|' + row[3],
      rowIdx:    i + 1, // 1-indexed sheet row
      date:      _formatDateKey(d),
      dateISO:   Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      time:      row[1],
      producer:  row[2],
      brand:     row[3],
      senior:    sen,
      pre:       [row[5], row[6], row[7], row[8], row[9], row[10]],
      durBase:   [row[11], row[12], row[13], row[14]],
      durBonus:  row[15],
      postBase:  [row[16], row[17], row[18], row[19]],
      postBonus: row[20],
      baseScore: row[21],
      bonusScore:row[22],
      status:    status
    });
  }

  // Sort: pending first, then by time
  sessions.sort(function(a, b) {
    var aDone = a.status.indexOf('Done') > -1 ? 1 : 0;
    var bDone = b.status.indexOf('Done') > -1 ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.time.localeCompare(b.time);
  });

  return {
    sessions: sessions,
    meta: {
      user: getCurrentUser_(),
      todayStr: Utilities.formatDate(today, Session.getScriptTimeZone(), 'd MMMM yyyy'),
      seniors: ['Mink', 'Peet', 'Nine']
    }
  };
}


/**
 * Save evaluation — writes Senior PIC + 16 checklist items
 * @param {object} payload {key, senior, items: [17 values]}
 */
function saveEvaluation(payload) {
  if (!payload || !payload.key) throw new Error('invalid payload');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ml = ss.getSheetByName('Master Log');
  if (!ml) throw new Error('Master Log not found');

  var data = ml.getDataRange().getValues();
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var d = row[0] instanceof Date ? row[0] : new Date(row[0].toString());
    var mkey = _formatDateKey(d) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (mkey !== payload.key) continue;

    // Build 17-value row: senior + 16 items
    var vals = [payload.senior].concat(payload.items);
    if (vals.length !== 17) throw new Error('expected 17 values, got ' + vals.length);

    ml.getRange(i + 1, 5, 1, 17).setValues([vals]);

    return {
      ok: true,
      rowIdx: i + 1,
      savedAt: new Date().toISOString()
    };
  }

  return { ok: false, reason: 'key not found' };
}


/**
 * Returns producer's recent score history for context (last 5 sessions)
 */
function getProducerHistory(producerName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ml = ss.getSheetByName('Master Log');
  if (!ml) return [];

  var data = ml.getDataRange().getValues();
  var history = [];
  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if ((row[2] || '').toString().trim() !== producerName) continue;
    if ((row[23] || '').toString().indexOf('Done') === -1) continue;

    var d = row[0] instanceof Date ? row[0] : new Date(row[0].toString());
    history.push({
      date: _formatDateKey(d),
      brand: row[3],
      baseScore: row[21],
      bonusScore: row[22]
    });
  }
  return history.slice(-5).reverse();
}


/**
 * Returns aggregate stats for current senior's team
 */
function getSeniorStats(seniorName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ml = ss.getSheetByName('Master Log');
  if (!ml) return null;

  var data = ml.getDataRange().getValues();
  var assigned = 0, done = 0, overdue = 0, pending = 0;
  var producers = {};

  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    if ((row[4] || '').toString().trim() !== seniorName) continue;

    assigned++;
    var status = (row[23] || '').toString();
    if (status.indexOf('Done') > -1) done++;
    else if (status.indexOf('Overdue') > -1) overdue++;
    else pending++;

    var p = (row[2] || '').toString().trim();
    if (!producers[p]) producers[p] = { sessions: 0, scoreSum: 0, scoreCount: 0 };
    producers[p].sessions++;
    if (status.indexOf('Done') > -1) {
      producers[p].scoreSum += Number(row[21]) || 0;
      producers[p].scoreCount++;
    }
  }

  return {
    assigned: assigned, done: done, overdue: overdue, pending: pending,
    evalRate: assigned > 0 ? Math.round((done / assigned) * 100) : 0,
    producers: producers
  };
}


// ============================================================
//  Helpers
// ============================================================

function getCurrentUser_() {
  try {
    var email = Session.getActiveUser().getEmail();
    return { email: email, name: email.split('@')[0] };
  } catch (e) {
    return { email: 'unknown', name: 'unknown' };
  }
}

// Date → "18 May 2026" (English, locale-independent)
function _formatDateKey(d) {
  var names = ['','January','February','March','April','May','June',
               'July','August','September','October','November','December'];
  return d.getDate() + ' ' + names[d.getMonth() + 1] + ' ' + d.getFullYear();
}
