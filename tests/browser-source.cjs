const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const app of ['one','admin']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8765/'+app+'/index.html');
  await page.waitForTimeout(1200);
  assert.equal(errors.length,0,JSON.stringify({app,errors}));
  await page.screenshot({path:'qa-'+app+'-login.png',fullPage:true});
  if(app==='one'){
   // Isolated fake workspace; no network, production credentials or server writes.
   await page.evaluate(()=>{
    KEY='zavi_qa_isolated';db=blankDB();
    window.zaviCloudCanEdit=()=>true;
    window.zaviCloudAfterSave=()=>{};
    printInvoice=()=>{};
    render();openOrder('purchase','',true);
   });
   const fields={freeContactName:'QA supplier',purchaseOrigin:'AE',originalCurrency:'USD',exchangeRate:'70.12345678',shippingOriginal:'2.10',customsOriginal:'1.20',otherCostsOriginal:'0.05',paid:'5'};
   await page.evaluate(fields=>{
    const form=document.getElementById('dialogForm');
    for(const [key,value] of Object.entries(fields)){form.elements[key].value=value;form.elements[key].dispatchEvent(new Event('input',{bubbles:true}));}
    form.querySelector('[data-field="productName"]').value='QA product';
    form.querySelector('[data-field="qty"]').value='1.250';
    form.querySelector('[data-field="price"]').value='20.50';
    form.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
   },fields);
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('zavi_qa_isolated')));
   assert.equal(state.tx.length,1,'one purchase must be persisted by production save()');
   const tx=state.tx[0];
   assert.equal(tx.purchaseOrigin,'AE');assert.equal(tx.originalCurrency,'USD');
   assert.equal(tx.originalAmount,28.98);assert.equal(tx.accountingTotal,2032.18);
   assert.equal(tx.customsOriginal,1.2);assert.equal(tx.otherCostsOriginal,.05);
   assert.equal(tx.originalPaid,5);assert.equal(state.products.length,1);
   assert.equal(await page.evaluate(()=>stockOf(db.products[0].id)),1.25);
   assert.equal(await page.evaluate(()=>contactBalances()[db.contacts[0].id].payable),1681.56);
   results.push({app,purchase:'passed',original:tx.originalAmount,accounting:tx.accountingTotal});
  }else results.push({app,boot:'passed'});
  assert.equal(errors.length,0,JSON.stringify({app,errors}));
  await context.close();
 }
 fs.writeFileSync('browser-source-results.json',JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
