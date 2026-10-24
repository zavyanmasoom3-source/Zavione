/* ZAVI ONE display density selector v65.44: works offline across WebView/PWA/desktop.
   Only UI scale changes. Printed documents retain native scale. */
(()=>{'use strict';
 const KEY='zavi_display_scale_v6544',VALUES={small:.87,medium:1,large:1.15};
 const L={
  en:{title:'Display size',small:'Small',medium:'Medium',large:'Large',choose:'Choose display size'},
  fa:{title:'اندازه نمایش',small:'کوچک',medium:'متوسط',large:'بزرگ',choose:'انتخاب اندازه نمایش'},
  ps:{title:'د ښودنې اندازه',small:'کوچنی',medium:'منځنی',large:'لوی',choose:'د ښودنې اندازه وټاکئ'}
 };
 let current='medium';
 try{let s=localStorage.getItem(KEY);if(Object.hasOwn(VALUES,s))current=s}catch(_){}
 let dock=null,panel=null,toggle=null;
 const locale=()=>{
  let sel=document.querySelector('#zaviSettingsLanguage,#zaviGateLanguage,[name="language"]');
  let lang=String(sel?.value||document.documentElement.lang||'fa').toLowerCase();
  return lang.startsWith('en')?'en':lang.startsWith('ps')?'ps':'fa';
 };
 const apply=()=>{document.documentElement.style.zoom=String(VALUES[current]);document.documentElement.dataset.zaviDisplaySize=current;};
 const paint=()=>{
  const t=L[locale()];
  if(toggle){toggle.textContent='Aa · '+t.title;toggle.setAttribute('aria-label',t.choose);}
  if(panel){
   panel.querySelector('.zavi-display-heading').textContent=t.title;
   panel.querySelectorAll('[data-zavi-size]').forEach(el=>{
    const k=el.getAttribute('data-zavi-size');el.textContent=t[k];el.setAttribute('aria-pressed',String(current===k));
   });
  }
 };
 const set=(v)=>{if(!Object.hasOwn(VALUES,v))return false;current=v;try{localStorage.setItem(KEY,v)}catch(_){}apply();paint();return true;};
 const hide=()=>{if(panel){panel.hidden=true;toggle?.setAttribute('aria-expanded','false')}};
 function mount(){
  if(document.getElementById('zavi-display-control'))return;
  const st=document.createElement('style');st.id='zavi-display-scale-v6544';
  st.textContent=`
#zavi-display-control{position:fixed;inset-inline-start:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147482000;font:600 13px/1.5 Tahoma,Arial,sans-serif!important;direction:rtl;text-align:start;--zavi-dock-ink:#17405f}
#zavi-display-control *{box-sizing:border-box;font-family:inherit!important}
#zavi-display-control .zavi-display-toggle{background:#fff;color:#17405f;border:1px solid #b7cedd;padding:7px 12px;border-radius:12px;min-height:36px;box-shadow:0 4px 16px #112e4850;cursor:pointer;white-space:nowrap}
#zavi-display-control .zavi-display-options{position:absolute;bottom:calc(100% + 9px);inset-inline-start:0;width:211px;padding:13px;background:#fff;color:#17405f;border:1px solid #c5d7e3;border-radius:15px;box-shadow:0 12px 35px #10243d55}
#zavi-display-control .zavi-display-options[hidden]{display:none!important}
#zavi-display-control .zavi-display-heading{font-size:13px!important;line-height:1.7;font-weight:800;display:block;margin-bottom:9px}
#zavi-display-control .zavi-display-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
#zavi-display-control [data-zavi-size]{font-size:12px!important;min-height:37px;white-space:normal;line-height:1.5;padding:6px 2px;border:1px solid #c9d9e5;background:#f2f7fb;color:#1e4468;border-radius:9px;cursor:pointer}
#zavi-display-control [data-zavi-size][aria-pressed="true"]{background:#0b719f;color:#fff;border-color:#0b719f;font-weight:900}
@media print{html{zoom:1!important}#zavi-display-control{display:none!important}}
`;
  (document.head||document.documentElement).appendChild(st);
  dock=document.createElement('div');dock.id='zavi-display-control';dock.setAttribute('data-zavi-ui-only','true');
  dock.innerHTML='<button type="button" class="zavi-display-toggle" aria-haspopup="true" aria-expanded="false"></button><div class="zavi-display-options" hidden><b class="zavi-display-heading"></b><div class="zavi-display-choices" role="group"><button type="button" data-zavi-size="small"></button><button type="button" data-zavi-size="medium"></button><button type="button" data-zavi-size="large"></button></div></div>';
  document.body.appendChild(dock);
  panel=dock.querySelector('.zavi-display-options');toggle=dock.querySelector('.zavi-display-toggle');
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)paint()});
  panel.addEventListener('click',e=>{let v=e.target.closest('[data-zavi-size]')?.getAttribute('data-zavi-size');if(v){set(v);hide()}});
  document.addEventListener('pointerdown',e=>{if(dock&&!dock.contains(e.target))hide()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
  document.addEventListener('change',e=>{if(e.target.matches('#zaviSettingsLanguage,#zaviGateLanguage,[name="language"]'))paint()});
  window.addEventListener('storage',e=>{if(e.key===KEY){let v=e.newValue||'medium';if(Object.hasOwn(VALUES,v)){current=v;apply();paint()}}});
  paint();
 }
 apply();
 window.ZaviDisplayScale=Object.freeze({get:()=>current,set});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();