/* V66.20: Settings-only assistant controls, no dashboard overlay. */
(()=>{'use strict';
const V='zavi.showVoiceLauncher',A='zavi.showAiLauncher';
const style=document.createElement('style');style.id='zavi-assistant-visibility-css';
style.textContent=`
#z605-launch{display:none!important}
body.zavi-show-voice #z605-launch{display:grid!important}
body.zavi-hide-ai #z637AiButton,body.zavi-hide-ai .z637-ai-button{display:none!important}
#zavi-assistant-settings{display:none!important;direction:rtl;box-sizing:border-box;clear:both;width:100%;max-width:100%;margin:12px 0;padding:12px;border:1px solid #7895ca;border-radius:12px;color:inherit;writing-mode:horizontal-tb!important;white-space:normal!important}
#zavi-assistant-settings.zavi-settings-visible{display:block!important}
#zavi-assistant-settings *{writing-mode:horizontal-tb!important;word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important}
#zavi-assistant-settings label{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:10px 0!important;font-size:13px!important}
#zavi-assistant-settings input{width:22px!important;height:22px!important;flex:none!important}
`;
(document.head||document.documentElement).appendChild(style);
function get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v==='true'}catch(_){return d}}
function apply(){document.body.classList.toggle('zavi-show-voice',get(V,false));document.body.classList.toggle('zavi-hide-ai',!get(A,true))}
function save(k,v){try{localStorage.setItem(k,String(v))}catch(_){ }apply()}
function visible(el){return !!(el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')}
function settingsRoot(){
 // Require an exact visible SETTINGS heading, never infer settings from a dashboard containing a link.
 const headings=[...document.querySelectorAll('h1,h2,h3,h4,[role="heading"],.page-title,.section-title')];
 const heading=headings.find(el=>visible(el)&&/^(تنظیمات|Settings|امستنې)$/.test((el.textContent||'').trim()));
 if(!heading)return null;
 const root=heading.closest('section,.settings-page,.page,.screen,.view,[role="tabpanel"]');
 if(!root||!visible(root)||root===document.body)return null;
 return root;
}
function mount(){
 apply();
 // Remove the previous wrongly positioned dashboard panel, wherever it was mounted.
 const root=settingsRoot();
 for(const old of document.querySelectorAll('#zavi-assistant-settings')){
  if(!root||!root.contains(old))old.remove();
 }
 if(!root)return;
 if(root.querySelector('#zavi-assistant-settings'))return;
 const box=document.createElement('section');box.id='zavi-assistant-settings';box.className='zavi-settings-visible';
 const heading=document.createElement('strong');heading.textContent='نمایش دستیارها';box.appendChild(heading);
 for(const [key,label,def] of [[V,'نمایش آیکن دستیار صوتی',false],[A,'نمایش آیکن هوش مصنوعی',true]]){
  const row=document.createElement('label'),span=document.createElement('span'),input=document.createElement('input');
  span.textContent=label;input.type='checkbox';input.checked=get(key,def);input.setAttribute('aria-label',label);
  input.addEventListener('change',()=>save(key,input.checked));row.append(span,input);box.appendChild(row);
 }
 root.appendChild(box);
}
let pending=false;new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();