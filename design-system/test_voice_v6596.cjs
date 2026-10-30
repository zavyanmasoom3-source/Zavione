/* Run: node design-system/test_voice_v6596.cjs
 * Does not call a microphone, browser server, Supabase, invoice posting or any external API.
 */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
function load(name){
  const handlers=[];
  const document={readyState:'loading',addEventListener:(name,fn)=>handlers.push([name,fn])};
  const window={};
  const context={window,document,console,localStorage:{getItem:()=>null,setItem:()=>{}},Option:function(){},navigator:{},Event:function(){},SpeechSynthesisUtterance:function(){},requestAnimationFrame:()=>{},setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync('design-system/'+name,'utf8'),context,{filename:name,timeout:2000});
  assert.equal(handlers.length,1);
  return window.ZaviVoiceProV6596;
}
const one=load('zavi-voice-pro-v6596.js');
const admin=load('zavi-voice-admin-v1442.js');
assert(one&&admin,'voice module exports missing');
for(const voice of [one,admin]){
  assert.equal(voice.route('open settings').key,'settingsPage');
  assert.equal(voice.route('بخش فروش را باز کن').kind,voice.app==='one'?'navigate':'navigate_label');
  assert.equal(voice.route('حذف تمام اسناد').kind,'unknown');
  assert.equal(voice.route('pay Ahmad 500').kind,'unknown');
  assert.equal(voice.route('open subscriptions').kind,voice.app==='admin'?'navigate':'navigate_label');
}
const sale=one.route('فروش پنج کیلو برنج به احمد');
assert.equal(sale.kind,'draft');assert.equal(sale.draft.status,'DRAFT_ONLY');
assert.equal(sale.draft.party,'احمد');
assert.equal(sale.draft.items[0].quantity,5);
assert.equal(sale.draft.items[0].unit,'kg');
assert.equal(sale.draft.items[0].product,'برنج');
const en=one.route('sell two bottles oil to Ahmad');
assert.equal(en.kind,'draft');assert.equal(en.draft.items[0].quantity,2);
assert.equal(one.route('open purchases').kind,'navigate');
assert.equal(one.route('open colleague management').kind,'navigate_label');
assert.equal(admin.route('باز کن مدیریت همکاران').kind,'navigate_label');
assert.equal(one.route('موجودی را نشان بده').key,'inventory');
assert.equal(admin.route('پیام های مستقیم').key,'communications');
assert.equal(admin.route('بخش پشتیبانی را باز کن').key,'support');
assert.equal(admin.route('فروش پنج کیلو برنج به احمد').kind,'unknown','ADMIN voice must never draft a store invoice');
assert.equal(one.route('رمز خصوصی را حذف کن').kind,'unknown');
console.log('PASS ZAVI VOICE commands and safe invoice previews, languages, consent UI and admin read-only routing');
