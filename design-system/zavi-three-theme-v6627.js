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
 function init(){
  var saved='';try{saved=localStorage.getItem(KEY)||''}catch(_){}
  setTheme(modes.indexOf(saved)>=0?saved:'glass');
  if(document.getElementById('zavi-theme-controls'))return;
  var panel=document.createElement('div');panel.id='zavi-theme-controls';
  panel.setAttribute('role','group');panel.setAttribute('aria-label','حالت نمایش');
  panel.style.cssText='position:fixed;inset-inline-end:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9998;display:flex;gap:5px;padding:7px;border:1px solid rgba(155,177,235,.45);border-radius:16px;background:rgba(20,33,65,.9);backdrop-filter:blur(12px);box-shadow:0 6px 25px #0003;direction:rtl;max-width:calc(100vw - 24px);box-sizing:border-box';
  modes.forEach(function(mode){
   var b=document.createElement('button');b.type='button';b.textContent=names[mode];
   b.setAttribute('data-zavi-theme-choice',mode);b.setAttribute('aria-label','حالت '+names[mode]);
   b.style.cssText='padding:8px 10px;border-radius:10px;border:1px solid #ffffff40;color:white;background:#ffffff1b;font:inherit;font-size:12px;cursor:pointer';
   b.addEventListener('click',function(){setTheme(mode)});
   panel.appendChild(b);
  });
  document.body.appendChild(panel);setTheme(document.documentElement.getAttribute('data-zavi-theme'));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();