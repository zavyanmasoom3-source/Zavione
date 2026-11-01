/* V66.19: independent visibility switches for existing assistants.
   Settings controls do not change voice, text or AI command logic. */
(()=>{'use strict';
const KEY_V='zavi.showVoiceLauncher',KEY_A='zavi.showAiLauncher';
const css=document.createElement('style');css.id='zavi-assistant-visibility-css';
css.textContent=`#z605-launch{display:none!important}body.zavi-show-voice #z605-launch{display:grid!important}body.zavi-hide-ai #z637AiButton,body.zavi-hide-ai .z637-ai-button{display:none!important}`;
document.head.appendChild(css);
function enabled(k,defaultValue){try{const v=localStorage.getItem(k);return v===null?defaultValue:v==='true'}catch(_){return defaultValue}}
function apply(){document.body.classList.toggle('zavi-show-voice',enabled(KEY_V,false));document.body.classList.toggle('zavi-hide-ai',!enabled(KEY_A,true))}
function save(k,v){try{localStorage.setItem(k,String(v))}catch(_){}apply()}
function isSettings(el){const s=(el?.textContent||'').trim();return s.includes('تنظیمات')||s.includes('Settings')||s.includes('امستنې')}
function mount(){
 apply();
 const candidates=[...document.querySelectorAll('main,section,article,.page,.settings-page,[id*="setting"],[class*="setting"]')];
 const root=candidates.find(el=>el.offsetWidth>0&&el.offsetHeight>0&&isSettings(el)&&el.querySelectorAll('button,input,select').length>=2);
 if(!root||root.querySelector('#zavi-assistant-settings'))return;
 const box=document.createElement('div');box.id='zavi-assistant-settings';
 box.style.cssText='padding:12px;margin:12px 0;border:1px solid #7598d4;border-radius:14px;display:grid;gap:12px;color:inherit;background:transparent;direction:rtl';
 const h=document.createElement('strong');h.textContent='نمایش دستیارها';box.appendChild(h);
 for(const [key,label,def] of [[KEY_V,'نمایش آیکن دستیار صوتی',false],[KEY_A,'نمایش آیکن هوش مصنوعی',true]]){
  const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px';
  const span=document.createElement('span');span.textContent=label;
  const input=document.createElement('input');input.type='checkbox';input.checked=enabled(key,def);input.setAttribute('aria-label',label);input.style.cssText='width:22px;height:22px;flex:none';
  input.addEventListener('change',()=>save(key,input.checked));row.append(span,input);box.appendChild(row);
 }
 root.appendChild(box);
}
let pending=false;new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();