/* ZAVI ONE 65.74 unified 20-trade user experience.
 * Only the existing authenticated store profile authorizes trade changes.
 * Never mutates invoices, stock, permissions, cash or offline licences. */
(()=>{'use strict';
 const q=(s,p=document)=>p.querySelector(s), types=(window.ZAVI_UNIFIED_PROFILES||[]);
 if(!Array.isArray(types)||types.length!==20||new Set(types.map(x=>x.id)).size!==20)return;
 const byId=Object.fromEntries(types.map(p=>[p.id,p]));
 const language=()=>{const v=(document.documentElement.lang||'fa').toLowerCase();return v.startsWith('en')?'en':v.startsWith('ps')?'ps':'fa'};
 const msg={
 fa:{head:'سیستم اختصاصی',choose:'تغییر کسب‌وکار',current:'کسب‌وکار فعال',tools:'کارهای اصلی این کسب‌وکار',preview:'مشخصات تخصصی',check:'فورم‌ها، فاکتورها، ابزارهای روزانه و راپورها بر اساس نوع تجارت پیشنهاد می‌شوند. انتخاب جدید فقط بعد از ذخیره مالک اعمال می‌شود؛ معلومات قبلی حفظ می‌گردد.',all:'انتخاب یکی از ۲۰ کسب‌وکار',search:'جستجوی کسب‌وکار',cancel:'بستن',select:'انتخاب و تنظیم',warning:'پس از انتخاب، تنظیمات تجارت را مرور کرده و دکمۀ ذخیره را بزنید.',general:'حسابداری عمومی',sales:'فروش',purchases:'خرید',products:'کالا و گدام',contacts:'مشتریان',money:'صندوق',reports:'گزارش‌ها',hawala:'حواله',expenses:'مصارف',repairs:'تعمیرات',debtors:'طلبکاران',creditors:'بدهی‌ها',journal:'روزنامچه'},
 en:{head:'Industry workspace',choose:'Change business type',current:'Active business',tools:'Essential business tools',preview:'Industry fields',check:'Daily tools, product details, invoices and reports follow the saved business profile. Only an authorised owner can save a change; existing accounts and records stay intact.',all:'Choose from 20 businesses',search:'Search businesses',cancel:'Close',select:'Choose and configure',warning:'After choosing, review the store settings and press Save business settings.',general:'General accounting',sales:'Sales',purchases:'Purchases',products:'Products & inventory',contacts:'Customers',money:'Cash & payments',reports:'Reports',hawala:'Transfers',expenses:'Expenses',repairs:'Repairs',debtors:'Receivables',creditors:'Payables',journal:'Journal'},
 ps:{head:'د سوداګرۍ ځانګړی سیستم',choose:'د سوداګرۍ ډول بدل کړئ',current:'فعاله سوداګري',tools:'مهم کاري برخې',preview:'ځانګړي معلومات',check:'ورځنۍ چارې، توکي، بلونه او راپورونه د خوندي شوي ډول له مخې برابریږي. یوازې مالک یې خوندي کوي؛ پخواني معلومات ساتل کېږي.',all:'له ۲۰ سوداګریو څخه یوه وټاکئ',search:'د سوداګرۍ لټون',cancel:'تړل',select:'ټاکل او تنظیم',warning:'د سوداګرۍ تنظیمات وګورئ او د خوندي کولو تڼۍ ووهئ.',general:'عمومي حسابداري',sales:'پلور',purchases:'پېرود',products:'توکي او ګدام',contacts:'پېرودونکي',money:'صندوق',reports:'راپورونه',hawala:'حواله',expenses:'لګښتونه',repairs:'ترمیم',debtors:'پورونه',creditors:'بدهی',journal:'ورځپاڼه'}
 };
 const fallback={
 general:['sales','products','purchases','reports'],
 supermarket:['sales','products','purchases','debtors'],
 pharmacy:['products','purchases','sales','reports'],
 laboratory:['contacts','sales','expenses','reports'],
 gold:['products','sales','purchases','money'],
 mobile:['products','sales','repairs','purchases'],
 wholesale:['purchases','products','sales','creditors'],
 distribution:['sales','products','debtors','money'],
 clothing:['products','sales','purchases','reports'],
 footwear:['products','sales','purchases','reports'],
 bookstore:['products','sales','purchases','reports'],
 cosmetics:['products','purchases','sales','reports'],
 electronics:['products','sales','repairs','purchases'],
 furniture:['products','sales','contacts','purchases'],
 hardware:['products','sales','purchases','debtors'],
 construction:['products','sales','debtors','purchases'],
 exchange:['money','hawala','reports','contacts'],
 contractor:['sales','expenses','purchases','reports'],
 services:['sales','contacts','expenses','money'],
 company:['money','reports','purchases','sales']
 };
 const icons={general:'📊',supermarket:'🛒',pharmacy:'💊',laboratory:'🧪',gold:'💍',mobile:'📱',wholesale:'📦',distribution:'🚚',clothing:'👕',footwear:'👟',bookstore:'📚',cosmetics:'🧴',electronics:'⚡',furniture:'🪑',hardware:'🔧',construction:'🏗️',exchange:'💱',contractor:'👷',services:'🛠️',company:'🏢'};
 const t=()=>msg[language()];
 const safe=id=>byId[id]?id:'general';
 const current=()=>{try{return safe(window.zaviActiveIndustry?.())}catch(e){return 'general'}};
 const name=(p)=>p.name?.[language()]||p.name?.fa||p.id;
 const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
 const go=id=>{location.assign('./v25-business.html?zavi_select='+encodeURIComponent(safe(id)))};
 let dialog=null,searchInput=null,grid=null;
 const fields=id=>(window.ZaviIndustryKit6525?.profile?.(id)?.fields||[]).map(x=>x.label).filter(Boolean).slice(0,8);
 function buildOptions(keyword){
  if(!grid)return;
  const k=String(keyword||'').trim().toLocaleLowerCase();
  grid.replaceChildren();
  types.filter(p=>!k||[p.name?.fa,p.name?.en,p.name?.ps,p.id,p.focus].some(s=>String(s||'').toLocaleLowerCase().includes(k))).forEach(p=>{
   const b=el('button','z74-option');b.type='button';b.dataset.z74Type=p.id;
   const top=el('strong','',icons[p.id]+'  '+name(p));b.append(top);
   if(p.id===current())b.classList.add('is-active');
   b.append(el('small','',p.focus||''));
   b.addEventListener('click',()=>go(p.id));grid.append(b);
  });
 }
 function chooser(){
  if(dialog)return dialog;
  dialog=el('dialog','z74-picker');dialog.id='z74-business-picker';
  const head=el('div','z74-dialog-header');
  head.append(el('h2','',t().all));
  const close=el('button','z74-close',t().cancel);close.type='button';close.addEventListener('click',()=>dialog.close?.());head.append(close);
  searchInput=el('input','z74-search');searchInput.type='search';searchInput.placeholder=t().search;searchInput.setAttribute('aria-label',t().search);
  grid=el('div','z74-choices');searchInput.addEventListener('input',()=>buildOptions(searchInput.value));
  dialog.append(head,searchInput,el('p','z74-notice',t().warning),grid);document.body.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close?.()});
  return dialog;
 }
 function open(){const d=chooser();q('.z74-dialog-header h2',d).textContent=t().all;q('.z74-close',d).textContent=t().cancel;searchInput.placeholder=t().search;searchInput.value='';buildOptions('');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');searchInput.focus()}
 function card(type,mode){
  const p=byId[type]||byId.general,box=el('section','z74-workspace');box.dataset.z74Industry=type;
  const bar=el('div','z74-bar');const left=el('div','z74-heading');
  left.append(el('small','',t().current));left.append(el('strong','',icons[type]+' '+name(p)));bar.append(left);
  const choose=el('button','z74-change',t().choose);choose.type='button';choose.addEventListener('click',open);bar.append(choose);box.append(bar);
  if(mode==='full'){
   const desc=el('p','z74-focus',p.focus||'');box.append(desc);
   const tools=el('div','z74-tools');tools.append(el('small','z74-subtitle',t().tools));
   const links=el('div','z74-link-grid');
   const xs=window.ZaviIndustryFocus?.plan?.(type)?.primary||fallback[type]||fallback.general;
   for(const id of [...new Set(xs)]){
    const b=el('button','z74-action',t()[id]||id);b.type='button';b.setAttribute('data-go',id);links.append(b);
   }
   tools.append(links);box.append(tools);
   const fs=fields(type);if(fs.length){box.append(el('small','z74-subtitle',t().preview));box.append(el('p','z74-fields',fs.join(' · ')));}
   box.append(el('small','z74-notice',t().check));
  }
  return box;
 }
 let updating=false;
 function sync(){
  const content=q('#content');if(!content)return;
  const type=current(),lang=language(),old=q('#z74-workspace',content);
  const dashboard=!!q('.welcome',content)||!!q('.zrf-home',content),settings=!!q('#shopForm',content);
  const mode=dashboard||settings?'full':'compact';
  if(old&&old.dataset.z74Industry===type&&old.dataset.z74Lang===lang&&old.dataset.z74Mode===mode)return;
  const panel=card(type,mode);panel.id='z74-workspace';panel.dataset.z74Lang=lang;panel.dataset.z74Mode=mode;
  if(old)old.replaceWith(panel);else content.prepend(panel);
  document.documentElement.dataset.z74CurrentTrade=type;
 }
 function enhanceBusinessPage(){
  const select=q('#type'),save=q('#saveProfile');if(!select||!save)return;
  const param=new URLSearchParams(location.search).get('zavi_select');
  if(param&&byId[param]&&select.querySelector('option[value="'+param+'"]')){
   if(select.value!==param){select.value=param;select.dispatchEvent(new Event('change',{bubbles:true}));}
   const note=el('p','z74-save-warning',t().warning);save.parentElement?.insertBefore(note,save);
   save.focus({preventScroll:true});
  }
  document.documentElement.dataset.z74BusinessSettings='true';
 }
 function run(){
  if(q('#type')&&q('#saveProfile'))enhanceBusinessPage();
  const content=q('#content');if(!content)return;
  const observer=new MutationObserver(()=>{if(updating)return;updating=true;requestAnimationFrame(()=>{updating=false;sync()})});
  observer.observe(content,{childList:true});
  window.addEventListener('focus',sync);
  ['zavi-business-updated','zavi-cloud-workspace-selected','zavi-cloud-session-changed'].forEach(ev=>window.addEventListener(ev,sync));
  sync();
 }
 window.ZAVIUnified20=Object.freeze({profiles:types.slice(),current,openPicker:open});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();