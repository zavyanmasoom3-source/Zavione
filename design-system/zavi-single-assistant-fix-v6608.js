/* ZAVI assistant: keep one entry point, remove decorative star.
   Both speech and typed commands remain tabs of the same panel. */
(()=>{'use strict';
 const css=document.createElement('style');
 css.id='zavi-single-assistant-fix';
 css.textContent=`
 #z605-launch{display:none!important}
 #z605-panel .z605-badge{display:none!important}
 #z197-dashboard-mic,#z196-launch,#z198-power,#z199-launch,
 .z196-launch,.z197-fab{display:none!important}
 #zavi-assistant-one-button[hidden]{display:none!important}
 #zavi-assistant-one-button{
 position:fixed!important;bottom:calc(env(safe-area-inset-bottom,0px) + 86px)!important;
 right:18px!important;left:auto!important;z-index:2147483000!important;
 width:54px!important;height:54px!important;border-radius:50%!important;
 display:grid!important;place-items:center!important;cursor:pointer!important;
 background:linear-gradient(135deg,#0784e8,#10b9e8)!important;
 color:white!important;border:1px solid rgba(255,255,255,.65)!important;
 box-shadow:0 5px 18px rgba(0,50,100,.35)!important;
 font-size:26px!important;line-height:1!important
 }`;
 document.head.append(css);
 const btn=document.createElement('button');
 btn.id='zavi-assistant-one-button';btn.type='button';
 btn.textContent='🎙';btn.setAttribute('aria-label','ZAVI VOICE — دستور صوتی و متنی');
 btn.addEventListener('click',()=>window.ZaviDualCommand605?.open?.());
 document.body.append(btn);
 function visible(){
 const base=document.getElementById('z605-launch');
 btn.hidden=!base||base.hidden||!window.ZaviDualCommand605;
 }
 visible();setInterval(visible,1500);
})();
