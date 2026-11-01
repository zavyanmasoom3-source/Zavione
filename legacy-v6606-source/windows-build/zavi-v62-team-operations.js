/* ZAVI ONE V62: team tools only under "Daily Operations", never on dashboard */
(()=>{'use strict';
const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>{const i=window.zaviCloudRestoreInfo?.()||{},s=window.zaviCloudGetAuthSession?.();return i.role==='owner'&&i.workspace&&s?.user?.id&&s.access_token?{ws:i.workspace,uid:s.user.id,token:s.access_token}:null};
const t=(fa,ps,en)=>document.documentElement.lang==='en'?en:document.documentElement.lang==='ps-AF'?ps:fa;
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
let opened=false,loaded=false,rows=[],busy=false,last=0,err='',scope='';
const oldCard='#z60TeamDashboard,#z61TeamPanel,#z20CloudPanel .z60-team-settings';
function nav(){
 const host=$('#sidebarLinks');if(!host)return;
 const o=owner();let b=$('#z62TeamMenu');
 if(!o){b?.remove();if(opened)close();return}
 if(!b){b=document.createElement('button');b.id='z62TeamMenu';b.type='button';b.className='nav-btn';b.setAttribute('aria-haspopup','dialog');b.innerHTML='<span aria-hidden="true">👥</span><span>'+t('مدیریت همکاران','د همکارانو اداره','Manage colleagues')+'</span>';host.append(b)}
}
function close(){opened=false;$('#z62TeamDialog')?.remove()}
function dlg(){
 let d=$('#z62TeamDialog');if(d)return d;
 d=document.createElement('div');d.id='z62TeamDialog';d.className='z62-backdrop';
 d.innerHTML='<section class="z62-dialog" role="dialog" aria-modal="true" aria-label="'+t('مدیریت همکاران','د همکارانو اداره','Manage colleagues')+'">'
 +'<div class="z62-head"><h2>👥 '+t('مدیریت همکاران','د همکارانو اداره','Manage colleagues')+'</h2><button type="button" data-z62-close>✕</button></div>'
 +'<div class="z62-body"><div class="z62-total"><span>'+t('تعداد همکاران دارای دسترسی','د همکارانو شمېر','Authorized colleagues')+'</span><strong id="z62Count">—</strong></div>'
 +'<p class="z62-note">'+t('این عدد تعداد همکاران ثبت‌شده است، نه تعداد افراد آنلاین.','دا د ثبت شوو همکارانو شمېر دی، نه آنلاین کسان.','Authorized accounts, not live online presence.')+'</p>'
 +'<form id="z62Add"><label for="z62Uid">'+t('شناسه حساب همکار (UID)','د همکار UID','Colleague account UID')+'</label>'
 +'<div class="z62-form"><input type="text" id="z62Uid" dir="ltr" maxlength="36" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required>'
 +'<button type="submit">'+t('اضافه کردن همکار','همکار زیاتول','Add colleague')+'</button></div></form>'
 +'<p class="z62-note">'+t('هر همکار باید حساب خودش را داشته باشد. UID او را از تنظیمات حسابش کاپی کنید.','همکار باید خپل حساب او UID ولري.','Each colleague needs a separate login. Copy their UID from Settings.')+'</p>'
 +'<div class="z62-headrow"><b>'+t('همکاران فعلی','اوسني همکاران','Current colleagues')+'</b><button type="button" data-z62-refresh>'+t('تازه‌سازی','تازه کول','Refresh')+'</button></div>'
 +'<div role="status" aria-live="polite" id="z62Status"></div><div id="z62List"></div></div></section>';
 document.body.append(d);return d;
}
function render(){
 if(!opened||!owner())return;
 const d=dlg();d.querySelector('#z62Count').textContent=loaded?String(rows.length):'—';
 d.querySelector('#z62Status').textContent=err||(!loaded?t('در حال دریافت...','رااخیستل کېږي...','Loading...'):'');
 d.querySelector('#z62Status').className=err?'z62-error':'';
 d.querySelector('#z62List').innerHTML=rows.map((r,i)=>'<div class="z62-member"><div><b>'+t('همکار ','همکار ','Colleague ')+(i+1)+'</b><small dir="ltr">'+escape(r.member_uid)+'</small></div><button type="button" data-z62-remove="'+escape(r.member_uid)+'">'+t('حذف دسترسی','لاسرسی لرې کول','Remove access')+'</button></div>').join('')||(loaded?'<p class="z62-note">'+t('همکاری ثبت نشده است.','هیڅ همکار نشته.','No colleagues.')+'</p>':'');
}
async function api(method,path,body){
 const o=owner(),c=window.ZAVI_CLOUD_DEFAULTS;
 if(!o||!c?.url||!c?.key)throw Error(t('ورود مالک و اتصال اینترنت لازم است.','د مالک ننوتل اړین دي.','Owner login required.'));
 const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),15000);
 try{const r=await fetch(c.url.replace(/\/$/,'')+path,{method,headers:{apikey:c.key,Authorization:'Bearer '+o.token,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:ctl.signal});const j=await r.json().catch(()=>null);if(!r.ok)throw Error(j?.message||j?.error||('HTTP '+r.status));return j}finally{clearTimeout(to)}
}
async function load(force=false){
 const o=owner();if(!opened||!o||busy||(!force&&last&&Date.now()-last<15000))return;
 const key=o.uid+'|'+o.ws;busy=true;
 try{const data=await api('GET','/rest/v1/zavi_workspace_members?select=member_uid,role,added_at&workspace_id=eq.'+encodeURIComponent(o.ws)+'&order=added_at.asc');
 const now=owner();if(!opened||!now||key!==now.uid+'|'+now.ws)return;
 rows=[...new Map((Array.isArray(data)?data:[]).filter(r=>r.role==='viewer'&&uuid(r.member_uid)).map(r=>[r.member_uid,r])).values()];
 loaded=true;err='';last=Date.now()}catch(e){err=e.message||String(e)}finally{busy=false;render()}
}
async function add(uid){
 const o=owner();if(!o||!uuid(uid)||uid.toLowerCase()===o.uid.toLowerCase())throw Error(t('UID معتبر همکار را وارد کنید.','سم UID ولیکئ.','Enter a valid colleague UID.'));
 await api('POST','/rest/v1/zavi_workspace_members',{workspace_id:o.ws,member_uid:uid,role:'viewer'});
 const input=$('#z62Uid');if(input)input.value='';last=0;await load(true)
}
async function remove(uid){
 const o=owner();if(!o||!rows.some(r=>r.member_uid===uid))return;
 if(!confirm(t('دسترسی این همکار حذف شود؟ اطلاعات حسابداری حذف نمی‌شود.','د همکار لاسرسی ختم شي؟','Remove this colleague? Accounting data is safe.')))return;
 const j=await api('DELETE','/rest/v1/zavi_workspace_members?workspace_id=eq.'+encodeURIComponent(o.ws)+'&member_uid=eq.'+encodeURIComponent(uid)+'&select=member_uid');
 if(!Array.isArray(j)||!j.some(x=>x.member_uid===uid))throw Error(t('حذف تأیید نشد.','حذف تایید نه شو.','Delete not confirmed.'));
 last=0;await load(true)
}
function openDialog(){const o=owner();if(!o)return;opened=true;scope=o.uid+'|'+o.ws;rows=[];loaded=false;err='';render();load(true)}
document.addEventListener('click',e=>{
 const x=e.target;
 if(x.closest('#z62TeamMenu')){e.preventDefault();openDialog();return}
 if(x.closest('[data-z62-close]')||x.id==='z62TeamDialog'){e.preventDefault();close();return}
 if(x.closest('[data-z62-refresh]')){e.preventDefault();last=0;load(true);return}
 const b=x.closest('[data-z62-remove]');if(b){e.preventDefault();b.disabled=true;remove(b.dataset.z62Remove).catch(ex=>{err=ex.message;render()}).finally(()=>b.disabled=false)}
});
document.addEventListener('submit',e=>{if(e.target.id!=='z62Add')return;e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;add($('#z62Uid')?.value.trim()).catch(ex=>{err=ex.message;render()}).finally(()=>b.disabled=false)});
document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape')close()});
const obs=new MutationObserver(()=>{if(owner()&&!$('#z62TeamMenu'))nav()});
window.addEventListener('load',()=>{if($('#sidebarLinks'))obs.observe($('#sidebarLinks'),{childList:true});nav()});
setInterval(()=>{nav();if(opened){const o=owner();if(!o||scope!==o.uid+'|'+o.ws)close();else if(document.visibilityState==='visible')load()}},4500);
document.addEventListener('visibilitychange',()=>{if(opened&&document.visibilityState==='visible')load(true)});
})();
