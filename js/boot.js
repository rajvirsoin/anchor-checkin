'use strict';
/* boot */
$('#brand').onclick = ()=>{ if(view!=='flow') go('today'); };

if(active) view = 'flow';          // resume a body-skill check-in (its timer derives from a timestamp)
render();
syncQueue();
syncRecords();

window.addEventListener('online', ()=>{ syncQueue(); syncRecords(); });
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState!=='visible') return;
  syncRecords();
  if(TABS.includes(view)) render();   // the day may have rolled over while the app slept
});
setInterval(syncRecords, 60000);

if('serviceWorker' in navigator && location.protocol!=='file:'){
  navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{});
}

/* test hook for the headless probe */
window.__anchor = {
  get S(){ return S; }, get view(){ return view; }, go, render,
  reset(){ localStorage.clear(); location.reload(); },
  set(fn){ fn(S); save(); render(); }
};
