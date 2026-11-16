/* Verify the REAL historical V66.62-labeled Android asset's own backup code.
 * All examples are synthetic; no production database, credentials or customer data.
 * Browser localStorage, native Android file picker and device upgrades are NOT proven.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {TextEncoder, TextDecoder} = require('node:util');

const apk = process.env.ZAVI_BASELINE_APK;
if (!apk || !fs.existsSync(apk)) throw Error('Set ZAVI_BASELINE_APK to the exact archived 62MB APK');
const sha = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
assert.equal(sha, '2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc',
  'Never test reconstructed/new-design code instead of the historical source');
const readAsset = name => execFileSync('unzip', ['-p',apk, 'assets/'+name],{maxBuffer:2*1024*1024}).toString('utf8');
const html = readAsset('index.html');
const integrityScript = readAsset('zavi-backup-integrity-v647.js');
const start = html.indexOf('function b64u(bytes)');
const end = html.indexOf('// V64.9:',start);
const guardStart = html.indexOf('function zaviCanExportSensitiveV646()');
const guardEnd = html.indexOf('function exportCSV',guardStart);
assert.ok(start>0 && end>start && guardStart>0 && guardEnd>guardStart, 'Original backup source not found');
const backupSource = html.slice(start,end);
const securityGuard = html.slice(guardStart,guardEnd);
const shopId = '00000000-0000-4000-8000-000000000002';
const ownerId = '00000000-0000-4000-8000-000000000001';

function sandbox({workspace=shopId,uid=ownerId,role='owner',confirm=()=>true,password='test-strong-pass'}={}) {
  const state={workspace,uid,role};
  const ctx = {
    crypto:crypto.webcrypto, TextEncoder,TextDecoder,Uint8Array,btoa,atob,queueMicrotask,
    setTimeout, clearTimeout, console,
    window: {
      crypto:crypto.webcrypto,
      zaviCloudGetAuthSession:()=>({user:{id:state.uid}}),
      zaviCloudRestoreInfo:()=>({workspace:state.workspace,role:state.role})
    },
    db:{version:1,shop:'QA ONLY - NOT REAL',products:[{id:'qa-p',name:'QA Item'}],
      contacts:[{id:'qa-c',name:'QA Customer'}],accounts:[{id:'qa-cash',opening:0}],
      tx:[{id:'qa-tx',type:'sale',date:'2026-11-16',amount:123.45,currency:'AFN'}]},
    calls:0,saved:null,messages:[],download:null,
    save:function(next){ctx.calls++;ctx.saved=JSON.parse(JSON.stringify(next));return true;},
    confirm, prompt:()=>password,
    toast:msg=>ctx.messages.push(String(msg)),
    go:()=>{}, ensureCoreAccounts:obj=>obj,markBackupTime:()=>{},
    nowISO:()=>'2026-11-16',
    downloadBlob:(data,name,type)=>{ctx.download={data,name,type};},
    FileReader:class {readAsText(file){this.result=file.text;queueMicrotask(()=>this.onload?.());}}
  };
  vm.createContext(ctx);
  vm.runInContext(integrityScript,ctx,{timeout:1000});
  vm.runInContext(securityGuard+'\n'+backupSource,ctx,{timeout:2000});
  return {ctx,state};
}

async function settle(ctx) {
  for(let i=0;i<150;i++){
    if(ctx.messages.length) return;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  throw Error('Backup operation did not produce an observable outcome');
}
function file(obj){const text=typeof obj==='string'?obj:JSON.stringify(obj);return {size:Buffer.byteLength(text,'utf8'),text};}
async function sealed(ctx) {
  return ctx.window.ZaviBackupIntegrity647.seal(ctx.zaviExportBackupV646(),crypto.webcrypto.subtle);
}

test('original scoped SHA-256 backup restores complete ledger for SAME owner only',async()=>{
  const {ctx} = sandbox();
  const exportObject=await sealed(ctx);
  assert.equal(exportObject.zavi_backup_scope.owner_uid,ownerId);
  assert.equal(exportObject.zavi_backup_scope.workspace_id,shopId);
  ctx.importBackup(file(exportObject));
  await settle(ctx);
  assert.equal(ctx.calls,1);
  assert.equal(ctx.saved.tx.length,1);
  assert.equal(ctx.saved.tx[0].amount,123.45);
  assert.equal(ctx.saved.products.length,1);
  assert.equal(ctx.saved.contacts.length,1);
  assert.equal(ctx.saved.accounts.length,1);
  assert.equal(Object.hasOwn(ctx.saved,'zavi_backup_scope'),false);
  assert.equal(Object.hasOwn(ctx.saved,'zavi_backup_integrity'),false);
});

test('original scoped backup rejects DIFFERENT workspace without any save',async()=>{
  const {ctx,state}=sandbox();
  const exportObject=await sealed(ctx);
  state.workspace='00000000-0000-4000-8000-000000000009';
  ctx.importBackup(file(exportObject));
  await settle(ctx);
  assert.equal(ctx.calls,0);
  assert.match(ctx.messages.join(' '),/حساب یا فروشگاه دیگری/);
});

test('original scoped backup rejects DIFFERENT owner without any save',async()=>{
  const {ctx,state}=sandbox();
  const exportObject=await sealed(ctx);
  state.uid='00000000-0000-4000-8000-000000000010';
  ctx.importBackup(file(exportObject));
  await settle(ctx);
  assert.equal(ctx.calls,0);
  assert.match(ctx.messages.join(' '),/حساب یا فروشگاه دیگری/);
});

test('altered transaction amount fails SHA-256 verification before save',async()=>{
  const {ctx}=sandbox();
  const original=await sealed(ctx);
  original.tx[0].amount=999999;
  ctx.importBackup(file(original));
  await settle(ctx);
  assert.equal(ctx.calls,0);
  assert.match(ctx.messages.join(' '),/تغییر کرده|آسیب/);
});

test('canceling overwrite confirmation keeps existing data unchanged',async()=>{
  const {ctx}=sandbox({confirm:()=>false});
  const oldSnapshot=JSON.stringify(ctx.db);
  ctx.importBackup(file(await sealed(ctx)));
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(ctx.calls,0);
  assert.equal(JSON.stringify(ctx.db),oldSnapshot);
});

test('original encrypted backup can decrypt and import for the SAME owner',async()=>{
  const {ctx}=sandbox();
  await ctx.backupSecure();
  assert.ok(ctx.download?.data,'Original AES-GCM export must create an encrypted file');
  assert.match(ctx.download.name,/\.zavibak$/);
  const obj=JSON.parse(ctx.download.data);
  assert.equal(obj.format,'ZAVI-STOER-ENC-v1');
  assert.equal(obj.alg,'AES-256-GCM');
  assert.equal(obj.iterations,220000);
  assert.equal(ctx.download.data.includes('QA Customer'),false,'No plaintext ledger data may appear in encrypted file');
  ctx.messages.length=0;
  ctx.importBackup(file(ctx.download.data));
  await settle(ctx);
  assert.equal(ctx.calls,1);
  assert.equal(ctx.saved.tx[0].amount,123.45);
});

test('wrong encrypted backup password does not restore data',async()=>{
  const {ctx}=sandbox();
  await ctx.backupSecure();
  const encrypted=ctx.download.data;
  ctx.prompt=()=> 'wrong-key';
  ctx.messages.length=0;
  ctx.importBackup(file(encrypted));
  await settle(ctx);
  assert.equal(ctx.calls,0);
  assert.match(ctx.messages.join(' '),/رمز نادرست|آسیب/);
});

test('viewer is blocked from exporting owner financial records',async()=>{
  const {ctx}=sandbox({role:'viewer'});
  await ctx.backup();
  assert.equal(ctx.download,null);
  assert.match(ctx.messages.join(' '),/همکار مشاهده‌کننده/);
});
