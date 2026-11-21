/* ZAVI ONE V66.62 approved settings layout — presentation-only DOM relocation.
 * Keep ORIGINAL nodes, ids, forms, event listeners, permission checks and ledger.
 * No auto-switch of a tenant's industry. Three new catalog items are previews
 * until their business workflows are backed by the original owner save flow.
 */
(() => {
 'use strict';
 // One owner-approved settings hierarchy only. Older profile code remains active
 // for the real profile editor, but must not create its own 8-section layout.
 window.ZAVI_SETTINGS_SINGLE_HUB = true;
 const EXTRA = [
  {id:'restaurant',name:{fa:'رستورانت و کافه',ps:'رستورانت او کافې',en:'Restaurant & Cafe'},focus:'منو، سفارش میز، آشپزخانه و صندوق',fields:['نام غذا','دسته غذا','شماره میز','قیمت']},
  {id:'covers',name:{fa:'کاور، پوش و پوزه موبایل',ps:'د موبایل کاور او پوښ',en:'Phone Cases & Covers'},focus:'مدل سازگار، رنگ‌های متعدد، موجودی و بارکد هر رنگ',fields:['نام کاور','جنس','مدل سازگار','قیمت'],colors:true},
  {id:'accessories',name:{fa:'لوازم جانبی موبایل',ps:'د موبایل لوازم',en:'Mobile Accessories'},focus:'کابل، شارژر، هندزفری، گلس و پاوربانک',fields:['نوع لوازم','مدل سازگار','برند','قیمت'],colors:true}
 ];
 const DATA = {
  fa:[['account','🏪','پروفایل و فروشگاه','نام، نوع تجارت و واحد پول'],['appearance','🎨','ظاهر، زبان و اندازه','سه حالت، تقویم، فونت و انیمیشن'],['invoice','🧾','فاکتور و چاپ','قالب، کاغذ، لوگو و پیش‌نمایش'],['operations','💳','فروش، خرید و حسابداری','حساب‌ها، سندها و دسترسی به بخش‌ها'],['inventory','📦','محصولات و گدام','موجودی، بارکد و تنظیمات نمایش'],['people','👥','مشتریان، واتساپ و همکاران','مخاطبین و مدیریت تیم'],['system','☁️','ابر، دستگاه، اشتراک و امنیت','همگام‌سازی، مجوز و دستگاه‌ها'],['advanced','🛠','پیشرفته و نگهداری','بکاپ، بررسی کیفیت و پاک‌سازی']],
  ps:[['account','🏪','دوکان او پروفایل','د دوکان نوم او د کاروبار ډول'],['appearance','🎨','بڼه، ژبه او اندازه','رڼا، تیاره، شیشه او جنتري'],['invoice','🧾','بېل او چاپ','چاپ، اندازه او ډیزاین'],['operations','💳','پلور، پیرود او حسابونه','حسابونه او اسناد'],['inventory','📦','توکي او ګدام','ذخیره او بارکوډ'],['people','👥','پېرودونکي او همکاران','اړیکې او لاسرسی'],['system','☁️','کلاوډ، وسایل او امنیت','همغږي، ګډون او امنیت'],['advanced','🛠','پرمختللي او ساتنه','بیک اپ او څارنه']],
  en:[['account','🏪','Store and profile','Business type and store details'],['appearance','🎨','Appearance, language and size','Themes, dates, font and motion'],['invoice','🧾','Invoices and printing','Templates, paper and preview'],['operations','💳','Sales, purchases and finance','Accounts and operational controls'],['inventory','📦','Products and warehouses','Inventory and barcode options'],['people','👥','Customers and staff','Contacts and team permissions'],['system','☁️','Cloud, devices and security','Sync, subscription and access'],['advanced','🛠','Advanced and maintenance','Backups, diagnostics and reset']]
 };
 const locale=()=>{
  const raw=String(document.querySelector('#zaviSettingsLanguage')?.value||document.documentElement.lang||'fa-AF').toLowerCase();
  return raw.startsWith('en')?'en':raw.startsWith('ps')?'ps':'fa';
 };
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;
 };
 const heading=n=>String(n.querySelector('h2,h3,h4')?.textContent||n.getAttribute('aria-label')||'').toLowerCase();
 function kind(n){
  const h=heading(n),c=String(n.className||'').toLowerCase();
  if(n.id==='zaviDateSettings'||n.classList.contains('zavi-date-settings'))return 'appearance';
  if(n.classList.contains('z6524-launch'))return 'advanced';
  if(n.id==='z74-workspace')return 'account';
  if(n.id==='z76-profile-card'||n.querySelector('#shopForm,#zaviRenameShopForm')||/rename|shopform|فروشگاهِ خریدار|تغییر نام فروشگاه|مدیریت عمومی|نوع تجارت|business/.test(h+' '+c))return 'account';
  if(n.querySelector('#zaviSettingsLanguage,#z6515FontChoice,.zavi-theme-picker')||/ظاهر|فونت|زبان|شخصی.سازی|appearance|theme|z6515-font|z637-customize/.test(h+' '+c))return 'appearance';
  if(/invoice|فاکتور|چاپ|thermal|print|receipt/.test(h+' '+c))return 'invoice';
  if(n.querySelector('#zaviEnableAllFeatures,[data-module-id],[data-z20-option],.accounts-grid')||/حساب.های نقدی|بانکی|حواله|ز642-smart|z642-smart|امکانات/.test(h+' '+c))return 'operations';
  if(/گدام|بارکد|موجودی|محصول/.test(h+' '+c))return 'inventory';
  if(/واتساپ|مشتری|همکار|تماس|staff|people/.test(h+' '+c))return 'people';
  if(n.querySelector('#zawiChangePin,#zawiSettingsLock')||/ابر|دستگاه|subscription|license|cloud|همگام|اشتراک|امنیت حسابداری/.test(h+' '+c))return 'system';
  if(n.querySelector('#importFile,#zaviIntegrityCheckV636')||/کیفیت|quality|آزمایش|سلامت|بکاپ|backup|پشتیبان|آغاز دوباره|پاک.کردن|حذف همه|csv/.test(h+' '+c))return 'advanced';
  return 'advanced';
 }
 const escapeText=v=>String(v??'');
 function catalogCard(){
  const card=el('section','card settings-card z66-trade-card');
  card.id='z66-approved-trades';
  card.append(el('h3','', '🏪 انتخاب از میان 23 کسب‌وکار'));
  card.append(el('p','z66-muted','هر 23 صنف در فهرست و فورم‌های برنامه تعریف شده‌اند. تغییر نوع تجارت فقط با تأیید مالک انجام می‌شود؛ ذخیره ابری سه صنف تازه هنوز به آزمایش سرور نیاز دارد.'));
  const search=el('input','z66-trade-search');search.type='search';search.placeholder='جستجوی زرگری، موبایل، کاور، دواخانه...';search.setAttribute('aria-label','جستجوی 23 کسب‌وکار');
  const list=el('div','z66-trade-list');
  const preview=el('section','z66-trade-preview');preview.setAttribute('aria-live','polite');
  card.append(search,list,preview);
  const core=Array.isArray(window.ZAVI_UNIFIED_PROFILES)?window.ZAVI_UNIFIED_PROFILES:[];
  if(core.length!==23){
   card.querySelector('p').textContent='فهرست 23 کسب‌وکار نیازمند بررسی منابع است. تنظیمات فروشگاه تا تأیید مالک تغییر نمی‌کند.';
  }
  const extraById=new Map(EXTRA.map(b=>[b.id,b]));
  const all=core.map((b,i)=>({...b,...(extraById.get(b.id)||{}),name:b.name,
      focus:b.focus||'',number:b.number||i+1,new:extraById.has(b.id)}));
  const types=new Set(all.map(b=>b.id));
  if(types.size!==all.length)throw Error('Duplicate industry type in approved settings catalog');
  const lang=locale(),title=b=>b.name?.[lang]||b.name?.fa||b.id;
  let selection='';
  function renderPreview(b){
   preview.replaceChildren();
   const head=el('div','z66-preview-head');
   head.append(el('strong','',title(b)),el('small','',b.focus));
   preview.append(head);
   if(b.new){
    preview.append(el('p','z66-muted','صنف جدید — فورم زیر فقط پیش‌نمایش طراحی است؛ ذخیره واقعی این صنف تا تکمیل فورم تخصصی و کنترل سمت سرور فعال نیست.'));
    const fields=el('div','z66-fields');
    (b.fields||[]).forEach(f=>{const wrap=el('label','z66-field');wrap.append(el('span','',f));const input=el('input');input.type='text';input.placeholder=f;wrap.append(input);fields.append(wrap)});
    preview.append(fields);
    if(b.colors){
     preview.append(el('strong','z66-field-heading','مدل و رنگ‌های مستقل'));
     const model=el('label','z66-field');model.append(el('span','','مدل موبایل سازگار'));
     const select=el('select');
     ['Samsung A56','Samsung A55','iPhone 16','iPhone 15 Pro','Redmi Note 14','مدل دیگر'].forEach(x=>{const opt=el('option','',x);opt.value=x;select.append(opt)});
     model.append(select);preview.append(model);
     const colors=el('div','z66-colors'),named=new Set();
     function colorRow(color){
      if(named.has(color))return;named.add(color);
      const group=el('div','z66-color');
      const check=el('input');check.type='checkbox';check.setAttribute('aria-label','انتخاب رنگ '+color);
      group.append(check,el('span','',color));
      const count=el('input');count.type='number';count.min='0';count.step='1';count.placeholder='تعداد';count.disabled=true;count.setAttribute('aria-label','تعداد رنگ '+color);
      const barcode=el('input');barcode.type='text';barcode.maxLength=70;barcode.placeholder='بارکد';barcode.disabled=true;barcode.setAttribute('aria-label','بارکد رنگ '+color);
      check.addEventListener('change',()=>{
       count.disabled=barcode.disabled=!check.checked;
       if(!check.checked){count.value='';barcode.value=''}
      });
      group.append(count,barcode);colors.append(group);
     }
     ['سیاه','سفید','آبی','سرخ','سبز','صورتی','شفاف','طلایی'].forEach(colorRow);
     preview.append(colors);
     const addRow=el('div','z66-add-color');
     const newColor=el('input');newColor.type='text';newColor.maxLength=30;newColor.placeholder='رنگ دلخواه، مثلاً نارنجی';
     newColor.setAttribute('aria-label','نام رنگ جدید');
     const add=el('button','btn subtle','افزودن رنگ');add.type='button';
     add.addEventListener('click',()=>{
      const value=newColor.value.trim();
      if(!value||named.size>=20||named.has(value))return;
      colorRow(value);newColor.value='';
     });
     addRow.append(newColor,add);preview.append(addRow);
     preview.append(el('p','z66-muted','مدل، تعداد و بارکد هر رنگ در اینجا صرفاً برای بررسی طراحی هستند؛ داده محصول یا گدام ذخیره نمی‌شود.'));
    }
   }else{
    preview.append(el('p','z66-muted','برای ذخیره نوع تجارت، مدیریت عمومی را باز کنید. تغییر خودکار یا بدون تأیید انجام نمی‌شود.'));
    const link=el('a','btn primary z66-manage-link','بازکردن مدیریت عمومی تجارت');
    link.href='./v25-business.html';preview.append(link);
   }
  }
  function renderList(){
   const q=search.value.trim().toLocaleLowerCase();
   list.replaceChildren();
   for(const b of all){
    if(q&&!(title(b)+' '+b.focus+' '+b.id).toLocaleLowerCase().includes(q))continue;
    const button=el('button','z66-trade-choice');button.type='button';
    button.setAttribute('aria-pressed',String(selection===b.id));
    button.append(el('strong','',b.number+'. '+title(b)));
    button.append(el('small','',b.focus));
    if(b.new)button.append(el('em','z66-new','جدید · پیش‌نمایش'));
    button.addEventListener('click',()=>{
     selection=b.id;
     list.querySelectorAll('.z66-trade-choice').forEach(x=>x.setAttribute('aria-pressed','false'));
     button.setAttribute('aria-pressed','true');renderPreview(b);
    });
    list.append(button);
   }
   if(!list.children.length)list.append(el('p','z66-muted','صنفی با این نام یافت نشد.'));
  }
  search.addEventListener('input',renderList);renderList();
  if(all.length!==23||new Set(all.map(b=>b.id)).size!==23)
   throw Error('Incomplete or duplicated 23-industry registry in settings');
  const active=typeof window.zaviActiveIndustry==='function'?window.zaviActiveIndustry():'general';
  const first=all.find(b=>b.id===active)||all[0];if(first){selection=first.id;renderPreview(first);renderList()}
  return card;
 }
 function splitFeatureCard(card){
  if(!card||card.dataset.z66split)return null;
  const grid=card.querySelector(':scope > .form-grid');
  if(!grid||!grid.querySelector('#zaviSettingsLanguage'))return null;
  const localeCard=el('section','card settings-card z66-locale-card');
  localeCard.append(el('h3','', '🌐 زبان و راه‌اندازی'));localeCard.append(grid);
  const label=card.querySelector('h3');
  if(label)label.textContent='🧩 روشن و خاموش کردن امکانات';
  card.dataset.z66split='true';
  const filter=el('input','z66-feature-filter');filter.type='search';filter.placeholder='جستجو در امکانات...';filter.setAttribute('aria-label','جستجو در همه امکانات');
  const help=el('p','z66-muted','علامت‌ها به کنترل‌های اصلی متصل‌اند؛ خاموش‌کردن فقط نمایش بخش‌ها را تغییر می‌دهد و دسترسی سروری را تغییر نمی‌دهد.');
  const moduleGrid=card.querySelector('.zavi-module-grid');
  if(moduleGrid){
   moduleGrid.before(filter,help);
   filter.addEventListener('input',()=>{
    const q=filter.value.trim().toLocaleLowerCase();
    for(const option of card.querySelectorAll('.zavi-switch,.z20-toggle')){
     option.hidden=!!q&&!option.textContent.toLocaleLowerCase().includes(q);
    }
   });
  }
  return localeCard;
 }
 function controlGroup(input){
  if(input.dataset.moduleId){
   const id=input.dataset.moduleId;
   if(['products','waste','repairs'].includes(id))return 'inventory';
   if(id==='contacts')return 'people';
   if(['dashboard','reports'].includes(id))return 'system';
   return 'operations';
  }
  const id=input.dataset.z20Option||'';
  if(['lowStock','usdStock'].includes(id))return 'inventory';
  if(['customerShare','debtorOgrai'].includes(id))return 'people';
  if(['invoiceImage','qr'].includes(id))return 'invoice';
  if(['backupAlert'].includes(id))return 'advanced';
  if(['dashboardPhone'].includes(id))return 'account';
  return 'operations';
 }
 function distributeControls(card,bodies){
  if(!card||card.dataset.z66distributed)return;
  const modules=[...card.querySelectorAll('input[data-module-id],input[data-z20-option]')];
  const buckets=new Map();
  for(const input of modules){
   const label=input.closest('label');if(!label)throw Error('Original settings toggle lost its label');
   const group=controlGroup(input),type=input.dataset.moduleId?'module':'option';
   const key=group+'|'+type;
   let container=buckets.get(key);
   if(!container){
    const shell=el('section','card settings-card z66-options-subcard');
    shell.append(el('h3','',type==='module'?'نمایش بخش‌های برنامه':'گزینه‌های نمایش و امکانات'));
    container=el('div',type==='module'?'zavi-module-grid':'z20-grid');
    shell.append(container);
    buckets.set(key,container);
    bodies.get(group).append(shell);
   }
   container.append(label);
  }
  if(modules.length!==card.querySelectorAll('input[data-module-id],input[data-z20-option]').length+
      [...buckets.values()].reduce((n,group)=>n+group.querySelectorAll('input').length,0)){
   throw Error('Settings option redistribution mismatch');
  }
  card.dataset.z66distributed='true';
  card.querySelectorAll('.zavi-module-grid:empty,.z20-grid:empty').forEach(x=>x.remove());
  for(const h of card.querySelectorAll('h4'))if(/بخش‌هایی که|روشن و خاموش کردن امکانات/.test(h.textContent||''))h.remove();
 }
 function quickLinks(bodies){
  const plans={
   operations:[['sales','فروش'],['purchases','خرید'],['money','صندوق'],['debtors','طلب‌ها'],['creditors','قرض‌های ما'],['journal','روزنامچه']],
   inventory:[['products','محصولات و گدام'],['waste','ضایعات']],
   people:[['contacts','مشتریان']],
   system:[['reports','گزارش‌ها'],['subscription','اشتراک']]
  };
  for(const [group,links] of Object.entries(plans)){
   const card=el('section','card settings-card z66-quick-links');
   card.append(el('h3','', 'دسترسی به بخش‌های اصلی'));
   const row=el('div','z66-link-grid');
   for(const [route,title] of links){
    const button=el('button','btn subtle',title);
    button.type='button';button.dataset.go=route;row.append(button);
   }
   card.append(row,el('p','z66-muted','این دکمه‌ها همان مسیرهای اصلی برنامه را باز می‌کنند؛ هیچ معامله‌ای به‌صورت خودکار ثبت نمی‌شود.'));
   bodies.get(group).append(card);
  }
 }
 const createHub=()=>{
  const hub=el('section','z66-approved-hub');hub.id='z66-approved-hub';
  const intro=el('div','z66-approved-intro');
  intro.append(el('strong','',locale()==='en'?'Settings':locale()==='ps'?'تنظیمات':'تنظیمات مرتب'));
  intro.append(el('p','',locale()==='en'?'Open one category at a time. All original settings stay available.':'همه امکانات در بخش‌های جدا و کوتاه، بدون حذف تنظیمات قبلی.'));
  const input=el('input','z66-setting-search');input.type='search';input.placeholder='جستجو در تمام تنظیمات...';
  input.setAttribute('aria-label','جستجو در تنظیمات');
  intro.append(input);
  const list=el('div','z66-settings-list');
  hub.append(intro,list);
  const bodies=new Map();
  for(const [id,emoji,name,subtitle] of DATA[locale()]){
   const details=el('details','z66-settings-group');details.dataset.z66group=id;
   const summary=el('summary','z66-group-summary');
   const symbol=el('span','z66-group-icon',emoji);
   const middle=el('span','z66-group-middle');middle.append(el('strong','',name),el('small','',subtitle));
   summary.append(symbol,middle,el('span','z66-chevron','⌄'));
   const body=el('div','z66-settings-body');details.append(summary,body);list.append(details);bodies.set(id,body);
   summary.addEventListener('click',()=>{setTimeout(()=>{if(details.open)list.querySelectorAll('details').forEach(other=>{if(other!==details)other.open=false})},0)});
  }
  input.addEventListener('input',()=>{
   const q=input.value.trim().toLocaleLowerCase();
   for(const details of list.children){
    const body=details.querySelector('.z66-settings-body');
    let matches=0;
    for(const c of body.children){
     const text=(c.textContent||'').toLocaleLowerCase();
     const hit=!q||text.includes(q);c.hidden=!hit;if(hit)matches++;
    }
    details.hidden=matches===0;
    if(q&&matches)details.open=true;
   }
  });
  return {hub,list,bodies};
 };
 let frame=0,active=false;
 function enhance(){
  if(active)return;
  const root=document.querySelector('#content');
  if(!root||!root.querySelector('#shopForm'))return;
  active=true;
  try{
   let hub=root.querySelector('#z66-approved-hub');
   let bodies;
   if(!hub){
    const next=createHub();hub=next.hub;bodies=next.bodies;
    const head=root.querySelector('.page-head');if(head)head.after(hub);else root.prepend(hub);
    // The ORIGINAL 23-industry selector remains functional. Do not render a
    // second, preview-only 23-card list or duplicate global navigation links.
   }else bodies=new Map([...hub.querySelectorAll('.z66-settings-body')].map(b=>[b.closest('details').dataset.z66group,b]));
   const before=[...root.querySelectorAll('button,input,select,textarea,a')].filter(x=>!hub.contains(x));
   const original=new Set(before);
   const custom=root.querySelector('.zavi-custom-card');
   const localCard=splitFeatureCard(custom);
   if(localCard)bodies.get('appearance').append(localCard);
   // Retain original form nodes; move ALL cards and the dynamic calendar.
   // The older organizer used to leave these above the new hub, producing
   // duplicate sections, a large blank settings header and 2 separate menus.
   const standalone=[...new Set([
    ...root.querySelectorAll('.settings-card,#z76-profile-card,#z74-workspace,.z6524-launch,#zaviDateSettings'),
    ...root.querySelectorAll(':scope > section.card,:scope > div.card')
   ])].filter(x=>!x.closest('#z66-approved-hub')&&!x.parentElement?.closest('.settings-card')&&!x.parentElement?.closest('#z74-workspace'));
   for(const node of standalone){
    if(node.id==='z74-workspace'){
     let drawer=hub.querySelector('#z66-business-picker-drawer');
     if(!drawer){
      drawer=el('details','z66-business-picker-drawer');drawer.id='z66-business-picker-drawer';
      drawer.append(el('summary','',locale()==='en'?'Choose business type · 23 options':'انتخاب نوع تجارت · 23 کسب‌وکار'));
      bodies.get('account').append(drawer);
     }
     drawer.append(node); // existing owner confirmation and buttons intact
    }else bodies.get(kind(node)).append(node);
   }
   if(custom&&custom.isConnected)distributeControls(custom,bodies);
   // Preserve dynamic cloud/device panels and notices not marked as cards.
   for(const node of [...root.children]){
    if(node===hub||node.classList.contains('page-head')||node.id==='z76-settings-groups')continue;
    if(node.matches('.notice')||node.matches('[id*="cloud"],[id*="device"],.z6524-launch')){
     bodies.get(kind(node)).append(node);
    }
   }
   // Empty legacy wrappers contain only obsolete section headers after relocation.
   const old=root.querySelector('#z76-settings-groups');
   if(old&&!old.querySelector('button,input,select,textarea,a,.settings-card'))old.remove();
   for(const legacy of root.querySelectorAll(':scope > .z673-settings-groups'))
    if(!legacy.querySelector('button,input,select,textarea,a,.settings-card'))legacy.remove();
   const unused=root.querySelector('.zavi-clean-settings-hub');
   if(unused&&!unused.querySelector('button,input,select,textarea,a,.settings-card'))unused.remove();
   const prior=root.querySelector('.zavi-settings-6546-intro');
   if(prior)prior.remove();
   for(const oldGroup of [...root.querySelectorAll('.zavi-settings-6546-group')]){
    if(!oldGroup.querySelector('button,input,select,textarea,a,.settings-card'))oldGroup.remove();
   }
   // Landing view is short. One user-selected section opens at a time.
   // Native 23-business selector stays collapsed until explicitly opened.
   if(!hub.querySelector('details.z66-settings-group[open]'))
    hub.querySelector('details[data-z66group="account"]').open=true;
   const missing=before.filter(n=>!root.contains(n));
   if(missing.length)throw Error('Settings preserved-control parity failed: '+missing.length);
   const strayControls=[...root.querySelectorAll('.settings-card,#z76-profile-card,#z74-workspace,#zaviDateSettings,.z6524-launch')].filter(x=>!hub.contains(x));
   if(strayControls.length)throw Error('Settings cards outside single hub: '+strayControls.map(x=>x.id||x.className).join(','));
   const secondGroups=root.querySelectorAll('#z76-settings-groups,.z673-settings-groups,.zavi-clean-settings-hub');
   if(secondGroups.length)throw Error('Duplicate old settings organizers still present');
   window.__z66SettingsApprovedAudit={ready:true,groups:hub.querySelectorAll('details[data-z66group]').length,originalControls:original.size,preservedControls:original.size-missing.length,modules:root.querySelectorAll('[data-module-id]').length,options:root.querySelectorAll('[data-z20-option]').length,enableAll:!!root.querySelector('#zaviEnableAllFeatures'),catalog:window.ZAVI_UNIFIED_PROFILES?.length||0,extras:EXTRA.length,strayControls:0,secondMenus:0};
  }finally{active=false}
 }
 function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;try{enhance()}catch(err){console.error('V66.62 settings organization failed',err)}})}
 function init(){
  const root=document.querySelector('#content');if(!root)return;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
  window.addEventListener('zavi-business-updated',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
