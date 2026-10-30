/* ZAVI 65.47: Account signup phone/WhatsApp; opt-in admin access, all country calling codes offline. */
(function(){'use strict';
var DIALS=[['AF','93'],['GB','44'],['US','1']],fields={country:'AF',waCountry:'AF',phone:'',whatsapp:'',consent:false},requested=false,saveInProgress=false,lastAttempt=0;
var t={fa:{title:'📱 شماره تماس و واتساپ ثبت‌نام',country:'کشور / کود تماس',phone:'شماره تماس',whatsapp:'شماره واتساپ (اختیاری)',same:'واتساپ همان شماره تماس است',consent:'موافق هستم شماره تماس ثبت‌نام من فقط برای ارتباط و پشتیبانی حساب در اختیار مدیریت مرکزی ZAVI ONE قرار گیرد.',info:'شماره به مشتریان دیگر یا همکاران فروشگاه نمایش داده نمی‌شود. پیام واتساپ فقط توسط مدیر و به‌شکل دستی ارسال می‌شود.',missing:'برای ثبت‌نام دست‌کم یک شماره تماس یا واتساپ وارد کنید.',permission:'برای ارسال شماره به مدیریت، موافقت خود را مشخص کنید.',invalid:'شماره را با کود کشور درست وارد کنید (مثلاً +93700123456).',save:'در حال ذخیره امن شماره پس از تأیید حساب...'},en:{title:'📱 Signup contact and WhatsApp',country:'Country / dial code',phone:'Phone number',whatsapp:'WhatsApp number (optional)',same:'WhatsApp uses the same number',consent:'I agree to share my signup contact number with ZAVI ONE central administration for account support and communication.',info:'Store staff and other customers cannot view this number. Messages are sent manually by the administrator.',missing:'Enter a phone or WhatsApp number.',permission:'Please agree to sharing your support contact.',invalid:'Enter a valid international number (e.g. +447911123456).',save:'Securely saving your number after account confirmation...'},ps:{title:'📱 د حساب اړیکې او واټساپ',country:'هېواد او نړیوال کوډ',phone:'د تلیفون شمېره',whatsapp:'د واټساپ شمېره (اختیاري)',same:'واټساپ همدا د تلیفون شمېره ده',consent:'زه موافق یم چې د حساب ملاتړ لپاره زما شمېره یوازې د ZAVI ONE مرکزي ادارې سره شریکه شي.',info:'نور پېرودونکي او د دوکان همکاران دا شمېره نه شي لیدلی. اداره پیغامونه په خپله استوي.',missing:'د تلیفون یا واټساپ شمېره ولیکئ.',permission:'د اړیکې شمېرې د شریکولو اجازه ورکړئ.',invalid:'له نړیوال کوډ سره سمه شمېره ولیکئ.',save:'له تأیید وروسته د شمېرې خوندي کول...'}};
function lang(){var x=document.querySelector('#zaviSettingsLanguage,#zaviTopLanguage');var s=String(x&&x.value||document.documentElement.lang||'fa').toLowerCase();return s.startsWith('en')?'en':s.startsWith('ps')?'ps':'fa'}
function phrase(s){return t[lang()][s]}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function normalize(raw,iso){var s=String(raw||'').replace(/[\s().-]/g,'').replace(/^00/,'+');if(!s)return '';if(s.startsWith('+'))return /^\+[1-9][0-9]{5,14}$/.test(s)?s:null;
 var found=DIALS.find(function(x){return x[0]===iso});if(!found)return null;
 s=s.replace(/[^0-9]/g,'').replace(/^0+/,'');var v='+'+found[1]+s;return /^\+[1-9][0-9]{5,14}$/.test(v)?v:null}
function read(){var phone=normalize(fields.phone,fields.country),wa=normalize(fields.whatsapp,fields.waCountry);
 if(phone===null||wa===null)throw Error(phrase('invalid'));
 if(!phone&&!wa)throw Error(phrase('missing'));
 if(!fields.consent)throw Error(phrase('permission'));
 return {phone_e164:phone,whatsapp_e164:wa,country_iso:fields.country,contact_opt_in:true};}
function renderCountries(){
 var locales={fa:'fa-AF',ps:'ps-AF',en:'en'};
 var formatter=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([locales[lang()]],{type:'region'}):null;
 return DIALS.map(function(x){var label=formatter?formatter.of(x[0]):x[0];return '<option value="'+esc(x[0])+'">'+esc(label)+' (+'+esc(x[1])+')</option>'}).join('');}
function mount(){
 var cloud=document.getElementById('z20CloudPanel');if(!cloud)return;
 var signup=cloud.querySelector('[data-z20-cloud="signup"]');
 if(!signup||cloud.querySelector('#z6547AccountContacts'))return;
 var panel=document.createElement('section');panel.id='z6547AccountContacts';
 panel.innerHTML='<h4 class="z6547ContactTitle"></h4><div class="z6547ContactGrid"><label class="z6547Label"><span data-label="country"></span><select id="z6547Country">'+renderCountries()+'</select></label><label class="z6547Label"><span data-label="phone"></span><input id="z6547Phone" inputmode="tel" autocomplete="tel" type="tel" dir="ltr" maxlength="25" placeholder="+93700123456"></label><label class="z6547Label"><span data-label="whatsapp"></span><input id="z6547WhatsApp" inputmode="tel" type="tel" dir="ltr" maxlength="25" placeholder="+93700123456"></label><label class="z6547Label"><span data-label="country"></span><select id="z6547WACountry">'+renderCountries()+'</select></label></div><label class="z6547Check"><input id="z6547Same" type="checkbox"><span data-label="same"></span></label><label class="z6547Check"><input id="z6547Consent" type="checkbox"><span data-label="consent"></span></label><p class="z6547ContactInfo"></p>';
 signup.closest('.z20-actions')?.before(panel);
 panel.querySelector('#z6547Country').value=fields.country;panel.querySelector('#z6547WACountry').value=fields.waCountry;
 panel.querySelector('#z6547Phone').value=fields.phone;panel.querySelector('#z6547WhatsApp').value=fields.whatsapp;
 panel.querySelector('#z6547Consent').checked=fields.consent;
 panel.addEventListener('input',function(e){
  if(e.target.id==='z6547Country')fields.country=e.target.value;
  if(e.target.id==='z6547WACountry')fields.waCountry=e.target.value;
  if(e.target.id==='z6547Phone')fields.phone=e.target.value;
  if(e.target.id==='z6547WhatsApp')fields.whatsapp=e.target.value;
  if(e.target.id==='z6547Consent')fields.consent=e.target.checked;
  if(e.target.id==='z6547Same'&&e.target.checked){fields.whatsapp=fields.phone;fields.waCountry=fields.country;panel.querySelector('#z6547WhatsApp').value=fields.whatsapp;panel.querySelector('#z6547WACountry').value=fields.waCountry}
 });
 panel.addEventListener('change',function(e){if(e.target.id==='z6547Same'&&e.target.checked){fields.whatsapp=fields.phone;fields.waCountry=fields.country;panel.querySelector('#z6547WhatsApp').value=fields.whatsapp;panel.querySelector('#z6547WACountry').value=fields.waCountry}});
 translate();
}
function translate(){var p=document.getElementById('z6547AccountContacts');if(!p)return;p.querySelector('.z6547ContactTitle').textContent=phrase('title');p.querySelectorAll('[data-label]').forEach(function(e){e.textContent=phrase(e.dataset.label)});p.querySelector('.z6547ContactInfo').textContent=phrase('info')}
function getValidated(){var o=read();requested=true;return o}
async function sync(session,request){
 if(saveInProgress||!session?.access_token||!session?.user?.id||!request)return;
 var profile=session.user.user_metadata?.zavi_contact;if(!profile||profile.contact_opt_in!==true)return;
 var uid=session.user.id,record={user_uid:uid,contact_e164:profile.phone_e164||'',whatsapp_e164:profile.whatsapp_e164||'',country_iso:profile.country_iso||'',contact_opt_in:true};
 if(!record.contact_e164&&!record.whatsapp_e164)return;
 if(Date.now()-lastAttempt<60000)return;
 lastAttempt=Date.now();saveInProgress=true;
 try{await request('/rest/v1/zavi_v6547_account_contacts',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:record});}
 catch(e){console.warn('ZAVI account contact not synced (backend migration may be pending)');}
 finally{saveInProgress=false}
}
function style(){if(document.getElementById('z6547AccountStyle'))return;var a=document.createElement('style');a.id='z6547AccountStyle';a.textContent='.z6547ContactTitle{font-size:15px;font-weight:800;margin:0 0 10px}.z6547ContactGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.z6547Label{display:grid;gap:6px;font-size:13px;font-weight:700}.z6547Label input,.z6547Label select{background:var(--panel,#fff);color:var(--text,#153c67);max-width:100%;width:100%;min-height:45px;border:1px solid #a8c9de;border-radius:10px;padding:8px}.z6547Check{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.8;margin-top:12px}.z6547Check input{width:19px;height:19px;flex-shrink:0}.z6547ContactInfo{font-size:12px;line-height:1.8;opacity:.8;margin:10px 0 0}#z6547AccountContacts{background:rgba(49,157,205,.08);border:1px solid #418db952;border-radius:13px;padding:14px;margin:14px 0}@media(max-width:540px){.z6547ContactGrid{grid-template-columns:1fr}}';document.head.append(a)}
async function codes(){try{var r=await fetch('./zavi-country-dials-v6547.json',{cache:'force-cache'});if(r.ok){var items=await r.json();if(Array.isArray(items)&&items.length>200)DIALS=items}}catch(e){}mount()}
window.ZaviAccountContactV6547={getValidated:getValidated,sync:sync,read:read};
function init(){style();codes();var root=document.getElementById('content');if(root){var running=false;new MutationObserver(function(){if(running)return;running=true;queueMicrotask(function(){running=false;mount()})}).observe(root,{childList:true,subtree:true})}mount()}
document.addEventListener('change',function(e){if(e.target.matches('#zaviSettingsLanguage,#zaviTopLanguage'))translate()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();