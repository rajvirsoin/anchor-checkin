'use strict';
/* =====================================================================
   Views. One #screen, one `view` string, one click delegate (data-act).
   ===================================================================== */

let view = 'today';
let vp = {};                    // view params
const TABS = ['today','catch','journal','you'];
const ACT = {};                 // data-act handlers

function go(v, p){ view = v; vp = p || {}; render(); window.scrollTo(0,0); }
const nm = () => S.profile.name || 'You';
const fillName = s => String(s).replace(/\{name\}/g, S.profile.name || 'your name');

/* ---------- small builders ---------- */
function page(kicker, title, sub, body, foot){
  return `<div class="body anim">
      ${kicker?`<div class="kicker">${kicker}</div>`:''}
      ${title?`<h1 class="q display">${title}</h1>`:''}
      ${sub?`<p class="sub">${sub}</p>`:''}
      ${body||''}
    </div>${foot?`<div class="foot">${foot}</div>`:''}`;
}
const backLink = (to, label) => `<button class="btn btn-quiet" data-act="go" data-v="${to}">${label||'Back'}</button>`;
function libCard(id, small){
  const c = LIBRARY.find(x=>x.id===id); if(!c) return '';
  return `<div class="lib ${small?'small':''}">
    <div class="lib-k">From the research · ${esc(c.strength)}</div>
    <div class="lib-t">${esc(c.title)}</div>
    <div class="lib-b">${esc(fillName(c.body))}</div>
    <div class="lib-s">${esc(c.source)}</div></div>`;
}
function libFor(tag){
  const list = LIBRARY.filter(c=>c.tags.includes(tag));
  return list.length ? list[dayNum() % list.length].id : '';
}
function seg(name, options, val){
  return `<div class="seg" data-seg="${name}">${options.map(([v,l])=>`<button class="${val===v?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function wireSegs(scr, onPick){
  scr.querySelectorAll('.seg').forEach(g=>g.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    g.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
    onPick(g.dataset.seg, b.dataset.v);
  }));
}
function scale(id, val, lo, hi){
  return `<div class="scale"><div class="scale-n" id="${id}N">${val==null?5:val}</div>
    <input type="range" min="0" max="10" step="1" value="${val==null?5:val}" id="${id}" aria-label="0 to 10">
    <div class="scale-ends"><span>0 · ${lo||'none'}</span><span>10 · ${hi||'strongest'}</span></div></div>`;
}
function wireScale(id, assign){
  const r = $('#'+id); if(!r) return;
  const upd = ()=>{ $('#'+id+'N').textContent = r.value; assign(+r.value); };
  r.oninput = upd; assign(+r.value);
}
function spinner(msg){ return `<div class="spin"></div>${msg?`<p class="note" style="text-align:center">${msg}</p>`:''}`; }

/* =====================================================================
   Render
   ===================================================================== */
function render(){
  clearInterval(timerInterval);
  clearTimeout(render._sigh);
  const scr = $('#screen');
  const inFlow = view==='flow';
  $('#progress').hidden = !inFlow;
  document.body.classList.toggle('no-tabs', !TABS.includes(view));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.tab===view));
  $('#seasonChip').textContent = S.profile.onboarded ? 'S'+currentSeason()+' · Day '+dayNum() : '';

  if(!S.profile.onboarded && view!=='settings') return renderOnboard(scr);
  if(inFlow){
    if(!active){ view='catch'; return render(); }
    const list = FLOW[active.mode];
    $('#progress').innerHTML = list.map((s,i)=>{
      const skip = (s==='escalate'||s==='escalate_do'||s==='suds_final') && !needsEscalation();
      return skip?'':'<i class="'+(i<active.step?'on':i===active.step?'now':'')+'"></i>';
    }).join('');
    return renderStep(scr);
  }
  const R = {
    today:renderToday, catch:renderCatchHub, journal:renderJournal, you:renderYou,
    morning:renderMorning, evening:renderEvening, weekly:renderWeekly, qcatch:renderQuickCatch,
    experiments:renderExperiments, experiment:renderExperiment, brothers:renderBrothers,
    chat:renderChat, chats:renderChats, map:renderMap, cards:renderCards, seasons:renderSeasons,
    module:renderModule, library:renderLibrary, ifthens:renderIfThens, settings:renderSettings,
    checkins:renderCheckins, eveninglog:renderEveningLog, dayview:renderDayView, weeks:renderWeeks,
    weekview:renderWeekView, catchlog:renderCatchLog, thennow:renderThenNow, letters:renderLetters
  }[view];
  (R || renderToday)(scr);
}

document.addEventListener('click', e=>{
  const b = e.target.closest('[data-act]');
  if(b && ACT[b.dataset.act]){ e.preventDefault(); ACT[b.dataset.act](b.dataset, b); }
});
ACT.go = d => go(d.v, d.p ? JSON.parse(d.p) : {});

/* =====================================================================
   Onboarding
   ===================================================================== */
function renderOnboard(scr){
  const step = vp.ob || 'welcome';
  const P = S.profile;
  const nav = (next, label) => `<button class="btn btn-primary" data-act="ob" data-next="${next}">${label||'Next'}</button>`;
  if(step==='welcome'){
    scr.innerHTML = page('Anchor', 'A year of becoming<br>your own anchor.',
      'This is your daily practice: a promise each morning, a catch when something hits, and a few honest questions each evening. It remembers what you write and builds on it.',
      `<div class="card"><div class="rule">No streaks. Missing a day breaks nothing.</div>
       <div class="rule">Your coach never praises you. It reflects and asks.</div>
       <div class="rule">The only score is what you do, never how you look to anyone.</div>
       <div class="rule">Your words stay on this phone and your own private Sheet.</div></div>`,
      nav('day1','Begin') + (settings.endpoint ? `<button class="btn btn-ghost" data-act="obRestore">Restore from my Sheet</button>` : ''));
  } else if(step==='day1'){
    scr.innerHTML = page('Day 1', 'When did your year start?',
      'The app counts the year from this date and opens new seasons as you go. You can change it later in Settings.',
      `<input type="date" id="obDate" value="${P.startDate || dayKey()}">`, nav('about'));
    $('#obDate').onchange = e=>{ P.startDate = e.target.value; save(); };
    if(!P.startDate){ P.startDate = dayKey(); save(); }
  } else if(step==='about'){
    scr.innerHTML = page('Your coach', 'What should your coach know about you?',
      'Who you are, what you’re working on, your patterns, your triggers. The more honest, the better it coaches. It lives only on this phone and in your Sheet. You can edit it any time.',
      `<label class="fl">Your first name</label><input type="text" id="obName" value="${esc(P.name)}" placeholder="First name">
       <label class="fl">About you</label><textarea id="obAbout" style="min-height:220px" placeholder="Paste the profile you were given, or write your own.">${esc(P.about)}</textarea>`,
      nav('ifthens'));
    $('#obName').oninput = e=>{ P.name = e.target.value.trim(); save(); };
    $('#obAbout').oninput = e=>{ P.about = e.target.value; save(); };
  } else if(step==='ifthens'){
    if(!S.ifthens.length){ S.ifthens = DEFAULT_IFTHENS.map(x=>Object.assign({id:uuid()}, x)); save(); }
    scr.innerHTML = page('If-then plans', 'Decide now, so the moment doesn’t have to.',
      'These come up when you catch something. Edit any of them to fit you. You can change them any time under You.',
      ifthenEditor(), nav('times'));
    wireIfthenEditor(scr);
  } else if(step==='times'){
    scr.innerHTML = page('Reminders', 'When should Anchor nudge you?',
      'Pick times that fit your life now. A year changes a lot, so change them whenever you need to.',
      timesEditor(), nav('done','Save and start'));
    wireTimesEditor(scr);
  } else if(step==='done'){
    P.onboarded = true; touch('profile'); touch('ifthens');
    if(settings.endpoint) setCalendarReminders(true).catch(()=>{});
    go('today');
  }
}
ACT.ob = d => { vp.ob = d.next; render(); };
ACT.obRestore = async () => {
  try{ const n = await restoreFromSheet(); toast(n ? 'Restored '+n+' records' : 'Nothing in the Sheet yet'); }
  catch(e){ toast('Could not restore: '+e.message); }
  go(S.profile.onboarded ? 'today' : 'onboard', { ob: S.profile.onboarded ? '' : 'day1' });
};

/* ---------- if-then editor (shared) ---------- */
function ifthenEditor(){
  return `<div id="itList">${S.ifthens.map((x,i)=>`
    <div class="it">
      <div class="it-row"><span class="it-k">If</span><input type="text" data-i="${i}" data-f="if" value="${esc(x.if)}"></div>
      <div class="it-row"><span class="it-k">then</span><input type="text" data-i="${i}" data-f="then" value="${esc(x.then)}"></div>
      <button class="btn btn-quiet it-del" data-del="${i}">Remove</button>
    </div>`).join('')}</div>
    <button class="btn btn-ghost" id="itAdd">Add an if-then</button>`;
}
function wireIfthenEditor(scr){
  scr.querySelectorAll('#itList input').forEach(inp=>inp.oninput=()=>{
    S.ifthens[+inp.dataset.i][inp.dataset.f] = inp.value; touch('ifthens');
  });
  scr.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ S.ifthens.splice(+b.dataset.del,1); touch('ifthens'); render(); });
  $('#itAdd').onclick = ()=>{ S.ifthens.push({ id:uuid(), kind:'other', if:'', then:'' }); touch('ifthens'); render(); };
}

/* ---------- reminder times editor (shared) ---------- */
function timesEditor(){
  const t = S.profile.times;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `<label class="fl">Morning promise</label><input type="time" id="tMorning" value="${t.morning||''}">
    <label class="fl">Evening reflection</label><input type="time" id="tEvening" value="${t.evening||''}">
    <label class="fl">Weekly review</label>
    <div class="row2"><select id="tWDay">${days.map((d,i)=>`<option value="${i}" ${+t.weeklyDay===i?'selected':''}>${d}</option>`).join('')}</select>
    <input type="time" id="tWeekly" value="${t.weekly||''}"></div>
    <p class="note" style="margin-top:12px">Reminders arrive as events in your Google Calendar, so they reach your phone even when Anchor is closed.${settings.endpoint?'':' Connect your Sheet in Settings to turn them on.'}</p>`;
}
function wireTimesEditor(scr){
  const t = S.profile.times;
  const upd = ()=>{ t.morning=$('#tMorning').value; t.evening=$('#tEvening').value; t.weekly=$('#tWeekly').value; t.weeklyDay=+$('#tWDay').value; touch('profile'); };
  ['#tMorning','#tEvening','#tWeekly','#tWDay'].forEach(s=>$(s).onchange=upd);
}
async function setCalendarReminders(enabled){
  await postAPI({ action:'reminders', enabled, times:S.profile.times, appUrl: location.href.split('#')[0].split('?')[0] });
}

/* =====================================================================
   Today
   ===================================================================== */
function renderToday(scr){
  const k = dayKey(), D = day(k), P = S.profile;
  const st = seasonStatus(currentSeason());
  const cards = [];

  // welcome back after a gap
  const gap = P.lastOpen ? daysBetween(P.lastOpen, k) : 0;
  if(gap >= 3) cards.push(`<div class="card soft anim">Welcome back. ${gap} days away breaks nothing. Pick up with today.</div>`);

  // new season opened
  if((P.seenSeason||1) < currentSeason()){
    cards.push(`<button class="card hero-card sand anim" data-act="seenSeason"><div class="hc-k">New season</div>
      <div class="hc-t">Season ${currentSeason()}: ${esc(SEASONS[currentSeason()-1].name)}</div>
      <div class="hc-d">${esc(SEASONS[currentSeason()-1].about)} Tap to see what’s open.</div></button>`);
  }

  // coach line
  if(D.coachLine) cards.push(`<div class="coachline anim"><span class="cl-k">Your coach</span>${esc(D.coachLine)}</div>`);
  else if(!D.coachTried && !coachOffline && settings.endpoint){
    D.coachTried = true; save();
    coachMorningLine().then(t=>{ if(t){ D.coachLine = t; touchDay(k); } if(view==='today') render(); });
  }

  // promise
  if(!D.promise){
    cards.push(`<button class="hero-btn anim d1" data-act="go" data-v="morning"><span class="t">Make today’s promise</span>
      <span class="d">One small thing you’ll do. Two minutes.</span></button>`);
  } else {
    cards.push(`<div class="card anim d1"><div class="hc-k">Today’s promise</div>
      <div class="promise">${esc(D.promise.text)}</div>
      ${D.promise.ifthen?`<div class="note">If ${esc(D.promise.ifthen.if)}, then ${esc(D.promise.ifthen.then)}.</div>`:''}
      ${D.kept ? `<div class="kept ${D.kept}">${{yes:'Kept',partly:'Partly kept',no:'Not today'}[D.kept]}</div>`
               : `<div class="seg mt" data-seg="kept">${[['yes','Kept'],['partly','Partly'],['no','Not today']].map(([v,l])=>`<button data-act="kept" data-v="${v}">${l}</button>`).join('')}</div>`}
    </div>`);
  }

  // evening
  const ev = D.evening || {};
  const eveningSoon = nowMinutes() >= minutesOf(P.times.evening||'20:30') - 90 || new Date().getHours() < 4;
  if(!ev.done){
    cards.push(`<button class="hero-btn ${eveningSoon?'glow':''} anim d2" data-act="go" data-v="evening">
      <span class="t">${ev.qs ? 'Finish tonight’s reflection' : 'Tonight’s reflection'}</span>
      <span class="d">Three questions. ${esc(currentPhase().name)}. About 10 minutes.</span></button>`);
  } else {
    cards.push(`<div class="card anim d2"><div class="hc-k">Reflection done</div>
      ${ev.carry?`<div class="note">Carrying into tomorrow: <b>${esc(ev.carry)}</b></div>`:'<div class="note">See you in the morning.</div>'}</div>`);
  }

  // weekly
  if(weeklyDue()) cards.push(`<button class="hero-btn sand anim d3" data-act="go" data-v="weekly"><span class="t">Weekly review</span>
    <span class="d">Your week as trends, your coach’s read, and the digest for therapy.</span></button>`);

  // experiments waiting for an "after"
  S.experiments.filter(x=>!x.after).slice(0,2).forEach(x=>cards.push(`
    <button class="card hero-card anim" data-act="go" data-v="experiment" data-p='${JSON.stringify({id:x.id})}'>
      <div class="hc-k">Experiment</div><div class="hc-t">How did ${esc(x.event)} go?</div>
      <div class="hc-d">Check your prediction against what actually happened.</div></button>`));

  // coach-session actions
  S.chats.filter(c=>c.action && !c.actionDone).slice(0,2).forEach(c=>cards.push(`
    <div class="card anim"><div class="hc-k">From your coach session</div><div class="promise sm">${esc(c.action)}</div>
      <button class="btn btn-ghost mt" data-act="actionDone" data-id="${c.id}">Done</button></div>`));

  // brothers nudge
  const quiet = S.brothers.filter(b=>{ const l = lastContact(b.id); return !l || daysBetween(l, k) >= 14; });
  if(S.brothers.length && quiet.length) cards.push(`<button class="card hero-card anim" data-act="go" data-v="brothers">
    <div class="hc-k">Brothers</div><div class="hc-t">${esc(quiet.slice(0,2).map(b=>b.name).join(' and '))}${quiet.length>2?' and others':''}</div>
    <div class="hc-d">Two weeks or more since you connected. Side-by-side, or one honest sentence.</div></button>`);

  // then vs now
  if(dayNum() >= 30 && (!P.lastThenNow || daysBetween(P.lastThenNow, k) >= 30)) cards.push(`
    <button class="card hero-card anim" data-act="go" data-v="thennow"><div class="hc-k">Monthly</div>
    <div class="hc-t">Then vs Now</div><div class="hc-d">Your first weeks next to this one, in your own words.</div></button>`);

  scr.innerHTML = `<div class="body">
      <div class="today-head anim">
        <div class="kicker">Season ${currentSeason()} · ${esc(st.season.name)}</div>
        <h1 class="display day-n">Day ${dayNum()}</h1>
      </div>
      <div class="stack">${cards.join('')}</div>
      <div class="foot-row anim d3">
        <button class="btn btn-ghost" data-act="go" data-v="experiment">Event coming up? Plan an experiment</button>
        <button class="btn btn-ghost" data-act="newChat">Talk to your coach</button>
      </div>
    </div>`;
  if(P.lastOpen !== k){ P.lastOpen = k; save(); }
}
function weeklyDue(){
  if(dayNum() < 7) return false;
  const last = S.weeks[0] ? S.weeks[0].weekEnd : null;
  if(last && daysBetween(last, dayKey()) < 6) return false;
  if(new Date().getDay() === +S.profile.times.weeklyDay) return true;
  return !last || daysBetween(last, dayKey()) >= 7;
}
ACT.kept = d => { day().kept = d.v; touchDay(); toast(d.v==='yes'?'Logged':'Logged. Tonight you can look at what got in the way.'); render(); };
ACT.seenSeason = () => { S.profile.seenSeason = currentSeason(); touch('profile'); go('seasons'); };
ACT.actionDone = d => { const c = S.chats.find(x=>x.id===d.id); if(c){ c.actionDone = dayKey(); touch('chat', c.id); } render(); };
function lastContact(id){ const l = S.brolog.find(x=>x.brother===id); return l ? l.date : null; }

/* =====================================================================
   Morning promise
   ===================================================================== */
function renderMorning(scr){
  const D = day();
  const draft = vp.draft || (vp.draft = { text: D.promise ? D.promise.text : '', ifthen: D.promise ? D.promise.ifthen : null });
  const ideas = ['Ask one man a real question','Say one honest sentence','No posting today','Phone out of the bedroom tonight','Train, and leave the mirror alone','Do one thing just for me'];
  const act = S.chats.find(c=>c.action && !c.actionDone);
  if(act) ideas.unshift(act.action);
  scr.innerHTML = page('Morning', 'What will you do today?',
    'One action, small enough that you’ll actually keep it. Something you do, not something you feel.',
    `${D.coachLine?`<div class="coachline"><span class="cl-k">Your coach</span>${esc(D.coachLine)}</div>`:''}
     <textarea id="mText" style="min-height:96px" placeholder="Today I will...">${esc(draft.text)}</textarea>
     <div class="chips mt">${ideas.slice(0,6).map(i=>`<button class="chip" data-idea="${esc(i)}">${esc(i)}</button>`).join('')}</div>
     ${S.ifthens.length?`<label class="fl">Bring one if-then into today (optional)</label>
     <div class="choices">${S.ifthens.filter(x=>x.if&&x.then).map(x=>`<button class="choice ${draft.ifthen&&draft.ifthen.id===x.id?'on':''}" data-it="${x.id}">If ${esc(x.if)}<span class="cd">then ${esc(x.then)}</span></button>`).join('')}</div>`:''}
     ${libCard('promises', true)}`,
    `<button class="btn btn-primary" id="mSave">Make the promise</button>${backLink('today')}`);
  $('#mText').oninput = e=>draft.text = e.target.value;
  scr.querySelectorAll('[data-idea]').forEach(c=>c.onclick=()=>{ draft.text = c.dataset.idea; $('#mText').value = draft.text; });
  scr.querySelectorAll('[data-it]').forEach(c=>c.onclick=()=>{
    const x = S.ifthens.find(i=>i.id===c.dataset.it);
    draft.ifthen = (draft.ifthen && draft.ifthen.id===x.id) ? null : { id:x.id, if:x.if, then:x.then };
    scr.querySelectorAll('[data-it]').forEach(b=>b.classList.toggle('on', draft.ifthen && b.dataset.it===draft.ifthen.id));
  });
  $('#mSave').onclick = ()=>{
    const text = draft.text.trim();
    if(!text){ toast('Write one small action'); return; }
    D.promise = { text, ifthen:draft.ifthen, at:new Date().toISOString() };
    touchDay(); go('today');
  };
}

/* =====================================================================
   Evening reflection
   ===================================================================== */
function renderEvening(scr){
  const k = dayKey(), D = day(k);
  const ev = D.evening = D.evening || { step:0 };
  if(!ev.qs){
    scr.innerHTML = page('Tonight', 'Reading your last few evenings...', '', spinner(), '');
    if(!renderEvening._loading){
      renderEvening._loading = true;
      ev.askKept = !!(D.promise && !D.kept);
      coachEveningQuestions().then(qs=>{ ev.qs = qs; ev.startedAt = new Date().toISOString(); touchDay(k); })
        .finally(()=>{ renderEvening._loading = false; if(view==='evening') render(); });
    }
    return;
  }
  const steps = [];
  if(ev.askKept || (D.promise && !D.kept)) steps.push('kept');
  steps.push('q0','q1','q2','carry','done');
  ev.step = Math.min(ev.step||0, steps.length-1);
  const id = steps[ev.step];
  const nextStep = ()=>{ ev.step++; touchDay(k); render(); window.scrollTo(0,0); };
  const prevStep = ()=>{ if(ev.step>0){ ev.step--; save(); render(); } else go('today'); };

  if(id==='kept'){
    scr.innerHTML = page('Tonight · your promise', 'Did you keep it?', '"'+esc(D.promise.text)+'"',
      `<div class="choices">${[['yes','Kept it',''],['partly','Partly',''],['no','Not today','That’s information, not failure.']].map(([v,l,s])=>`<button class="choice" data-v="${v}">${l}${s?`<span class="cd">${s}</span>`:''}</button>`).join('')}</div>`,
      backLink('today','Later'));
    scr.querySelectorAll('.choice').forEach(c=>c.onclick=()=>{ D.kept = c.dataset.v; nextStep(); });
    return;
  }
  if(id.startsWith('q')){
    const i = +id[1], q = ev.qs[i];
    const label = { arc:currentPhase().name, thread:'Following a thread', today:'Today' }[q.kind];
    scr.innerHTML = page('Tonight · '+(i+1)+' of 3 · '+esc(label), esc(q.q), '',
      `<textarea id="eA" style="min-height:160px" placeholder="Write it the way it is.">${esc(q.a)}</textarea>
       ${q.push ? `<div class="push"><span class="cl-k">Your coach</span>${esc(q.push)}</div>
         <textarea id="eP" style="min-height:110px" placeholder="Optional. Go one layer down.">${esc(q.pa||'')}</textarea>` : ''}`,
      `<button class="btn btn-primary" id="eNext">${q.pushTried ? 'Next' : 'Next'}</button>
       <div class="row-between"><button class="btn btn-quiet" id="eBack">Back</button><button class="btn btn-quiet" data-act="go" data-v="today">Save and finish later</button></div>`);
    $('#eA').oninput = e=>{ q.a = e.target.value; save(); };
    $('#eP') && ($('#eP').oninput = e=>{ q.pa = e.target.value; save(); });
    $('#eBack').onclick = prevStep;
    $('#eNext').onclick = async ()=>{
      if(!q.a.trim()){ toast('Even one line counts'); return; }
      if(!q.pushTried && !coachOffline && settings.endpoint){
        q.pushTried = true; save();
        const b = $('#eNext'); b.disabled = true; b.textContent = 'Your coach is reading...';
        q.push = await coachPush(q.q, q.a);
        touchDay(k);
        if(q.push){ render(); return; }
      }
      nextStep();
    };
    return;
  }
  if(id==='carry'){
    scr.innerHTML = page('Tonight · last one', 'What will you carry into tomorrow?',
      'One line. Your coach will pick it up in the morning.',
      `<input type="text" id="eC" value="${esc(ev.carry||'')}" placeholder="e.g. Say the thing instead of swallowing it">`,
      `<button class="btn btn-primary" id="eDone">Finish</button><button class="btn btn-quiet" id="eBack">Back</button>`);
    $('#eC').oninput = e=>{ ev.carry = e.target.value; save(); };
    $('#eBack').onclick = prevStep;
    $('#eDone').onclick = ()=>{
      ev.done = true; ev.doneAt = new Date().toISOString();
      const arc = ev.qs.find(q=>q.kind==='arc'); if(arc && arc.idx!=null) markArcUsed(arc.idx);
      nextStep();
    };
    return;
  }
  // done
  scr.innerHTML = `<div class="center anim">
      <div class="done-mark">✓</div>
      <h1 class="display" style="font-size:1.9rem;margin-bottom:10px">Written down.</h1>
      <p class="sub" style="max-width:300px">That’s ${eveningsDone()} evening${eveningsDone()===1?'':'s'} of reflection so far.</p>
    </div>
    <div class="foot anim d1">${libCard(libFor('evening') || 'schema', true)}<button class="btn btn-primary" data-act="go" data-v="today">Done</button></div>`;
}

/* =====================================================================
   Catch hub + quick catch
   ===================================================================== */
function renderCatchHub(scr){
  const todays = S.catches.filter(c=>dayKey(new Date(c.at))===dayKey()).length;
  const qc = LS.get('anchor_qc', null);
  scr.innerHTML = `<div class="body">
    ${active ? `<div class="card anim" style="border-color:var(--sage)"><div style="font-weight:700;margin-bottom:4px">A check-in is in progress</div>
      <div class="note" style="margin-bottom:14px">Step ${active.step+1}. Pick up where you left off.</div>
      <button class="btn btn-primary" onclick="view='flow';render()">Resume check-in</button>
      <button class="btn btn-quiet" onclick="abandonSession()">Discard / save partial</button></div>` : ''}
    ${qc ? `<div class="card anim" style="border-color:var(--sage)"><div style="font-weight:700;margin-bottom:10px">A catch is in progress</div>
      <button class="btn btn-primary" data-act="go" data-v="qcatch">Pick it up</button>
      <button class="btn btn-quiet" data-act="qcDrop">Drop it</button></div>` : ''}
    <div class="anim"><div class="kicker">Catch</div><h1 class="q display">What caught you?</h1>
      <p class="sub">Catching it is the win. Under two minutes.</p></div>
    <div class="kinds anim d1">${CATCH_KINDS.map(c=>`<button class="kind" data-act="qcStart" data-k="${c.id}">${esc(c.label)}</button>`).join('')}</div>
    <div class="stack mt anim d2">
      <button class="hero-btn" onclick="startSession('full')"><span class="t">Full body-skill check-in</span><span class="d">The whole walk-through from therapy, step by step.</span></button>
      <button class="hero-btn flood" onclick="startSession('flooded')"><span class="t">I’m flooded</span><span class="d">Skip the writing. Ground first, words later.</span></button>
    </div>
    <p class="note anim d3" style="text-align:center;margin-top:18px">${todays ? todays+' caught today' : ''}</p>
  </div>`;
}
ACT.qcDrop = () => { LS.del('anchor_qc'); render(); };
ACT.qcStart = d => {
  LS.set('anchor_qc', { id:uuid(), at:new Date().toISOString(), kind:d.k, step:0, body:[], before:null, after:null });
  go('qcatch');
};

function qcSteps(qc){
  if(!qc.path) return ['when'];
  const urge = (CATCH_KINDS.find(k=>k.id===qc.kind)||{}).urge;
  return qc.path==='slip'
    ? ['when','c1','c2','c3','before','ifthen','done']
    : ['when','body','sigh','story','ifthen'].concat(urge?['surf']:[]).concat(['after','done']);
}
function renderQuickCatch(scr){
  const qc = LS.get('anchor_qc', null);
  if(!qc){ go('catch'); return; }
  const sv = ()=>LS.set('anchor_qc', qc);
  const steps = qcSteps(qc);
  const id = steps[Math.min(qc.step, steps.length-1)];
  const kind = CATCH_KINDS.find(k=>k.id===qc.kind) || CATCH_KINDS[7];
  const next = ()=>{ qc.step++; sv(); render(); window.scrollTo(0,0); };
  const back = ()=>{ if(qc.step>0){ qc.step--; sv(); render(); } else { LS.del('anchor_qc'); go('catch'); } };
  const nav = (label)=>`<button class="btn btn-primary" id="qN">${label||'Next'}</button>
    <div class="row-between"><button class="btn btn-quiet" id="qB">Back</button><button class="btn btn-quiet" id="qX">Save and close</button></div>`;
  const wire = (before)=>{ $('#qN') && ($('#qN').onclick=()=>{ before&&before(); next(); }); $('#qB') && ($('#qB').onclick=()=>{ before&&before(); back(); }); $('#qX') && ($('#qX').onclick=()=>{ before&&before(); finishCatch(qc, true); }); };
  const matching = S.ifthens.filter(x=>x.kind===qc.kind && x.if && x.then);

  if(id==='when'){
    scr.innerHTML = page(esc(kind.label), 'Where are you with it?', '',
      `<div class="choices">
        <button class="choice" data-p="now">It’s happening now<span class="cd">Ride it out with me.</span></button>
        <button class="choice" data-p="slip">It already happened<span class="cd">I acted on it. No guilt, just look at it.</span></button></div>`,
      `<button class="btn btn-quiet" id="qB">Back</button>`);
    scr.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ qc.path = b.dataset.p; next(); });
    wire(); return;
  }
  if(id==='body'){
    scr.innerHTML = page('Body first', 'Where do you feel it?', 'Tap what’s true. Then how strong it is.',
      `<div class="chips">${CATCH_BODY.map(c=>`<button class="chip ${qc.body.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
       ${scale('qS', qc.before, 'calm', 'overwhelming')}`, nav());
    wireChips(scr, qc.body); scr.querySelectorAll('.chip').forEach(c=>c.addEventListener('click', sv));
    wireScale('qS', v=>{ qc.before = v; sv(); });
    wire(); return;
  }
  if(id==='sigh'){
    scr.innerHTML = page('Three sighs', 'Breathe with the circle.',
      'Two breaths in through the nose: a full one, then a short top-up. Then a long, slow breath out through the mouth.',
      `<div style="text-align:center"><div class="sigh" id="sighO"></div><div class="pacer-lbl" id="sighL">Ready</div>
       <div class="note" id="sighC" style="margin-top:6px">0 of 3</div></div>`, nav('Done'));
    let round = 0;
    const cycle = ()=>{
      if(view!=='qcatch' || !$('#sighO')) return;
      const o = $('#sighO'), L = $('#sighL');
      o.className = 'sigh in'; L.textContent = 'Breathe in';
      render._sigh = setTimeout(()=>{ if(!$('#sighO')) return; o.className = 'sigh top'; L.textContent = 'Top up';
        render._sigh = setTimeout(()=>{ if(!$('#sighO')) return; o.className = 'sigh out'; L.textContent = 'Long breath out';
          render._sigh = setTimeout(()=>{ round++; if(!$('#sighC')) return; $('#sighC').textContent = round+' of 3';
            if(round<3) cycle(); else { L.textContent = 'Done'; o.className='sigh'; } }, 6000); }, 900); }, 1800);
    };
    render._sigh = setTimeout(cycle, 600);
    wire(); return;
  }
  if(id==='story'){
    if(!qc.story) qc.story = nm() + ' is feeling ';
    scr.innerHTML = page('The story', 'Say it in the third person.',
      'Use your name. The feeling first, then the story your mind is telling about it. It puts a little space between you and it.',
      `<textarea id="qT" style="min-height:120px">${esc(qc.story)}</textarea>${libCard('thirdperson', true)}`, nav());
    $('#qT').oninput = e=>{ qc.story = e.target.value; sv(); };
    wire(); return;
  }
  if(id==='ifthen'){
    const slip = qc.path==='slip';
    const it = matching[0];
    if(!qc.itDraft) qc.itDraft = { if: it ? it.if : '', then: it ? it.then : '' };
    scr.innerHTML = page(slip ? 'Next time' : 'Your plan', slip ? 'What will you do next time?' : 'You decided this in advance.',
      slip ? 'Shape the if-then for the next time this comes. It saves to your list.' : 'Do it now, or change the plan if it doesn’t fit.',
      `<div class="it"><div class="it-row"><span class="it-k">If</span><input type="text" id="qIf" value="${esc(qc.itDraft.if)}" placeholder="the moment"></div>
       <div class="it-row"><span class="it-k">then</span><input type="text" id="qThen" value="${esc(qc.itDraft.then)}" placeholder="what you’ll do"></div></div>
       ${!slip && matching.length>1 ? `<div class="note">Also: ${matching.slice(1).map(x=>'if '+esc(x.if)+', then '+esc(x.then)).join(' · ')}</div>`:''}`,
      nav(slip ? 'Save it' : 'Doing it'));
    $('#qIf').oninput = e=>{ qc.itDraft.if = e.target.value; sv(); };
    $('#qThen').oninput = e=>{ qc.itDraft.then = e.target.value; sv(); };
    wire(()=>{
      const d = qc.itDraft; if(!d.if.trim() || !d.then.trim()) return;
      const ex = S.ifthens.find(x=>x.kind===qc.kind && x.if===(it&&it.if));
      if(ex){ ex.if = d.if; ex.then = d.then; } else S.ifthens.push({ id:uuid(), kind:qc.kind, if:d.if, then:d.then });
      qc.ifthen = 'If '+d.if+', then '+d.then; touch('ifthens'); sv();
    });
    return;
  }
  if(id==='surf'){
    const s = qc.surf || null;
    if(!s){
      scr.innerHTML = page('Urge surfing', 'Ride the wave instead of feeding it.',
        'Urges rise, peak, and fall on their own, usually within 20 to 30 minutes. Rate it every couple of minutes and watch the curve. You can stop whenever it has passed.',
        libCard('urge', true),
        `<button class="btn btn-sand" id="sStart">Start surfing</button>
         <button class="btn btn-quiet" id="qN">It’s already passed</button><button class="btn btn-quiet" id="qB">Back</button>`);
      $('#sStart').onclick = ()=>{ qc.surf = { start:Date.now(), pts:[{ t:0, v: qc.before==null?5:qc.before }] }; sv(); render(); };
      wire(); return;
    }
    const mins = ()=> (Date.now()-s.start)/60000;
    const lastV = s.pts[s.pts.length-1].v;
    scr.innerHTML = page('Urge surfing', '<span id="sClock">0:00</span>', 'Rate the urge now. Then sit with it. The next rating is due in two minutes.',
      `${surfChart(s.pts)}${scale('sR', lastV, 'gone', 'strongest')}
       <button class="btn btn-ghost mt" id="sLog">Log this rating</button><p class="note" id="sDue" style="text-align:center;margin-top:8px"></p>`,
      `<button class="btn btn-primary" id="qN">It’s passed</button><button class="btn btn-quiet" id="qX">Save and close</button>`);
    let cur = lastV;
    wireScale('sR', v=>cur = v);
    $('#sLog').onclick = ()=>{ s.pts.push({ t:Math.round(mins()*10)/10, v:cur }); sv(); render(); };
    const tick = ()=>{
      const m = mins(); if(!$('#sClock')) return;
      $('#sClock').textContent = Math.floor(m)+':'+pad2(Math.floor((m%1)*60));
      const since = m - s.pts[s.pts.length-1].t;
      $('#sDue').textContent = since >= 2 ? 'Time for a rating.' : 'Next rating in '+Math.ceil(2-since)+' min';
      if(m >= 20) $('#sDue').textContent = 'Twenty minutes. Most waves have broken by now.';
    };
    tick(); timerInterval = setInterval(tick, 1000);
    wire(()=>{ s.pts.push({ t:Math.round(mins()*10)/10, v:cur }); sv(); });
    return;
  }
  if(id==='after'){
    scr.innerHTML = page('Now', 'How strong is it now?', 'Same scale as before'+(qc.before!=null?' (you started at '+qc.before+')':'')+'.',
      scale('qA', qc.after, 'calm', 'overwhelming'), nav('Finish'));
    wireScale('qA', v=>{ qc.after = v; sv(); });
    wire(); return;
  }
  if(id==='c1'){
    scr.innerHTML = page(COMPASSION[0].k, COMPASSION[0].t, COMPASSION[0].s,
      `<div class="chips">${CATCH_BODY.map(c=>`<button class="chip ${qc.body.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>`, nav());
    wireChips(scr, qc.body); scr.querySelectorAll('.chip').forEach(c=>c.addEventListener('click', sv));
    wire(); return;
  }
  if(id==='c2'){
    scr.innerHTML = page(COMPASSION[1].k, COMPASSION[1].t, COMPASSION[1].s, libCard(qc.kind==='porn'?'porn':'compassion', true), nav());
    wire(); return;
  }
  if(id==='c3'){
    scr.innerHTML = page(COMPASSION[2].k, COMPASSION[2].t, COMPASSION[2].s,
      `<textarea id="qK" style="min-height:140px" placeholder="Bro, ...">${esc(qc.kind_words||'')}</textarea>`, nav());
    $('#qK').oninput = e=>{ qc.kind_words = e.target.value; sv(); };
    wire(); return;
  }
  if(id==='before'){
    scr.innerHTML = page('Looking back', 'What was happening right before?', 'Where you were, what you were doing, what you were feeling. This is how you learn your triggers.',
      `<textarea id="qBe" style="min-height:140px" placeholder="I was...">${esc(qc.note||'')}</textarea>`, nav());
    $('#qBe').oninput = e=>{ qc.note = e.target.value; sv(); };
    wire(); return;
  }
  // done
  finishCatch(qc, false);
}
function surfChart(pts){
  const W=300, H=90, maxT = Math.max(20, ...pts.map(p=>p.t));
  const xy = pts.map(p=>[(p.t/maxT)*W, H - (p.v/10)*H]);
  return `<svg class="surf" viewBox="-6 -6 ${W+12} ${H+12}" preserveAspectRatio="none">
    <line x1="0" y1="${H}" x2="${W}" y2="${H}" class="ax"/>
    <polyline points="${xy.map(p=>p.join(',')).join(' ')}" class="ln"/>
    ${xy.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" class="pt"/>`).join('')}</svg>`;
}
function finishCatch(qc, early){
  const rec = { id:qc.id, at:qc.at, kind:qc.kind, path:qc.path||'now', body:qc.body, before:qc.before, after:qc.after,
    story:qc.story, ifthen:qc.ifthen, surf:qc.surf ? qc.surf.pts : null, kind_words:qc.kind_words, note:qc.note, partial:early||undefined };
  S.catches = S.catches.filter(c=>c.id!==rec.id); S.catches.unshift(rec);
  touch('catch', rec.id);
  LS.del('anchor_qc');
  if(early){ toast('Saved'); go('today'); return; }
  const scr = $('#screen');
  const drop = rec.before!=null && rec.after!=null ? rec.before - rec.after : null;
  const card = S.cards.length && seasonStatus(2).open ? S.cards[Math.floor(Math.random()*S.cards.length)] : null;
  scr.innerHTML = `<div class="center anim">
      <div class="done-mark">✓</div>
      <h1 class="display" style="font-size:1.9rem;margin-bottom:10px">Caught.</h1>
      <p class="sub" style="max-width:310px">${rec.path==='slip' ? 'You looked at it instead of looking away. That’s the practice.'
        : drop>0 ? 'From '+rec.before+' to '+rec.after+'. You rode it down.' : 'Logged. Catching it is the win, whatever the numbers did.'}</p>
    </div>
    <div class="foot anim d1">
      ${card ? `<div class="card"><div class="hc-k">Your flashcard</div><div class="note"><b>When</b> ${esc(card.trigger)}<br><b>The old belief:</b> ${esc(card.belief)}<br><b>My answer:</b> ${esc(card.response)}</div></div>` : libCard(libFor(rec.path==='slip'?'slip':rec.kind) || 'comparison', true)}
      <button class="btn btn-primary" data-act="go" data-v="today">Done</button>
      <button class="btn btn-quiet" onclick="startSession('full')">Go deeper: full check-in</button>
    </div>`;
  syncRecords();
}

/* =====================================================================
   Experiments (drop the performance)
   ===================================================================== */
function renderExperiment(scr){
  const x = vp.id ? S.experiments.find(e=>e.id===vp.id) : (vp.draft || (vp.draft = { event:'', prediction:'', drop:[], dropOther:'', intention:'' }));
  if(!x){ go('experiments'); return; }
  if(!vp.id){
    scr.innerHTML = page('Experiment', 'Drop the performance.',
      'Before an event: write what you fear will happen if you don’t perform, and pick one performance to drop. Afterwards, check what actually happened.',
      `<label class="fl">The event</label><input type="text" id="xE" value="${esc(x.event)}" placeholder="e.g. Fika on Tuesday">
       <label class="fl">My prediction</label><textarea id="xP" style="min-height:90px" placeholder="If I don’t entertain people, they’ll...">${esc(x.prediction)}</textarea>
       <label class="fl">The performance I’ll drop</label>
       <div class="chips">${SAFETY_BEHAVIOURS.map(c=>`<button class="chip ${x.drop.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
       <input type="text" id="xO" value="${esc(x.dropOther)}" placeholder="Something else">
       <label class="fl">Instead, what can I add?</label><input type="text" id="xI" value="${esc(x.intention)}" placeholder="e.g. Listen properly. Ask good questions.">
       ${libCard('safety', true)}`,
      `<button class="btn btn-primary" id="xSave">Save the experiment</button>${backLink('today')}`);
    wireChips(scr, x.drop);
    $('#xE').oninput=e=>x.event=e.target.value; $('#xP').oninput=e=>x.prediction=e.target.value;
    $('#xO').oninput=e=>x.dropOther=e.target.value; $('#xI').oninput=e=>x.intention=e.target.value;
    $('#xSave').onclick = ()=>{
      if(!x.event.trim() || !x.prediction.trim()){ toast('Name the event and your prediction'); return; }
      const rec = Object.assign({ id:uuid(), at:new Date().toISOString() }, x);
      S.experiments.unshift(rec); touch('experiment', rec.id); toast('Saved. Check back after.'); go('today');
    };
    return;
  }
  const a = x.after || (x.after = { happened:'', true_:'', mode:'', anxiety:null });
  scr.innerHTML = page('Experiment · after', esc(x.event), 'You predicted: "'+esc(x.prediction)+'"<br>You dropped: '+esc([...x.drop, x.dropOther].filter(Boolean).join(', ')),
    `<label class="fl">What actually happened?</label><textarea id="aH" style="min-height:110px">${esc(a.happened)}</textarea>
     <label class="fl">Did the prediction come true?</label>${seg('true_', [['yes','Yes'],['partly','Partly'],['no','No']], a.true_)}
     <label class="fl">Which mode were you in, mostly?</label>${seg('mode', [['contribute','Contributing'],['mixed','Mixed'],['seen','Trying to be seen']], a.mode)}
     <label class="fl">How anxious were you, overall?</label>${scale('aX', a.anxiety, 'calm', 'very')}`,
    `<button class="btn btn-primary" id="aSave">Save</button>${backLink('today','Not yet')}`);
  $('#aH').oninput = e=>a.happened = e.target.value;
  wireSegs(scr, (k,v)=>a[k]=v);
  wireScale('aX', v=>a.anxiety=v);
  $('#aSave').onclick = ()=>{ a.at = new Date().toISOString(); touch('experiment', x.id); toast('Logged'); go('today'); };
}
function renderExperiments(scr){
  scr.innerHTML = page('Experiments', 'Drop the performance', experimentsDone()+' done so far.',
    S.experiments.length ? S.experiments.map(x=>`<button class="hrow" data-act="go" data-v="experiment" data-p='${JSON.stringify({id:x.id})}'>
      <div class="when"><div class="d">${esc(x.event)}</div><div class="t">${fmtWhen(x.at)} · ${x.after&&x.after.at ? 'prediction: '+(x.after.true_||'?') : 'waiting for the after'}</div></div></button>`).join('')
      : '<p class="note">None yet. Before your next event, plan one.</p>',
    `<button class="btn btn-primary" data-act="go" data-v="experiment">Plan an experiment</button>${backLink('you')}`);
}

/* =====================================================================
   Brothers
   ===================================================================== */
function renderBrothers(scr){
  const k = dayKey();
  const weekFrom = addDays(k, -6);
  const thisWeek = S.brolog.filter(l=>l.date>=weekFrom);
  scr.innerHTML = page('Brothers', 'The men in your life',
    'One side-by-side activity and one honest sentence with a man, each week. This week: '+thisWeek.filter(l=>l.kind==='side').length+' side-by-side, '+thisWeek.filter(l=>l.kind==='honest').length+' honest.',
    `${S.brothers.map(b=>{ const l = lastContact(b.id); return `<div class="bro">
        <div><div class="bro-n">${esc(b.name)}</div><div class="note">${l ? daysBetween(l,k)+' days since you connected' : 'Not logged yet'}</div></div>
        <div class="bro-a"><button class="chip" data-log="${b.id}" data-k="side">Side by side</button><button class="chip" data-log="${b.id}" data-k="honest">Honest</button></div></div>`; }).join('')}
     <div class="row2 mt"><input type="text" id="bN" placeholder="Add a name"><button class="btn btn-ghost" id="bAdd" style="width:auto">Add</button></div>
     ${S.brothers.length < 5 ? '<p class="note mt">Aim for five to eight men you want to stay close to.</p>' : ''}
     ${libCard('friendship', true)}`,
    backLink('you'));
  $('#bAdd').onclick = ()=>{ const n = $('#bN').value.trim(); if(!n) return; S.brothers.push({ id:uuid(), name:n }); touch('brothers'); render(); };
  scr.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>{
    const note = prompt(b.dataset.k==='side' ? 'What did you do together?' : 'What did you say? (optional)') ;
    if(note===null) return;
    const rec = { id:uuid(), at:new Date().toISOString(), date:k, brother:b.dataset.log, kind:b.dataset.k, note };
    S.brolog.unshift(rec); touch('brolog', rec.id); toast('Logged'); render();
  });
}

/* =====================================================================
   Weekly review
   ===================================================================== */
function weekStats(endKey){
  const from = addDays(endKey, -6);
  const days = Object.entries(S.days).filter(([k])=>k>=from && k<=endKey).map(([,d])=>d);
  const cs = S.catches.filter(c=>{ const k = dayKey(new Date(c.at)); return k>=from && k<=endKey; });
  const byKind = {}; cs.forEach(c=>byKind[c.kind]=(byKind[c.kind]||0)+1);
  return {
    promises: days.filter(d=>d.promise).length, kept: days.filter(d=>d.kept==='yes').length, partly: days.filter(d=>d.kept==='partly').length,
    returned: days.filter(d=>d.promise || (d.evening&&d.evening.done)).length,
    evenings: days.filter(d=>d.evening&&d.evening.done).length,
    catches: cs.length, slips: cs.filter(c=>c.path==='slip').length, byKind,
    experiments: S.experiments.filter(x=>x.after&&x.after.at&&x.after.at.slice(0,10)>=from).length,
    brothers: S.brolog.filter(l=>l.date>=from && l.date<=endKey).length
  };
}
function renderWeekly(scr){
  const k = dayKey();
  const W = S.weekDraft && S.weekDraft.weekEnd===k ? S.weekDraft : (S.weekDraft = { weekEnd:k, step:0, review:{ test:{} } });
  const sv = ()=>save();
  const steps = ['stats','test','body','savor','read','digest'];
  const id = steps[W.step];
  const nextS = ()=>{ W.step++; sv(); render(); window.scrollTo(0,0); };
  const backS = ()=>{ if(W.step>0){ W.step--; sv(); render(); } else go('today'); };
  const nav = l=>`<button class="btn btn-primary" id="wN">${l||'Next'}</button><button class="btn btn-quiet" id="wB">Back</button>`;
  const wire = ()=>{ $('#wN') && ($('#wN').onclick = nextS); $('#wB') && ($('#wB').onclick = backS); };
  const st = W.stats = weekStats(k), prev = weekStats(addDays(k,-7));
  const tr = (a,b)=> a>b ? '<span class="up">↑</span>' : a<b ? '<span class="down">↓</span>' : '<span class="flat">→</span>';

  if(id==='stats'){
    const kinds = Object.entries(st.byKind).sort((a,b)=>b[1]-a[1]).map(([kk,n])=>{ const c = CATCH_KINDS.find(x=>x.id===kk); return (c?c.label:kk)+' ('+n+')'; }).join(', ');
    scr.innerHTML = page('Weekly review', 'Your week, as practice.', 'Arrows compare with the week before. This measures what you practised, not what you’re worth.',
      `<div class="stats">
        <div class="stat"><b>${st.kept}<small>/${st.promises}</small></b><span>promises kept ${tr(st.kept,prev.kept)}</span></div>
        <div class="stat"><b>${st.returned}<small>/7</small></b><span>days you came back ${tr(st.returned,prev.returned)}</span></div>
        <div class="stat"><b>${st.evenings}</b><span>evenings written ${tr(st.evenings,prev.evenings)}</span></div>
        <div class="stat"><b>${st.catches}</b><span>catches ${tr(st.catches,prev.catches)}</span></div>
        <div class="stat"><b>${st.experiments}</b><span>experiments</span></div>
        <div class="stat"><b>${st.brothers}</b><span>times with brothers ${tr(st.brothers,prev.brothers)}</span></div>
      </div>
      ${kinds ? `<p class="note mt">What you caught: ${esc(kinds)}.${st.slips?' '+st.slips+' of them after the fact.':''}</p>` : ''}
      ${libCard('contingent', true)}`, nav());
    wire(); return;
  }
  if(id==='test'){
    scr.innerHTML = page('The year-one test', 'This week, did you...', 'Honest answers. "Didn’t come up" is a fine answer.',
      YEAR_TEST.map(t=>`<div class="yt"><div class="yt-t">${esc(t.t)}</div>${seg(t.id, [['yes','Yes'],['notreally','Not really'],['na','Didn’t come up']], W.review.test[t.id])}</div>`).join(''), nav());
    wireSegs(scr, (kk,v)=>{ W.review.test[kk]=v; sv(); });
    wire(); return;
  }
  if(id==='body'){
    scr.innerHTML = page('Your body this week', 'Sleep and touch.', '',
      `<label class="fl">Sleep, most nights</label>${seg('sleep', [['good','Good'],['ok','Okay'],['poor','Poor']], W.review.sleep)}
       <label class="fl">Safe, non-romantic touch (massage, barber, hugs, contact sport)</label>${seg('touch', [['yes','Yes'],['little','A little'],['no','None']], W.review.touch)}
       <div id="bodyLib"></div>`, nav());
    const lib = ()=>{ $('#bodyLib').innerHTML = W.review.touch==='no' ? libCard('touch', true) : W.review.sleep==='poor' ? libCard('sleep', true) : ''; };
    wireSegs(scr, (kk,v)=>{ W.review[kk]=v; sv(); lib(); }); lib();
    wire(); return;
  }
  if(id==='savor'){
    scr.innerHTML = page('One good thing', 'Something good in your life this week that has nothing to do with women.', '',
      `<textarea id="wS" style="min-height:110px">${esc(W.review.savor||'')}</textarea>`, nav('Get my coach’s read'));
    $('#wS').oninput = e=>{ W.review.savor = e.target.value; sv(); };
    wire(); return;
  }
  if(id==='read'){
    if(!W.coached){
      scr.innerHTML = page('Weekly review', 'Your coach is reading your week...', '', spinner('This takes up to a minute.'), '');
      if(!renderWeekly._loading){
        renderWeekly._loading = true;
        coachWeekly(st, W.review).then(out=>{ W.coach = out; }).catch(()=>{ W.coach = null; })
          .finally(()=>{ W.coached = true; renderWeekly._loading = false; if(!W.digest) W.digest = (W.coach&&W.coach.digest) || localDigest(st, W.review); sv(); if(view==='weekly') render(); });
      }
      return;
    }
    const c = W.coach;
    const ph = currentPhase(), nextPh = PHASES[phaseIndex()+1];
    const manualReady = !c && nextPh && eveningsInPhase() >= 14;
    scr.innerHTML = page('Your coach’s read', '', '',
      `${c ? `<div class="coachline big">${esc(c.read)}</div>` : '<p class="note">Your coach is offline, so this week is just your numbers and your words. That’s enough.</p>'}
       ${c && c.beliefs && c.beliefs.length ? `<label class="fl">Beliefs your coach saw at work</label>${c.beliefs.map((b,i)=>`<div class="card">
          <div class="promise sm">${esc(b.belief)}</div>${b.origin?`<div class="note">Seems to come from: ${esc(b.origin)}</div>`:''}
          ${b.counter?`<div class="note">Against it: ${esc(b.counter)}</div>`:''}
          ${b.added?'<div class="kept yes">On your map</div>':`<button class="btn btn-ghost mt" data-addb="${i}">Add to my belief map</button>`}</div>`).join('')}` : ''}
       ${c && c.cards && c.cards.length ? `<label class="fl">Flashcards from your words</label>${c.cards.map((f,i)=>`<div class="card">
          <div class="note"><b>When</b> ${esc(f.trigger)}<br><b>Old belief:</b> ${esc(f.belief)}<br><b>My answer:</b> ${esc(f.response)}</div>
          ${f.added?'<div class="kept yes">Saved</div>':`<button class="btn btn-ghost mt" data-addc="${i}">Keep this card</button>`}</div>`).join('')}` : ''}
       ${c && c.phase && c.phase.advance && nextPh && !W.phaseDone ? `<div class="card sandline"><div class="hc-k">Shadow work</div>
          <div class="promise sm">Move from ${esc(ph.name)} to ${esc(nextPh.name)}?</div><div class="note">${esc(c.phase.reason||'')}</div>
          <div class="row2 mt"><button class="btn btn-sand" data-act="phaseGo">Move on</button><button class="btn btn-ghost" data-act="phaseStay">Stay a bit longer</button></div></div>` : ''}
       ${c && c.phase && !c.phase.advance && c.phase.reason ? `<p class="note">Staying in ${esc(ph.name)}: ${esc(c.phase.reason)}</p>` : ''}
       ${manualReady && !W.phaseDone ? `<div class="card sandline"><div class="hc-k">Shadow work</div>
          <div class="promise sm">${eveningsInPhase()} evenings in ${esc(ph.name)}. Ready for ${esc(nextPh.name)}?</div>
          <div class="note">${esc(ph.ready)}</div>
          <div class="row2 mt"><button class="btn btn-sand" data-act="phaseGo">Move on</button><button class="btn btn-ghost" data-act="phaseStay">Stay</button></div></div>` : ''}`,
      nav('Next: the therapy digest'));
    scr.querySelectorAll('[data-addb]').forEach(b=>b.onclick=()=>{ const x = c.beliefs[+b.dataset.addb];
      S.beliefs.push({ id:uuid(), belief:x.belief, origin:x.origin||'', counter:x.counter?[x.counter]:[], strength:7, hist:[{d:k,v:7}], at:new Date().toISOString() });
      x.added = true; touch('beliefs'); sv(); render(); });
    scr.querySelectorAll('[data-addc]').forEach(b=>b.onclick=()=>{ const x = c.cards[+b.dataset.addc];
      S.cards.push({ id:uuid(), trigger:x.trigger, belief:x.belief, origin:x.origin||'', response:x.response }); x.added = true; touch('cards'); sv(); render(); });
    wire(); return;
  }
  // digest
  scr.innerHTML = page('For your therapist', 'This week’s digest', 'Edit it however you like. It saves to the Therapy Digest tab in your Sheet.',
    `<textarea id="wD" style="min-height:260px">${esc(W.digest||'')}</textarea>`,
    `<button class="btn btn-primary" id="wSave">Save the week</button><button class="btn btn-ghost" id="wCopy">Copy digest</button><button class="btn btn-quiet" id="wB">Back</button>`);
  $('#wD').oninput = e=>{ W.digest = e.target.value; sv(); };
  $('#wCopy').onclick = ()=>{ navigator.clipboard && navigator.clipboard.writeText(W.digest||'').then(()=>toast('Copied')).catch(()=>toast('Select and copy the text')); };
  $('#wB').onclick = backS;
  $('#wSave').onclick = ()=>{
    const rec = { id:uuid(), at:new Date().toISOString(), weekEnd:k, dayNum:dayNum(), phase:currentPhase().name,
      stats:st, review:W.review, read:W.coach?W.coach.read:'', digest:W.digest||'' };
    S.weeks.unshift(rec); S.weekDraft = null; touch('week', rec.id); syncRecords(); toast('Week saved'); go('today');
  };
}
ACT.phaseGo = () => { const W = S.weekDraft; const r = W && W.coach && W.coach.phase ? W.coach.phase.reason : 'Chose to move on after '+eveningsInPhase()+' evenings';
  advancePhase(r); if(W){ W.phaseDone = true; save(); } toast('Now in '+currentPhase().name); render(); };
ACT.phaseStay = () => { if(S.weekDraft){ S.weekDraft.phaseDone = true; save(); } render(); };
function localDigest(st, rv){
  const carries = recentEvenings(7).map(e=>e.carry).filter(Boolean);
  const kinds = Object.entries(st.byKind).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([kk])=>{ const c = CATCH_KINDS.find(x=>x.id===kk); return c?c.label.toLowerCase():kk; });
  return 'This week I kept ' + st.kept + ' of ' + st.promises + ' promises and wrote ' + st.evenings + ' evening reflections. ' +
    (st.catches ? 'I caught ' + st.catches + ' moments, mostly: ' + kinds.join(' and ') + '. ' : '') +
    'Shadow work phase: ' + currentPhase().name + '. ' +
    (carries.length ? 'What I carried out of my evenings: "' + carries.slice(0,3).join('", "') + '". ' : '') +
    (rv.savor ? 'One good thing: ' + rv.savor + '. ' : '') +
    'What I want to bring to the session: ';
}

/* =====================================================================
   Coach chat (capped)
   ===================================================================== */
ACT.newChat = () => {
  const open = S.chats.find(c=>!c.closed);
  if(open){ go('chat', { id:open.id }); return; }
  const c = { id:uuid(), at:new Date().toISOString(), turns:[], action:'', closed:false };
  S.chats.unshift(c); touch('chat', c.id); go('chat', { id:c.id });
};
function renderChat(scr){
  const c = S.chats.find(x=>x.id===vp.id); if(!c){ go('today'); return; }
  const used = c.turns.filter(t=>t.role==='user').length, left = CHAT_CAP - used;
  if(c.closed || vp.ending){
    scr.innerHTML = page('Coach session', c.closed ? 'Your one action' : 'End with one action', c.closed ? fmtWhen(c.at) : 'Every session ends with one thing you’ll do in the next 24 hours.',
      `${c.turns.map(t=>`<div class="bubble ${t.role}">${esc(t.text)}</div>`).join('')}
       ${vp.loadingAction ? spinner('Your coach is naming the action...') : `<label class="fl">The action</label><input type="text" id="cA" value="${esc(c.action)}" placeholder="One small, concrete thing">`}`,
      c.closed ? backLink('chats','All sessions') : `<button class="btn btn-primary" id="cSave">Save and close the session</button>`);
    if($('#cA')) $('#cA').oninput = e=>c.action = e.target.value;
    $('#cSave') && ($('#cSave').onclick = ()=>{ if(!c.action.trim()){ toast('Name one action'); return; } c.closed = true; c.closedAt = new Date().toISOString(); touch('chat', c.id); go('today'); });
    return;
  }
  scr.innerHTML = `<div class="body anim">
      <div class="kicker">Coach session · ${left} message${left===1?'':'s'} left</div>
      ${!c.turns.length ? `<h1 class="q display">What’s on you?</h1><p class="sub">This is a coaching session, not a vent. Up to ${CHAT_CAP} messages, and it ends with one action.</p>` : ''}
      <div id="cLog">${c.turns.map(t=>`<div class="bubble ${t.role}">${esc(t.text)}</div>`).join('')}${vp.thinking?'<div class="bubble coach typing">...</div>':''}</div>
    </div>
    <div class="foot">
      <textarea id="cIn" style="min-height:90px" placeholder="Say it plainly"></textarea>
      <button class="btn btn-primary" id="cSend" ${vp.thinking?'disabled':''}>Send</button>
      <div class="row-between"><button class="btn btn-quiet" data-act="go" data-v="today">Leave it open</button><button class="btn btn-quiet" id="cEnd">End session</button></div>
    </div>`;
  window.scrollTo(0, document.body.scrollHeight);
  $('#cEnd').onclick = ()=>endChat(c);
  $('#cSend').onclick = async ()=>{
    const text = $('#cIn').value.trim(); if(!text) return;
    c.turns.push({ role:'user', text }); touch('chat', c.id);
    vp.thinking = true; render();
    try{ const r = await coachChatReply(c); c.turns.push({ role:'coach', text:r }); }
    catch(e){ c.turns.push({ role:'coach', text:'Your coach is offline right now. Keep writing if it helps, then end the session with one action.' }); }
    vp.thinking = false; touch('chat', c.id);
    if(c.turns.filter(t=>t.role==='user').length >= CHAT_CAP) return endChat(c);
    if(view==='chat') render();
  };
}
async function endChat(c){
  vp.ending = true;
  if(c.turns.length && !c.action && !coachOffline && settings.endpoint){
    vp.loadingAction = true; render();
    try{ c.action = await coachChatAction(c); }catch(e){}
    vp.loadingAction = false;
  }
  touch('chat', c.id); render();
}
function renderChats(scr){
  scr.innerHTML = page('Journal', 'Coach sessions', '',
    S.chats.length ? S.chats.map(c=>`<button class="hrow" data-act="go" data-v="chat" data-p='${JSON.stringify({id:c.id})}'>
      <div class="when"><div class="d">${esc(c.action || (c.turns[0]?c.turns[0].text.slice(0,60):'(empty)'))}</div><div class="t">${fmtWhen(c.at)}${c.closed?'':' · open'}</div></div></button>`).join('')
      : '<p class="note">No sessions yet.</p>', backLink('journal'));
}

/* =====================================================================
   Journal tab and logs
   ===================================================================== */
function renderJournal(scr){
  const evs = Object.values(S.days).filter(d=>d.evening&&d.evening.done).length;
  const row = (v, t, d, extra) => `<button class="hrow" data-act="go" data-v="${v}"><div class="when"><div class="d">${t}</div><div class="t">${d}</div></div>${extra||''}<span class="chev">›</span></button>`;
  scr.innerHTML = `<div class="body anim">
    <div class="kicker">Journal</div><h1 class="q display">What you’ve written</h1>
    <p class="sub">Phase: ${esc(currentPhase().name)}. ${esc(currentPhase().aim)}</p>
    ${row('map','Belief map', S.beliefs.length+' beliefs you’re watching')}
    ${seasonStatus(2).open ? row('cards','Flashcards', S.cards.length+' cards') : ''}
    ${row('eveninglog','Evenings', evs+' reflections')}
    ${row('weeks','Weekly reviews', S.weeks.length+' weeks')}
    ${row('catchlog','Catches', S.catches.length+' caught')}
    ${row('checkins','Body-skill check-ins', entries.length+' check-ins')}
    ${row('chats','Coach sessions', S.chats.length+' sessions')}
    ${row('letters','Letters', S.letters.length+' letters')}
  </div>`;
}
function renderEveningLog(scr){
  const list = Object.entries(S.days).filter(([,d])=>d.evening&&d.evening.done).sort((a,b)=>b[0].localeCompare(a[0]));
  scr.innerHTML = page('Journal', 'Evenings', '',
    list.length ? list.map(([k,d])=>`<button class="hrow" data-act="go" data-v="dayview" data-p='${JSON.stringify({k})}'>
      <div class="when"><div class="d">${fmtDay(k)}</div><div class="t">${esc((d.evening.qs[0]||{}).a ? d.evening.qs[0].a.slice(0,70) : '')}</div></div><span class="chev">›</span></button>`).join('')
      : '<p class="note">Your first evening will show up here.</p>', backLink('journal'));
}
function renderDayView(scr){
  const d = S.days[vp.k]; if(!d){ go('eveninglog'); return; }
  const ev = d.evening || {};
  scr.innerHTML = page(fmtDay(vp.k), d.promise ? esc(d.promise.text) : 'No promise that day', d.kept ? 'Promise: '+{yes:'kept',partly:'partly kept',no:'not kept'}[d.kept] : '',
    `${d.coachLine?`<div class="coachline"><span class="cl-k">Morning</span>${esc(d.coachLine)}</div>`:''}
     <dl class="detail qa">${(ev.qs||[]).map(q=>`<dt>${esc(q.q)}</dt><dd>${esc(q.a)||'<i>not answered</i>'}</dd>
       ${q.push?`<dt class="sub2">Coach: ${esc(q.push)}</dt><dd>${esc(q.pa)||'<i>not answered</i>'}</dd>`:''}`).join('')}
       ${ev.carry?`<dt>Carried into the next day</dt><dd>${esc(ev.carry)}</dd>`:''}</dl>`,
    backLink('eveninglog'));
}
function renderWeeks(scr){
  scr.innerHTML = page('Journal', 'Weekly reviews', '',
    S.weeks.length ? S.weeks.map(w=>`<button class="hrow" data-act="go" data-v="weekview" data-p='${JSON.stringify({id:w.id})}'>
      <div class="when"><div class="d">Week ending ${fmtDay(w.weekEnd)}</div><div class="t">Day ${w.dayNum} · ${esc(w.phase)} · kept ${w.stats.kept}/${w.stats.promises}</div></div><span class="chev">›</span></button>`).join('')
      : '<p class="note">Your first weekly review opens on day 7.</p>', backLink('journal'));
}
function renderWeekView(scr){
  const w = S.weeks.find(x=>x.id===vp.id); if(!w){ go('weeks'); return; }
  scr.innerHTML = page('Week ending '+fmtDay(w.weekEnd), 'Day '+w.dayNum, esc(w.phase),
    `${w.read?`<div class="coachline big">${esc(w.read)}</div>`:''}
     <dl class="detail">${YEAR_TEST.map(t=>`<dt>${esc(t.t)}</dt><dd>${{yes:'Yes',notreally:'Not really',na:'Didn’t come up'}[(w.review.test||{})[t.id]]||'<i>skipped</i>'}</dd>`).join('')}
       <dt>One good thing</dt><dd>${esc(w.review.savor)||'<i>none</i>'}</dd>
       <dt>Digest for therapy</dt><dd>${esc(w.digest)}</dd></dl>`,
    `<button class="btn btn-ghost" id="wvCopy">Copy digest</button>${backLink('weeks')}`);
  $('#wvCopy').onclick = ()=>navigator.clipboard && navigator.clipboard.writeText(w.digest||'').then(()=>toast('Copied'));
}
function renderCatchLog(scr){
  scr.innerHTML = page('Journal', 'Catches', 'Every one of these is a moment you noticed instead of being run by it.',
    S.catches.length ? S.catches.map(c=>{ const k = CATCH_KINDS.find(x=>x.id===c.kind);
      return `<div class="hrow static"><div class="when"><div class="d">${esc(k?k.label:c.kind)} ${c.path==='slip'?'<span class="tag unsynced">after</span>':''}</div>
        <div class="t">${fmtWhen(c.at)}${c.story?' · '+esc(c.story.slice(0,60)):''}${c.note?' · '+esc(c.note.slice(0,60)):''}</div></div>
        <div class="arc">${c.before!=null?c.before:'–'}<small> → </small>${c.after!=null?c.after:'–'}</div></div>`; }).join('')
      : '<p class="note">Nothing caught yet.</p>', backLink('journal'));
}

/* ---------- belief map ---------- */
function renderMap(scr){
  const k = dayKey();
  scr.innerHTML = page('Journal', 'Belief map', 'Core beliefs you’re watching. Rate how true each one feels today, from your gut. Watch them loosen over the year.',
    `${S.beliefs.map((b,i)=>`<div class="card belief">
      <textarea class="bl-t" data-i="${i}" data-f="belief" rows="2">${esc(b.belief)}</textarea>
      <label class="fl">Where it seems to come from</label><input type="text" data-i="${i}" data-f="origin" value="${esc(b.origin)}">
      <label class="fl">Evidence against it</label><textarea data-i="${i}" data-f="counter" rows="3" placeholder="One per line">${esc((b.counter||[]).join('\n'))}</textarea>
      <label class="fl">How true it feels today: <b id="bv${i}">${b.strength}</b>/10 ${b.hist&&b.hist.length>1?'<span class="note">(was '+b.hist[0].v+' on '+fmtDay(b.hist[0].d)+')</span>':''}</label>
      <input type="range" min="0" max="10" value="${b.strength}" data-i="${i}" data-f="strength">
      <button class="btn btn-quiet" data-delb="${i}">Remove</button></div>`).join('')}
     <button class="btn btn-ghost" id="bAddNew">Add a belief</button>${libCard('schema', true)}`,
    backLink('journal'));
  scr.querySelectorAll('[data-f]').forEach(inp=>inp.oninput=()=>{
    const b = S.beliefs[+inp.dataset.i], f = inp.dataset.f;
    if(f==='counter') b.counter = inp.value.split('\n').filter(s=>s.trim());
    else if(f==='strength'){ b.strength = +inp.value; $('#bv'+inp.dataset.i).textContent = inp.value;
      b.hist = b.hist || []; const h = b.hist.find(x=>x.d===k); if(h) h.v = b.strength; else b.hist.push({ d:k, v:b.strength }); }
    else b[f] = inp.value;
    touch('beliefs');
  });
  scr.querySelectorAll('[data-delb]').forEach(x=>x.onclick=()=>{ if(confirm('Remove this belief from your map?')){ S.beliefs.splice(+x.dataset.delb,1); touch('beliefs'); render(); } });
  $('#bAddNew').onclick = ()=>{ S.beliefs.push({ id:uuid(), belief:'I ', origin:'', counter:[], strength:7, hist:[{d:k,v:7}], at:new Date().toISOString() }); touch('beliefs'); render(); };
}
function renderCards(scr){
  scr.innerHTML = page('Journal', 'Flashcards', 'Built from your own words. One shows up after a catch.',
    `${S.cards.map((c,i)=>`<div class="card">
      <label class="fl">When</label><input type="text" data-i="${i}" data-f="trigger" value="${esc(c.trigger)}">
      <label class="fl">The old belief</label><input type="text" data-i="${i}" data-f="belief" value="${esc(c.belief)}">
      <label class="fl">Where it comes from</label><input type="text" data-i="${i}" data-f="origin" value="${esc(c.origin)}">
      <label class="fl">My answer now</label><textarea data-i="${i}" data-f="response" rows="3">${esc(c.response)}</textarea>
      <button class="btn btn-quiet" data-delc="${i}">Remove</button></div>`).join('')}
     <button class="btn btn-ghost" id="cAddNew">Add a card</button>`, backLink('journal'));
  scr.querySelectorAll('[data-f]').forEach(inp=>inp.oninput=()=>{ S.cards[+inp.dataset.i][inp.dataset.f] = inp.value; touch('cards'); });
  scr.querySelectorAll('[data-delc]').forEach(x=>x.onclick=()=>{ S.cards.splice(+x.dataset.delc,1); touch('cards'); render(); });
  $('#cAddNew').onclick = ()=>{ S.cards.push({ id:uuid(), trigger:'', belief:'', origin:'', response:'' }); touch('cards'); render(); };
}

/* ---------- letters / then vs now ---------- */
function renderLetters(scr){
  const yl = S.mods.filter(m=>m.mod==='yearletter');
  scr.innerHTML = page('Journal', 'Letters', '',
    `${yl.map(m=>`<button class="hrow" data-act="go" data-v="module" data-p='${JSON.stringify({id:'yearletter', edit:m.id})}'><div class="when"><div class="d">Year-end letter</div><div class="t">${fmtWhen(m.at)}</div></div><span class="chev">›</span></button>`).join('')}
     ${S.letters.map(l=>`<div class="card"><div class="hc-k">Then vs Now · ${fmtDay(l.at.slice(0,10))}</div><div class="letter">${esc(l.text)}</div></div>`).join('')}
     ${!yl.length && !S.letters.length ? '<p class="note">Your year-end letter and monthly Then vs Now letters live here.</p>' : ''}`,
    `<button class="btn btn-ghost" data-act="go" data-v="module" data-p='{"id":"yearletter"}'>Write your year-end letter</button>${backLink('journal')}`);
}
function renderThenNow(scr){
  const all = Object.entries(S.days).filter(([,d])=>d.evening&&d.evening.done).sort((a,b)=>a[0].localeCompare(b[0]));
  const pick = arr => arr.flatMap(([k,d])=>d.evening.qs.filter(q=>q.a&&q.a.trim()).map(q=>({ date:k, q:q.q, a:q.a }))).slice(0,6);
  const early = pick(all.slice(0,7)), late = pick(all.slice(-7).reverse());
  if(vp.text==null && !vp.loading){
    vp.loading = true;
    scr.innerHTML = page('Monthly', 'Then vs Now', '', spinner('Putting your words side by side...'), '');
    coachThenNow(early, late).then(t=>vp.text=t).catch(()=>vp.text='')
      .finally(()=>{ vp.loading = false; if(view==='thennow') render(); });
    return;
  }
  if(vp.loading) return;
  const body = vp.text ? `<div class="letter">${esc(vp.text)}</div>` :
    `<label class="fl">Then</label>${early.slice(0,3).map(x=>`<div class="quote"><span>${fmtDay(x.date)}</span>${esc(x.a)}</div>`).join('') || '<p class="note">Not enough yet.</p>'}
     <label class="fl">Now</label>${late.slice(0,3).map(x=>`<div class="quote"><span>${fmtDay(x.date)}</span>${esc(x.a)}</div>`).join('') || '<p class="note">Not enough yet.</p>'}`;
  scr.innerHTML = page('Monthly', 'Then vs Now', 'Day '+dayNum()+'.', body,
    `<button class="btn btn-primary" id="tnSave">Keep it</button>${backLink('today')}`);
  $('#tnSave').onclick = ()=>{
    const text = vp.text || ('Then:\n' + early.slice(0,3).map(x=>x.a).join('\n') + '\n\nNow:\n' + late.slice(0,3).map(x=>x.a).join('\n'));
    const rec = { id:uuid(), at:new Date().toISOString(), kind:'thennow', text };
    S.letters.unshift(rec); S.profile.lastThenNow = dayKey(); touch('letter', rec.id); touch('profile'); go('today');
  };
}

/* =====================================================================
   You tab: seasons, modules, if-thens, library, settings
   ===================================================================== */
function renderYou(scr){
  const cur = currentSeason();
  const mods = MODULES.filter(m=>m.gate!=='therapist' || S.profile.therapistOK);
  const row = (act, t, d, attrs) => `<button class="hrow" ${attrs||`data-act="go" data-v="${act}"`}><div class="when"><div class="d">${t}</div><div class="t">${d}</div></div><span class="chev">›</span></button>`;
  scr.innerHTML = `<div class="body anim">
    <div class="kicker">You</div><h1 class="q display">${esc(S.profile.name || 'Your year')}</h1>
    <p class="sub">Season ${cur}: ${esc(SEASONS[cur-1].name)}. Day ${dayNum()}.</p>
    ${row('seasons','Seasons and unlocks', seasonLine())}
    ${row('ifthens','If-then plans', S.ifthens.length+' plans')}
    ${row('brothers','Brothers', S.brothers.length+(S.brothers.length===1?' man':' men'))}
    ${row('experiments','Experiments', experimentsDone()+' done')}
    <label class="fl" style="margin-top:26px">Practices</label>
    ${mods.map(m=>{ const open = moduleOpen(m);
      return row('', (open?'':'🔒 ')+esc(m.title), open ? esc(m.cadence) : (m.season ? 'Opens in season '+m.season : 'Locked'),
        `data-act="go" data-v="${open?'module':'seasons'}" data-p='${JSON.stringify({id:m.id})}'`); }).join('')}
    <label class="fl" style="margin-top:26px">More</label>
    ${row('library','The research', LIBRARY.length+' short reads')}
    ${row('','Talk to your coach', 'Capped at '+CHAT_CAP+' messages, ends with one action', 'data-act="newChat"')}
    ${row('settings','Settings', 'Reminders, your coach profile, your Sheet')}
  </div>`;
}
function seasonLine(){
  const n = currentSeason();
  if(n >= SEASONS.length) return 'All four seasons open';
  const s = seasonStatus(n+1);
  return 'Next: season '+(n+1)+' waits on '+s.waiting.join(' and ');
}
function renderSeasons(scr){
  const ph = phaseIndex();
  scr.innerHTML = page('You', 'Seasons', 'Each season opens with time and practice. A missed month just delays the next one.',
    `${SEASONS.map((s,i)=>{ const st = seasonStatus(s.n);
      const mods = MODULES.filter(m=>m.season===s.n).map(m=>m.title);
      return `<div class="card season ${st.open?'open':''}">
        <div class="hc-k">Season ${s.n} ${st.open ? (st.override && !st.earned ? '· opened early' : '· open') : '· locked'}</div>
        <div class="hc-t">${esc(s.name)}</div><div class="note">${esc(s.about)}</div>
        ${mods.length?`<div class="note mt">Opens: ${esc(mods.join(', '))}</div>`:''}
        ${!st.open ? `<div class="note mt">Waiting on ${esc(st.waiting.join(' and '))}.</div>
          <button class="btn btn-quiet" data-early="${s.n}">Unlock early</button>` : ''}
        ${st.override && !st.earned ? `<div class="note mt">You said: "${esc(st.override.reason)}"</div>` : ''}</div>`; }).join('')}
     <label class="fl">Shadow work</label>
     <div class="card">${PHASES.map((p,i)=>`<div class="ph ${i<ph?'past':i===ph?'now':''}"><b>${esc(p.name)}</b><span>${esc(p.aim)}</span></div>`).join('')}
       <p class="note mt">Phases move when your answers show you’re ready, checked at each weekly review.</p></div>`,
    backLink('you'));
  scr.querySelectorAll('[data-early]').forEach(b=>b.onclick=()=>{
    const reason = prompt('This is designed for later. Why now?');
    if(!reason || !reason.trim()) return;
    S.profile.overrides[b.dataset.early] = { at:dayKey(), reason:reason.trim() };
    touch('profile'); toast('Opened. Your reason is saved.'); render();
  });
}

/* ---------- generic module ---------- */
function renderModule(scr){
  const m = MODULES.find(x=>x.id===vp.id); if(!m){ go('you'); return; }
  if(!moduleOpen(m)){ go('seasons'); return; }
  const past = S.mods.filter(x=>x.mod===m.id);
  const editing = vp.edit ? past.find(x=>x.id===vp.edit) : null;
  const vals = vp.vals || (vp.vals = Object.assign({}, editing ? editing.values : {}));
  const field = f => {
    if(f.type==='scale') return `<label class="fl">${esc(f.label)}</label>${scale('mf_'+f.key, vals[f.key], 'none', 'complete')}`;
    if(f.type==='choice') return `<label class="fl">${esc(f.label)}</label>${seg(f.key, f.options.map(o=>[o,o]), vals[f.key])}`;
    return `<label class="fl">${esc(f.label)}</label>` + (f.big
      ? `<textarea data-k="${f.key}" style="min-height:200px" placeholder="${esc(f.ph||'')}">${esc(vals[f.key]||'')}</textarea>`
      : `<textarea data-k="${f.key}" style="min-height:70px" placeholder="${esc(f.ph||'')}">${esc(vals[f.key]||'')}</textarea>`);
  };
  scr.innerHTML = page(esc(m.cadence), esc(m.title), esc(m.intro),
    `${m.fields.map(field).join('')}
     ${past.length && !editing ? `<label class="fl">Before</label>${past.map(p=>`<button class="hrow" data-act="go" data-v="module" data-p='${JSON.stringify({id:m.id, edit:p.id})}'>
        <div class="when"><div class="d">${esc(String(Object.values(p.values)[0]||'').slice(0,70))}</div><div class="t">${fmtWhen(p.at)}</div></div><span class="chev">›</span></button>`).join('')}` : ''}
     ${libCard(m.lib, true)}`,
    `<button class="btn btn-primary" id="mdSave">${editing?'Save changes':'Save'}</button>${backLink(editing?'module':'you')}`);
  if(editing) scr.querySelector('.foot .btn-quiet').dataset.p = JSON.stringify({ id:m.id });
  scr.querySelectorAll('[data-k]').forEach(t=>t.oninput=()=>vals[t.dataset.k]=t.value);
  m.fields.filter(f=>f.type==='scale').forEach(f=>wireScale('mf_'+f.key, v=>vals[f.key]=v));
  wireSegs(scr, (k,v)=>vals[k]=v);
  $('#mdSave').onclick = ()=>{
    if(!Object.values(vals).some(v=>String(v).trim())){ toast('Write something first'); return; }
    if(editing){ editing.values = Object.assign({}, vals); editing.updated = new Date().toISOString(); touch('mod', editing.id); }
    else { const rec = { id:uuid(), at:new Date().toISOString(), mod:m.id, values:Object.assign({}, vals) }; S.mods.unshift(rec); touch('mod', rec.id); }
    toast('Saved'); go('module', { id:m.id });
  };
}

function renderIfThens(scr){
  scr.innerHTML = page('You', 'If-then plans', 'Decided in advance, so the moment doesn’t have to decide. They come up in Catch and in your morning promise.',
    ifthenEditor() + libCard('ifthen', true), backLink('you'));
  wireIfthenEditor(scr);
}
function renderLibrary(scr){
  scr.innerHTML = page('You', 'The research', 'Short reads on why each part of this app is here. Strength is marked honestly.',
    LIBRARY.map(c=>`<details class="libd"><summary>${esc(c.title)}<span>${esc(c.strength)}</span></summary>
      <p>${esc(fillName(c.body))}</p><p class="lib-s">${esc(c.source)}</p></details>`).join(''), backLink('you'));
}

/* ---------- settings ---------- */
function renderSettings(scr){
  const P = S.profile;
  scr.innerHTML = page('Settings', 'Settings', '',
    `<label class="fl">First name</label><input type="text" id="sName" value="${esc(P.name)}">
     <label class="fl">What your coach knows about you</label>
     <textarea id="sAbout" style="min-height:200px">${esc(P.about)}</textarea>
     <label class="fl">Day 1 of your year</label><input type="date" id="sStart" value="${esc(P.startDate)}">
     <hr class="sep">
     <div class="kicker" style="margin-top:6px">Reminders</div>
     ${timesEditor()}
     <button class="btn btn-ghost mt" id="sCal">Put these reminders in my Google Calendar</button>
     <button class="btn btn-quiet" id="sCalOff">Remove the reminders</button>
     <hr class="sep">
     <div class="kicker" style="margin-top:6px">Your Sheet</div>
     <label class="fl">Apps Script URL (ends in /exec)</label>
     <input type="url" id="sEnd" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(settings.endpoint)}">
     <label class="fl">App secret</label>
     <input type="password" id="sSec" value="${esc(settings.secret)}">
     <button class="btn btn-ghost mt" id="sTest">Test connection</button>
     <button class="btn btn-quiet" id="sRestore">Restore everything from my Sheet</button>
     <p class="note">${Object.keys(S.dirty).length} changes waiting to sync.</p>
     <hr class="sep">
     <label class="fl">Therapist go-ahead</label>
     <label class="toggle"><input type="checkbox" id="sTher" ${P.therapistOK?'checked':''}> My therapist has agreed to imagery rescripting</label>
     <label class="fl">Default pause length (full check-in)</label>
     <div class="chips" id="pDef">${[5,10,20,30].map(m=>`<button class="chip ${settings.pauseDefault===m?'on':''}" data-m="${m}">${m} min</button>`).join('')}</div>
     <hr class="sep">
     <p class="note">Everything lives on this phone and in your private Google Sheet. The coach sends only what it needs for each question to your own Apps Script, which calls Claude with a key that never leaves Google’s side.</p>`,
    `<button class="btn btn-primary" id="sSave">Save</button>${backLink(P.onboarded?'you':'today')}`);
  wireTimesEditor(scr);
  scr.querySelectorAll('#pDef .chip').forEach(c=>c.onclick=()=>{ settings.pauseDefault=+c.dataset.m; saveSettings(); scr.querySelectorAll('#pDef .chip').forEach(x=>x.classList.toggle('on',x===c)); });
  const grab = ()=>{
    P.name = $('#sName').value.trim(); P.about = $('#sAbout').value; if($('#sStart').value) P.startDate = $('#sStart').value;
    P.therapistOK = $('#sTher').checked;
    settings.endpoint = $('#sEnd').value.trim(); settings.secret = $('#sSec').value.trim(); saveSettings();
    touch('profile');
  };
  $('#sSave').onclick = ()=>{ grab(); coachOffline = false; toast('Saved'); syncRecords(); syncQueue(); };
  $('#sTest').onclick = async ()=>{ grab();
    try{ const out = await postAPI({ action:'ping' }); coachOffline = false; toast('Connected. Coach '+(out.coach===false?'is off: add ANTHROPIC_API_KEY':'is on')); }
    catch(e){ toast('Could not reach it: '+e.message); } };
  $('#sCal').onclick = async ()=>{ grab(); try{ await setCalendarReminders(true); toast('Reminders set in your calendar'); }catch(e){ toast('Could not set reminders: '+e.message); } };
  $('#sCalOff').onclick = async ()=>{ try{ await setCalendarReminders(false); toast('Reminders removed'); }catch(e){ toast('Could not remove them: '+e.message); } };
  $('#sRestore').onclick = async ()=>{ grab();
    if(!confirm('Replace what’s on this phone with what’s in your Sheet?')) return;
    try{ const n = await restoreFromSheet(); toast('Restored '+n+' records'); go('today'); }catch(e){ toast('Could not restore: '+e.message); } };
}
