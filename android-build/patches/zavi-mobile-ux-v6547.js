/* ZAVI V65.47: full-screen More, accessible search, crisp category icons, preserved features */
(()=>{'use strict';
const mode=document.querySelector('#side.sidebar')?'one':'admin';
const fa=['بستن منو','جستجوی بخش‌ها...','همه بخش‌ها','راهنمای سریع','کارهای مهم در بالای صفحه قرار دارند. تمام امکانات قبلی حفظ شده‌اند.'];
const ps=['مېنو بندول','برخې ولټوئ...','ټولې برخې','چټکه لارښود','مهم کارونه پورته دي. ټولې پخوانۍ برخې ساتل شوي دي.'];
const en=['Close menu','Search sections...','All sections','Quick access','Important tasks come first. All previous features remain available.'];
const emoji={overview:'🏠',dashboard:'🏠',home:'🏠',sales:'🛒',sale:'🛒',purchases:'📦',purchase:'📦',products:'📦',inventory:'📦',customers:'🏪',contacts:'👥',suppliers:'🚚',payments:'💳',finance:'💰',activity:'📋',devices:'📱',support:'🛟',health:'🩺',settings:'⚙️',brand:'🏷️',security:'🛡️',reports:'📊',debts:'💵',phonebook:'☎️',accounts:'💳',expenses:'📉',repairs:'🔧',journal:'📒',team:'👨‍💼'};
let sidebar=null,head=null;
const lang=()=>{const p=document.querySelector('#zaviTopLanguage,#zaviAdminLanguage,#zaviSettingsLanguage');const v=String(p?.value||document.documentElement.lang||'fa').toLowerCase();return v.startsWith('en')?en:v.startsWith('ps')?ps:fa};
const css=String.raw\`
/* Sidebar is a mobile FULL SCREEN route, not a half drawer. */
@media(max-width:900px){
 html body #side.sidebar.mobile-drawer,
 html body.mobile-drawer .sidebar,
 html body .sidebar.mobile-drawer{
 position:fixed!important;inset:0!important;inset-inline:0!important;left:0!important;right:0!important;
 top:0!important;bottom:0!important;width:100vw!important;max-width:100vw!important;min-width:100vw!important;
 height:100vh!important;height:100dvh!important;max-height:100dvh!important;
 margin:0!important;display:flex!important;flex-direction:column!important;
 transform:none!important;translate:none!important;visibility:visible!important;opacity:1!important;
 z-index:2147482000!important;border-radius:0!important;
 box-shadow:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;
 padding:env(safe-area-inset-top,0px) max(14px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(14px,env(safe-area-inset-left,0px))!important;
 }
 html body #side.sidebar.mobile-drawer>.zavi-v6-menu-scroll,
 html body.mobile-drawer .sidebar>.zavi-v6-menu-scroll{
 flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain!important;
 -webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;padding-bottom:22px!important;
 }
 html body #side.sidebar.mobile-drawer .sidebar-footer,
 html body.mobile-drawer .sidebar .sidebar-bottom{flex:0 0 auto!important}
 html body #side.sidebar.mobile-drawer :is(.nav-btn,[data-go],#sidebarLinks button,#sidebarLinks2 button),
 html body.mobile-drawer .sidebar .nav-item{
 display:flex!important;align-items:center!important;gap:12px!important;min-height:48px!important;
 font-size:14px!important;line-height:1.7!important;white-space:normal!important;word-break:normal!important;
 text-align:start!important;padding:10px 12px!important;width:100%!important;max-width:100%!important;
 }
 html body #side.sidebar.mobile-drawer :is(.nav-btn,[data-go]) :is(svg,i,.zavi-v6547-icon),
 html body.mobile-drawer .sidebar .nav-item :is(span:first-child,.zavi-v6547-icon){flex:0 0 30px!important;min-width:26px!important}
 html body :is(.zavi-v6547-head){position:sticky;top:0;z-index:30}
}
.zavi-v6547-head{display:grid;gap:9px;border-radius:14px;background:linear-gradient(120deg,#184678,#0a82b4);color:#fff;padding:13px;margin:12px 0 14px;box-shadow:0 5px 20px #0002;direction:inherit}
.zavi-v6547-row{display:flex;align-items:center;gap:10px;justify-content:space-between}
.zavi-v6547-label{font-weight:850;font-size:17px;color:#fff}
.zavi-v6547-close{border:1px solid #ffffff99;border-radius:10px;background:#fff!important;color:#0a3768!important;padding:7px 13px;min-height:40px;font-size:13px;font-weight:750;cursor:pointer}
.zavi-v6547-search{display:block!important;width:100%!important;height:43px!important;min-height:43px!important;border:1px solid #b7d4e8!important;
 border-radius:11px!important;background:#fff!important;color:#122e50!important;font:600 14px/1.6 Tahoma,Arial,sans-serif!important;padding:7px 12px!important}
.zavi-v6547-empty{padding:13px;text-align:center;font-size:13px}
.zavi-v6547-hidden{display:none!important}
.zavi-v6547-icon{display:inline-flex;justify-content:center;align-items:center;min-width:30px;width:30px;font-size:19px;line-height:1.4;flex-shrink:0}
.zavi-v6547-settings-icon{display:inline-flex;align-items:center;justify-content:center;background:rgba(34,142,210,.13);border-radius:10px;padding:8px;margin-inline-end:9px;min-width:38px;height:38px}
.zavi-settings-6546-group>h3{display:flex!important;align-items:center!important;gap:6px!important;font-size:16px!important}
.zavi-settings-6546-group>.settings-card{border-radius:15px!important}
html body #view .card,html body #content .card{scroll-margin-top:80px}
html body .zavi-v6547-dashboard-actions :is(button,a){min-height:47px!important}
@media print{.zavi-v6547-head{display:none!important}}
\`;
function stylesheet(){if(document.getElementById('zavi-v6547-ui-css'))return;const s=document.createElement('style');s.id='zavi-v6547-ui-css';s.textContent=css;document.head.append(s)}
function fixIcons(){
 if(mode==='admin'){
  sidebar?.querySelectorAll('button[data-page]').forEach(b=>{
   if(b.dataset.zaviIcon==='true')return;
   let old=b.querySelector('span');
   if(old){old.textContent=emoji[b.dataset.page]||'🧩';old.classList.add('zavi-v6547-icon')}else b.insertAdjacentHTML('afterbegin','<span class="zavi-v6547-icon">🧩</span>');
   b.dataset.zaviIcon='true';
  });
 }else{
  sidebar?.querySelectorAll('.nav-btn').forEach(b=>{
   if(b.dataset.zaviIcon==='true')return;
   const k=(b.getAttribute('data-go')||b.id||'').toLowerCase();
   const entry=Object.entries(emoji).find(([id])=>k.includes(id));
   if(entry&&!b.querySelector('svg,.z63-icon')){const e=document.createElement('span');e.className='zavi-v6547-icon';e.textContent=entry[1];b.prepend(e)}
   b.dataset.zaviIcon='true';
  });
 }
 const sections=document.querySelectorAll('.zavi-settings-6546-group>h3');
 const settingsIcons=['🛡️','🏪','🎨','🖨️','☁️','🧰'];
 sections.forEach((h,i)=>{if(h.querySelector('.zavi-v6547-settings-icon'))return;const k=h.parentElement?.dataset.section||'';const icon={secure:'🛡️',store:'🏪',display:'🎨',printing:'🖨️',data:'☁️',advanced:'🧰'}[k]||settingsIcons[i%6];
  const span=document.createElement('span');span.className='zavi-v6547-settings-icon';span.setAttribute('aria-hidden','true');span.textContent=icon;h.prepend(span);
 });
}
function close(){
 if(mode==='admin'){document.body.classList.remove('mobile-drawer')}
 else document.getElementById('drawerShade')?.click();
}
function renderStrings(){
 if(!head)return;
 const t=lang();head.querySelector('.zavi-v6547-label').textContent=t[2];head.querySelector('.zavi-v6547-close').textContent='✕ '+t[0];
 head.querySelector('.zavi-v6547-search').placeholder=t[1];
}
function search(q){
 q=String(q||'').trim().toLocaleLowerCase();
 const targets=mode==='admin'?'button[data-page]':'.nav-btn';
 const list=sidebar?.querySelectorAll(targets)||[];
 let count=0;list.forEach(b=>{const visible=!q||String(b.textContent||'').toLocaleLowerCase().includes(q);b.classList.toggle('zavi-v6547-hidden',!visible);if(visible)count++});
 const empty=head?.querySelector('.zavi-v6547-empty');if(empty){empty.hidden=count>0;empty.textContent=lang()[3]+' — 0'}
}
function mount(){
 sidebar=mode==='one'?document.getElementById('side'):document.querySelector('#appScreen .sidebar');
 if(!sidebar)return;
 stylesheet();
 if(!sidebar.querySelector('.zavi-v6547-head')){
  head=document.createElement('section');head.className='zavi-v6547-head';
  head.setAttribute('aria-label','Navigation');
  head.innerHTML='<div class="zavi-v6547-row"><b class="zavi-v6547-label"></b><button type="button" class="zavi-v6547-close"></button></div><input type="search" class="zavi-v6547-search" autocomplete="off" spellcheck="false"><div class="zavi-v6547-empty" hidden></div>';
  const scroll=sidebar.querySelector('.zavi-v6-menu-scroll');
  if(scroll)scroll.before(head);else sidebar.prepend(head);
  head.querySelector('.zavi-v6547-close').addEventListener('click',close);
  head.querySelector('input').addEventListener('input',e=>search(e.target.value));
 }else head=sidebar.querySelector('.zavi-v6547-head');
 renderStrings();fixIcons();
}
document.addEventListener('click',e=>{
 if(e.target.matches('#mobileMenu,[data-go="more"]')){setTimeout(()=>{mount();head?.querySelector('input')?.focus({preventScroll:true})},70)}
 if(e.target.closest('#zavi-v6547-admin-contacts'))return;
 if(e.target.matches('.zavi-v6547-close'))close();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.body.classList.contains('mobile-drawer')||document.getElementById('side')?.classList.contains('mobile-drawer'))close()}});
document.addEventListener('change',e=>{if(e.target.matches('#zaviTopLanguage,#zaviAdminLanguage,#zaviSettingsLanguage'))renderStrings()});
function init(){mount();let updating=false;const root=mode==='one'?document.getElementById('content'):document.getElementById('view');if(root)new MutationObserver(()=>{if(updating)return;updating=true;queueMicrotask(()=>{updating=false;fixIcons()})}).observe(root,{childList:true,subtree:false});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();