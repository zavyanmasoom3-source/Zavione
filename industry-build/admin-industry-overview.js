/* ZAVI ONE ADMIN 1.4.20 — central read-only industry edition directory.
   All data queries enforce billing-admin checks on server. The 20 Android + desktop
   binaries use one Supabase tenancy; this screen never grants itself privileges. */
(()=>{'use strict';
const industries=[{"id":"general","fa":"تجارت عمومی","en":"General Business","ps":"تجارت عمومي"},{"id":"pharmacy","fa":"دواخانه","en":"Pharmacy","ps":"درملتون"},{"id":"mobile","fa":"فروشگاه موبایل","en":"Mobile Shop","ps":"د موبایل پلورنځی"},{"id":"supermarket","fa":"سوپرمارکیت","en":"Supermarket","ps":"سوپرمارکېټ"},{"id":"wholesale","fa":"عمده‌فروشی","en":"Wholesale","ps":"عمده پلور"},{"id":"clothing","fa":"فروشگاه لباس","en":"Clothing","ps":"د جامو دوکان"},{"id":"services","fa":"شرکت خدماتی","en":"Services","ps":"خدماتي شرکت"},{"id":"construction","fa":"مصالح ساختمانی","en":"Building Materials","ps":"ساختماني مواد"},{"id":"company","fa":"شرکت تجارتی","en":"Trading Company","ps":"سوداګریز شرکت"},{"id":"exchange","fa":"صرافی و تبدیل ارز","en":"Exchange Office","ps":"صرافۍ"},{"id":"contractor","fa":"شرکت ساختمانی و پیمانکاری","en":"Construction Contractor","ps":"ساختماني قراردادي"},{"id":"gold","fa":"زرگری و طلافروشی","en":"Jewelry & Gold","ps":"زرګري"},{"id":"bookstore","fa":"کتاب‌فروشی و لوازم‌التحریر","en":"Bookstore & Stationery","ps":"کتابپلورنځی"},{"id":"footwear","fa":"کفش و لوازم ورزشی","en":"Footwear & Sports","ps":"بوټان او سپورت"},{"id":"cosmetics","fa":"آرایشی و بهداشتی","en":"Cosmetics","ps":"ښکلا او روغتیا"},{"id":"electronics","fa":"وسایل برقی و الکترونیکی","en":"Electronics","ps":"برېښنايي وسایل"},{"id":"furniture","fa":"مبلمان و لوازم خانه","en":"Furniture & Home","ps":"فرنیچر"},{"id":"hardware","fa":"ابزار و لوازم ساختمانی","en":"Tools & Hardware","ps":"وسایل او ابزار"},{"id":"laboratory","fa":"لابراتوار طبی","en":"Medical Laboratory","ps":"طبي لابراتوار"},{"id":"distribution","fa":"شرکت توزیع","en":"Distribution","ps":"د توزیع شرکت"}];
const q=(s,p=document)=>p.querySelector(s);
const api=()=>window.ZaviAdminAPI;
const lang=()=>{const x=(q('#zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return x.startsWith('en')?'en':x.startsWith('ps')?'ps':'fa'};
const words={
 fa:{name:'مدیریت نسخه‌های تخصصی',subtitle:'۲۰ کسب‌وکار با حسابداری، اشتراک و مجوز آفلاین مشترک',close:'بستن',total:'همۀ فروشگاه‌ها',active:'اشتراک فعال',trial:'آزمایش ۷ روزه',empty:'در حال دریافت گزارش امن از سرور…',fail:'گزارش فقط با ورود مالک مرکزی و اتصال به سرور نمایش داده می‌شود.',list:'فهرست نسخه‌ها',shops:'فروشگاه',reload:'تازه‌سازی',licenses:'مجوز آفلاین و آزمایش ۷ روزه',note:'هر APK و Windows Setup اطلاعات محلی مستقل دارد؛ یک حساب ابری مشترک است و انتخاب نوع تجارت باید توسط مالک فروشگاه تأیید شود.',demo:'حالت نمایشی — گزارش واقعی در دسترس نیست.'},
 en:{name:'Industry editions',subtitle:'20 business editions with shared accounting, subscription and offline permissions',close:'Close',total:'All stores',active:'Active plans',trial:'7-day trials',empty:'Loading secure report…',fail:'Central owner sign-in and network required to access report.',list:'Business editions',shops:'stores',reload:'Refresh',licenses:'Offline licences & 7-day trial',note:'Each APK and Windows Setup stores its local data separately; cloud workspaces share central management. Business type changes require the shop owner’s confirmation.',demo:'Demo mode — no live stats.'},
 ps:{name:'د صنفونو ځانګړې بڼې',subtitle:'۲۰ سوداګرۍ، ګډ حسابداري او آفلاین جوازونه',close:'بندول',total:'ټول دوکانونه',active:'فعال ګډونونه',trial:'۷ ورځنۍ ازموینه',empty:'د خوندي راپور د ترلاسه کولو په حال کې…',fail:'د مرکزي مالک ننوتل او انټرنېټ ته اړتیا ده.',list:'د سوداګرۍ بڼې',shops:'دوکانونه',reload:'تازه کول',licenses:'آفلاین او ۷ ورځنۍ اجازه',note:'د هر اپ ځایي معلومات جلا دي؛ مرکزي کلاوډ حساب شریک دی. د سوداګرۍ ډول بدلول د مالک تایید غواړي.',demo:'ازمایښتي حالت — د حقیقي معلوماتو راپور نشته.'}};
const mk=(tag,cl,txt)=>{let e=document.createElement(tag);if(cl)e.className=cl;e.textContent=txt||'';return e};
const ready=()=>{const a=q('#appScreen');return !!a&&!a.hidden&&getComputedStyle(a).display!=='none'&&api()?.getMode?.()==='live'};
let overlay=null;
function shut(){overlay?.remove();overlay=null}
async function refresh(){
 if(!overlay)return;const w=words[lang()],board=q('#z73-industry-board');if(!board)return;
 board.replaceChildren(mk('p','z73-note',w.empty));
 if(!ready()){board.textContent=w.demo;return}
 try{
  const data=await api().request('/rest/v1/rpc/zavi_admin_v6573_industry_edition_report',{method:'POST',body:{}});
  if(!overlay?.isConnected)return;
  let rec=Array.isArray(data)?data[0]:data;
  const byId=new Map((rec?.industry_counts||[]).map(x=>[x.id,x]));
  const strip=mk('div','z73-stats','');
  for(const [name,val] of [[w.total,rec?.total_workspaces||0],[w.active,rec?.active_workspaces||0],[w.trial,rec?.trial_workspaces||0]]){
   const item=mk('div','z73-stat','');item.append(mk('strong','',String(val)),mk('span','',name));strip.append(item)
  }
  const grid=mk('div','z73-grid','');
  for(const industry of industries){
   const count=byId.get(industry.id)||{};
   const cell=mk('article','z73-industry','');const name=mk('strong','',industry[lang()]||industry.fa);
   const stats=mk('span','',String(count.total||0)+' '+w.shops+' · '+String(count.active||0)+' '+w.active);
   cell.append(name,stats);
   if(count.trial>0)cell.append(mk('small','',String(count.trial)+' '+w.trial));
   grid.append(cell);
  }
  board.replaceChildren(strip,mk('h3','z73-section-title',w.list),grid,mk('p','z73-note',w.note));
 }catch(err){board.replaceChildren(mk('p','z73-error',w.fail))}
}
function open(){
 if(overlay){refresh();return}
 const w=words[lang()],root=mk('section','z73-overlay','');root.id='z73-overlay';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',w.name);
 const panel=mk('div','z73-panel',''),head=mk('div','z73-header','');
 const titles=mk('div','', '');titles.append(mk('strong','',w.name),mk('small','',w.subtitle));
 const close=mk('button','z73-close','×');close.type='button';close.setAttribute('aria-label',w.close);close.addEventListener('click',shut);
 head.append(titles,close);
 const actions=mk('div','z73-actions','');const reload=mk('button','',w.reload);reload.type='button';reload.addEventListener('click',refresh);
 const perms=mk('button','',w.licenses);perms.type='button';perms.addEventListener('click',()=>{shut();q('#z70-launch')?.click()});
 actions.append(reload,perms);
 const board=mk('div','z73-board','');board.id='z73-industry-board';
 panel.append(head,actions,board);root.append(panel);root.addEventListener('click',e=>{if(e.target===root)shut()});
 q('#appScreen')?.append(root);overlay=root;refresh();
}
function mount(){
 const screen=q('#appScreen');if(!screen||screen.hidden||getComputedStyle(screen).display==='none')return;
 const top=q('#appScreen .top-actions')||q('#appScreen .topbar');
 if(top&&!q('#z73-launch')){
  const b=mk('button','z73-launch',words[lang()].name);b.id='z73-launch';b.type='button';b.addEventListener('click',open);top.prepend(b)
 }
}
function start(){const shell=q('#appScreen');if(!shell)return;new MutationObserver(mount).observe(shell,{childList:true,attributes:true,attributeFilter:['hidden','style','class']});document.addEventListener('keydown',e=>{if(e.key==='Escape')shut()});mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();