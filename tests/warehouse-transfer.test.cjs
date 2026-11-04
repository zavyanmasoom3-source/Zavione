const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../app-source/one/zavi-warehouse-transfers-v1.js');
test('Dari/Pashto warehouse transfer quantities are exact decimals, not floats',()=>{
 const accepted=new Map([['۱٫۲۵۰۰','1.2500'],['١٢.٠٠٠١','12.0001'],['0.0001','0.0001'],['100000000000.9999','100000000000.9999'],['1','1']]);
 for(const [raw,expected] of accepted)assert.equal(api.quantity(raw),expected);
 for(const bad of ['0','0.0000','-1','1e3','1.00000','1000000000000','1,5','NaN','Infinity','',null,' 1abc',{}])assert.throws(()=>api.quantity(bad),/INVALID_QUANTITY/);
});
test('Transfer IDs and distinct source/destination are required; no amount is rounded',()=>{
 const item={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',workspace_id:'ws1',
 from_warehouse_id:'from',to_warehouse_id:'to',product_ref:'P1',p_quantity:'۲٫۴۰۰۰',reference:'QA'};
 const value=api.operation(item);
 assert.equal(value.p_quantity,'2.4000');
 assert.equal(Object.isFrozen(value),true);
 assert.equal(item.p_quantity,'۲٫۴۰۰۰','source input must remain untouched');
 assert.throws(()=>api.operation({...item,from_warehouse_id:'to'}),/INVALID_TRANSFER/);
 assert.throws(()=>api.operation({...item,id:''}),/INVALID_TRANSFER/);
});

test('reconciliation requires full immutable transfer contents, including exact quantity',()=>{
 const item={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',workspace_id:'ws1',from_warehouse_id:'from',to_warehouse_id:'to',product_ref:'P1',p_quantity:'1.25',reference:'invoice1'};
 const row={...item,quantity:'1.2500'};
 assert.equal(api.matches(item,row),true);
 for(const [key,value] of Object.entries({workspace_id:'ws2',from_warehouse_id:'other',to_warehouse_id:'other',product_ref:'P2',quantity:'1.2501',reference:'different'}))assert.equal(api.matches(item,{...row,[key]:value}),false,key);
 assert.equal(api.matches(item,{id:item.id,workspace_id:item.workspace_id}),false);
 assert.equal(api.matches(item,{...row,quantity:'NaN'}),false);
});
