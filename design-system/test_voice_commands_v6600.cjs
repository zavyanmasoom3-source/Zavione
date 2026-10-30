'use strict';
/* Mock the EXISTING navigation elements without touching ledger/database.
   Demonstrates typed input is absent, spoken navigation is automatic,
   only allowlisted routes are clicked, and ADMIN never reaches ONE pages.
*/
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('design-system/zavi-voice-local-v6599.js','utf8');
const java=fs.readFileSync('design-system/ZaviLocalWhisper.java','utf8');
const bridge=fs.readFileSync('design-system/apply_local_voice_v6599.py','utf8');
assert(!src.includes("el('textarea'"),'Voice UI must contain NO typing fields');
assert(!src.includes("el('details'"),'No hidden type-a-command panel');
assert(!src.includes('webkitSpeechRecognition'),'Native offline only');
assert(java.includes('Math.sqrt(power/Math.max(n,1))'),'Capture actual PCM amplitude');
assert(java.includes('emit("no_audio"'),'Report silence instead of fake listening');
assert(java.includes('emit("heard"'),'Report genuine detected speech');
assert(java.includes('MediaRecorder.AudioSource.MIC'),'Use local microphone');
assert(!src.includes('z199-privacy'),'Privacy footer must be absent');
assert(src.includes('else if(event?.type===\'no_audio\')'),'Show audio diagnostics');
assert(bridge.includes('ZaviAndroidLocalVoice'),'Origin-checked Android bridge required');
assert(bridge.includes('Local-only mode'),'Legacy Google/system handlers must be disabled');
function simulate(admin){
 const clicks=[],app={isConnected:true,hidden:false},keys=admin?
 ['overview','customers','devices','support','payments','finance','activity','health','brand','security','settings']:
 ['dashboard','sales','purchases','products','contacts','phonebook','debtors','creditors','money','hawala','expenses','waste','reports','journal','repairs','settings','subscription'];
 const entries=keys.map(k=>({isConnected:true,disabled:false,hidden:true,dataset:admin?{page:k}:{go:k},textContent:k,getAttribute:()=>null,closest:()=>null,click:()=>clicks.push(k)}));
 const document={readyState:'loading',currentScript:null,hidden:false,
  querySelector(sel){
   if(sel==='script[src*="zavi-voice-admin-v1442.js"]')return admin?{}:null;
   if(sel==='#content')return admin?null:app;
   if(sel==='#appScreen')return admin?app:null;
   return null;
  },
  querySelectorAll:()=>entries,addEventListener:()=>{}};
 const window={ZaviAdminAPI:{getMode:()=> 'live'},ZaviVoiceProV6596:{
  route(text){
   const n=text.toLowerCase();
   if(n.includes('حذف')||n.includes('delete'))return {kind:'unknown'};
   if(n.includes('فروش')||n.includes('sales'))return {kind:'navigate',key:'sales'};
   if(n.includes('گدام')||n.includes('inventory'))return {kind:'navigate',key:'inventory'};
   if(n.includes('report')||n.includes('گزارش'))return {kind:'navigate',key:'reports'};
   if(n.includes('پرداخت')||n.includes('payment'))return {kind:'navigate',key:'billing'};
   if(n.includes('امنیت'))return {kind:'unknown'};
   return {kind:'unknown'};
  }
 }};
 const sandbox={window,document,localStorage:{getItem:()=>null,setItem:()=>{}},getComputedStyle:(node)=>({display:node===app?'block':'none'}),console,setInterval:()=>{},Date,Option:function(){}};
 vm.runInNewContext(src,sandbox,{timeout:2000});
 assert.equal(typeof window.ZaviVoiceLocal6599.interpret,'function');
 return {api:window.ZaviVoiceLocal6599,clicks};
}
const one=simulate(false);
one.api.interpret('بخش فروش را باز کن');
one.api.interpret('موجودی گدام را نشان بده');
one.api.interpret('گزارش‌ها را باز کن');
one.api.interpret('حذف همه مشتریان');
assert.deepEqual(one.clicks,['sales','products','reports']);
const admin=simulate(true);
admin.api.interpret('پرداخت‌ها را باز کن');
admin.api.interpret('گزارش‌ها را باز کن');
admin.api.interpret('امنیت');
admin.api.interpret('حذف همه مشتریان');
assert.deepEqual(admin.clicks,['payments','finance','security']);
console.log('PASS voice-only, no footer, audio status, real store/admin routes on hidden sidebar, refused deletion, local microphone');
