/* ZAVI ONE / ADMIN · unified dual-theme controller.
 * Three preferences (light/dark/auto), exactly two rendered palettes.
 * Presentation-only: no accounting, auth, RLS, or offline state is touched.
 */
(()=>{'use strict';
 const KEY='zavi_theme_preference_v29';
 const root=document.documentElement;
 const media=typeof window.matchMedia==='function'?window.matchMedia('(prefers-color-scheme: dark)'):null;
 const valid=x=>x==='light'||x==='dark'||x==='auto';
 const canonical=x=>x==='glass'?'dark':valid(x)?x:'auto';
 const labels={
  fa:{light:'☀️ روشن',dark:'🌙 تاریک',auto:'◐ خودکار (سیستم)',heading:'ظاهر برنامه'},
  ps:{light:'☀️ روښانه',dark:'🌙 تیاره',auto:'◐ اتومات (سیستم)',heading:'د پروګرام بڼه'},
  en:{light:'☀️ Light',dark:'🌙 Dark',auto:'◐ Auto (system)',heading:'Appearance'}
 };
 let preference='auto';
 try{preference=canonical(localStorage.getItem(KEY))}catch(_){}
 const language=()=>{const l=(root.lang||'fa').toLowerCase();return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa'};
 const resolve=()=>preference==='auto'?(media?.matches?'dark':'light'):preference;
 function paint(){
  const theme=resolve();
  root.setAttribute('data-zavi-theme',theme);
  root.setAttribute('data-zavi-appearance',theme);
  root.setAttribute('data-zavi-theme-preference',preference);
  const color=document.querySelector('meta[name="theme-color"]');
  if(color)color.content=theme==='dark'?'#0B1220':'#EAF2FF';
  return theme;
 }
 function addAdminPicker(){
  const view=document.getElementById('view');
  const settings=document.querySelector('.nav-item[data-page="settings"].selected,.nav-item[data-page="settings"][aria-current="page"]');
  if(!view||!settings||view.querySelector('.zavi-theme-picker'))return;
  const panel=document.createElement('section');
  panel.className='zavi-dual-theme-settings';
  const heading=document.createElement('h3');
  heading.textContent=labels[language()].heading;
  const group=document.createElement('div');
  group.className='zavi-theme-picker';
  group.setAttribute('role','group');
  group.setAttribute('aria-label',labels[language()].heading);
  panel.append(heading,group);
  view.prepend(panel);
 }
 function syncControls(){
  addAdminPicker();
  const lang=language();
  document.querySelectorAll('[data-zavi-theme-choice="glass"]').forEach(button=>button.remove());
  document.querySelectorAll('.zavi-theme-picker').forEach(group=>{
   group.setAttribute('aria-label',labels[lang].heading);
   for(const option of ['light','dark','auto']){
    let button=group.querySelector('[data-zavi-theme-choice="'+option+'"]');
    if(!button){
     button=document.createElement('button');
     button.type='button';button.className='zavi-theme-choice';
     button.setAttribute('data-zavi-theme-choice',option);
     group.appendChild(button);
    }
    const caption=labels[lang][option];
    if(button.textContent!==caption)button.textContent=caption;
    button.setAttribute('aria-pressed',String(preference===option));
    button.classList.toggle('is-selected',preference===option);
   }
  });
 }
 function apply(next,persist){
  preference=canonical(next);
  const theme=paint();
  if(persist)try{localStorage.setItem(KEY,preference)}catch(_){}
  syncControls();
  document.dispatchEvent(new CustomEvent('zavi:theme-changed',{detail:{theme,preference}}));
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-zavi-theme-choice]');
  if(button){const next=button.getAttribute('data-zavi-theme-choice');if(valid(next))apply(next,true)}
 });
 window.addEventListener('storage',event=>{
  if(event.key===KEY)apply(event.newValue,false);
 });
 if(media){
  const onChange=()=>{if(preference==='auto'){paint();syncControls();document.dispatchEvent(new CustomEvent('zavi:theme-changed',{detail:{theme:resolve(),preference}}))}};
  if(media.addEventListener)media.addEventListener('change',onChange);
  else if(media.addListener)media.addListener(onChange);
 }
 function init(){
  apply(preference,false);
  let pending=false;
  const observer=new MutationObserver(mutations=>{
   const found=mutations.some(m=>m.target?.id==='view'||[...m.addedNodes].some(n=>
    n.nodeType===1&&(n.matches?.('.zavi-theme-picker,[data-zavi-theme-choice],.nav-item[data-page="settings"]')||
    n.querySelector?.('.zavi-theme-picker,[data-zavi-theme-choice],.nav-item[data-page="settings"]'))));
   if(found&&!pending){pending=true;requestAnimationFrame(()=>{pending=false;syncControls()})}
  });
  observer.observe(document.body,{subtree:true,childList:true});
  new MutationObserver(syncControls).observe(root,{attributes:true,attributeFilter:['lang']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.ZaviThemeV29={get:resolve,getPreference:()=>preference,set:next=>apply(next,true)};
})();
