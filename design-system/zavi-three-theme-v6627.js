/* ZAVI visual themes: additive only, no accounting or auth mutations. */
(function(){
 'use strict';
 var KEY='zavi.visual.theme.v1', modes=['light','dark','glass'];
 var names={glass:'شیشه‌ای',light:'روشن',dark:'تیره'};
 function setTheme(mode){
  if(modes.indexOf(mode)<0)return;
  document.documentElement.setAttribute('data-zavi-theme',mode);
  try{window.localStorage.setItem(KEY,mode)}catch(e){console.warn('ZAVI theme persistence unavailable',e)}
  document.querySelectorAll('[data-zavi-theme-choice]').forEach(function(btn){
   var active=btn.getAttribute('data-zavi-theme-choice')===mode;
   btn.setAttribute('aria-pressed',String(active));
   btn.style.background=active?'var(--zavi-primary,#385ec9)':'var(--zavi-surface,#fff)';
   btn.style.borderColor=active?'var(--zavi-primary,#385ec9)':'var(--zavi-border,#d8e3f6)';
   btn.style.color=active?'#fff':'var(--zavi-text,#172544)';
  });
 }
 function settingsTarget(){
  var candidates=[
   '#settingsPanel','#settingsView','#page-settings','.settings-panel','.settings-view',
   '[data-page="settings"]','[data-screen="settings"]',
   '#settings-page','#settingsPage','#settings',
   '.settings-page','.settings-screen','.settings-content',
   '[id*="settings"][class*="page"]'
  ];
  for(var i=0;i<candidates.length;i++){
   var nodes=document.querySelectorAll(candidates[i]);
   for(var j=0;j<nodes.length;j++){
    var el=nodes[j];
    if(el && el.getClientRects().length && el.getBoundingClientRect().width>180 && !el.closest('#zavi-theme-controls'))return el;
   }
  }
  // Fallback for the legacy SPA: find a visible settings heading, never a
  // navigation label, and mount inside its content section.
  var headings=document.querySelectorAll('main h1,main h2,main h3,[role="main"] h1,[role="main"] h2,.page h1,.page h2');
  for(var k=0;k<headings.length;k++){
   var h=headings[k];
   if(!h.getClientRects().length)continue;
   var label=(h.textContent||'').trim();
   if(!/^(تنظیمات|Settings|امستنې)(\\s|$)/i.test(label))continue;
   var section=h.closest('section,article,.page,.screen,.content,.panel')||h.parentElement;
   if(section && section.getBoundingClientRect().width>180)return section;
  }
  return null;
 }
 function init(){
  var saved='';try{saved=localStorage.getItem(KEY)||''}catch(_){}
  setTheme(modes.indexOf(saved)>=0?saved:'light');
  var panel=document.getElementById('zavi-theme-controls');
  if(!panel){
   panel=document.createElement('section');panel.id='zavi-theme-controls';
   panel.setAttribute('role','group');panel.setAttribute('aria-label','حالت نمایش برنامه');
   panel.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;padding:12px;border:1px solid var(--zavi-border,#7789ab);border-radius:14px;background:var(--zavi-surface,#182b4c);direction:rtl;box-sizing:border-box;max-width:100%';
   var heading=document.createElement('strong');heading.textContent='حالت نمایش برنامه';heading.style.cssText='width:100%;color:var(--zavi-text,#fff)';
   panel.appendChild(heading);
   var hint=document.createElement('small');hint.textContent='یکی از سه حالت را انتخاب کنید. تغییر فوری ذخیره می‌شود.';hint.style.cssText='width:100%;color:var(--zavi-muted,#536685)';panel.appendChild(hint);
   modes.forEach(function(mode){
    var button=document.createElement('button');button.type='button';button.textContent=names[mode];
    button.setAttribute('data-zavi-theme-choice',mode);button.setAttribute('aria-label','حالت '+names[mode]);
    button.style.cssText='padding:9px 12px;border-radius:10px;border:1px solid var(--zavi-border,#d8e3f6);color:var(--zavi-text,#172544);background:var(--zavi-surface,#fff);font:inherit;font-size:13px;cursor:pointer;min-height:40px';
    button.addEventListener('click',function(){setTheme(mode)});
    panel.appendChild(button);
   });
  }
  function relocate(){
   var target=settingsTarget();
   if(target){
    if(panel.parentNode!==target)target.appendChild(panel);
    panel.hidden=false;
   }else{
    panel.hidden=true;
   }
  }
  if(!panel.parentNode)document.body.appendChild(panel);
  relocate();setTheme(document.documentElement.getAttribute('data-zavi-theme'));
  // Navigation can be SPA-based; never overlay bottom navigation.
  var queued=false;
  new MutationObserver(function(){
   if(queued)return;queued=true;
   requestAnimationFrame(function(){queued=false;relocate()});
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();