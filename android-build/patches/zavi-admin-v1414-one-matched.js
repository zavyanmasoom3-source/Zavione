/* ZAVI ONE ADMIN 1.4.14 – owner-only existing menu proxy, matching ZAVI ONE UI.
 * Does not bypass or substitute server authorization: all actions delegate to existing nav items.
 */
(()=>{
'use strict';
const q=(s,p=document)=>p.querySelector(s),qa=(s,p=document)=>Array.from(p.querySelectorAll(s));
const words={fa:{all:'همه بخش‌ها',sub:'تمام امکانات مدیریت مرکزی در یک جا',close:'بستن'},ps:{all:'ټولې برخې',sub:'د مرکزي ادارې ټولې برخې',close:'بندول'},en:{all:'All sections',sub:'All central administration tools',close:'Close'}};
function locale(){const val=(q('#zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return val.startsWith('en')?'en':val.startsWith('ps')?'ps':'fa'}
function accountReady(){
 const screen=q('#appScreen');
 if(!screen||!q('.sidebar .nav-item',screen))return false;
 const style=getComputedStyle(screen);
 return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;
}
function close(){
 q('#za67-menu')?.remove();document.body.classList.remove('za67-overlay-open');
 q('#appScreen .za67-menu-trigger')?.focus({preventScroll:true});
}
function open(){
 if(!accountReady())return;
 close();
 const dict=words[locale()];
 const screen=q('#appScreen');
 const originals=qa('.sidebar .nav-item',screen).filter(x=>!x.disabled&&!x.hidden&&!x.closest('[hidden]')&&getComputedStyle(x).display!=='none'&&x.textContent.trim());
 if(!originals.length)return;
 const overlay=document.createElement('section');overlay.id='za67-menu';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',dict.all);
 const panel=document.createElement('div');panel.className='za67-panel';
 const head=document.createElement('div');head.className='za67-head';
 const brand=document.createElement('b');brand.append(document.createTextNode('ZAVI '));const one=document.createElement('span');one.textContent='ONE ADMIN';brand.append(one);
 const x=document.createElement('button');x.className='za67-close';x.type='button';x.textContent='×';x.setAttribute('aria-label',dict.close);
 head.append(brand,x);
 const hero=document.createElement('div');hero.className='za67-hero';
 const title=document.createElement('strong');title.textContent=dict.all;
 const description=document.createElement('small');description.textContent=dict.sub;hero.append(title,description);
 const grid=document.createElement('div');grid.className='za67-grid';
 originals.forEach((target,i)=>{
  const label=target.textContent.replace(/\s+/g,' ').trim();
  const item=document.createElement('button');item.type='button';item.className='za67-item';
  if(label.length>22||label.split(/\s+/).length>3)item.classList.add('za67-long');
  item.setAttribute('aria-label',label);
  const icon=document.createElement('span');icon.className='za67-symbol';icon.textContent=i%5===0?'▦':i%5===1?'◇':i%5===2?'☰':i%5===3?'✦':'▣';
  icon.setAttribute('aria-hidden','true');
  const text=document.createElement('span');text.className='za67-label';text.textContent=label;
  const arrow=document.createElement('span');arrow.className='za67-chevron';arrow.textContent='‹';arrow.setAttribute('aria-hidden','true');
  item.append(icon,text,arrow);
  item.addEventListener('click',()=>{close();if(accountReady())target.click()});
  grid.append(item);
 });
 panel.append(head,hero,grid);overlay.append(panel);document.body.append(overlay);document.body.classList.add('za67-overlay-open');
 x.addEventListener('click',close);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 x.focus({preventScroll:true});
}
function install(){
 if(!accountReady())return;
 const bar=q('#appScreen .top-actions')||q('#appScreen .topbar');
 if(!bar||q('.za67-menu-trigger',bar))return;
 const b=document.createElement('button');b.type='button';b.className='za67-menu-trigger';
 const logo=document.createElement('span');logo.textContent='▦';logo.className='za67-squares';logo.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.textContent=words[locale()].all;
 b.append(logo,label);
 b.addEventListener('click',open);bar.insertBefore(b,bar.firstChild);
}
function start(){
 install();
 const screen=q('#appScreen');if(!screen)return;
 // Only listen for topbar replacement; avoids expensive observers on financial dashboards.
 new MutationObserver(()=>{if(!q('#appScreen .za67-menu-trigger'))install()})
  .observe(screen,{childList:true,attributes:true,attributeFilter:['style','class']});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('#za67-menu'))close()});
 document.addEventListener('change',e=>{
  if(e.target?.id==='zaviAdminLanguage'){
   const trigger=q('.za67-menu-trigger span:last-child');
   if(trigger)trigger.textContent=words[locale()].all;
  }
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();