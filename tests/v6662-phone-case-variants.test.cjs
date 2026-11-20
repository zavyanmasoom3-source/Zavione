const test=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../tools/v6662/legacy-phone-case-variants.js');
const base={name:'کاور سیلیکونی',kind:'covers',model:'Samsung A56',material:'سیلیکون',salePrice:'150',purchasePrice:'75',reorder:'3'};
function ids(){let n=0;return prefix=>prefix+'_'+(++n)}
const example=[{color:'سیاه',qty:'5',barcode:'COV-A56-BLK'},{color:'آبی',qty:'2',barcode:'COV-A56-BLU'}];
test('each color has unique original ledger product and own opening stock',()=>{
 const records=build({...base,variants:example},[],ids());
 assert.equal(records.length,2);
 assert.notEqual(records[0].id,records[1].id);
 assert.notEqual(records[0].sku,records[1].sku);
 assert.deepEqual(records.map(x=>x.openingQty),[5,2]);
 assert.equal(records[0].openingCost,75);
 assert.equal(records[0].industryDetails.values.model,'Samsung A56');
 assert.equal(records[1].industryDetails.values.color,'آبی');
 assert.equal(records[0].industryDetails.type,'covers');
});
test('conflicting stored barcode is rejected without editing any record',()=>{
 const old=[{id:'p-old',name:'Existing item',sku:'COV-A56-BLK',openingQty:10}];
 assert.throws(()=>build({...base,variants:example},old,ids()),/تکراری/);
 assert.equal(old[0].openingQty,10);assert.equal(old.length,1);
});
test('duplicate color is rejected before any commit',()=>{
 assert.throws(()=>build({...base,variants:[example[0],example[0]]},[],ids()),/رنگ تکراری/);
});
test('invalid quantity and invalid price fail closed',()=>{
 assert.throws(()=>build({...base,variants:[{color:'سرخ',qty:'-1'}]},[],ids()),/نامعتبر/);
 assert.throws(()=>build({...base,variants:[{color:'سرخ',qty:'1.5'}]},[],ids()),/صحیح/);
 assert.throws(()=>build({...base,salePrice:'NaN',variants:example},[],ids()),/نامعتبر/);
});
test('automatically generated codes are unique for separate colors',()=>{
 const products=build({...base,variants:[{color:'شفاف',qty:'0'},{color:'صورتی',qty:'10'}]},[],ids());
 assert.notEqual(products[0].sku,products[1].sku);
 assert.ok(products.every(x=>x.sku.startsWith('ZV-')));
 assert.ok(products.every(x=>x.sku.length<=70));
});
test('another model with the same color has an independent name and stock',()=>{
 const old=build({...base,variants:[example[0]]},[],ids());
 const newer=build({...base,model:'iPhone 16',variants:[example[0].color==='سیاه'?{...example[0],barcode:'IPH-16-BLK'}:example[0]]},old,ids());
 assert.notEqual(newer[0].name,old[0].name);
 assert.equal(newer[0].openingQty,5);
});
test('accessory receives its own specialized metadata and barcode',()=>{
 const records=build({...base,kind:'accessories',name:'کابل شارژ',variants:[{color:'سفید',qty:'6',barcode:'CABLE-WHT-1'}]},[],ids());
 assert.equal(records[0].industryDetails.type,'accessories');
 assert.equal(records[0].category,'لوازم جانبی موبایل');
 assert.equal(records[0].industryDetails.values.variantBarcode,'CABLE-WHT-1');
});
