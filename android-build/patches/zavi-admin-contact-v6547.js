/* ZAVI Admin 1.3.6: protected signup contacts, manually opened WhatsApp support links. */
(function(){'use strict';
var ownerRows=[],dialog=null;
var words={fa:['شماره تماس و واتساپ ثبت‌نام‌ها','بستن','جستجوی ایمیل یا شماره','ثبت‌نام‌های دارای رضایت','شماره‌ای یافت نشد.','برای مشاهده شماره‌ها باید بخش امن سرور نصب و ورود مدیر تأیید شده باشد.'],
 en:['Registration contact & WhatsApp','Close','Search email or number','Consented registrations','No numbers found.','Secure server endpoint and verified admin session required.'],
 ps:['د نوم‌لیکنې اړیکې او واټساپ','بندول','د ایمیل یا شمېرې لټون','په رضا ثبت شوي حسابونه','شمېره ونه موندل شوه.','خوندي سرور او د ادارې تایید شوی حساب اړین دي.']};
function lang(){var x=String(document.getElementById('zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return x.startsWith('en')?'en':x.startsWith('ps')?'ps':'fa'}
function w(i){return words[lang()][i]}
function esc(x){return String(x||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function close(){if(dialog)dialog.hidden=true}
function paint(){
 if(!dialog)return;
 var title=dialog.querySelector('h2'),search=dialog.querySelector('input'),end=dialog.querySelector('button[data-close]');
 title.textContent='📱 '+w(0);search.placeholder=w(2);end.textContent='✕ '+w(1);
 var q=search.value.toLowerCase(),rows=ownerRows.filter(function(x){return [x.account_email,x.phone_e164,x.whatsapp_e164].join(' ').toLowerCase().includes(q)});
 dialog.querySelector('.zA47List').innerHTML=rows.length?rows.map(function(x){
  var phone=/^\+[1-9][0-9]{5,14}$/.test(x.phone_e164||'')?x.phone_e164:'';
  var wa=/^\+[1-9][0-9]{5,14}$/.test(x.whatsapp_e164||'')?x.whatsapp_e164:'';
  var links=(phone?'<a href="tel:'+phone+'">☎ '+esc(phone)+'</a> ':'')+(wa?'<a href="https://wa.me/'+wa.slice(1)+'" rel="noopener">💬 WhatsApp</a>':'');
  return '<article><b>'+esc(x.account_email)+'</b><div dir="ltr">'+esc(phone||'—')+' · '+esc(wa||'—')+'</div><div>'+links+'</div></article>'
 }).join(''):'<p>'+esc(w(4))+'</p>';
}
function make(){
 if(dialog)return;
 var st=document.createElement('style');st.textContent='#zA47Modal{position:fixed;inset:0;z-index:2147482000;background:#051931bb;padding:12px;display:grid;place-items:center}#zA47Modal[hidden]{display:none!important}#zA47Modal section{width:min(860px,100%);max-height:93dvh;overflow:auto;background:#fff;color:#143150;padding:18px;border-radius:16px}#zA47Modal header{display:flex;justify-content:space-between;align-items:center;gap:12px}#zA47Modal h2{font-size:18px}#zA47Modal input{width:100%;border:1px solid #a2bdd4;padding:12px;background:white;color:#183450;border-radius:10px;margin:13px 0}#zA47Modal button{padding:10px;border-radius:10px;border:1px solid #a2bdd4;background:#e5f4ff;color:#163655}#zA47Modal article{border:1px solid #c8dceb;padding:12px;border-radius:12px;margin:9px 0}#zA47Modal article a{display:inline-block;padding:8px;border-radius:10px;border:1px solid #9abfda;color:#095a89;margin-top:6px;text-decoration:none}';document.head.append(st);
 dialog=document.createElement('div');dialog.id='zA47Modal';dialog.hidden=true;dialog.innerHTML='<section role="dialog" aria-modal="true"><header><h2></h2><button type="button" data-close></button></header><p>🔒 '+esc(w(3))+'</p><input type="search" autocomplete="off"><div class="zA47List"></div></section>';document.body.append(dialog);
 dialog.querySelector('button[data-close]').addEventListener('click',close);
 dialog.querySelector('input').addEventListener('input',paint);
 dialog.addEventListener('click',function(e){if(e.target===dialog)close()});
}
async function show(){
 make();dialog.hidden=false;ownerRows=[];paint();
 var api=window.ZaviAdminAPI;
 if(!api||api.getMode()!=='live'){dialog.querySelector('.zA47List').textContent=w(5);return}
 try{
  var records=await api.request('/rest/v1/rpc/zavi_admin_registration_contacts',{method:'POST',body:{}});
  if(!Array.isArray(records))throw Error('not a list');
  ownerRows=records.filter(function(r){return r.contact_opt_in===true});paint();
 }catch(e){dialog.querySelector('.zA47List').textContent=w(5)}
}
function install(){
 var nav=document.querySelector('#appScreen .sidebar .nav');if(!nav||document.getElementById('zA47Nav'))return;
 var b=document.createElement('button');b.type='button';b.className='nav-item';b.id='zA47Nav';b.innerHTML='<span>📱</span> <b>'+esc(w(0))+'</b>';var after=nav.querySelector('[data-page="customers"]');if(after)after.after(b);else nav.append(b);b.addEventListener('click',function(){document.body.classList.remove('mobile-drawer');show()});
}
function init(){install();new MutationObserver(install).observe(document.body,{childList:true,subtree:false})}
document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();