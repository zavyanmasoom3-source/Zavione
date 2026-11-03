/* ZAVI ONE / ADMIN: presentation-only light/dark mode.
 * The theme preference is local to this browser/origin; no accounting data or auth state is changed.
 */
(()=>{'use strict';
 const KEY='zavi_theme_preference_v29';
 const isValid=x=>x==='light'||x==='dark';
 let current=document.documentElement.getAttribute('data-zavi-theme');
 if(!isValid(current))current='dark';
 function syncControls(){
  document.querySelectorAll('[data-zavi-theme-choice]').forEach(el=>{
   const active=el.getAttribute('data-zavi-theme-choice')===current;
   if(el.getAttribute('aria-pressed')!==String(active))el.setAttribute('aria-pressed',String(active));
   el.classList.toggle('is-selected',active);
  });
 }
 function setTheme(next){
  if(!isValid(next))return;
  current=next;
  document.documentElement.setAttribute('data-zavi-theme',next);
  try{localStorage.setItem(KEY,next)}catch(_){/* private browser mode */}
  syncControls();
  document.dispatchEvent(new CustomEvent('zavi:theme-changed',{detail:{theme:next}}));
 }
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-zavi-theme-choice]');
  if(el)setTheme(el.getAttribute('data-zavi-theme-choice'));
 });
 window.addEventListener('storage',e=>{if(e.key===KEY&&isValid(e.newValue))setTheme(e.newValue)});
 function init(){
  syncControls();
  const mo=new MutationObserver(mutations=>{
   if(mutations.some(m=>m.addedNodes.length))syncControls();
  });
  mo.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.ZaviThemeV29={get:()=>current,set:setTheme};
})();
