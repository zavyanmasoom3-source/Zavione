/* ZAVI visual themes: additive only, no accounting or auth mutations. */
(function(){
 'use strict';
 var KEY='zavi.visual.theme.v1', modes=['glass','light','dark'];
 var names={glass:'شیشه‌ای',light:'روشن',dark:'سیاه تیره'};
 function setTheme(mode){
  if(modes.indexOf(mode)<0)return;
  document.documentElement.setAttribute('data-zavi-theme',mode);
  try{localStorage.setItem(KEY,mode)}catch(_){}
  document.querySelectorAll('[data-zavi-theme-choice]').forEach(function(btn){
   var active=btn.getAttribute('data-zavi-theme-choice')===mode;
   btn.setAttribute('aria-pressed',String(active));
   btn.style.background=active?'#6376f0':'#ffffff1b';
   btn.style.borderColor=active?'#d8e1ff':'#ffffff40';
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
  return null;
 }
 function init(){
  var saved='';try{saved=localStorage.getItem(KEY)||''}catch(_){}
  setTheme(modes.indexOf(saved)>=0?saved:'dark');
  var panel=document.getElementById('zavi-theme-controls');
  if(!panel){
   panel=document.createElement('section');panel.id='zavi-theme-controls';
   panel.setAttribute('role','group');panel.setAttribute('aria-label','حالت نمایش');
   panel.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;padding:12px;border:1px solid var(--zavi-border,#7789ab);border-radius:14px;background:var(--zavi-surface,#182b4c);direction:rtl;box-sizing:border-box;max-width:100%';
   var heading=document.createElement('strong');heading.textContent='حالت نمایش';heading.style.cssText='width:100%;color:var(--zavi-text,#fff)';
   panel.appendChild(heading);
   modes.forEach(function(mode){
    var button=document.createElement('button');button.type='button';button.textContent=names[mode];
    button.setAttribute('data-zavi-theme-choice',mode);button.setAttribute('aria-label','حالت '+names[mode]);
    button.style.cssText='padding:9px 12px;border-radius:10px;border:1px solid #ffffff40;color:white;background:#ffffff1b;font:inherit;font-size:13px;cursor:pointer;min-height:40px';
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