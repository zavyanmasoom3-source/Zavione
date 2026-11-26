const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.ZAVI_SALES_ASSETS;
assert.ok(root,'staged original APK assets required');
const api=require(path.resolve(root,'zavi-industry-forms-v6529.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('all 23 actual profile schemas have an optional initially empty sale form',()=>{
 assert.equal(api.types.length,23);
 assert.equal(new Set(api.types).size,23);
 for(const type of api.types){
  const ui=api.renderSale(type);
  assert.match(ui,/class="z629-industry zsales-optional"/);
  assert.doesNotMatch(ui,/<details[^>]*\sopen(?:\s|>)/);
  assert.doesNotMatch(ui,/\srequired(?:\s|>)/);
  assert.equal(Object.keys(api.collectSale(null,type).values).length,0);
  assert.ok(api.saleFields(type).length>0);
 }
});
test('gold choice or manual value, blank omission and jewelry type survive line metadata',()=>{
 const row={querySelectorAll:()=>[{dataset:{z629Key:'karat'},value:'21'},{dataset:{z629Key:'jewelryType'},value:'لاکت سفارشی'},{dataset:{z629Key:'grossGrams'},value:'5.25'},{dataset:{z629Key:'labor'},value:''}]};
 const d=api.collectSale(row,'gold');
 assert.deepEqual(d.values,{karat:'21',grossGrams:'5.25',jewelryType:'لاکت سفارشی'});
 assert.ok(api.display(d,99).some(([k,v])=>v==='لاکت سفارشی'));
 assert.throws(()=>api.normalize('gold',{grossGrams:'2',stoneGrams:'3'},{sale:true}));
 assert.throws(()=>api.normalize('gold',{karat:'other'})); // old product rules unchanged
 assert.equal(api.normalize('gold',{karat:'17K'},{sale:true}).values.karat,'17K');
});
test('mobile and cover choices are optional and IMEI validation retained',()=>{
 assert.match(api.renderSale('mobile'),/data-zsales-choice="brand"/);
 assert.match(api.renderSale('covers'),/data-zsales-choice="color"/);
 assert.throws(()=>api.normalize('mobile',{imei2:'123'},{sale:true}));
 assert.equal(api.normalize('mobile',{imei2:'123456789012345'},{sale:true}).values.imei2,'123456789012345');
});
test('actual sale entry routes keep stock, existing barcode and finance guards',()=>{
 const start=html.indexOf('function openOrder(kind,');
 const end=html.indexOf('function openCashForm(',start);
 const order=html.slice(start,end);
 for(const anchor of ['collectSale','data-zsales-load','data-zsales-choice','window.ZaviDecimal.invoiceTotals','stockOf(pid)','invoiceSubmitting','n.tx.push(payload)','zaviBarcodeScan','z659BarcodeConfirm','data-zavi-camera-open','f.accountId.value','f.paid.value','f.discount.value','printInvoice(saved)'])assert.ok(order.includes(anchor),anchor);
 assert.ok(html.includes('zsales-approved'));
 assert.ok(html.includes('zsalesFilterButton'));
});
