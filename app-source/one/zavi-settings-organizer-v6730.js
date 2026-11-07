/* ZAVI ONE V67.30 — settings information architecture.
 * Reorganizes existing controls only; it never clones or deletes feature controls.
 */
(()=>{'use strict';
const GROUPS=[
 ['account','👤',{fa:'حساب و پروفایل',ps:'حساب او پروفایل',en:'Account & profile'}],
 ['business','🏪',{fa:'فروشگاه و کسب‌وکار',ps:'دوکان او کاروبار',en:'Store & business'}],
 ['appearance','🎨',{fa:'ظاهر و زبان',ps:'بڼه او ژبه',en:'Appearance & language'}],
 ['security','🔐',{fa:'امنیت و دسترسی',ps:'امنیت او لاسرسی',en:'Security & access'}],
 ['cloud','☁️',{fa:'ابر و دستگاه‌ها',ps:'کلاوډ او وسایل',en:'Cloud & devices'}],
 ['accounting','🧾',{fa:'حسابداری و فاکتورها',ps:'حسابداري او بلونه',en:'Accounting & invoices'}],
 ['subscription','💳',{fa:'اشتراک',ps:'ګډون',en:'Subscription'}],
 ['advanced','⚙️',{fa:'پیشرفته',ps:'پرمختللي',en:'Advanced'}]
];
function lang(){const l=String(document.documentElement.lang||'fa-AF').toLowerCase();return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa'}
function tr(v){return typeof v==='string'?v:(v?.[lang()]||v?.fa||'')}

function isSettings(){
 try{if(typeof page!=='undefined'&&page==='settings')return true}catch(_){}
 const h=document.querySelector('#content h1,#content .page-title,#content h2');
 return !!h&&/تنظیمات|settings|امستنې/i.test(h.textContent||'');
}
function classify(node){
 const text=(node.textContent||'').replace(/\s+/g,' ').toLowerCase();
 const cls=String(node.className||'').toLowerCase();
 const id=String(node.id||'').toLowerCase();
 const meta=cls+' '+id+' '+text.slice(0,900);
 if(/subscription|اشتراک|تمدید|فعال.?سازی|license|trial|آزمایشی/.test(meta))return 'subscription';
 if(/cloud|ابر|دستگاه|device|انتقال دستگاه|همگام|sync/.test(meta))return 'cloud';
 if(/امنیت|security|اثر انگشت|finger|pin|رمز|قفل|همکار|کاربر|staff|team|دسترسی|permission/.test(meta))return 'security';
 if(/فاکتور|invoice|چاپ|پرنتر|thermal|رسید|حسابداری|accounting|مالیات|روزنامچه/.test(meta))return 'accounting';
 if(/theme|ظاهر|فونت|font|زبان|language|شیشه|glass|اندازه نوشته|آیکن|icon size|شخصی.?سازی/.test(meta))return 'appearance';
 if(/پروفایل|profile|حساب کاربری|نام و عکس|avatar/.test(meta))return 'account';
 if(/فروشگاه|shop|store|کسب.?وکار|business|صنعت|industry|نام فروشگاه|واحد پول|currency/.test(meta))return 'business';
 return 'advanced';
}
function collapseLongCopy(card){
 if(!card?.querySelectorAll)return;
 for(const p of [...card.querySelectorAll(':scope > p')]){
  if(p.closest('.z673-guide')||String(p.textContent||'').trim().length<150)continue;
  const details=document.createElement('details');details.className='z673-guide';
  const summary=document.createElement('summary');summary.textContent=tr({fa:'راهنما',ps:'لارښود',en:'Guide'});
  p.parentNode.insertBefore(details,p);details.append(summary,p);
 }
}
function ensureGroups(content){
 let root=content.querySelector(':scope > .z673-settings-groups');
 if(root)return root;
 root=document.createElement('div');root.className='z673-settings-groups';
 for(const [id,icon,title] of GROUPS){
  const d=document.createElement('details');d.className='z673-settings-group';d.dataset.z673Group=id;if(id==='account')d.open=true;
  const s=document.createElement('summary');s.innerHTML='<span class="z673-group-icon">'+icon+'</span><span data-z673-title>'+tr(title)+'</span><b data-z673-count>0</b>';
  const body=document.createElement('div');body.className='z673-settings-body';
  d.append(s,body);root.append(d);
 }
 content.append(root);return root;
}
function candidates(content,root){
 return [...content.children].filter(node=>{
  if(node===root||node.matches?.('.z673-settings-groups'))return false;
  if(node.matches?.('h1,h2,.page-header,.page-head,.header,.zavi-page-header'))return false;
  if(node.tagName==='SCRIPT'||node.tagName==='STYLE')return false;
  return node.matches?.('.card,.settings-card,.notice,section,form,[data-settings-card],.zavi-cloud-panel,.zavi-device-panel')||false;
 });
}
function refreshLabels(root){
 for(const [id,,title] of GROUPS){const el=root.querySelector('[data-z673-group="'+id+'"] [data-z673-title]');if(el)el.textContent=tr(title)}
 root.querySelectorAll('.z673-guide>summary').forEach(el=>el.textContent=tr({fa:'راهنما',ps:'لارښود',en:'Guide'}));
}
function updateCounts(root){
 refreshLabels(root);
 for(const [id] of GROUPS){
  const d=root.querySelector('[data-z673-group="'+id+'"]'),body=d?.querySelector('.z673-settings-body'),count=d?.querySelector('[data-z673-count]');
  if(count)count.textContent=String(body?.children.length||0);
  if(d)d.hidden=!(body?.children.length);
 }
}
function organize(){
 if(!isSettings())return;
 const content=document.getElementById('content');if(!content)return;
 const root=ensureGroups(content);
 for(const node of candidates(content,root)){
  collapseLongCopy(node);
  const id=classify(node),body=root.querySelector('[data-z673-group="'+id+'"] .z673-settings-body');
  if(body)body.append(node);
 }
 updateCounts(root);
}
let timer=0;
const schedule=()=>{clearTimeout(timer);timer=setTimeout(organize,30)};
const obs=new MutationObserver(schedule);
function start(){
 const content=document.getElementById('content');if(content)obs.observe(content,{childList:true,subtree:false});
 organize();
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-go="settings"]'))setTimeout(organize,40)},true);
 document.addEventListener('zavi:language-changed',()=>setTimeout(organize,30));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ZaviSettingsOrganizerV6730=Object.freeze({organize});
})();