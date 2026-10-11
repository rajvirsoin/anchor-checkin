'use strict';
/* =====================================================================
   Store: one localStorage object is the source of truth on the phone.
   Every change marks a record dirty; dirty records sync to the Sheet's
   Records tab (upsert by type+id) so a new phone can restore everything.
   ===================================================================== */

const LS = {
  get(k, fb){ try{ const v = localStorage.getItem(k); return v==null ? fb : JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};

const STORE_KEY = 'anchor_v2';
const SETTINGS_KEY = 'anchor_settings', ENTRIES_KEY = 'anchor_entries', ACTIVE_KEY = 'anchor_active';

function blankState(){
  return {
    profile:{
      name:'', about:'', startDate:'', onboarded:false, therapistOK:false,
      times:{ morning:'07:30', evening:'20:30', weeklyDay:0, weekly:'17:00' },
      overrides:{},                       // season number -> {at, reason}
      phase:{ id:'seeing', since:'', log:[] },
      asked:{},                           // phase id -> list of arc question indexes used
      lastOpen:'', lastThenNow:''
    },
    days:{},          // 'YYYY-MM-DD' -> {promise, kept, evening}
    catches:[], experiments:[], brothers:[], brolog:[], ifthens:[],
    weeks:[], beliefs:[], cards:[], chats:[], letters:[], mods:[],
    dirty:{}          // 'type|id' -> true
  };
}

let S = Object.assign(blankState(), LS.get(STORE_KEY, {}));
S.profile = Object.assign(blankState().profile, S.profile || {});
let settings = LS.get(SETTINGS_KEY, { endpoint:'', secret:'', pauseDefault:20 });
let entries  = LS.get(ENTRIES_KEY, []);

function save(){ LS.set(STORE_KEY, S); }
function saveSettings(){ LS.set(SETTINGS_KEY, settings); }
function saveEntries(){ LS.set(ENTRIES_KEY, entries); }

/* ---------- ids, dates ---------- */
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'e-'+Date.now()+'-'+Math.random().toString(36).slice(2,10));
const pad2 = n => String(n).padStart(2,'0');
function ymd(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function parseYmd(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
// a "day" runs until 4am, so a late reflection still belongs to the evening it started
function dayKey(d){ d = d || new Date(); const x=new Date(d); if(x.getHours()<4) x.setDate(x.getDate()-1); return ymd(x); }
function addDays(s, n){ const d=parseYmd(s); d.setDate(d.getDate()+n); return ymd(d); }
function daysBetween(a, b){ return Math.round((parseYmd(b)-parseYmd(a))/864e5); }
function dayNum(){ return S.profile.startDate ? Math.max(1, daysBetween(S.profile.startDate, dayKey())+1) : 1; }
function day(k){ k = k || dayKey(); if(!S.days[k]) S.days[k] = {}; return S.days[k]; }
function fmtDay(s){ return parseYmd(s).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); }
function fmtWhen(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }
function minutesOf(hhmm){ const [h,m]=(hhmm||'0:0').split(':').map(Number); return h*60+m; }
function nowMinutes(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }

/* ---------- dirty tracking ---------- */
// list-shaped collections sync as one record each; item-shaped ones per item
const LIST_RECORDS = ['ifthens','brothers','beliefs','cards'];
function touch(type, id){ S.dirty[type+'|'+(id||type)] = true; save(); }
function touchDay(k){ touch('day', k || dayKey()); }

function recordFor(key){
  const [type, id] = key.split('|');
  if(type==='profile') return { type, id, date:'', data:S.profile };
  if(type==='day') return S.days[id] ? { type, id, date:id, data:S.days[id] } : null;
  if(LIST_RECORDS.includes(type)) return { type, id:type, date:'', data:S[type] };
  const coll = { catch:'catches', experiment:'experiments', brolog:'brolog', week:'weeks', chat:'chats', letter:'letters', mod:'mods' }[type];
  const item = coll && S[coll].find(x=>x.id===id);
  return item ? { type, id, date:(item.at||'').slice(0,10), data:item } : null;
}

let recSyncing = false;
async function syncRecords(){
  if(recSyncing || !settings.endpoint || !navigator.onLine) return;
  const keys = Object.keys(S.dirty);
  if(!keys.length) return;
  recSyncing = true;
  try{
    for(let i=0; i<keys.length; i+=25){
      const batch = keys.slice(i, i+25);
      const records = batch.map(recordFor).filter(Boolean);
      if(records.length) await postAPI({ action:'save', records });
      batch.forEach(k=>delete S.dirty[k]);
      save();
    }
  }catch(e){ /* stays dirty, retried later */ }
  recSyncing = false;
}

async function restoreFromSheet(){
  const out = await postAPI({ action:'restore' });
  const fresh = blankState();
  (out.records||[]).forEach(r=>{
    let data; try{ data = typeof r.data==='string' ? JSON.parse(r.data) : r.data; }catch(e){ return; }
    if(r.type==='profile') fresh.profile = Object.assign(fresh.profile, data);
    else if(r.type==='day') fresh.days[r.id] = data;
    else if(LIST_RECORDS.includes(r.type)) fresh[r.type] = data || [];
    else {
      const coll = { catch:'catches', experiment:'experiments', brolog:'brolog', week:'weeks', chat:'chats', letter:'letters', mod:'mods' }[r.type];
      if(coll) fresh[coll].push(data);
    }
  });
  ['catches','experiments','brolog','weeks','chats','letters','mods'].forEach(c=>fresh[c].sort((a,b)=>(b.at||'').localeCompare(a.at||'')));
  S = fresh; save();
  return (out.records||[]).length;
}

/* ---------- API ---------- */
async function postAPI(payload){
  if(!settings.endpoint) throw new Error('No endpoint configured');
  const res = await fetch(settings.endpoint, {
    method:'POST', redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},   // simple request, no CORS preflight
    body: JSON.stringify(Object.assign({secret: settings.secret}, payload))
  });
  const out = await res.json();
  if(out.result==='error') throw new Error(out.message||'Server error');
  return out;
}

/* ---------- practice counts ---------- */
function eveningsDone(){ return Object.values(S.days).filter(d=>d.evening && d.evening.done).length; }
function eveningsInPhase(){
  const since = S.profile.phase.since || S.profile.startDate || '0000';
  return Object.entries(S.days).filter(([k,d])=>k>=since && d.evening && d.evening.done).length;
}
function experimentsDone(){ return S.experiments.filter(e=>e.after && e.after.at).length; }
function daysReturned(fromKey, toKey){
  return Object.entries(S.days).filter(([k,d])=>k>=fromKey && k<=toKey && (d.promise || (d.evening&&d.evening.done))).length
    + 0;
}

/* ---------- seasons and unlocks ---------- */
function seasonStatus(n){
  const s = SEASONS[n-1], dn = dayNum(), ev = eveningsDone(), ex = experimentsDone();
  const ov = S.profile.overrides[n];
  const waiting = [];
  if(dn < s.minDay) waiting.push('day '+s.minDay+' (now day '+dn+')');
  if(ev < s.evenings) waiting.push(s.evenings+' evenings ('+ev+' done)');
  if(ex < s.experiments) waiting.push(s.experiments+' experiments ('+ex+' done)');
  return { season:s, open: !waiting.length || !!ov, earned: !waiting.length, override: ov, waiting };
}
function currentSeason(){
  let cur = 1;
  for(let n=2; n<=SEASONS.length; n++) if(seasonStatus(n).open) cur = n;
  return cur;
}
function moduleOpen(m){
  if(m.gate==='therapist') return !!S.profile.therapistOK;
  if(!seasonStatus(m.season).open) return false;
  if(m.minDay && dayNum() < m.minDay && !S.profile.overrides['m:'+m.id]) return false;
  return true;
}

/* ---------- phase ---------- */
function phaseIndex(){ return Math.max(0, PHASES.findIndex(p=>p.id===S.profile.phase.id)); }
function currentPhase(){ return PHASES[phaseIndex()]; }
function advancePhase(reason){
  const i = phaseIndex();
  if(i >= PHASES.length-1) return false;
  S.profile.phase.log.push({ from:PHASES[i].id, to:PHASES[i+1].id, at:dayKey(), reason:reason||'' });
  S.profile.phase.id = PHASES[i+1].id;
  S.profile.phase.since = dayKey();
  touch('profile');
  return true;
}
function nextArcQuestion(){
  const ph = currentPhase();
  const used = S.profile.asked[ph.id] || [];
  let idx = ph.qs.findIndex((_,i)=>!used.includes(i));
  if(idx < 0){ idx = used.length % ph.qs.length; }   // bank exhausted: cycle, answers will differ
  return { idx, q: ph.qs[idx] };
}
function markArcUsed(idx){
  const ph = currentPhase();
  const used = S.profile.asked[ph.id] = S.profile.asked[ph.id] || [];
  if(!used.includes(idx)) used.push(idx);
  touch('profile');
}

/* ---------- context for the coach ---------- */
function recentEvenings(n){
  return Object.entries(S.days)
    .filter(([k,d])=>d.evening && d.evening.done)
    .sort((a,b)=>b[0].localeCompare(a[0])).slice(0, n)
    .map(([k,d])=>({ date:k, promise:d.promise&&d.promise.text, kept:d.kept,
      answers:(d.evening.qs||[]).map(q=>({ q:q.q, a:q.a, push:q.push||undefined, push_answer:q.pa||undefined })),
      carry:d.evening.carry }));
}
function recentCatches(days){
  const from = addDays(dayKey(), -days);
  return S.catches.filter(c=>dayKey(new Date(c.at))>=from).map(c=>({
    date:dayKey(new Date(c.at)), kind:c.kind, path:c.path, story:c.story||undefined,
    intensity:c.before, after:c.after, note:c.note||undefined
  }));
}
function lastQuote(){
  for(const ev of recentEvenings(5)){
    for(const q of ev.answers){ if(q.a && q.a.trim().length > 20) return q.a.trim().split(/(?<=[.!?])\s/)[0].slice(0,140); }
  }
  return '';
}
