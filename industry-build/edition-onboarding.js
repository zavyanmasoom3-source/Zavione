/* ZAVI ONE business-specific installer onboarding: no unsanctioned tenant mutation.
 * User clicks once to select the edition's original <select id="type"> option,
 * and MUST confirm native "Save business settings" after validation.
 */
(()=>{'use strict';
const p=window.ZAVI_INDUSTRY_EDITION;if(!p?.id)return;
function mount(){
 const select=document.querySelector('#type'),save=document.querySelector('#saveProfile');
 if(!select||!save||document.querySelector('#zavi-edition-onboarding'))return;
 const option=Array.from(select.options).find(o=>o.value===p.id);
 if(!option)return;
 const en=(document.documentElement.lang||'fa').toLowerCase().startsWith('en');
 const ps=(document.documentElement.lang||'fa').toLowerCase().startsWith('ps');
 const head=document.createElement('section');head.className='zavi-edition-onboarding';head.id='zavi-edition-onboarding';
 const label=document.createElement('strong');label.textContent=(en?'Installed business edition: ':ps?'د سوداګرۍ بڼه: ':'نسخۀ اختصاصی نصب‌شده: ')+(p.name?.[en?'en':ps?'ps':'fa']||option.textContent);
 const btn=document.createElement('button');btn.type='button';
 btn.textContent=en?'Choose this business type':ps?'همدا د سوداګرۍ ډول غوره کړئ':'انتخاب همین نوع تجارت';
 btn.addEventListener('click',()=>{
  // Do not click save automatically: explicit owner confirmation remains mandatory.
  select.value=p.id;select.dispatchEvent(new Event('change',{bubbles:true}));
  select.focus({preventScroll:true});
  const msg=document.createElement('p');msg.style.fontSize='12px';msg.textContent=en?'Now verify your settings and press the existing Save business settings button.':ps?'تنظیمات وګورئ او د خوندي کولو تڼۍ ووهئ.':'اکنون تنظیمات را بررسی کنید و دکمۀ اصلی «ذخیره تنظیمات تجارت» را بزنید.';
  head.querySelector('p')?.remove();head.append(msg);
 });
 head.append(label,btn);
 const container=save.closest('section.card')||select.parentElement;
 container.parentNode.insertBefore(head,container);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();