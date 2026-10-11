/**
 * Anchor backend: Google Sheet + Claude proxy + calendar reminders.
 * One Apps Script web app:
 *   action:'ping'      connection test
 *   action:'log'       append a body-skill check-in row to "Log" (idempotent on entry_id)
 *   action:'reframe'   3 alternative stories for a check-in
 *   action:'save'      upsert app records into "Records" (by type+id); weekly reviews also land in "Therapy Digest"
 *   action:'restore'   return every record, so a new phone gets everything back
 *   action:'coach'     proxy one Claude call for the in-app coach
 *   action:'reminders' create/replace daily + weekly reminder events in your Google Calendar
 * Plus buildWeeklySummary() for the Sunday check-in summary trigger.
 *
 * SETUP: see SETUP.md. Script Properties needed: APP_SECRET, ANTHROPIC_API_KEY.
 * Never put either value in this file.
 */

var LOG_SHEET = 'Log';
var SUMMARY_SHEET = 'Weekly Summary';
var RECORDS_SHEET = 'Records';
var DIGEST_SHEET = 'Therapy Digest';
var CLAUDE_MODEL = 'claude-opus-5';

var LOG_HEADERS = [
  'timestamp','entry_id','mode','weekday','time_of_day','trigger','body','emotions',
  'distress_before','fears','floatback','urges','urge_before',
  'interpretation','facts_known','alt_explanation','fits_facts',
  'grounding_completed','grounding','distress_after_grounding',
  'pause_minutes','pause_completed','urge_after','distress_after_pause','acted_on_urge','what_helped',
  'escalation_used','distress_final','chosen_story','ai_suggestions','closing_note',
  'duration_minutes','abandoned'
];
var RECORD_HEADERS = ['key','type','id','date','updated','data'];
var DIGEST_HEADERS = ['week_ending','day_of_year','phase','for_my_therapist','coach_read','promises_kept','catches','experiments'];

/* ------------------------------------------------------------------ */

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ result: 'error', message: 'Bad JSON' }); }

  var secret = PropertiesService.getScriptProperties().getProperty('APP_SECRET') || '';
  if (!secret || data.secret !== secret) {
    return json_({ result: 'error', message: 'Wrong or missing app secret' });
  }

  try {
    if (data.action === 'ping')      return json_({ result: 'ok', message: 'Anchor endpoint is live', coach: !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') });
    if (data.action === 'log')       return handleLog_(data.entry || {});
    if (data.action === 'reframe')   return handleReframe_(data.entry || {});
    if (data.action === 'save')      return handleSave_(data.records || []);
    if (data.action === 'restore')   return handleRestore_();
    if (data.action === 'coach')     return handleCoach_(data);
    if (data.action === 'reminders') return handleReminders_(data);
    return json_({ result: 'error', message: 'Unknown action' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  }
}

function doGet() {
  return json_({ result: 'ok', message: 'Anchor endpoint is live. POST with your app secret to use it.' });
}

/* ---------------- log (body-skill check-ins) ---------------- */

function handleLog_(en) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_(LOG_SHEET, LOG_HEADERS);

    if (en.entry_id) {
      var ids = sheet.getLastRow() > 1
        ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
        : [];
      if (ids.indexOf(String(en.entry_id)) >= 0) {
        return json_({ result: 'ok', deduped: true });
      }
    }

    var g = en.grounding || {};
    var groundingTxt = ['see','touch','hear','smell','taste'].map(function (k) {
      var v = (g[k] || []).filter(String).join(', ');
      return v ? k + ': ' + v : '';
    }).filter(String).join(' | ');

    sheet.appendRow([
      en.started_at ? new Date(en.started_at) : new Date(),
      en.entry_id || '', en.mode || 'full', en.weekday || '', en.time_of_day || '',
      en.trigger || '',
      joinList_(en.body, en.body_other), joinList_(en.emotions, en.emotions_other),
      numOr_(en.distress_before), en.fears || '', en.floatback || '',
      joinList_(en.urges, en.urges_other), numOr_(en.urge_before),
      en.interpretation || '', en.facts_known || '', en.alt_explanation || '', en.fits_facts || '',
      en.grounding_completed ? 'yes' : 'no', groundingTxt, numOr_(en.distress_after_grounding),
      numOr_(en.pause_minutes), en.pause_completed ? 'yes' : 'no',
      numOr_(en.urge_after), numOr_(en.distress_after_pause), en.acted_on_urge || '', en.what_helped || '',
      en.escalation_used || '', numOr_(en.distress_final),
      en.chosen_story || '', en.ai_suggestions || '', en.closing_note || '',
      numOr_(en.duration_minutes), en.abandoned ? 'yes' : ''
    ]);
    return json_({ result: 'ok' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- records (upsert + restore) ---------------- */

function handleSave_(records) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_(RECORDS_SHEET, RECORD_HEADERS);
    var last = sheet.getLastRow();
    var keys = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = new Date();
    records.forEach(function (r) {
      var key = r.type + '|' + r.id;
      var row = [key, r.type, r.id, r.date || '', now, JSON.stringify(r.data)];
      var i = keys.indexOf(key);
      if (i >= 0) sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
      else { sheet.appendRow(row); keys.push(key); }
      if (r.type === 'week') upsertDigest_(r.data || {});
    });
    return json_({ result: 'ok', saved: records.length });
  } finally {
    lock.releaseLock();
  }
}

function upsertDigest_(w) {
  var sheet = getSheet_(DIGEST_SHEET, DIGEST_HEADERS);
  var last = sheet.getLastRow();
  var weeks = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return String(r[0]); }) : [];
  var st = w.stats || {};
  var row = [w.weekEnd || '', w.dayNum || '', w.phase || '', w.digest || '', w.read || '',
    (st.kept != null ? st.kept + ' of ' + st.promises : ''), st.catches || 0, st.experiments || 0];
  var i = weeks.indexOf(String(w.weekEnd));
  if (i >= 0) sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function handleRestore_() {
  var sheet = getSheet_(RECORDS_SHEET, RECORD_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return json_({ result: 'ok', records: [] });
  var rows = sheet.getRange(2, 1, last - 1, RECORD_HEADERS.length).getValues();
  var out = rows.map(function (r) { return { type: String(r[1]), id: String(r[2]), data: String(r[5]) }; });
  return json_({ result: 'ok', records: out });
}

/* ---------------- Claude ---------------- */

function claude_(body) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('No ANTHROPIC_API_KEY set in Script Properties');
  body.model = CLAUDE_MODEL;
  body.fallbacks = 'default';
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify(body)
  });
  var code = res.getResponseCode();
  if (code !== 200) throw new Error(friendlyAiError_(code, res.getContentText()));
  var msg = JSON.parse(res.getContentText());
  if (msg.stop_reason === 'refusal') throw new Error('The AI declined this one. Try rewording.');
  // thinking blocks come first on current models; take the text blocks only
  return (msg.content || []).filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; }).join('\n').trim();
}

function handleCoach_(d) {
  var effort = ['low', 'medium', 'high'].indexOf(d.effort) >= 0 ? d.effort : 'low';
  var maxTokens = Math.min(Math.max(Number(d.max_tokens) || 3000, 500), 8000);
  var messages = (d.messages || []).filter(function (m) {
    return (m.role === 'user' || m.role === 'assistant') && m.content;
  });
  if (!messages.length) return json_({ result: 'error', message: 'No messages' });
  var text = claude_({
    max_tokens: maxTokens,
    system: String(d.system || ''),
    output_config: { effort: effort },
    messages: messages
  });
  return json_({ result: 'ok', text: text });
}

function handleReframe_(en) {
  var prompt =
    'You are helping someone finish a structured therapy check-in (a DBT-style "check the facts" exercise). ' +
    'They were triggered, named their fear, and wrote down their own evidence. Your ONLY job is to offer 3 alternative ' +
    'interpretations ("stories") that fit THEIR OWN written evidence.\n\n' +
    'Their entry:\n' +
    '- Trigger: ' + (en.trigger || '(not given)') + '\n' +
    '- Emotions: ' + (en.emotions || '(not given)') + '\n' +
    '- Fear / what they are afraid it means: ' + (en.fears || '(not given)') + '\n' +
    '- Earlier time they felt this: ' + (en.floatback || '(not given)') + '\n' +
    '- What they are telling themselves it means: ' + (en.interpretation || '(not given)') + '\n' +
    '- What they actually KNOW (verifiable): ' + (en.facts_known || '(not given)') + '\n' +
    '- Their own alternative explanation: ' + (en.alt_explanation || '(not given)') + '\n' +
    '- Their own verdict on whether the emotion fits the facts: ' + (en.fits_facts || '(not given)') + '\n\n' +
    'Rules:\n' +
    '1. Each story must be grounded in the facts they wrote, no invented details, no mind-reading of other people.\n' +
    '2. No empty reassurance ("they probably love you"). Plausible readings of the evidence only.\n' +
    '3. Each story under 35 words, second person or first person, plain warm language.\n' +
    '4. For each story, name in a few words which of their facts supports it.\n' +
    '5. If their evidence genuinely supports the fear, say so plainly in one story and orient it toward what they can do next. Do not manufacture positivity.\n' +
    '6. Never diagnose, never claim to be a therapist, never tell them how they should feel. Never use em dashes.\n\n' +
    'Return ONLY JSON, no markdown fences: {"stories":[{"story":"...","based_on":"..."},{"story":"...","based_on":"..."},{"story":"...","based_on":"..."}]}';

  var text;
  try {
    text = claude_({ max_tokens: 3000, output_config: { effort: 'low' }, messages: [{ role: 'user', content: prompt }] });
  } catch (err) {
    return json_({ result: 'error', message: String(err.message || err) });
  }
  text = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  var stories;
  try { stories = JSON.parse(text).stories; }
  catch (err) { return json_({ result: 'error', message: 'Could not parse AI reply' }); }
  if (!stories || !stories.length) return json_({ result: 'error', message: 'AI returned no stories' });

  return json_({ result: 'ok', stories: stories.slice(0, 3) });
}

function friendlyAiError_(code, bodyText) {
  var msg = '';
  try { msg = (JSON.parse(bodyText).error || {}).message || ''; } catch (e) {}
  if (code === 401) return 'The Anthropic API key looks wrong. Check ANTHROPIC_API_KEY in Script Properties.';
  if (code === 400 && /credit balance/i.test(msg)) return 'Anthropic credit balance is too low. Top up at console.anthropic.com.';
  if (code === 429) return 'Rate-limited by the AI. Try again in a minute.';
  if (code === 529) return 'The AI service is overloaded. Try again shortly.';
  return 'AI call failed (' + code + ')' + (msg ? ': ' + msg : '');
}

/* ---------------- calendar reminders ---------------- */
// Replaces the previous Anchor reminder series each time, so changing times in the app just works.

function handleReminders_(d) {
  var props = PropertiesService.getScriptProperties();
  var cal = CalendarApp.getDefaultCalendar();
  var old = JSON.parse(props.getProperty('REMINDER_SERIES') || '[]');
  old.forEach(function (id) {
    try { var s = cal.getEventSeriesById(id); if (s) s.deleteEventSeries(); } catch (e) {}
  });
  var ids = [];
  if (d.enabled !== false) {
    var url = String(d.appUrl || '');
    var t = d.times || {};
    if (t.morning) ids.push(makeSeries_(cal, 'Anchor: morning promise', t.morning, null, url));
    if (t.evening) ids.push(makeSeries_(cal, 'Anchor: evening reflection', t.evening, null, url));
    if (t.weekly)  ids.push(makeSeries_(cal, 'Anchor: weekly review', t.weekly, Number(t.weeklyDay) || 0, url));
  }
  props.setProperty('REMINDER_SERIES', JSON.stringify(ids));
  return json_({ result: 'ok', created: ids.length });
}

function makeSeries_(cal, title, hhmm, weekday, url) {
  var parts = String(hhmm).split(':');
  var start = new Date();
  start.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  if (weekday !== null) {
    while (start.getDay() !== weekday) start.setDate(start.getDate() + 1);
  }
  if (start < new Date()) start.setDate(start.getDate() + (weekday !== null ? 7 : 1));
  var end = new Date(start.getTime() + 10 * 60000);
  var rule = weekday !== null
    ? CalendarApp.newRecurrence().addWeeklyRule()
    : CalendarApp.newRecurrence().addDailyRule();
  var series = cal.createEventSeries(title, start, end, rule, { description: url ? 'Open Anchor: ' + url : '' });
  series.removeAllReminders();
  series.addPopupReminder(0);
  return series.getId();
}

/* ---------------- weekly summary (check-ins) ---------------- */
function buildWeeklySummary() {
  var log = getSheet_(LOG_SHEET, LOG_HEADERS);
  if (log.getLastRow() < 2) return;

  var rows = log.getRange(2, 1, log.getLastRow() - 1, LOG_HEADERS.length).getValues();
  var col = {}; LOG_HEADERS.forEach(function (h, i) { col[h] = i; });

  var now = new Date();
  var weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  var week = rows.filter(function (r) {
    var t = r[col.timestamp];
    return t instanceof Date && t >= weekAgo && t <= now;
  });
  if (!week.length) return;

  var nums = function (field) {
    return week.map(function (r) { return r[col[field]]; })
               .filter(function (v) { return v !== '' && v != null && !isNaN(v); })
               .map(Number);
  };
  var avg = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10 : ''; };
  var top3 = function (field, split) {
    var counts = {};
    week.forEach(function (r) {
      var v = String(r[col[field]] || '').trim();
      if (!v) return;
      (split ? v.split(/,\s*/) : [v]).forEach(function (x) {
        x = x.trim(); if (x) counts[x] = (counts[x] || 0) + 1;
      });
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })
      .slice(0, 3).map(function (k) { return k + ' (' + counts[k] + ')'; }).join(', ');
  };

  var before = nums('distress_before'), afterG = nums('distress_after_grounding'), fin = nums('distress_final');
  var completed = week.filter(function (r) { return r[col.abandoned] !== 'yes'; }).length;
  var actedRows = week.filter(function (r) { return r[col.acted_on_urge]; });
  var acted = actedRows.filter(function (r) { return r[col.acted_on_urge] === 'yes'; }).length;
  var pauses = week.filter(function (r) { return r[col.pause_minutes] !== '' && r[col.pause_minutes] != null; });
  var pausesDone = pauses.filter(function (r) { return r[col.pause_completed] === 'yes'; }).length;

  var HEAD = ['week_ending','entries','completed','abandoned',
    'avg_distress_before','avg_after_grounding','avg_final','avg_drop',
    'acted_on_urge_pct','pauses_completed_pct','avg_pause_min',
    'top_triggers','top_emotions','top_fears','most_common_time','what_helped_most'];
  var sheet = getSheet_(SUMMARY_SHEET, HEAD);

  sheet.appendRow([
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    week.length, completed, week.length - completed,
    avg(before), avg(afterG), avg(fin),
    (avg(before) !== '' && avg(fin) !== '') ? Math.round((avg(before) - avg(fin)) * 10) / 10 : '',
    actedRows.length ? Math.round(acted / actedRows.length * 100) + '%' : '',
    pauses.length ? Math.round(pausesDone / pauses.length * 100) + '%' : '',
    avg(nums('pause_minutes')),
    top3('trigger', false), top3('emotions', true), top3('fears', false),
    top3('time_of_day', false), top3('what_helped', false)
  ]);
}

/* ---------------- helpers ---------------- */

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function joinList_(arr, other) {
  var out = (arr || []).slice();
  if (other) out.push(other);
  return out.join(', ');
}

function numOr_(v) { return (v === null || v === undefined || v === '') ? '' : v; }

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
