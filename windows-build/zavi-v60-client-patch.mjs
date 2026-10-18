// ZAVI ONE customer APK/Windows V60: safe owner-managed view-only colleagues.
// This module patches ONLY the staged offline web bundle, not the live Netlify site.
import fs from "node:fs";
import path from "node:path";

const css = String.raw`
#z61TeamPanel{margin:0 0 17px;max-width:100%;min-width:0;overflow:hidden}
#z61TeamPanel .z61-box{padding:15px!important;border:1px solid #138db177!important;border-radius:17px!important;background:linear-gradient(120deg,#0c315e,#064e72)!important;color:#f4fbff!important}
#z61TeamPanel .z61-title{font-size:17px;font-weight:800;margin:0;color:white}
#z61TeamPanel .z61-note{font-size:11px;line-height:1.9;color:#c8e5f0}
#z61TeamPanel .z61-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
#z61TeamPanel .z61-count{font-weight:850;font-size:23px;display:grid;place-items:center;min-width:48px;min-height:48px;border-radius:13px;background:linear-gradient(140deg,#0772b9,#04b1c6);color:#fff}
#z61TeamPanel .z61-buttons{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}
#z61TeamPanel .z61-buttons button{border:1px solid #50a9cf;background:#0b629a;color:#fff;padding:8px 13px;border-radius:10px;font:inherit;cursor:pointer}
#z61TeamPanel .z61-person{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid #277ba066;border-radius:12px;margin-top:8px;padding:10px;min-width:0}
#z61TeamPanel .z61-info{flex:1;min-width:0;overflow-wrap:anywhere;font-size:11px}
#z61TeamPanel .z61-info b{display:block;font-size:13px}
#z61TeamPanel .z61-uid{display:block;direction:ltr;text-align:right;font:10px ui-monospace,monospace}
#z61TeamPanel .z61-remove{flex:none;border:1px solid #e47486;border-radius:9px;color:#fff;background:#96384e;padding:8px 11px;font:inherit}
#z61TeamPanel .z61-error{color:#ffd6bc}
.z47-chart-scroll,.z45-chart-scroll{display:block;overflow-x:auto!important;overflow-y:hidden!important;max-width:100%!important;width:100%!important;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x pan-y}
.z47-chart-scroll .bar-chart,.z45-chart-scroll .bar-chart{min-width:790px!important}
@media(max-width:760px){.content,.main,.layout-2,.panel-body,.card{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}
.layout-2{grid-template-columns:1fr!important}
#z61TeamPanel .z61-box{padding:13px!important}
#z61TeamPanel .z61-remove{padding:7px 9px;font-size:12px}
}
`;

const script = String.raw`/* ZAVI ONE V60 desktop & APK colleagues panel. Server RLS controls access. */
(()=>{'use strict';
let scope='',rows=[],loaded=false,error='',loading=false,lastCheck=0;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&#39;':'&#39;'}[c]||'&#39;'));
const info=()=>window.zaviCloudRestoreInfo?.()||{};
const sess=()=>window.zaviCloudGetAuthSession?.();
const own=()=>{const x=info(),s=sess();return x.role==='owner'&&x.workspace&&s?.user?.id?{ws:x.workspace,uid:s.user.id,token:s.access_token}:null};
const lang=()=>document.documentElement.lang==='en'?'en':document.documentElement.lang==='ps-AF'?'ps':'fa';
const label=(fa,ps,en)=>lang()==='en'?en:lang()==='ps'?ps:fa;
const source=()=>window.ZAVI_CLOUD_DEFAULTS||null;
function reset(){scope='';rows=[];loaded=false;error='';lastCheck=0;}
function draw(){
 const o=own(),id=o?o.uid+'|'+o.ws:'';
 if(!o){document.getElementById('z61TeamPanel')?.remove();reset();return;}
 if(scope!==id){scope=id;rows=[];loaded=false;error='';lastCheck=0;}
 const dashboard=$('.welcome');
 if(!dashboard){document.getElementById('z61TeamPanel')?.remove();return;}
 let root=document.getElementById('z61TeamPanel');
 if(!root){root=document.createElement('div');root.id='z61TeamPanel';dashboard.before(root);}
 const count=loaded?rows.length:'—';
 const text=error?'<p class="z61-error">'+esc(error)+'</p>':
 (!loaded?'<p class="z61-note">'+label('در حال دریافت فهرست ...','نوملړ راوړل کېږي ...','Loading authorized colleagues ...')+'</p>':
 !rows.length?'<p class="z61-note">'+label('هنوز همکار دارای دسترسی نیست.','هیڅ همکار نشته.','No authorized colleagues yet.')+'</p>':
 rows.map((m,i)=>'<div class="z61-person"><div class="z61-info"><b>'+esc(label('همکار ','همکار ','Colleague ')+(i+1))+'</b><span class="z61-uid">'+esc(m.member_uid)+'</span><small>'+esc(m.added_at?new Date(m.added_at).toLocaleDateString():'')+'</small></div><button class="z61-remove" type="button" data-z61-delete="'+esc(m.member_uid)+'">'+label('حذف دسترسی','لاسرسی لرې کول','Remove access')+'</button></div>').join(''));
 const html='<section class="card z61-box"><div class="z61-head"><div><h3 class="z61-title">'+label('👥 همکاران فقط‌مشاهده','👥 لیدونکي همکاران','👥 View-only colleagues')+'</h3><div class="z61-note">'+label('تعداد افراد مجاز، نه تعداد آنلاین در همین لحظه.','دا د مجازو حسابونو شمېر دی، نه آنلاین کسان.','Authorized viewers, not currently-online presence.')+'</div></div><strong class="z61-count">'+esc(count)+'</strong></div><div class="z61-buttons"><button type="button" data-z61-refresh>'+label('تازه‌سازی','تازه کول','Refresh')+'</button><button type="button" data-go="settings">'+label('مدیریت همکاران','د همکارانو اداره','Manage colleagues')+'</button></div>'+text+'</section>';
 if(root.innerHTML!==html)root.innerHTML=html;
}
async function request(method,url,body){
 const c=source(),s=sess();if(!c?.url||!c?.key||!s?.access_token)throw Error('برای فهرست همکاران، اتصال و ورود معتبر لازم است.');
 const res=await fetch(c.url.replace(/\/$/,'')+url,{
  method,headers:{apikey:c.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',Prefer:'return=representation'},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)
 });
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(data?.message||data?.error||'خطای ارتباط با سرور: '+res.status);
 return data;
}
async function load(force=false){
 const o=own();if(!o||loading||!navigator.onLine)return;
 const id=o.uid+'|'+o.ws;
 if(!force&&loaded&&Date.now()-lastCheck<14000)return;
 loading=true;
 try{
  const data=await request('GET','/rest/v1/zavi_workspace_members?select=member_uid,role,added_at&workspace_id=eq.'+encodeURIComponent(o.ws)+'&order=added_at.asc');
  if(own()?.uid+'|'+own()?.ws!==id)return;
  rows=[...new Map((Array.isArray(data)?data:[]).filter(m=>m.role==='viewer'&&m.member_uid).map(m=>[m.member_uid,m])).values()];
  loaded=true;error='';lastCheck=Date.now();
 }catch(e){if(own()?.uid+'|'+own()?.ws===id){error=e.message||'خطای شبکه';}}
 finally{loading=false;draw();}
}
async function remove(uid){
 const o=own(),member=rows.find(m=>m.member_uid===uid);if(!o||!member)return;
 if(!confirm(label('دسترسی همکار انتخاب‌شده لغو شود؟ این کار حساب یا معاملات را حذف نمی‌کند.','د همکار لاسرسی ختم کړئ؟ معلومات نه حذف کېږي.','Remove this colleague\'s access? No accounting records will be deleted.')))return;
 try{
  const data=await request('DELETE','/rest/v1/zavi_workspace_members?workspace_id=eq.'+encodeURIComponent(o.ws)+'&member_uid=eq.'+encodeURIComponent(uid)+'&select=member_uid');
  if(!Array.isArray(data)||!data.some(m=>m.member_uid===uid))throw Error('سرور حذف را تأیید نکرد.');
  loaded=false;await load(true);
 }catch(e){alert('خطا: '+(e.message||e));}
}
document.addEventListener('click',e=>{
 const del=e.target.closest('[data-z61-delete]');
 if(del){e.preventDefault();e.stopPropagation();remove(del.dataset.z61Delete);return;}
 if(e.target.closest('[data-z61-refresh]')){e.preventDefault();load(true);}
},true);
// Ensure the panel returns after route re-render; do not modify accounting state.
setInterval(()=>{try{const o=own();if(!o){draw();return;}if(document.visibilityState==='visible'){draw();load(false)}}catch(e){console.warn('team count',e.message)}},2100);
setInterval(()=>{if(document.visibilityState==='visible')load(true)},20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){draw();load(true)}});
window.addEventListener('online',()=>load(true));
window.addEventListener('load',()=>{draw();load(true)});
})();
`;

export function applyZaviV60(web) {
 const index=path.join(web,'index.html');
 if(!fs.existsSync(index))throw Error('ZAVI V60: missing index.html');
 let html=fs.readFileSync(index,'utf8');
 if(!html.includes('cloud.js'))throw Error('ZAVI V60: unexpected frontend; cloud.js missing');
 fs.writeFileSync(path.join(web,'zavi-v60-team.css'),css,'utf8');
 fs.writeFileSync(path.join(web,'zavi-v60-team.js'),script,'utf8');
 html=html.replace(/<\/body>/i,'<link rel="stylesheet" href="./zavi-v60-team.css?v=60"><script src="./zavi-v60-team.js?v=60" defer></script></body>');
 fs.writeFileSync(index,html,'utf8');
 const sw=path.join(web,'sw.js');
 if(fs.existsSync(sw)){
  let x=fs.readFileSync(sw,'utf8');
  x=x.replace(/const CACHE_NAME\s*=\s*['"][^'"]+['"]/, "const CACHE_NAME='zavi-one-v60-apk-windows-20261018'");
  x=x.replace(/const CORE=\[/, 'const CORE=["zavi-v60-team.css","zavi-v60-team.js",');
  fs.writeFileSync(sw,x,'utf8');
 }
 console.log('ZAVI V60: owner colleague count/delete bundled into '+web);
}
