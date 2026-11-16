const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');

const apk=process.env.ZAVI_HISTORIC_APK;
const repaired=process.env.ZAVI_REPAIRED_INDEX;
assert.ok(apk&&repaired,'Run with exact original APK and rebuilt staging index');
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),
  '2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc'
);
const original=execFileSync('unzip',['-p',apk,'assets/index.html'],{maxBuffer:2*1024*1024}).toString('utf8');
const fixed=fs.readFileSync(repaired,'utf8');

function extract(html){
  const start=html.indexOf('function save(next){');
  const end=html.indexOf('function commit(fn){',start);
  assert.ok(start>0&&end>start,'Real old save(next) and commit(fn) must remain');
  return html.slice(start,end);
}
function make(html,settings={}){
  const store=new Map();
  const messages=[];
  const events=[];
  const ctx={
    Date,Math,Promise,console,
    window:{
      zaviCloudCanEdit:()=>true,
      zaviCloudGetAuthSession:()=>null,
      zaviCloudRestoreInfo:()=>({}),
      zaviOfflineBackupSave:()=>{events.push('backup');if(settings.backupThrow)throw Error('offline backup unavailable');if(settings.backupReject)return Promise.reject(Error('offline backup rejected'));},
      zaviCloudAfterSave:()=>{events.push('cloud');if(settings.cloudThrow)throw Error('cloud disconnected');if(settings.cloudReject)return Promise.reject(Error('cloud denied'));},
      ZaviBarcodeV641:{invalidate:()=>{events.push('barcode');if(settings.barcodeThrow)throw Error('scanner cache');}}
    },
    db:{updatedAt:0,products:[],tx:[]},KEY:'qa',storageOk:false,
    localStorage:{
      getItem:k=>store.get(k)||null,
      setItem:(k,v)=>{if(settings.quotaThrow)throw Error('QuotaExceeded');store.set(k,v)},
      removeItem:k=>store.delete(k)
    },
    refreshBusinessAssets:()=>{events.push('assets');if(settings.assetsThrow)throw Error('DOM refresh failed')},
    archiveInIndexedDB:()=>{events.push('archive');if(settings.archiveThrow)throw Error('IDB failed')},
    toast:v=>messages.push(String(v))
  };
  vm.createContext(ctx);
  vm.runInContext(extract(html),ctx,{timeout:1000});
  return {ctx,store,messages,events};
}
function sale(){return {updatedAt:0,products:[],tx:[{id:'qa-unique-transaction',amount:123,currency:'AFN'}]}}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('reproduced HISTORICAL BUG: durable sale was saved but a backup crash caused false failure',()=>{
  const {ctx,store,events}=make(original,{backupThrow:true});
  assert.throws(()=>ctx.save(sale()),/offline backup unavailable/);
  assert.equal(JSON.parse(store.get('qa')).tx.length,1,'The original sale was durably stored');
  assert.equal(events.includes('cloud'),false,'Cloud was skipped after backup failure');
});

test('PATCH: synchronous failed backup cannot cause a second save and cloud is still called',()=>{
  const {ctx,store,messages,events}=make(fixed,{backupThrow:true});
  assert.equal(ctx.save(sale()),true);
  assert.equal(JSON.parse(store.get('qa')).tx.length,1);
  assert.equal(events.filter(x=>x==='cloud').length,1);
  assert.equal(events.filter(x=>x==='backup').length,1);
  assert.ok(messages.some(m=>m.includes('روی دستگاه ثبت شد')));
});

test('PATCH: promise rejected by backup is handled without unhandled-rejection and cloud still executes',async()=>{
  const {ctx,store,messages,events}=make(fixed,{backupReject:true});
  assert.equal(ctx.save(sale()),true);
  await tick();
  assert.equal(JSON.parse(store.get('qa')).tx.length,1);
  assert.equal(events.includes('cloud'),true);
  assert.ok(messages.some(x=>x.includes('پشتیبان‌گیری')));
});

test('PATCH: rejected cloud sync does not pretend the local sale was not saved',async()=>{
  const {ctx,store,messages}=make(fixed,{cloudReject:true});
  assert.equal(ctx.save(sale()),true);
  await tick();
  assert.equal(JSON.parse(store.get('qa')).tx.length,1);
  assert.ok(messages.some(x=>x.includes('همگام‌سازی')));
});

test('PATCH: synchronous cloud failure is reported after local commit, not thrown',()=>{
  const {ctx,store,messages}=make(fixed,{cloudThrow:true});
  assert.equal(ctx.save(sale()),true);
  assert.equal(JSON.parse(store.get('qa')).tx[0].amount,123);
  assert.ok(messages.some(x=>x.includes('همگام‌سازی')));
});

test('PATCH: barcode, display or IndexedDB follow-up errors do not prevent backup and cloud',()=>{
  for(const option of ['barcodeThrow','assetsThrow','archiveThrow']){
    const {ctx,events,store}=make(fixed,{[option]:true});
    assert.equal(ctx.save(sale()),true,option);
    assert.deepEqual(events.slice(-2),['backup','cloud'],option);
    assert.equal(JSON.parse(store.get('qa')).tx.length,1,option);
  }
});

test('PATCH: storage quota failure still returns false and never invokes cloud or backup',()=>{
  const {ctx,store,events,messages}=make(fixed,{quotaThrow:true});
  assert.equal(ctx.save(sale()),false);
  assert.equal(store.has('qa'),false);
  assert.equal(ctx.db.tx.length,0);
  assert.equal(events.includes('cloud'),false);
  assert.equal(events.includes('backup'),false);
  assert.ok(messages.some(x=>x.includes('ذخیره نشد')));
});

test('PATCH: successful save preserves normal call ordering and transaction contents',()=>{
  const {ctx,store,messages,events}=make(fixed);
  assert.equal(ctx.save(sale()),true);
  assert.deepEqual(events,['barcode','assets','archive','backup','cloud']);
  assert.equal(JSON.parse(store.get('qa')).tx[0].id,'qa-unique-transaction');
  assert.equal(messages.length,0);
});
