const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync('app-source/one/index.html','utf8');
const source=html.slice(html.indexOf('function save(next){'),html.indexOf('\nfunction commit(fn){'));
function setup(hooks={},failStorage=false){
 const stored=new Map(),messages=[];
 const context={window:{zaviCloudCanEdit:()=>true,...hooks},db:{updatedAt:1,products:[],tx:[]},KEY:'qa',storageOk:true,
 localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>{if(failStorage)throw Error('QuotaExceeded');stored.set(k,v)},removeItem:k=>stored.delete(k)},
 toast:x=>messages.push(x),refreshBusinessAssets:()=>{},archiveInIndexedDB:()=>{}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,stored,messages};
}
test('a synchronous backup error after durable commit never reports the sale as failed',()=>{
 let synced=0;
 const {context,stored,messages}=setup({zaviOfflineBackupSave:()=>{throw Error('backup failed')},zaviCloudAfterSave:()=>synced++});
 const next={products:[],tx:[{id:'sale1',amount:123}]};
 assert.equal(context.save(next),true);
 assert.equal(synced,1);
 assert.equal(JSON.parse(stored.get('qa')).tx.length,1);
 assert.equal(context.db,next);
 assert.equal(messages.length,1);
});
test('rejected asynchronous sync keeps committed ledger and gives a retry warning',async()=>{
 const {context,stored,messages}=setup({zaviCloudAfterSave:()=>Promise.reject(Error('offline'))});
 assert.equal(context.save({products:[],tx:[{id:'sale2'}]}),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(stored.get('qa')).tx[0].id,'sale2');
 assert.equal(messages.length,1);
});
test('quota failure still aborts commit and never calls downstream hooks',()=>{
 let called=0;const {context,stored}=setup({zaviCloudAfterSave:()=>called++},true);
 const before=context.db;
 assert.equal(context.save({products:[],tx:[{id:'sale3'}]}),false);
 assert.equal(context.db,before);assert.equal(stored.size,0);assert.equal(called,0);
});
