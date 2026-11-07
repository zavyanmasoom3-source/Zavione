/* ZAVI ONE 65.59 UI-only upgrade: keep every form, module and auth handler. */
(()=>{'use strict';
const D={
fa:{title:'تنظیمات مرتب',desc:'هر گزینه در بخش خودش قرار دارد.',search:'جست‌وجوی تنظیمات',placeholder:'مثلاً فاکتور، فونت، پشتیبان...',help:'برای دیدن گزینه‌ها یک گروه را باز کنید.',none:'نتیجه‌ای پیدا نشد.',found:'گزینه پیدا شد',groups:[['account','👤 حساب و پروفایل','پروفایل و مشخصات حساب'],['business','🏪 فروشگاه و کسب‌وکار','نام، نوع تجارت و ساختار فروشگاه'],['look','🎨 ظاهر و زبان','زبان، قلم و Light / Dark / Glass'],['security','🔐 امنیت و دسترسی','رمز، اثر انگشت و اجازه‌ها'],['cloud','☁️ ابر و دستگاه‌ها','همگام‌سازی، پشتیبان و انتقال دستگاه'],['accounting','🧾 حسابداری و فاکتورها','حساب‌ها، ارز، فاکتور و چاپ'],['subscription','💳 اشتراک','مجوز، تمدید و وضعیت اشتراک'],['advanced','🛠️ پیشرفته','بررسی و گزینه‌های حساس']]},
en:{title:'Organized settings',desc:'All settings are available in clear groups.',search:'Search settings',placeholder:'E.g. invoice, font, backup...',help:'Open a group to view its settings.',none:'No matching settings.',found:'matching settings',groups:[['account','👤 Account & profile','Profile and account identity'],['business','🏪 Store & business','Store and industry'],['look','🎨 Appearance & language','Language, font and themes'],['security','🔐 Security & access','PIN, biometrics and permissions'],['cloud','☁️ Cloud & devices','Sync, backup and device transfer'],['accounting','🧾 Accounting & invoices','Accounts, currency, invoices and printing'],['subscription','💳 Subscription','License and renewals'],['advanced','🛠️ Advanced','Sensitive settings']]},
ps:{title:'منظم تنظیمات',desc:'ټول انتخابونه په جلا برخو کې شته.',search:'تنظیمات ولټوئ',placeholder:'بېلګه: فونټ، فاکتور، بیک اپ...',help:'د انتخابونو لپاره یوه برخه پرانیزئ.',none:'کومه پایله نشته.',found:'انتخابونه وموندل شول',groups:[['account','👤 حساب او پروفایل','پروفایل او حساب'],['business','🏪 دوکان او کاروبار','دوکان او د کاروبار ډول'],['look','🎨 بڼه او ژبه','ژبه، فونټ او درې حالتونه'],['security','🔐 امنیت او لاسرسی','رمز، بایومتریک او اجازه'],['cloud','☁️ کلاوډ او وسایل','همغږي، بیک اپ او انتقال'],['accounting','🧾 حسابداري او بلونه','حسابونه، اسعار، بلونه او چاپ'],['subscription','💳 ګډون','جواز او تمدید'],['advanced','🛠️ پرمختللي','حساس انتخابونه']]}
};
function locale(){const v=(document.querySelector('#zaviTopLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return v.startsWith('en')?'en':v.startsWith('ps')?'ps':'fa'}
function group(el){
const s=((el.querySelector('h1,h2,h3,h4')?.textContent||el.getAttribute('aria-label')||'')+' '+(el.className||'')).trim();
if(/آغاز دوباره|پاک.کردن|حذف همه|reset|danger|ریست|سلامت|بررسی|آزمایش|integrity|testing/i.test(s))return 'advanced';
if(/اشتراک|تمدید|مجوز|لایسنس|license|subscription|renew|trial|آزمایشی/i.test(s))return 'subscription';
if(/اثر انگشت|biometric|fingerprint|pin|رمز|permission|اجازه|همکار|team|staff|access|دسترسی|امنیت/i.test(s))return 'security';
if(/دستگاه|device|انتقال دستگاه|sync|همگام|cloud|ابری|backup|پشتیبان|بازیابی/i.test(s))return 'cloud';
if(/فونت|ظاهر|زبان|شخصی‌سازی|theme|appearance|language|font|glass|روشن|تاریک|رنګ|ژبه/i.test(s))return 'look';
if(/فاکتور|چاپ|رسید|invoice|print|حساب|account|ارز|currency|روزنامچه|journal|صندوق|cash|بانک/i.test(s))return 'accounting';
if(/پروفایل|profile|نام نمایشی|avatar|حساب شخصی|account identity/i.test(s))return 'account';
if(/فروشگاه|دوکان|نوع تجارت|کسب‌وکار|business|industry|feature|امکانات|صنف/i.test(s))return 'business';
return 'business';
}
function removeBulkActions(root){
root.querySelectorAll('#zaviEnableAllFeatures,.zavi-enable-all').forEach(x=>x.remove());
root.querySelectorAll('button,a').forEach(x=>{const t=x.textContent.replace(/\s+/g,' ').trim();if(/^(همه بخش‌ها|همه بخش ها|نمایش همه بخش‌ها|روشن‌کردن تمام بخش‌ها و امکانات)$/u.test(t))x.remove()});
}
function shorten(root){
const map={'فونت دلخواه خود را انتخاب کنید؛ این انتخاب برای همین حساب در این دستگاه محفوظ می‌ماند.':'فونت دلخواه را انتخاب کنید.','تنظیم بخش‌ها و امکانات فروشگاه.':'مدیریت امکانات','زبان و بخش‌های دلخواه خود را انتخاب کنید.':'زبان و بخش‌ها را انتخاب کنید.','انتخاب رنگ یا چیدمان را تغییر دهید تا پیش‌نمایش را ببینید.':'پیش‌نمایش ظاهر'};
if(locale()!=='fa')return;
root.querySelectorAll('p,.tiny-note').forEach(el=>{if(el.children.length)return;const r=map[el.textContent.trim()];if(r)el.textContent=r});
}
function enhance(){
const root=document.getElementById('content');if(!root||root.querySelector('.zavi-clean-settings-hub'))return;
const cards=Array.from(root.children).filter(el=>el.matches?.('section.settings-card'));if(cards.length<5)return;
const lang=D[locale()];const hub=document.createElement('section');hub.className='zavi-clean-settings-hub';
hub.innerHTML='<div class="zavi-clean-settings-title"><strong></strong><span></span></div><label class="zavi-clean-search-label" for="zaviCleanSettingsSearch"></label><input type="search" id="zaviCleanSettingsSearch" autocomplete="off"><p class="zavi-clean-search-help"></p><div class="zavi-clean-settings-groups"></div>';
hub.querySelector('strong').textContent=lang.title;hub.querySelector('.zavi-clean-settings-title span').textContent=lang.desc;
hub.querySelector('label').textContent=lang.search;hub.querySelector('input').placeholder=lang.placeholder;hub.querySelector('.zavi-clean-search-help').textContent=lang.help;
cards[0].before(hub);const list=hub.querySelector('.zavi-clean-settings-groups');const groups=new Map();
for(const [id,title,sub] of lang.groups){const d=document.createElement('details');d.className='zavi-clean-settings-group';d.dataset.group=id;const summary=document.createElement('summary');summary.innerHTML='<span></span><small></small><span class="zavi-clean-count"></span>';summary.children[0].textContent=title;summary.children[1].textContent=sub;d.append(summary);const body=document.createElement('div');body.className='zavi-clean-settings-stack';d.append(body);list.append(d);groups.set(id,d)}
cards.forEach(el=>{shorten(el);groups.get(group(el)).lastElementChild.append(el)});removeBulkActions(root);
groups.forEach((d,id)=>{const c=d.querySelectorAll('.settings-card').length;d.querySelector('.zavi-clean-count').textContent=c||'';if(!c)d.hidden=true});
const initial=groups.get('account')||groups.get('business');if(initial&&!initial.hidden)initial.open=true;
hub.querySelector('input').addEventListener('input',ev=>{const q=ev.target.value.trim().toLowerCase();let total=0;
for(const d of list.children){let found=0;d.querySelectorAll('.settings-card').forEach(c=>{const h=c.querySelector('h1,h2,h3,h4')?.textContent||'';const ok=!q||(h+' '+c.textContent.slice(0,500)).toLowerCase().includes(q);c.hidden=!ok;if(ok)found++});d.hidden=found===0;if(q&&found)d.open=true;total+=found}
hub.querySelector('.zavi-clean-search-help').textContent=q?(total?total+' '+lang.found:lang.none):lang.help});
}
function ready(){const root=document.getElementById('content');if(!root)return;let wait=false;
new MutationObserver(()=>{if(wait)return;wait=true;queueMicrotask(()=>{wait=false;try{enhance()}catch(e){console.warn('ZAVI settings:',e)}})}).observe(root,{childList:true});enhance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();