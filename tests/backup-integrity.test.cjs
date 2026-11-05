const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const backup=require('../app-source/one/zavi-backup-integrity-v647.js');
const hash=webcrypto.subtle;

test('backup integrity seal and verification preserve original ledger and customer fields',async()=>{
 const payload={version:1,shop:'QA only',customers:[{id:'test-1',name:'Test Client'}],
   tx:[{id:'tx1',type:'sale',amount:93.125,currency:'AFN'}],
   licenses:{offline:true},warehouses:{main:[{product:'QA item',quantity:4}]}};
 const before=JSON.stringify(payload);
 const sealed=await backup.seal(payload,hash);
 assert.equal(JSON.stringify(payload),before,'seal must never mutate accounting data');
 assert.deepEqual({...sealed,[backup.marker]:undefined},{...payload,[backup.marker]:undefined});
 assert.match(sealed[backup.marker].sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(await backup.verify(sealed,hash),{status:'verified'});
});

test('reject any edited financial amount or damaged backup fingerprint',async()=>{
 const original=await backup.seal({tx:[{id:'qa',amount:150}],currency:'AFN'},hash);
 const changed=structuredClone(original);changed.tx[0].amount=150.01;
 await assert.rejects(backup.verify(changed,hash),/تغییر کرده|آسیب/);
 const changedHash=structuredClone(original);changedHash[backup.marker].sha256='0'.repeat(64);
 await assert.rejects(backup.verify(changedHash,hash),/تغییر کرده|آسیب/);
 const invalid={...original,[backup.marker]:{format:'unknown',sha256:'0'.repeat(64)}};
 await assert.rejects(backup.verify(invalid,hash),/نامعتبر/);
});

test('old backups remain readable and explicitly marked legacy',async()=>{
 const raw={tx:[{id:'one',amount:7}],noSignature:true};
 assert.deepEqual(await backup.verify(raw,hash),{status:'legacy'});
});
