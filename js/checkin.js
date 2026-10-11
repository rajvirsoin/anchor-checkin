'use strict';
/* Anchor body-skill check-in (the original Anchor flow), now reached from Catch. */
let active = LS.get(ACTIVE_KEY, null);   // in-flight check-in
let timerInterval = null;
/* ---------- step lists ---------- */
const GROUND = ['g_see','g_touch','g_hear','g_smell','g_taste'];
const FACTS  = ['facts_mean','facts_know','facts_alt','facts_fit'];
const TAIL   = ['urge_after','suds_pause','acted','helped','escalate','escalate_do','suds_final','reframe','close','done'];

const FLOW = {
  full:    ['trigger','body','emotion','suds_before','fears','floatback','urges','urge_before',...FACTS,...GROUND,'suds_ground','pause',...TAIL],
  flooded: ['suds_before',...GROUND,'suds_ground','pause','trigger','body','emotion','fears','floatback','urges','urge_before',...FACTS,...TAIL]
};

/* ---------- chip banks ---------- */
const BODY_CHIPS   = ['Chest tight','Heart racing','Throat closing','Stomach knot','Jaw clenched','Hands restless','Shallow breath','Hot face','Heavy limbs','Buzzing / wired'];
const EMOTION_CHIPS= ['Fear','Shame','Anger','Sadness','Jealousy','Abandonment','Rejection','Loneliness','Panic','Numb'];
const URGE_CHIPS   = ['Distract myself','Overthink it','Check my phone','Text them again','Withdraw','Snap at someone','Eat / drink','Doomscroll','Cancel plans','Shut down'];

const SENSES = {
  g_see:  {n:5,verb:'see',    prompt:'Look around slowly.'},
  g_touch:{n:4,verb:'touch',  prompt:'Reach out. Notice texture and temperature.'},
  g_hear: {n:3,verb:'hear',   prompt:'Close your eyes if it helps.'},
  g_smell:{n:2,verb:'smell',  prompt:'Breathe in through your nose.'},
  g_taste:{n:1,verb:'taste',  prompt:'Even the taste of your own mouth counts.'}
};

/* ---------- helpers ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),2600); }
function timeOfDay(d){ const h=d.getHours(); return h<5?'night':h<12?'morning':h<17?'afternoon':h<22?'evening':'night'; }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); }
function fmtTime(iso){ const d=new Date(iso); return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }
function saveActive(){ if(active) LS.set(ACTIVE_KEY, active); else LS.del(ACTIVE_KEY); }

/* =====================================================================
   Session lifecycle
   ===================================================================== */
function startSession(mode){
  active = {
    mode, step:0,
    data:{
      entry_id: uuid(), mode,
      started_at: new Date().toISOString(),
      trigger:'', body:[], body_other:'', emotions:[], emotions_other:'',
      distress_before:null, fears:'', floatback:'', urges:[], urges_other:'', urge_before:null,
      interpretation:'', facts_known:'', alt_explanation:'', fits_facts:'',
      grounding:{see:[],touch:[],hear:[],smell:[],taste:[]}, grounding_completed:false,
      distress_after_grounding:null,
      pause_minutes:null, pause_completed:false, pause_ends_at:null,
      urge_after:null, distress_after_pause:null, acted_on_urge:'', what_helped:'',
      escalation_used:'', distress_final:null,
      ai_suggestions:'', chosen_story:'', closing_note:''
    }
  };
  saveActive();
  view='flow'; render();
}

function stepId(){ return FLOW[active.mode][active.step]; }

function next(skipSave){
  const list = FLOW[active.mode];
  let i = active.step + 1;
  // conditional skip of the escalation branch
  while(i < list.length){
    const id = list[i];
    if((id==='escalate' || id==='escalate_do' || id==='suds_final') && !needsEscalation()) { i++; continue; }
    if(id==='escalate_do' && !active.data.escalation_used){ i++; continue; }
    break;
  }
  active.step = Math.min(i, list.length-1);
  saveActive(); render();
}
function back(){
  const list = FLOW[active.mode];
  let i = active.step - 1;
  while(i > 0){
    const id = list[i];
    if((id==='escalate' || id==='escalate_do' || id==='suds_final') && !needsEscalation()){ i--; continue; }
    if(id==='escalate_do' && !active.data.escalation_used){ i--; continue; }
    break;
  }
  active.step = Math.max(i, 0);
  saveActive(); render();
}
function needsEscalation(){
  return active && active.data.urge_after != null && active.data.urge_after >= 6;
}

function finishSession(){
  const d = active.data;
  d.finished_at = new Date().toISOString();
  if(d.distress_final==null) d.distress_final = d.distress_after_pause;
  d.duration_minutes = Math.max(1, Math.round((new Date(d.finished_at) - new Date(d.started_at))/60000));
  const st = new Date(d.started_at);
  d.weekday = st.toLocaleDateString('en-US',{weekday:'long'});
  d.time_of_day = timeOfDay(st);
  d.synced = false;
  delete d.pause_ends_at;
  entries.unshift(d);
  saveEntries();
  active = null; saveActive();
  syncQueue();
}

function abandonSession(){
  // a half-finished entry is still worth saving
  const d = active.data;
  const touched = d.trigger || d.distress_before!=null || d.fears || (d.body&&d.body.length);
  if(touched){
    d.finished_at = new Date().toISOString();
    d.abandoned = true;
    d.duration_minutes = Math.max(1, Math.round((new Date(d.finished_at)-new Date(d.started_at))/60000));
    const st=new Date(d.started_at); d.weekday=st.toLocaleDateString('en-US',{weekday:'long'}); d.time_of_day=timeOfDay(st);
    d.synced=false; delete d.pause_ends_at;
    entries.unshift(d); saveEntries(); syncQueue();
    toast('Saved as partial entry');
  }
  active=null; saveActive(); view='catch'; render();
}

/* =====================================================================
   Sync — Apps Script endpoint; localStorage queue, idempotent by entry_id
   ===================================================================== */

let syncing=false;
async function syncQueue(){
  if(syncing || !settings.endpoint || !navigator.onLine) {
    if(view==='checkins') render();
    return;
  }
  syncing=true;
  let sent=0;
  for(const e of entries.filter(x=>!x.synced)){
    try{
      await postAPI({action:'log', entry:e});
      e.synced=true; sent++;
      saveEntries();
    }catch(err){ break; }   // stop on first failure, retry later
  }
  syncing=false;
  if(sent) toast(sent + (sent===1?' entry':' entries') + ' synced to your Sheet');
  if(view==='checkins') render();
}
window.addEventListener('online', syncQueue);

/* ---------- flow steps ---------- */
function shell(kicker, q, sub, bodyHTML, footHTML){
  return `
    <div class="body anim">
      <div class="kicker">${kicker}</div>
      <h1 class="q display">${q}</h1>
      ${sub?'<p class="sub">'+sub+'</p>':''}
      ${bodyHTML}
    </div>
    <div class="foot">${footHTML}</div>`;
}
function navBtns(nextLabel){
  return `
    <button class="btn btn-primary" id="nx">${nextLabel||'Next'}</button>
    <div style="display:flex;justify-content:space-between">
      <button class="btn btn-quiet" id="bk" style="width:auto">Back</button>
      <button class="btn btn-quiet" id="quit" style="width:auto">Save &amp; exit</button>
    </div>`;
}
function wireNav(onNext){
  $('#nx') && ($('#nx').onclick = ()=>{ onNext&&onNext(); next(); });
  $('#bk') && ($('#bk').onclick = ()=>{ onNext&&onNext(); back(); });
  $('#quit') && ($('#quit').onclick = ()=>{ onNext&&onNext(); abandonSession(); });
}
function chipGroup(bank, selected){
  return '<div class="chips">'+bank.map(c=>`<button class="chip ${selected.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')+'</div>';
}
function wireChips(container, arr){
  container.querySelectorAll('.chip').forEach(ch=>{
    ch.onclick=()=>{
      const c=ch.dataset.c, i=arr.indexOf(c);
      if(i>=0) arr.splice(i,1); else arr.push(c);
      ch.classList.toggle('on');
      saveActive();
    };
  });
}
function sudsBlock(val){
  const labels=['Calm, barely anything','Very mild','Mild','Noticeable','Uncomfortable','Distressing','Hard to think straight','Very intense','Severe','Overwhelming','The worst it gets'];
  return `
    <div class="suds">
      <div class="big" id="sudsNum">${val==null?5:val}</div>
      <div class="lbl" id="sudsLbl">${labels[val==null?5:val]}</div>
      <input type="range" min="0" max="10" step="1" value="${val==null?5:val}" id="sudsRange" aria-label="0 to 10">
      <div class="scale-ends"><span>0 · calm</span><span>10 · worst</span></div>
    </div>`;
}
function wireSuds(assign){
  const r=$('#sudsRange');
  const labels=['Calm, barely anything','Very mild','Mild','Noticeable','Uncomfortable','Distressing','Hard to think straight','Very intense','Severe','Overwhelming','The worst it gets'];
  const upd=()=>{ $('#sudsNum').textContent=r.value; $('#sudsLbl').textContent=labels[+r.value]; assign(+r.value); saveActive(); };
  r.oninput=upd; upd();
}

function renderStep(scr){
  const id = stepId(), d = active.data;
  const N = FLOW[active.mode].length;

  /* --- free-text steps --- */
  const textSteps = {
    trigger:  {k:'The trigger', q:'What just happened?', s:'Name the event, plainly. Just the facts of it.', ph:'e.g. My partner hasn’t replied to my text since this morning…', field:'trigger'},
    fears:    {k:'The fear',    q:'What fears is this bringing up?', s:'What is the scared part of you saying this means?', ph:'e.g. She doesn’t love me anymore…', field:'fears'},
    floatback:{k:'The echo',    q:'When did you feel this before?', s:'Let your mind drift back. When is the earliest or strongest time this exact feeling showed up?', ph:'e.g. When my ex ghosted me… or further back…', field:'floatback'},
    facts_mean:{k:'Check the facts · 1 of 4', q:'What am I telling myself this means?', s:'The story under the fear, in one or two lines.', ph:'e.g. If she loved me she’d have answered by now…', field:'interpretation'},
    facts_know:{k:'Check the facts · 2 of 4', q:'What do I actually know?', s:'Only things you could prove to a stranger. No mind-reading.', ph:'e.g. She hasn’t replied in 4 hours. She said she had back-to-back meetings today…', field:'facts_known'},
    facts_alt:{k:'Check the facts · 3 of 4', q:'What else could explain it?', s:'One other explanation that also fits the same facts.', ph:'e.g. She’s slammed at work and hasn’t looked at her phone…', field:'alt_explanation'},
    helped:   {k:'Looking back', q:'What helped, and what knocked you off?', s:'So future-you knows what to reach for.', ph:'e.g. The grounding helped. Checking her last-seen made it worse…', field:'what_helped'},
    close:    {k:'Closing',     q:'A word for the you from back then', s:'You touched an old memory earlier. Before you finish: what would you say to that version of you, knowing what you know now?', ph:'e.g. That was then. You survived it, and this is not that…', field:'closing_note'}
  };

  if(textSteps[id]){
    const t = textSteps[id];
    scr.innerHTML = shell(t.k, t.q, t.s, `<textarea id="tx" placeholder="${t.ph}">${esc(d[t.field])}</textarea>`, navBtns(id==='close'?'Finish this step':'Next'));
    const save=()=>{ d[t.field]=$('#tx').value.trim(); saveActive(); };
    $('#tx').addEventListener('input',()=>{ d[t.field]=$('#tx').value; saveActive(); });
    wireNav(save);
    return;
  }

  /* --- chip steps --- */
  if(id==='body'||id==='emotion'||id==='urges'){
    const cfg = {
      body:   {k:'The body', q:'Where do you feel it?', s:'Scan from head to belly. Tap what’s true, add anything else.', bank:BODY_CHIPS, arr:d.body, other:'body_other', ph:'Anything else you notice…'},
      emotion:{k:'The feeling', q:'What would you call this feeling?', s:'Naming an emotion turns the volume down. Pick every one that fits.', bank:EMOTION_CHIPS, arr:d.emotions, other:'emotions_other', ph:'Another word for it…'},
      urges:  {k:'The urge', q:'What do you want to do right now?', s:'No judgment. Just notice the pull.', bank:URGE_CHIPS, arr:d.urges, other:'urges_other', ph:'Another urge…'}
    }[id];
    scr.innerHTML = shell(cfg.k, cfg.q, cfg.s,
      chipGroup(cfg.bank, cfg.arr) + `<input type="text" id="oth" placeholder="${cfg.ph}" value="${esc(d[cfg.other])}">`,
      navBtns());
    wireChips(scr, cfg.arr);
    $('#oth').addEventListener('input',()=>{ d[cfg.other]=$('#oth').value; saveActive(); });
    wireNav(()=>{ d[cfg.other]=$('#oth').value.trim(); });
    return;
  }

  /* --- SUDS steps --- */
  const sudsSteps = {
    suds_before:{k:'Intensity', q:'How intense is it, right now?', s:'0 is calm, 10 is the worst it gets. Gut answer.', field:'distress_before'},
    suds_ground:{k:'Intensity · after grounding', q:'And now, how intense?', s:'Same scale. There’s no right answer; the number is just information.', field:'distress_after_grounding'},
    urge_before:{k:'The urge', q:'How strong is the pull?', s:'How hard is the urge pushing you to act, 0 to 10?', field:'urge_before'},
    urge_after: {k:'After the pause', q:'Do you still feel the urge?', s:'Same urge, same scale. Urges crest and fall like waves. Where is yours now?', field:'urge_after'},
    suds_pause: {k:'After the pause', q:'And the feeling itself?', s:'The distress, 0 to 10.', field:'distress_after_pause'},
    suds_final: {k:'After the reset', q:'Where is it now?', s:'One more read, after that skill.', field:'distress_final'}
  };
  if(sudsSteps[id]){
    const t=sudsSteps[id];
    scr.innerHTML = shell(t.k, t.q, t.s, sudsBlock(d[t.field]), navBtns());
    wireSuds(v=>{ d[t.field]=v; });
    wireNav();
    return;
  }

  /* --- fits the facts --- */
  if(id==='facts_fit'){
    scr.innerHTML = shell('Check the facts · 4 of 4','Does the emotion fit the facts?','Given only what you actually know, not the story, does the size of this feeling match?',
      `<div class="choices">
        ${[['yes','Yes','The facts genuinely support it'],['partly','Partly','Some of it is real, some is story'],['no','No','This is mostly the old fear talking']]
          .map(([v,l,dd])=>`<button class="choice ${d.fits_facts===v?'on':''}" data-v="${v}">${l}<span class="cd">${dd}</span></button>`).join('')}
      </div>`, navBtns());
    scr.querySelectorAll('.choice').forEach(c=>c.onclick=()=>{ d.fits_facts=c.dataset.v; saveActive(); scr.querySelectorAll('.choice').forEach(x=>x.classList.toggle('on',x===c)); });
    wireNav();
    return;
  }

  /* --- grounding senses --- */
  if(SENSES[id]){
    const s=SENSES[id], key=s.verb==='see'?'see':s.verb;
    const vals=d.grounding[key]||[];
    scr.innerHTML = shell('Grounding · 5-4-3-2-1',
      `<span class="sense-count">${s.n}</span><br>thing${s.n>1?'s':''} you can <em style="color:var(--sage);font-style:normal">${s.verb}</em>`,
      s.prompt,
      `<div class="sense-list">${Array.from({length:s.n},(_,i)=>`<input type="text" data-i="${i}" placeholder="${i+1}." value="${esc(vals[i]||'')}">`).join('')}</div>`,
      navBtns(id==='g_taste'?'Grounding done':'Next sense'));
    scr.querySelectorAll('.sense-list input').forEach(inp=>{
      inp.addEventListener('input',()=>{ vals[+inp.dataset.i]=inp.value; d.grounding[key]=vals; saveActive(); });
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const nx=inp.nextElementSibling; nx?nx.focus():$('#nx').click(); }});
    });
    wireNav(()=>{ if(id==='g_taste') d.grounding_completed=true; });
    return;
  }

  /* --- pause --- */
  if(id==='pause') return renderPause(scr);

  /* --- acted on urge --- */
  if(id==='acted'){
    scr.innerHTML = shell('The outcome','What did you actually do?','Honest answer. This is the number your therapist cares about most, and there’s no wrong one.',
      `<div class="choices">
        ${[['no','Didn’t act on it','The urge passed without me feeding it'],['partly','Partly','I gave it a little ground'],['yes','Acted on it','I did the thing. That’s data, not failure']]
          .map(([v,l,dd])=>`<button class="choice ${d.acted_on_urge===v?'on':''}" data-v="${v}">${l}<span class="cd">${dd}</span></button>`).join('')}
      </div>`, navBtns());
    scr.querySelectorAll('.choice').forEach(c=>c.onclick=()=>{ d.acted_on_urge=c.dataset.v; saveActive(); scr.querySelectorAll('.choice').forEach(x=>x.classList.toggle('on',x===c)); });
    wireNav();
    return;
  }

  /* --- escalation choose --- */
  if(id==='escalate'){
    scr.innerHTML = shell('Still riding the wave','The urge is still strong. That’s okay.','Waves this big sometimes need a second set. Pick one:',
      `<div class="choices">
        ${[['extend','Ten more minutes','Extend the pause. Most urges fall within 30'],['breath','Paced breathing','In for 4, out for 6, with a pacer'],['cold','Cold water','Splash your face / hold a cold bottle to your cheeks'],['move','Move hard for 60 seconds','Star jumps, stairs, fast walk. Burn the adrenaline'],['ok','I’m actually okay','Continue without another round']]
          .map(([v,l,dd])=>`<button class="choice" data-v="${v}">${l}<span class="cd">${dd}</span></button>`).join('')}
      </div>`,
      `<div style="display:flex;justify-content:space-between">
        <button class="btn btn-quiet" id="bk" style="width:auto">Back</button>
        <button class="btn btn-quiet" id="quit" style="width:auto">Save &amp; exit</button>
      </div>`);
    scr.querySelectorAll('.choice').forEach(c=>c.onclick=()=>{
      const v=c.dataset.v;
      if(v==='ok'){ d.escalation_used=''; d.distress_final=d.distress_after_pause; saveActive();
        active.step = FLOW[active.mode].indexOf('reframe'); saveActive(); render(); return; }
      if(v==='extend'){ d.escalation_used='extended pause +10'; d.pause_ends_at = Date.now()+10*60000; d.pause_minutes=(d.pause_minutes||0)+10; saveActive();
        active.step = FLOW[active.mode].indexOf('pause'); saveActive(); render(); return; }
      d.escalation_used = v==='breath'?'paced breathing 4-6':v==='cold'?'cold water':'intense movement 60s';
      saveActive(); next();
    });
    $('#bk').onclick=back; $('#quit').onclick=abandonSession;
    return;
  }

  /* --- escalation do --- */
  if(id==='escalate_do'){
    const kind = d.escalation_used;
    let bodyHTML='', title='', sub='';
    if(kind.startsWith('paced')){
      title='Breathe with the circle';
      sub='In through the nose as it grows: 4 counts. Out through the mouth as it shrinks: 6 counts. Ten rounds.';
      bodyHTML=`<div style="text-align:center"><div class="pacer"></div><div class="pacer-lbl">in 4 · out 6</div></div>`;
    } else if(kind.startsWith('cold')){
      title='Cold water, now';
      sub='Splash cold water on your face, or press something cold to your cheeks and hold your breath for 15–30 seconds. This flips a physiological switch (the dive reflex) that slows your heart rate.';
      bodyHTML='';
    } else {
      title='Move hard for one minute';
      sub='Star jumps, run the stairs, fast march on the spot. The point is to burn through the adrenaline, not to exercise.';
      bodyHTML=`<div class="timer-wrap" style="flex:0;padding:16px 0"><div class="timer" id="mvT">1:00</div></div>`;
    }
    scr.innerHTML = shell('Reset', title, sub, bodyHTML, navBtns('Done, re-rate'));
    if(kind.startsWith('intense')){
      let left=60; timerInterval=setInterval(()=>{ left--; if(left<=0){clearInterval(timerInterval); $('#mvT').textContent='0:00'; return;} $('#mvT').textContent='0:'+String(left).padStart(2,'0'); },1000);
    }
    wireNav();
    return;
  }

  /* --- reframe --- */
  if(id==='reframe') return renderReframe(scr);

  /* --- done --- */
  if(id==='done'){
    finishSession();
    const last = entries[0];
    const drop = (last.distress_before!=null && last.distress_final!=null) ? last.distress_before - last.distress_final : null;
    scr.innerHTML = `
      <div class="center anim">
        <div class="done-mark">✓</div>
        <h1 class="display" style="font-size:1.9rem;margin-bottom:10px">You came back.</h1>
        <p class="sub" style="max-width:300px">
          ${drop!=null && drop>0 ? 'Distress went from <b style="color:var(--sand)">'+last.distress_before+'</b> to <b style="color:var(--sage)">'+last.distress_final+'</b>. You rode it down.' :
            drop!=null && drop<=0 ? 'The numbers didn’t drop this time. That happens, and logging it still counts.' :
            'Logged and saved.'}
        </p>
        <p class="note">${last.synced?'Synced to your Sheet.':'Saved on this phone. It will sync when you’re online.'}</p>
      </div>
      <div class="foot anim d1">
        <button class="btn btn-primary" onclick="view='today';render()">Done</button>
      </div>`;
    return;
  }

  scr.innerHTML = '<p class="sub">Unknown step: '+esc(id)+'</p>';
}

/* ---------- pause screen ---------- */
function renderPause(scr){
  const d = active.data;

  // not started yet → duration picker
  if(!d.pause_ends_at || d.pause_done_ack){
    d.pause_done_ack = false;
    const def = d.pause_minutes || settings.pauseDefault || 20;
    scr.innerHTML = shell('The pause','Now, step away from it.',
      'Urges rise, crest, and fall on their own if you don’t feed them. Give this one time to break. Make tea, stretch, sit by a window. Don’t solve anything.',
      `<div class="durs">${[5,10,20,30].map(m=>`<button class="chip ${m===def?'on':''}" data-m="${m}">${m} min</button>`).join('')}</div>
       <p class="note" style="text-align:center">The timer keeps counting even if you close the app.</p>`,
      `<button class="btn btn-sand" id="startP">Start the pause</button>
       <button class="btn btn-quiet" id="skipP">Skip the pause (it gets logged)</button>
       <div style="display:flex;justify-content:space-between">
         <button class="btn btn-quiet" id="bk" style="width:auto">Back</button>
         <button class="btn btn-quiet" id="quit" style="width:auto">Save &amp; exit</button>
       </div>`);
    let mins = def;
    scr.querySelectorAll('.durs .chip').forEach(c=>c.onclick=()=>{ mins=+c.dataset.m; scr.querySelectorAll('.durs .chip').forEach(x=>x.classList.toggle('on',x===c)); });
    $('#startP').onclick=()=>{
      d.pause_minutes = (d.pause_minutes||0) + mins;
      d.pause_ends_at = Date.now() + mins*60000;
      saveActive();
      requestNotifyPermission();
      render();
    };
    $('#skipP').onclick=()=>{ d.pause_completed=false; d.pause_minutes=d.pause_minutes||0; saveActive(); next(); };
    $('#bk').onclick=back; $('#quit').onclick=abandonSession;
    return;
  }

  // running or finished — derived from stored timestamp, survives app kill
  const remaining = d.pause_ends_at - Date.now();
  if(remaining <= 0){
    d.pause_completed = true; saveActive();
    scr.innerHTML = shell('The pause','The pause is complete.','However long you were away, the time passed, and you’re back. Let’s see where the urge is now.',
      `<div class="timer-wrap" style="flex:0;padding:10px 0"><div class="timer" style="color:var(--sage)">0:00</div></div>`,
      `<button class="btn btn-primary" id="nx">Check back in</button>`);
    $('#nx').onclick=()=>{ next(); };
    return;
  }

  scr.innerHTML = shell('The pause','Let it crest.','You don’t have to watch the timer. A notification will try to reach you, and the clock keeps running even if you leave.',
    `<div class="timer-wrap" style="flex:0;padding:6px 0 0">
       <div class="timer" id="pT">--:--</div>
       <div style="text-align:center"><div class="pacer" id="pacer"></div><div class="pacer-lbl">breathe with it · in 4 · out 6</div></div>
     </div>`,
    `<button class="btn btn-ghost" id="endP">End pause early</button>
     <button class="btn btn-quiet" id="quit">Save &amp; exit. The timer keeps running</button>`);
  const tick=()=>{
    const ms = d.pause_ends_at - Date.now();
    if(ms<=0){
      clearInterval(timerInterval);
      d.pause_completed=true; saveActive();
      notifyPauseDone();
      render(); return;
    }
    const m=Math.floor(ms/60000), s=Math.floor(ms%60000/1000);
    $('#pT').textContent = m+':'+String(s).padStart(2,'0');
  };
  tick(); timerInterval=setInterval(tick,500);
  $('#endP').onclick=()=>{ d.pause_completed=false; saveActive(); next(); };
  $('#quit').onclick=()=>{ view='today'; render(); };  // keep session alive, timer derived from timestamp
}

function requestNotifyPermission(){
  if('Notification' in window && Notification.permission==='default'){
    Notification.requestPermission().catch(()=>{});
  }
}
function notifyPauseDone(){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  if(navigator.serviceWorker && navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification('Anchor', { body:'Your pause is complete. Come back when you’re ready.', icon:'./icons/icon-192.png', badge:'./icons/icon-192.png', tag:'anchor-pause' });
    }).catch(()=>{});
  }
}

/* ---------- reframe ---------- */
async function fetchReframe(d){
  const out = await postAPI({action:'reframe', entry:{
    trigger:d.trigger, fears:d.fears, floatback:d.floatback,
    interpretation:d.interpretation, facts_known:d.facts_known,
    alt_explanation:d.alt_explanation, fits_facts:d.fits_facts,
    emotions:(d.emotions||[]).join(', ')
  }});
  if(!out.stories || !out.stories.length) throw new Error('No stories returned');
  return out.stories;
}

function renderReframe(scr){
  const d = active.data;
  const finishUI = (storiesHTML, seed)=> {
    scr.innerHTML = shell('The new story','Which story will you carry instead?',
      storiesHTML===null
        ? 'The AI isn’t reachable right now, so build it yourself from your own evidence. You already wrote the raw material.'
        : 'Three readings of the same facts. Tap the one that lands, then make it yours: edit it into your own words.',
      (storiesHTML===null ? `
        <div class="card"><div class="note" style="color:var(--muted)">
          <b style="color:var(--sage)">Your other explanation:</b> ${esc(d.alt_explanation)||'<i>none</i>'}<br><br>
          <b style="color:var(--sage)">What you actually know:</b> ${esc(d.facts_known)||'<i>none</i>'}
        </div></div>` : storiesHTML) +
      `<label class="fl">The story you’ll keep</label>
       <textarea id="chosen" placeholder="Write the story you’re choosing to stand on…">${esc(d.chosen_story || seed || '')}</textarea>`,
      navBtns());
    scr.querySelectorAll('.story-card').forEach(c=>{
      c.onclick=()=>{
        scr.querySelectorAll('.story-card').forEach(x=>x.classList.toggle('on',x===c));
        $('#chosen').value = c.dataset.story;
        d.chosen_story = c.dataset.story; saveActive();
      };
    });
    $('#chosen').addEventListener('input',()=>{ d.chosen_story=$('#chosen').value; saveActive(); });
    wireNav(()=>{ d.chosen_story=$('#chosen').value.trim(); });
  };

  // already fetched this session?
  if(d.ai_suggestions){
    let stories=[]; try{ stories=JSON.parse(d.ai_suggestions);}catch(e){}
    if(stories.length){
      finishUI(stories.map(s=>`<button class="card story-card" data-story="${esc(s.story)}"><span class="s">${esc(s.story)}</span><span class="b">↳ ${esc(s.based_on||'from your facts')}</span></button>`).join(''), '');
      return;
    }
  }

  scr.innerHTML = shell('The new story','Finding other readings…','Weighing your own evidence. A moment.', '<div class="spin"></div>','');
  fetchReframe(d).then(stories=>{
    d.ai_suggestions = JSON.stringify(stories); saveActive();
    if(stepId()!=='reframe') return;      // user navigated away
    finishUI(stories.map(s=>`<button class="card story-card" data-story="${esc(s.story)}"><span class="s">${esc(s.story)}</span><span class="b">↳ ${esc(s.based_on||'from your facts')}</span></button>`).join(''), '');
  }).catch(err=>{
    if(stepId()!=='reframe') return;
    finishUI(null, d.alt_explanation||'');
  });
}

/* ---------- history ---------- */
function renderCheckins(scr){
  if(!entries.length){
    scr.innerHTML = `<div class="center anim"><h1 class="display" style="font-size:1.7rem;margin-bottom:8px">No check-ins yet</h1><p class="sub">Your log will live here, and in your Sheet.</p></div>
    <div class="foot"><button class="btn btn-ghost" onclick="view='journal';render()">Back</button></div>`;
    return;
  }
  const unsynced = entries.filter(e=>!e.synced).length;
  scr.innerHTML = `
    <div class="body anim">
      <div class="kicker">Your log</div>
      <h1 class="q display" style="font-size:1.7rem">${entries.length} check-in${entries.length===1?'':'s'}</h1>
      <p class="sub">${unsynced ? unsynced+' still on this phone. They’ll sync when online.' : 'All synced to your Sheet.'}</p>
      <div id="hlist">
      ${entries.map((e,i)=>`
        <button class="hrow" data-i="${i}">
          <div class="when">
            <div class="d">${fmtDate(e.started_at)} ${e.mode==='flooded'?'<span class="tag flood">flooded</span>':''} ${e.abandoned?'<span class="tag unsynced">partial</span>':''}</div>
            <div class="t">${fmtTime(e.started_at)} · ${esc((e.trigger||'').slice(0,42))||'(no trigger)'}${(e.trigger||'').length>42?'…':''}</div>
          </div>
          <div class="arc">${e.distress_before!=null?e.distress_before:'–'}<small> → </small>${e.distress_final!=null?e.distress_final:'–'}</div>
          <span class="tag ${e.synced?'synced':'unsynced'}">${e.synced?'✓':'…'}</span>
        </button>`).join('')}
      </div>
    </div>
    <div class="foot">
      ${unsynced?'<button class="btn btn-sand" id="syncNow">Sync now</button>':''}
      <button class="btn btn-ghost" onclick="view='journal';render()">Back</button>
    </div>`;
  $('#syncNow') && ($('#syncNow').onclick=()=>syncQueue());
  scr.querySelectorAll('.hrow').forEach(r=>r.onclick=()=>renderDetail(+r.dataset.i));
}

function renderDetail(i){
  const e = entries[i], scr=$('#screen');
  const F = (label,val)=>`<dt>${label}</dt><dd class="${val?'':'empty'}">${val?esc(val):'not filled'}</dd>`;
  const g = e.grounding||{};
  const gs = ['see','touch','hear','smell','taste'].map(k=>(g[k]||[]).filter(Boolean).join(', ')).filter(Boolean).join(' · ');
  scr.innerHTML = `
    <div class="body anim">
      <div class="kicker">${fmtDate(e.started_at)} · ${fmtTime(e.started_at)}</div>
      <h1 class="q display" style="font-size:1.5rem">${esc(e.trigger||'(no trigger written)')}</h1>
      <dl class="detail">
        ${F('Distress arc', [e.distress_before,e.distress_after_grounding,e.distress_after_pause,e.distress_final].filter(v=>v!=null).join(' → '))}
        ${F('Body',[...(e.body||[]),e.body_other].filter(Boolean).join(', '))}
        ${F('Emotions',[...(e.emotions||[]),e.emotions_other].filter(Boolean).join(', '))}
        ${F('Fears',e.fears)}
        ${F('When before',e.floatback)}
        ${F('Urges',[...(e.urges||[]),e.urges_other].filter(Boolean).join(', ')+(e.urge_before!=null?' ('+e.urge_before+'/10 → '+(e.urge_after!=null?e.urge_after+'/10':'?')+')':''))}
        ${F('Telling myself',e.interpretation)}
        ${F('Actually know',e.facts_known)}
        ${F('Other explanation',e.alt_explanation)}
        ${F('Emotion fits facts',e.fits_facts)}
        ${F('Grounding',gs)}
        ${F('Pause',(e.pause_minutes||0)+' min · '+(e.pause_completed?'completed':'skipped/cut short'))}
        ${F('Acted on urge',e.acted_on_urge)}
        ${F('What helped',e.what_helped)}
        ${F('Reset used',e.escalation_used)}
        ${F('Story kept',e.chosen_story)}
        ${F('Closing note',e.closing_note)}
      </dl>
    </div>
    <div class="foot"><button class="btn btn-ghost" onclick="renderCheckins($('#screen'))">Back to log</button></div>`;
}
