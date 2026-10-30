/* ZAVI ONE ADMIN 1.4.17 — central owner's offline permission console.
 * Server remains sole authority: original ZaviAdminAPI session + billing-admin gated RPC.
 * No customer database edits are attempted outside zavi_v269_set_offline_policy.
 */
(()=>{'use strict';
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const words={
 fa:{button:'مجوزهای آفلاین',title:'مدیریت مجوز آفلاین فروشگاه‌ها',sub:'برای هر فروشگاه ۱۸۰ یا ۳۶۵ روز اجازه بدهید. مدت واقعی از پایان اشتراک بیشتر نمی‌شود.',store:'انتخاب فروشگاه',pick:'یک فروشگاه را انتخاب کنید',days:'مدت مجوز',six:'۱۸۰ روز • شش ماه',year:'۳۶۵ روز • یک سال',enabled:'اجازه استفاده آفلاین فعال باشد',save:'ثبت مجوز روی سرور',refresh:'بررسی وضعیت فعلی',close:'بستن',demo:'حالت نمایشی: هیچ مجوزی صادر نمی‌شود.',logged:'برای مدیریت مجوز، با حساب مالک مرکزی وارد شوید.',expire:'پایان اشتراک',effective:'حداکثر اعتبار بر اساس اشتراک',issued:'مجوز ذخیره شد؛ برای دریافت مجوز امضاشده، مالک فروشگاه باید با اینترنت وارد حساب شود.',disabled:'سیاست آفلاین غیرفعال است.',active:'مجوز آفلاین فعال است.',none:'هنوز سیاست آفلاین ثبت نشده.',loading:'در حال دریافت وضعیت...',confirm:'آیا تغییر مجوز آفلاین این فروشگاه را تأیید می‌کنید؟',expired:'اشتراک فعال یا معتبر نیست؛ نخست اشتراک را تمدید کنید.',error:'عملیات انجام نشد: ',policy:'نوع اشتراک',warning:'غیرفعال‌سازی تا زمانی که دستگاه دوباره مجوز را بررسی نکند، لزوماً اثر فوری بر دستگاه آفلاین ندارد.',manage:'مدیریت امن مجوزهای آفلاین'},
 en:{button:'Offline licences',title:'Store offline licence management',sub:'Allow 180 or 365 days for a store. Actual permission cannot exceed its subscription expiry.',store:'Choose store',pick:'Select a store',days:'Permission duration',six:'180 days · six months',year:'365 days · one year',enabled:'Enable offline permission',save:'Save permission to server',refresh:'Check current policy',close:'Close',demo:'Demo mode: no grants are issued.',logged:'Sign in as central owner to manage licences.',expire:'Subscription expiry',effective:'Latest effective expiry',issued:'Policy saved. Store owner must connect to request a signed device licence.',disabled:'Offline policy is disabled.',active:'Offline policy is enabled.',none:'No offline policy registered.',loading:'Loading current policy...',confirm:'Confirm changing the offline policy for this store?',expired:'Subscription not active; renew it first.',error:'Action failed: ',policy:'Subscription type',warning:'Revoking policy may not immediately disable an already disconnected device until it rechecks its signed licence.',manage:'Manage offline permissions'},
 ps:{button:'آفلاین جوازونه',title:'د دوکانونو آفلاین جوازونه',sub:'د ۱۸۰ یا ۳۶۵ ورځو جواز وټاکئ؛ د ګډون له ختمېدو وروسته نه غځېږي.',store:'دوکان وټاکئ',pick:'دوکان غوره کړئ',days:'د جواز موده',six:'۱۸۰ ورځې • شپږ میاشتې',year:'۳۶۵ ورځې • یو کال',enabled:'آفلاین جواز فعال کړئ',save:'په سرور کې ثبت',refresh:'اوسنی حالت وګورئ',close:'بندول',demo:'ازمایښتي بڼه: جواز نه صادرېږي.',logged:'د مرکزي مالک حساب ته ننوځئ.',expire:'د ګډون ختمېدو نېټه',effective:'د اعتبار وروستۍ نېټه',issued:'اجازه ثبت شوه؛ د دوکان مالک باید انټرنېټ سره د لاسلیک شوي جواز غوښتنه وکړي.',disabled:'آفلاین اجازه غیر فعاله ده.',active:'آفلاین اجازه فعاله ده.',none:'آفلاین جواز نشته.',loading:'د وضعیت د ترلاسه کولو په حال کې...',confirm:'د دوکان د آفلاین جواز بدلون تاییدوئ؟',expired:'فعال ګډون نشته؛ لومړی ګډون نوی کړئ.',error:'چاره ترسره نه شوه: ',policy:'د ګډون ډول',warning:'آفلاین وسیله کې د جواز لغوه کېدل ممکن تر بیا کتنې پورې سملاسي پلي نشي.',manage:'د آفلاین جوازونو اداره'}
};
const lang=()=>{const x=($('#zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return x.startsWith('en')?'en':x.startsWith('ps')?'ps':'fa'};
const api=()=>window.ZaviAdminAPI;
const ready=()=>{let s=$('#appScreen');return !!(s&&!s.hidden&&getComputedStyle(s).display!=='none'&&$('.sidebar .nav-item',s))};
const live=()=>ready()&&api()?.getMode?.()==='live';
const date=x=>x&&Number.isFinite(new Date(x).getTime())?new Date(x).toLocaleDateString(lang()==='en'?'en-GB':lang()==='ps'?'ps-AF':'fa-AF',{year:'numeric',month:'short',day:'numeric'}):'—';
let openPanel=null, busy=false, snapshot=null, selectedId='';
function text(tag,cls,str){let e=document.createElement(tag);if(cls)e.className=cls;e.textContent=str;return e}
function status(message,bad=false){let e=$('#z70-status');if(e){e.textContent=message;e.dataset.error=bad?'yes':'no'}}
function fillInfo(){
 const box=$('#z70-info');if(!box)return;
 const w=words[lang()];box.replaceChildren();
 if(!snapshot){box.append(text('p','z70-muted',w.none));return}
 const fields=[[w.policy,String(snapshot.subscription_status||'—')],[w.expire,date(snapshot.subscription_expires_at)],[w.effective,date(snapshot.effective_expires_at)]];
 for(let [k,v] of fields){const r=text('div','z70-field','');r.append(text('span','',k),text('strong','',v));box.append(r)}
 box.append(text('p','z70-note',snapshot.offline_enabled?w.active:w.disabled));
 if(snapshot.offline_days===180||snapshot.offline_days===365){$('#z70-days').value=String(snapshot.offline_days)}
 $('#z70-enabled').checked=!!snapshot.offline_enabled;
}
async function load(){
 if(!openPanel)return;
 const w=words[lang()],select=$('#z70-store');selectedId=select?.value||'';
 snapshot=null;fillInfo();if(!selectedId){status(w.pick);return}
 if(!live()){status(w.demo,true);return}
 status(w.loading);
 try{
  const data=await api().request('/rest/v1/rpc/zavi_admin_v6570_offline_status',{method:'POST',body:{p_workspace_id:selectedId}});
  if(select.value!==selectedId)return;
  snapshot=data;fillInfo();status(snapshot?.offline_enabled?w.active:w.disabled);
 }catch(e){status(w.error+(e?.message||String(e)),true)}
}
function close(){openPanel?.remove();openPanel=null;document.body.classList.remove('z70-open')}
function open(){
 if(!ready())return;
 if(openPanel){$('#z70-store')?.focus();return}
 const w=words[lang()],screen=$('#appScreen'),dict=api();
 const root=text('section','z70-overlay','');root.id='z70-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',w.title);
 const card=text('div','z70-panel',''),head=text('div','z70-heading','');
 const heading=text('div','', '');heading.append(text('h2','',w.title),text('p','',w.sub));
 const x=text('button','z70-close','×');x.type='button';x.setAttribute('aria-label',w.close);x.addEventListener('click',close);head.append(heading,x);
 const choose=text('label','z70-label',w.store);const store=document.createElement('select');store.id='z70-store';
 store.append(new Option(w.pick,''));
 const stores=(dict?.getRows?.()||[]).filter(r=>r.workspace_id);
 stores.forEach(r=>store.append(new Option([r.workspace_name||r.workspace_id,r.owner_email||''].filter(Boolean).join(' • '),r.workspace_id)));
 store.addEventListener('change',load);choose.append(store);
 const length=text('label','z70-label',w.days);const duration=document.createElement('select');duration.id='z70-days';duration.append(new Option(w.six,'180'),new Option(w.year,'365'));length.append(duration);
 const enable=text('label','z70-toggle','');const tick=document.createElement('input');tick.type='checkbox';tick.id='z70-enabled';enable.append(tick,text('span','',w.enabled));
 const info=text('div','z70-info','');info.id='z70-info';
 const state=text('p','z70-status','');state.id='z70-status';state.setAttribute('role','status');
 const actions=text('div','z70-actions','');const check=text('button','z70-secondary',w.refresh);check.type='button';check.addEventListener('click',load);
 const grant=text('button','z70-primary',w.save);grant.type='button';
 grant.addEventListener('click',async()=>{
  if(busy)return;
  if(!live())return status(w.logged,true);
  const ws=store.value,days=Number(duration.value),enabled=tick.checked;
  if(!ws||![180,365].includes(days)||!(dict.getRows?.()||[]).some(r=>r.workspace_id===ws))return status(w.pick,true);
  if(!window.confirm(w.confirm))return;
  busy=true;grant.disabled=true;
  try{
   await dict.request('/rest/v1/rpc/zavi_v269_set_offline_policy',{method:'POST',body:{p_workspace_id:ws,p_offline_days:days,p_enabled:enabled}});
   await load();status(w.issued);
  }catch(e){status(w.error+(e?.message||String(e)),true)}
  finally{busy=false;grant.disabled=false}
 });
 actions.append(check,grant);
 card.append(head,choose,length,enable,info,text('p','z70-warning',w.warning),state,actions);
 root.append(card);root.addEventListener('click',e=>{if(e.target===root)close()});
 screen.append(root);openPanel=root;document.body.classList.add('z70-open');
 if(!live()){grant.disabled=true;state.textContent=w.demo}
 fillInfo();store.focus();
}
function mount(){
 if(!ready()){close();return}
 const w=words[lang()];
 const top=$('#appScreen .top-actions')||$('#appScreen .topbar');
 if(top&&!$('#z70-launch',top)){
  const b=text('button','z70-launch','▣ '+w.button);b.id='z70-launch';b.type='button';b.addEventListener('click',open);top.prepend(b);
 }
 const view=$('#appScreen #view');
 if(view&&($('#appScreen .sidebar [data-page="devices"].selected')||$('#appScreen .sidebar [data-page="brand"].selected')||$('#appScreen .sidebar [data-page="overview"].selected'))&&!$('#z70-quick',view)){
  const card=text('div','z70-quick','');card.id='z70-quick';
  const info=text('div','', '');info.append(text('strong','',w.manage),text('small','',w.sub));
  const b=text('button','z70-launch',w.button);b.type='button';b.addEventListener('click',open);card.append(info,b);
  view.prepend(card);
 }
}
function start(){
 const screen=$('#appScreen');if(!screen)return;
 let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};
 new MutationObserver(schedule).observe(screen,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden','style','class']});
 const view=$('#view');if(view)new MutationObserver(schedule).observe(view,{childList:true});
 document.addEventListener('click',e=>{if(e.target.closest?.('#appScreen .sidebar [data-page],#appScreen [data-nav]'))setTimeout(schedule,75)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openPanel)close()});
 mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();