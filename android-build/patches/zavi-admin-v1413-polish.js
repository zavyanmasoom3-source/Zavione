/* ZAVI ONE ADMIN 1.4.13 – owner console usability (presentation only).
 * No authentication, authorization, billing, money, workspace or offline API changes.
 */
(()=>{
'use strict';
const view=()=>document.querySelector('#appScreen #view');
const language=()=>{
 const l=(document.querySelector('#zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();
 return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa';
};
const t={
 fa:{search:'جستجو در تنظیمات',none:'همه گزینه‌ها در گروه‌های زیر قرار دارند.'},
 ps:{search:'تنظات ولټوئ',none:'ټول انتخابونه په لاندې برخو کې شته.'},
 en:{search:'Search administration settings',none:'All settings are grouped below.'}
};
let pending=false;
function decorate(){
 const root=view();if(!root)return;
 const hub=root.querySelector('.zavi-clean-settings-hub');
 if(hub){
  root.classList.add('za1413-settings');
  if(root.firstElementChild!==hub)root.prepend(hub);
  const search=hub.querySelector('#zaviCleanAdminSearch');
  if(search){search.placeholder=t[language()].search;search.setAttribute('aria-label',t[language()].search)}
  if(!hub.dataset.za1413){
   hub.dataset.za1413='1';
   const groups=Array.from(hub.querySelectorAll('.zavi-clean-settings-group'));
   for(let i=1;i<groups.length;i++)if(groups[i].open)groups[i].open=false;
  }
 }else root.classList.remove('za1413-settings');
}
function queue(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{pending=false;try{decorate()}catch(e){console.warn('ZAVI ADMIN interface:',e)}});
}
function scrollToTop(){
 const c=view();
 for(const el of [document.scrollingElement,document.body,c,document.querySelector('#appScreen .content')]){
  if(!el)continue;try{el.scrollTop=0}catch(_){}
 }
}
function start(){
 const root=view();if(!root)return;
 new MutationObserver(queue).observe(root,{childList:true});
 new MutationObserver(queue).observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-zavi-theme']});
 document.addEventListener('change',event=>{if(event.target?.id==='zaviAdminLanguage')queue()});
 document.addEventListener('click',event=>{
   const nav=event.target.closest?.('#appScreen .sidebar .nav-item,#appScreen .admin-mobile-nav button');
   if(nav)setTimeout(()=>{scrollToTop();queue()},40);
 },true);
 queue();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();