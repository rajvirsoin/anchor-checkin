'use strict';
/* =====================================================================
   Coach: every Claude call goes through the Apps Script proxy
   (action:'coach'). Each task has an offline fallback so the app works
   fully before the API key is set, or with no signal.
   ===================================================================== */

let coachOffline = false;   // set once per session after a hard failure (no key, no endpoint)

function coachSystem(){
  const about = (S.profile.about||'').trim();
  return COACH_RULES +
    (S.profile.name ? '\n\nHis name is ' + S.profile.name + '.' : '') +
    (about ? '\n\nWhat he has told you about himself (his words, keep it private):\n' + about : '') +
    '\n\nToday is ' + dayKey() + ', day ' + dayNum() + ' of his year. Season ' + currentSeason() + ': ' +
    SEASONS[currentSeason()-1].name + '. Shadow-work phase: ' + currentPhase().name + ' (' + currentPhase().aim + ')';
}

async function coachCall(task, context, opts){
  opts = opts || {};
  if(coachOffline || !settings.endpoint || !navigator.onLine) throw new Error('offline');
  const user = 'TASK\n' + task + (context!=null ? '\n\nCONTEXT (JSON)\n' + JSON.stringify(context) : '');
  const messages = opts.messages || [{ role:'user', content:user }];
  try{
    const out = await withTimeout(postAPI({
      action:'coach', system:coachSystem(), messages,
      max_tokens: opts.max_tokens || 3000, effort: opts.effort || 'low'
    }), opts.timeout || 45000);
    return out.text || '';
  }catch(err){
    if(/ANTHROPIC_API_KEY|endpoint|secret|Unknown action/i.test(err.message)) coachOffline = true;
    throw err;
  }
}
function withTimeout(p, ms){
  return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))]);
}
function parseJSON(text){
  const t = String(text||'').replace(/^```(json)?\s*/i,'').replace(/```\s*$/,'').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return JSON.parse(a>=0 ? t.slice(a, b+1) : t);
}
const stripDashes = s => String(s||'').replace(/\s*[—–]\s*/g, ', ');

/* ---------- morning line ---------- */
async function coachMorningLine(){
  const ctx = { last_evenings: recentEvenings(3), catches_last_3_days: recentCatches(3),
    recent_promises: Object.entries(S.days).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5)
      .filter(([k,d])=>d.promise).map(([k,d])=>({ date:k, promise:d.promise.text, kept:d.kept||'not marked' })),
    open_session_actions: S.chats.filter(c=>c.action && !c.actionDone).slice(0,2).map(c=>c.action) };
  try{
    const t = await coachCall(
      'Write his morning line: one or two short sentences, max 45 words. Pick the single most useful thread from the context (often what he carried out of last night, a promise he keeps missing, or a pattern in his catches) and point it at today as a chance to practise. Quote his words where you can. If there is no history yet, give one plain sentence about starting with a small promise he can keep. No praise. Return only the sentences.',
      ctx, { max_tokens:1500 });
    return stripDashes(t.trim());
  }catch(e){
    const ev = recentEvenings(1)[0];
    if(ev && ev.carry) return 'Last night you carried this into today: "' + ev.carry + '"';
    return '';
  }
}

/* ---------- evening questions ---------- */
async function coachEveningQuestions(){
  const arc = nextArcQuestion();
  const today = recentCatches(0);
  const ctx = { phase:{ name:currentPhase().name, aim:currentPhase().aim }, arc_question_tonight:arc.q,
    last_evenings: recentEvenings(8), catches_today: today,
    promise_today: day().promise ? { text:day().promise.text, kept:day().kept||'not marked' } : null,
    belief_map: S.beliefs.map(b=>({ belief:b.belief, strength:b.strength })) };
  let thread = '', todayQ = '';
  try{
    const out = parseJSON(await coachCall(
      'Write two questions for tonight\'s written reflection. The first, "arc", is already chosen (in context). Write:\n' +
      '1. "thread": a follow-up that digs into something he wrote in recent evenings: something he avoided, skimmed, contradicted, or said in passing that matters. Quote his words briefly and say which day. If there is no history yet, ask about what made him start this year.\n' +
      '2. "today": a question about today. If he logged catches today, build it on the most important one. If not, on his promise. If neither, on a moment from his day.\n' +
      'Each question is one or two sentences, plain words, no praise, does not repeat the arc question. Return only JSON: {"thread":"...","today":"..."}',
      ctx, { max_tokens:2500 }));
    thread = stripDashes(out.thread); todayQ = stripDashes(out.today);
  }catch(e){}
  if(!thread){
    const q = lastQuote();
    thread = q ? THREAD_FALLBACKS[dayNum() % THREAD_FALLBACKS.length].replace('{q}', q)
               : 'What made you decide to start this year? What were you most tired of?';
  }
  if(!todayQ){
    if(today.length){
      const k = CATCH_KINDS.find(c=>c.id===today[0].kind);
      todayQ = 'Today you caught: ' + (k?k.label.toLowerCase():'a moment') + '. What happened just before it, and what were you hoping for?';
    } else if(day().promise){
      todayQ = 'Your promise today was "' + day().promise.text + '". What happened with it, honestly?';
    } else todayQ = TODAY_FALLBACKS[dayNum() % TODAY_FALLBACKS.length];
  }
  return [
    { kind:'arc', q:arc.q, idx:arc.idx, a:'' },
    { kind:'thread', q:thread, a:'' },
    { kind:'today', q:todayQ, a:'' }
  ];
}

/* ---------- one push per answer ---------- */
async function coachPush(q, a){
  if(!a || a.trim().length < 3) return '';
  try{
    const t = await coachCall(
      'He just answered a reflection question. Push back once: reflect a few of his exact words, then ask one question that goes one layer deeper, especially if he stayed vague, intellectualised, blamed someone else, or answered a different question. One or two sentences, max 40 words. If his answer is already specific and honest and there is nothing worth pressing, return exactly: NONE',
      { question:q, answer:a, phase:currentPhase().name }, { max_tokens:1500 });
    const s = stripDashes(t.trim());
    return /^NONE\b/i.test(s) ? '' : s;
  }catch(e){ return ''; }
}

/* ---------- weekly ---------- */
async function coachWeekly(stats, review){
  const s2 = seasonStatus(2).open;
  const ph = currentPhase();
  const ctx = { stats, review, evenings_this_week: recentEvenings(7), catches_this_week: recentCatches(7),
    experiments: S.experiments.slice(0,5), phase:{ name:ph.name, aim:ph.aim, ready_when:ph.ready, evenings_in_phase:eveningsInPhase(),
      is_last: phaseIndex()===PHASES.length-1 },
    belief_map: S.beliefs.map(b=>({ belief:b.belief, origin:b.origin, counter:b.counter, strength:b.strength })),
    previous_week_read: S.weeks[0] ? S.weeks[0].read : null };
  const out = parseJSON(await coachCall(
    'Write his weekly review. Return only JSON with these keys:\n' +
    '"read": your read on his week, 3 to 5 sentences, plain words. Trends, not grades. Name the strongest pattern with his own words. No praise. Mention one thing to watch next week.\n' +
    '"digest": a one-page summary for his therapist, in first person as if he wrote it, 120 to 200 words: what came up, the main pattern, any origin material he touched, what he wants to bring to the session.\n' +
    '"beliefs": 0 to 2 core beliefs you saw at work this week that are NOT already in the belief map, each {"belief":"I ...","origin":"where it seems to come from, from his words, or empty","counter":"evidence against it from his week"}.\n' +
    '"phase": {"advance": true or false, "reason": "one sentence"}. Advance only if his answers show the ready_when condition is met and he has done at least 10 evenings in the phase. Never advance if is_last.\n' +
    (s2 ? '"cards": 0 to 2 schema flashcards from his own words, each {"trigger":"...","belief":"...","origin":"...","response":"what his adult self says back, in his voice"}.\n' : '') +
    'Never use em dashes.',
    ctx, { max_tokens:6000, effort:'medium', timeout:60000 }));
  ['read','digest'].forEach(k=>out[k]=stripDashes(out[k]));
  return out;
}

/* ---------- capped chat ---------- */
const CHAT_CAP = 10;
async function coachChatReply(session){
  const msgs = session.turns.map(t=>({ role: t.role==='coach'?'assistant':'user', content:t.text }));
  const left = CHAT_CAP - session.turns.filter(t=>t.role==='user').length;
  const ctx = { last_evenings: recentEvenings(3), catches_last_3_days: recentCatches(3), exchanges_left: left };
  msgs[0] = { role:'user', content:
    'This is a capped coaching session (max ' + CHAT_CAP + ' messages from him). It is a coaching session, not venting: keep him moving toward one concrete action. Reply in 1 to 4 short sentences, ask at most one question. When 2 or fewer exchanges are left, start steering toward the action.\n\nCONTEXT (JSON)\n' + JSON.stringify(ctx) +
    '\n\nHIS MESSAGE\n' + session.turns[0].text };
  return stripDashes((await coachCall('', null, { messages:msgs, max_tokens:2500 })).trim());
}
async function coachChatAction(session){
  const msgs = session.turns.map(t=>({ role: t.role==='coach'?'assistant':'user', content:t.text }));
  const instr = 'The session is over. Based on this conversation, name ONE concrete action he can do in the next 24 hours. One sentence, starts with a verb, small enough to actually do. Return only that sentence.';
  const last = msgs[msgs.length-1];
  if(last.role==='user') last.content += '\n\n' + instr; else msgs.push({ role:'user', content:instr });
  return stripDashes((await coachCall('', null, { messages:msgs, max_tokens:1500 })).trim());
}

/* ---------- then vs now ---------- */
async function coachThenNow(early, late){
  return stripDashes((await coachCall(
    'Write him a short "Then vs Now" letter, 120 to 180 words, from his own words: set what he wrote in his first weeks next to what he writes now. Quote both. Say plainly what has moved and what hasn\'t. No praise, no cheerleading: let the quotes carry it. End with one question for the month ahead.',
    { early, late }, { max_tokens:4000, effort:'medium', timeout:60000 })).trim());
}
