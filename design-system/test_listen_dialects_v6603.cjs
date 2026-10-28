'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('design-system/zavi-voice-local-v6599.js','utf8');
const patch=fs.readFileSync('design-system/apply_local_voice_v6599.py','utf8');
const java=fs.readFileSync('design-system/ZaviLocalWhisper.java','utf8');
assert(!code.includes('sayReply('));
assert(!code.includes('new Audio('));
assert(!code.includes('speechSynthesis'));
assert(!code.includes('z199-privacy'));
assert(!code.includes("el('textarea'"));
assert(code.includes('dialectNavigation'));
assert(patch.includes('if(!window.__zaviLocalOnly)'),'Legacy mic UI must not start');
assert(!patch.includes('setMediaPlaybackRequiresUserGesture(false)'));
assert(java.includes('ggml-base-q5_1.bin'),'Require larger multilingual model');
function fake(admin){
 let clicks=[];
 const app={hidden:false};
 const map=admin?
 ['overview','customers','devices','support','payments','finance','activity','health','brand','security','settings']:
 ['dashboard','sales','purchases','products','contacts','phonebook','debtors','creditors','money','hawala','expenses','waste','reports','journal','repairs','settings','subscription'];
 const nodes=map.map(key=>({isConnected:true,hidden:true,disabled:false,dataset:admin?{page:key}:{go:key},
  textContent:key,classList:{contains:()=>true},closest:()=>null,getAttribute:()=>null,click:()=>clicks.push(key)}));
 const document={readyState:'loading',hidden:false,querySelector:x=>{
  if(x==='script[src*="zavi-voice-admin-v1442.js"]')return admin?{}:null;
  if(x==='#content')return admin?null:app;
  if(x==='#appScreen')return admin?app:null;
  return null;},querySelectorAll:()=>nodes,addEventListener:()=>{}};
 const win={ZaviAdminAPI:{getMode:()=> 'live'},ZaviVoiceProV6596:{route:()=>({kind:'unknown'})}};
 vm.runInNewContext(code,{window:win,document,Date,console,setInterval:()=>{},getComputedStyle:()=>({display:'block'}),localStorage:{getItem:()=>null,setItem:()=>{}},Option:function(){}},{timeout:1700});
 return {api:win.ZaviVoiceLocal6599,clicks};
}
const one=fake(false);
one.api.interpret('بخش فروش را باز کن');
one.api.interpret('باز بکن گدام');
one.api.interpret('د پیرود بخش خلاصه کړه');
one.api.interpret('open reports');
one.api.interpret('حذف تمام فروش');
assert.deepEqual(one.clicks,['sales','products','purchases','reports']);
const admin=fake(true);
admin.api.interpret('امنیت را باز کو');
admin.api.interpret('open payments');
admin.api.interpret('بخش فعالیت را باز کن');
admin.api.interpret('ړنګ ټول مشتریان');
assert.deepEqual(admin.clicks,['security','payments','activity']);
console.log('PASS: listen-only, accent aliases, legacy UI muted, safe mobile navigation, unsafe operations refused');
