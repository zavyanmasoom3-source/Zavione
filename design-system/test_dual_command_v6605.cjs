'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('design-system/zavi-dual-command-v6605.js','utf8');
const patch=fs.readFileSync('design-system/apply_dual_command_v6605.py','utf8');
const css=fs.readFileSync('design-system/zavi-dual-command-v6605.css','utf8');
assert(src.includes("id=\"z605-voice-tab\"")&&src.includes("id=\"z605-text-tab\""));
assert(src.includes("id=\"z605-type\"")&&src.includes("id=\"z605-execute\""));
assert(src.includes("window.ZaviVoiceLocalNativeEvent"));
assert(src.includes("ZaviAndroidLocalVoice.postMessage"));
assert(!src.includes("new Audio(")&&!src.includes('speechSynthesis'));
assert(patch.includes('window.__zaviDual605=true'));
assert(patch.includes('if(window.__zaviDual605)return;'));
assert(patch.includes('zavi-premium-cloud-v6604.js'));
assert(css.includes('#z605-panel')&&css.includes('prefers-reduced-motion:reduce'));
function vmApp(admin){
 const opened=[];
 const keys=admin?['overview','customers','devices','support','payments','finance','activity','health','brand','security','settings']:
 ['dashboard','sales','purchases','products','contacts','debtors','creditors','reports','settings','expenses','money','hawala','phonebook','journal','waste','repairs','subscription'];
 const nodes=keys.map(key=>({isConnected:true,disabled:false,dataset:admin?{page:key}:{go:key},
  textContent:key,closest:()=>null,getAttribute:()=>null,click(){opened.push(key)}}));
 const authScreen={hidden:true},appScreen={hidden:false},content={hidden:false};
 const doc={readyState:'loading',hidden:false,
  querySelector(s){
   if(s==='script[src*="zavi-voice-admin-v1442.js"]')return admin?{}:null;
   if(s==='#z704-welcome')return null;
   if(s==='#authScreen')return admin?authScreen:null;
   if(s==='#appScreen')return admin?appScreen:null;
   if(s==='#loginScreen')return null;
   if(s==='#content')return admin?null:content;
   return null;
  },querySelectorAll(s){return nodes},addEventListener(){}};
 const win={ZaviAdminAPI:{getMode:()=> 'live'},ZaviVoiceProV6596:{route:s=>({
  kind:s.includes('دو کیلو')?'draft':'unknown',key:'sales',draft:{items:[{product:'برنج',quantity:2}],party:'احمد'}})}};
 const context={window:win,document:doc,localStorage:{getItem:()=>null,setItem(){}},Date,
  getComputedStyle:()=>({display:'block'}),console};
 vm.runInNewContext(src,context,{timeout:2500});
 const api=win.ZaviDualCommand605;assert.equal(api.app,admin?'admin':'one');
 return {api,opened,doc,win};
}
const one=vmApp(false);
const phrases=[['فروش را باز کن','sales'],['تنظیمات را باز کن','settings'],['باز کن بخش فروش','sales'],
 ['بخش گدام را باز کو','products'],['د پلور برخه خلاصه کړه','sales'],['Open sales','sales'],
 ['open settings','settings'],['گدام را باز کن','products'],['بخش خرید را باز کن','purchases'],
 ['نمایش گزارش ها','reports']];
for(const [input,key] of phrases){
 const p=one.api.parseCommand(input);
 assert.equal(p.kind,'navigate','parse '+input);
 assert.equal(p.key,key,'section '+input);
 assert.equal(one.api.execute(input,'text').kind,'navigate','typed command '+input);
 assert.equal(one.opened.at(-1),key,'opened '+input);
}
assert.equal(one.api.parseCommand('حذف تمام فاکتورها').kind,'refuse');
assert.equal(one.api.parseCommand('delete all customers').kind,'refuse');
assert.equal(one.api.parseCommand('فروش دو کیلو برنج').kind,'draft','financial speech never posts');
assert(!one.opened.includes('delete'));
const admin=vmApp(true);
for(const [cmd,key] of [['تنظیمات را باز کن','settings'],['open payments','payments'],['گزارش مالی باز کن','finance'],['امنیت را باز کن','security']]){
 const result=admin.api.execute(cmd,'text');
 assert.equal(result.kind,'navigate',cmd);
 assert.equal(admin.opened.at(-1),key,cmd);
}
assert.equal(admin.api.parseCommand('فروش را باز کن').kind,'unknown','ADMIN does not expose store sales');
const before=one.opened.length;
one.doc.querySelector=selector=>selector==='#loginScreen'?{hidden:false}:
  selector==='#content'?{hidden:false}:null;
assert.equal(one.api.execute('فروش را باز کن').kind,'blocked','Cloud login gate required');
assert.equal(one.opened.length,before,'no bypass while logged out');
console.log('PASS typed and voice intent shared, Dari/Pashto/English sales+settings, stock/report, unsafe requests denied, admin restricted, actual navigation clicked, cloud gate respected');
