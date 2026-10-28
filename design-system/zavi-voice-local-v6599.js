/* ZAVI VOICE LOCAL 65.99 / 1.4.45: own lightweight screen & local-only Android bridge.
   Transcription uses bundled whisper.cpp, not Google / Android SpeechRecognizer.
   Navigation is immediate. Financial instructions are preview-only: never submit.
*/
(()=>{'use strict';
 if(window.ZaviVoiceLocal6599)return;
 const ADMIN=!!document.querySelector('script[src*="zavi-voice-admin-v1442.js"]');
 const KEY='zavi.local.voice.6599.'+(ADMIN?'admin':'one');
 const L={
  fa:{title:'ZAVI VOICE',enabled:'دستیار روشن است',off:'دستیار خاموش است',start:'فعال‌کردن صدا',stop:'خاموش‌کردن صدا',listening:'گوش می‌دهم؛ صحبت کنید',working:'در حال فهمیدن صحبت شما',lang:'زبان',example:'مثلاً: «بخش فروش را باز کن»',manual:'نوشتن دستور',send:'اجرا',confirm:'بازکردن فاکتور برای بررسی',cancel:'لغو',draft:'پیش‌نویس معامله — ثبت نشده',review:'برای ثبت نهایی، نام کالا، قیمت، موجودی و مشتری را در فاکتور اصلی تأیید کنید.',unknown:'دستور واضح نبود؛ دوباره بگویید یا اصلاح کنید.',permission:'اجازه میکروفون را فعال کنید.',unavailable:'مدل صوتی محلی در این نسخه در دسترس نیست؛ می‌توانید دستور را بنویسید.',error:'دستیار صوتی موقتاً در دسترس نیست.',closed:'بستن',ready:'برای شروع، دکمه روشن‌کردن را بزنید.',privacy:'صدا روی همین گوشی پردازش می‌شود؛ به گوگل ارسال نمی‌شود.',navigated:'بخش باز شد',safe:'عملیات مالی بدون تأیید نهایی ثبت نمی‌شود.'},
  ps:{title:'ZAVI VOICE',enabled:'مرستیال فعال دی',off:'مرستیال بند دی',start:'غږ فعال کړئ',stop:'غږ بند کړئ',listening:'اورم؛ خبرې وکړئ',working:'ستاسې خبرې پېژنم',lang:'ژبه',example:'ووایئ: «د پلور برخه خلاصه کړه»',manual:'امر ولیکئ',send:'اجرا',confirm:'اصلي بل ته د کتنې لپاره لاړ شئ',cancel:'لغوه',draft:'د معاملې مسوده — نه ده ثبت شوې',review:'د توکو، بیې او پېرودونکي جزیات په اصلي بل کې تایید کړئ.',unknown:'امر نه پېژنم؛ بیا یې ووایئ یا سم یې کړئ.',permission:'مایکروفون ته اجازه ورکړئ.',unavailable:'سیمه‌ییز غږیز ماډل نشته؛ امر ولیکئ.',error:'غږیز مرستیال اوس کار نه کوي.',closed:'بندول',ready:'د غږ لپاره تڼۍ کېکاږئ.',privacy:'غږ په همدې موبایل کې پېژندل کېږي؛ ګوګل ته نه لېږل کېږي.',navigated:'برخه پرانیستل شوه',safe:'مالي معامله له وروستي تایید پرته نه ثبتېږي.'},
  en:{title:'ZAVI VOICE',enabled:'Assistant is on',off:'Assistant is off',start:'Enable voice',stop:'Turn voice off',listening:'Listening — speak now',working:'Understanding speech',lang:'Language',example:'Say “open sales” or “show inventory”',manual:'Type a command',send:'Run',confirm:'Open invoice for review',cancel:'Cancel',draft:'Transaction draft — not posted',review:'Review the product, price, stock and customer in the original invoice before posting.',unknown:'Command not clear; repeat or edit it.',permission:'Allow microphone access.',unavailable:'Local voice model is not available here; type a command instead.',error:'Voice engine unavailable.',closed:'Close',ready:'Tap Enable voice to begin.',privacy:'Speech is processed on this device, not sent to Google.',navigated:'Section opened',safe:'Financial changes need final confirmation.'}
 };
 const names={'fa-AF':'دری افغانستان','ps-AF':'پښتو افغانستان','en-GB':'English'};
 const state={enabled:false,lang:'fa-AF',active:false,working:false,root:null,last:'',pending:null,status:'',native:false};
 const $=(s,p=document)=>p.querySelector(s);
 const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
 const t=()=>L[state.lang.startsWith('ps')?'ps':state.lang.startsWith('en')?'en':'fa'];
 const avail=()=>!!window.ZaviAndroidLocalVoice?.postMessage;
 function auth(){
  const s=$('#appScreen'),login=$('#loginScreen');
  const visible=x=>!!x&&!x.hidden&&getComputedStyle(x).display!=='none';
  if(ADMIN)return visible(s)&&window.ZaviAdminAPI?.getMode?.()==='live';
  return !(login&&visible(login))&&((s&&visible(s))||visible($('#content')));
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify({enabled:state.enabled,lang:state.lang}))}catch(_){}}
 function restore(){try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');state.enabled=p.enabled===true;state.lang=names[p.lang]?p.lang:'fa-AF'}catch(_){}}
 function publishStatus(message){state.status=message;draw()}
 function native(op){if(!avail())return false;try{window.ZaviAndroidLocalVoice.postMessage(JSON.stringify({op,language:state.lang}));return true}catch(_){return false}}
 function stop(){native('stop');state.active=false;state.working=false;draw()}
 function toggle(){if(!auth())return;
  if(state.enabled){state.enabled=false;stop();save();publishStatus(t().off)}
  else{state.enabled=true;save();if(!avail()){state.enabled=false;save();publishStatus(t().unavailable);return}
   state.status=t().working;native('start');draw()}
 }
 function normalize(s){return String(s||'').replace(/[\u200c\u200e\u200f]/g,'').trim().toLowerCase();}
 const YES=/^(تایید|تأیید|تایید کن|تأیید کن|بلی|بله|هو|تایید کړه|confirm|yes|okay|ok)$/u;
 const NO=/^(لغو|لغوه|نخیر|نه|no|cancel|stop)$/u;
 function navFor(r){
  const map={sales:['sales','فروش','پلور'],purchase:['purchase','خرید','پېرود'],inventory:['inventory','انبار','گدام','موجودی'],
   customers:['customers','مشتریان','پېرودونکي'],debt:['debt','قرض','پور'],reports:['report','گزارش','راپور'],
   settingsPage:['settings','تنظیمات','تنظیمونه'],daily:['daily','داشبورد','روزمره'],expenses:['expense','مصارف','لګښت'],
   barcode:['barcode','بارکد','بارکوډ'],subscriptions:['subscriptions','اشتراک'],support:['support','پشتیبانی'],
   devices:['device','دستگاه'],billing:['billing','finance','مالی'],audit:['audit','تاریخچه'],communications:['communications','پیام']};
  const aliases=r.kind==='navigate_label'?[r.label]:map[r.key]||[];
  const candidates=[...document.querySelectorAll('#sidebarLinks [data-go],#mobileBottom [data-go],#side [data-go],#appScreen [data-page],button[data-page],a[data-page],.nav-btn,.nav-item')];
  return candidates.find(n=>{
   if(n.disabled||n.closest('#z199-voice,#z196-voice,#z198-easy'))return false;
   const v=[n.dataset.page,n.dataset.go,n.textContent,n.getAttribute('aria-label')].filter(Boolean).join(' ').toLowerCase();
   return aliases.some(a=>a.length>2&&v.includes(a.toLowerCase()));
  })||null;
 }
 function action(result){
  const target=navFor(result);
  if(!target){publishStatus(t().unknown);return false}
  // Route through the EXISTING application's authenticated navigation handler.
  target.click();publishStatus(t().navigated);return true
 }
 function interpret(words){
  if(!auth())return;
  const text=String(words||'').trim().slice(0,350);
  if(!text)return;
  state.last=text;const n=normalize(text);
  if(state.pending && YES.test(n)){const pending=state.pending;state.pending=null;action({kind:'navigate',key:pending.key});draw();return}
  if(state.pending && NO.test(n)){state.pending=null;publishStatus(t().ready);return}
  const cleaned=text.replace(/^(?:ای|هی|hey|ok|okay)?\s*(?:زاوی|زاوي|zavi|zavy|زاوی وان)[،,\s:]*/iu,'').trim()||text;
  const result=window.ZaviVoiceProV6596?.route?.(cleaned);
  if(!result||result.kind==='unknown'){state.pending=null;publishStatus(t().unknown);return}
  if(result.kind==='draft'){
   state.pending={key:result.key,draft:result.draft};
   publishStatus(t().draft);return
  }
  if(result.kind==='navigate'||result.kind==='navigate_label'){state.pending=null;action(result);return}
  publishStatus(t().unknown)
 }
 function draw(){
  if(!state.root)return;const w=t(),root=state.root;
  $('#z199-title',root).textContent=w.title;
  $('#z199-close',root).setAttribute('aria-label',w.closed);
  $('#z199-label',root).textContent=w.lang;
  $('#z199-locale',root).value=state.lang;
  $('#z199-toggle',root).textContent=state.enabled?w.stop:w.start;
  $('#z199-toggle',root).setAttribute('aria-pressed',String(state.enabled));
  $('#z199-toggle',root).classList.toggle('on',state.enabled);
  $('#z199-status',root).textContent=state.status||(state.working?w.working:state.active?w.listening:state.enabled?w.enabled:w.ready);
  $('#z199-note',root).textContent=state.pending?w.review:w.example;
  $('#z199-manual',root).placeholder=w.manual;
  $('#z199-run',root).textContent=w.send;
  $('#z199-privacy',root).textContent=avail()?w.privacy:w.unavailable;
  const transcript=$('#z199-transcript',root);transcript.hidden=!state.last;transcript.textContent=state.last;
  const preview=$('#z199-preview',root);preview.replaceChildren();
  if(state.pending){
   const d=state.pending.draft;
   preview.append(el('strong','',w.draft));
   if(d.party)preview.append(el('div','z199-party',d.party));
   d.items.slice(0,12).forEach(x=>preview.append(el('div','z199-line',x.product+' · '+(x.quantity??'?')+' '+(x.unit||''))));
   const buttons=el('div','z199-actions'),confirm=el('button','z199-confirm',w.confirm),cancel=el('button','z199-cancel',w.cancel);
   confirm.type=cancel.type='button';
   confirm.addEventListener('click',()=>{const k=state.pending?.key;state.pending=null;if(k)action({kind:'navigate',key:k});draw()});
   cancel.addEventListener('click',()=>{state.pending=null;draw()});
   buttons.append(confirm,cancel);preview.append(buttons);
  }
  preview.hidden=!state.pending;
  root.classList.toggle('is-on',state.enabled);
  for(const n of document.querySelectorAll('#z197-dashboard-mic'))n.classList.toggle('z199-active',state.enabled);
 }
 function build(){
  if(state.root)return;
  const root=el('div','z199-voice');root.id='z199-voice';root.hidden=true;root.dir='auto';
  const sheet=el('section','z199-sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','z199-title');
  const header=el('header','z199-header'),mark=el('div','z199-mark','🎙'),heading=el('strong','z199-title','ZAVI VOICE');
  heading.id='z199-title';const close=el('button','z199-close','×');close.id='z199-close';close.type='button';close.onclick=()=>root.hidden=true;
  header.append(mark,heading,close);
  const row=el('div','z199-row'),label=el('label','z199-label');label.id='z199-label';
  const locale=el('select','z199-locale');locale.id='z199-locale';
  for(const [code,name] of Object.entries(names))locale.append(new Option(name,code));
  locale.value=state.lang;locale.onchange=()=>{const was=state.enabled;stop();state.lang=locale.value;save();if(was)native('start');draw()};
  row.append(label,locale);
  const toggleEl=el('button','z199-toggle');toggleEl.id='z199-toggle';toggleEl.type='button';toggleEl.onclick=toggle;
  const led=el('div','z199-led');led.setAttribute('aria-hidden','true');const statusEl=el('p','z199-status');statusEl.id='z199-status';statusEl.setAttribute('role','status');
  const heard=el('p','z199-transcript');heard.id='z199-transcript';heard.hidden=true;
  const note=el('p','z199-note');note.id='z199-note';
  const preview=el('div','z199-preview');preview.id='z199-preview';preview.hidden=true;
  const details=el('details','z199-details'),summary=el('summary','z199-summary','✎');
  const field=el('textarea','z199-manual');field.id='z199-manual';field.maxLength=350;field.rows=2;
  const run=el('button','z199-run');run.id='z199-run';run.type='button';run.onclick=()=>{interpret(field.value);details.open=false};
  details.append(summary,field,run);
  const privacy=el('p','z199-privacy');privacy.id='z199-privacy';
  sheet.append(header,row,toggleEl,led,statusEl,heard,note,preview,details,privacy);
  root.append(sheet);root.addEventListener('click',e=>{if(e.target===root)root.hidden=true});
  document.body.append(root);state.root=root;draw();
 }
 function open(){if(!auth())return;build();state.root.hidden=false;draw()}
 // The old "Start speech" Google/system UI is intentionally NOT called, even as fallback.
 window.ZaviVoiceLocalNativeEvent=event=>{
  if(!state.enabled||!auth())return;
  if(event?.type==='ready'){state.active=true;state.working=false;publishStatus(t().listening)}
  else if(event?.type==='working'){state.working=true;publishStatus(t().working)}
  else if(event?.type==='result'){state.working=false;interpret(event.text);state.active=true;draw()}
  else if(event?.type==='permission'){state.active=false;state.enabled=false;save();publishStatus(t().permission)}
  else if(event?.type==='error'){state.active=false;state.enabled=false;save();publishStatus(t().error)}
  else if(event?.type==='stopped'){state.active=false;state.working=false;draw()}
 };
 function init(){
  restore();build();
  // Always intercept legacy mic launcher before its handlers; hide both old panels.
  document.addEventListener('click',event=>{
   const b=event.target?.closest?.('#z197-dashboard-mic,#z196-launch,#z198-power,.z196-launch,.z197-fab');
   if(!b||!auth())return;
   event.preventDefault();event.stopImmediatePropagation();open();
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.root)state.root.hidden=true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop()}else if(state.enabled&&auth()&&avail())native('start')});
  window.addEventListener('pagehide',stop);
  setInterval(()=>{if(!auth()&&state.active)stop();else if(state.enabled&&!state.active&&!document.hidden&&auth()&&avail())native('start')},3500);
  if(state.enabled&&avail()&&auth()&&!document.hidden)native('start');
 }
 window.ZaviVoiceLocal6599=Object.freeze({open,interpret,stop,toggle,isEnabled:()=>state.enabled,engine:'whisper.cpp device-only'});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();