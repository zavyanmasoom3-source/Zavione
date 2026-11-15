/* ZAVI ONE UI: move ORIGINAL assistant controls into the existing side menu.
 * No button cloning, no replacement handlers, no changes to cloud/ledger/auth logic.
 * Both remain usable in the mobile drawer and the desktop menu.
 */
(()=>{'use strict';
 const IDS=['z637AiButton','z605-launch'];
 let scheduled=false;
 function dock(){
  const footer=document.querySelector('#side .sidebar-footer');
  if(!footer)return;
  let group=document.getElementById('zaviAssistantsDock');
  if(!group){
   group=document.createElement('div');
   group.id='zaviAssistantsDock';
   group.className='zavi-assistants-dock';
   group.setAttribute('role','group');
   group.setAttribute('aria-label','دستیار و فرمان‌های ZAVI ONE');
   const label=document.createElement('small');
   label.className='zavi-assistants-title';
   label.textContent='دستیارها / Assistants';
   const items=document.createElement('div');items.className='zavi-assistants-buttons';
   group.append(label,items);
   footer.prepend(group);
  }
  const items=group.querySelector('.zavi-assistants-buttons');
  IDS.forEach(id=>{
   const el=document.getElementById(id);
   if(el&&el.parentElement!==items){
    // Existing click listeners stay attached when the original node is moved.
    items.append(el);
   }
  });
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;requestAnimationFrame(()=>{scheduled=false;dock()});
 }
 function start(){
  dock();
  // Both original launchers append asynchronously to body after DOM ready.
  // Watching only body direct children avoids a re-render/observer loop.
  new MutationObserver(schedule).observe(document.body,{childList:true});
  document.addEventListener('zavi:theme-changed',schedule);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
