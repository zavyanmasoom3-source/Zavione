const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8765/one/index.html');
  const result=await page.evaluate(async()=>{
   if(!window.ZaviWarehouseV1)throw Error('Warehouse source asset is missing');
   const saved={state:window.zaviCloudRestoreInfo,config:window.zaviCloudGetPublicConfig,session:window.zaviCloudRefreshAuthSession,fetch:window.fetch};
   const workspace='11111111-1111-4111-8111-111111111111',records=[],calls=[];
   window.zaviCloudRestoreInfo=()=>({workspace,role:'owner'});
   window.zaviCloudGetPublicConfig=()=>({url:'https://warehouse-qa.invalid',key:'sb_publishable_test'});
   window.zaviCloudRefreshAuthSession=async()=>({access_token:'qa-user-token'});
   window.fetch=async(input,opts={})=>{
    const url=new URL(input);if(url.hostname!=='warehouse-qa.invalid')return saved.fetch(input,opts);
    if(opts.headers?.Authorization!=='Bearer qa-user-token'||opts.headers?.apikey!=='sb_publishable_test')throw Error('Missing authenticated headers');
    const method=opts.method||'GET';calls.push(method);let value;
    if(method==='GET')value=url.pathname.endsWith('zavi_warehouse_movements')?
      [{workspace_id:workspace,id:'33333333-3333-4333-8333-333333333333',from_warehouse_id:null,to_warehouse_id:'22222222-2222-4222-8222-222222222222',product_ref:'QA-PRODUCT',quantity:'3.5000',reference:'QA receipt',created_at:'2026-11-03T10:00:00Z'},
       {workspace_id:'99999999-9999-4999-8999-999999999999',id:'44444444-4444-4444-8444-444444444444',from_warehouse_id:null,to_warehouse_id:'22222222-2222-4222-8222-222222222222',product_ref:'SECRET-HISTORY',quantity:'9.0000'}]:
       url.pathname.endsWith('zavi_warehouse_stock_summary')?
      [{workspace_id:workspace,warehouse_id:'22222222-2222-4222-8222-222222222222',product_ref:'QA-PRODUCT',quantity:'3.5000'},
       {workspace_id:'99999999-9999-4999-8999-999999999999',warehouse_id:'22222222-2222-4222-8222-222222222222',product_ref:'PRIVATE',quantity:'999.0000'}]:
       records.map(x=>({...x}));
    else if(method==='POST'){const body=JSON.parse(opts.body);if(body.workspace_id!==workspace)throw Error('Wrong tenant');value=[{...body,id:'22222222-2222-4222-8222-222222222222',is_active:true}];records.push(value[0]);}
    else if(method==='PATCH'){const target=url.searchParams.get('id').slice(3);const record=records.find(x=>x.id===target);if(!record)throw Error('Missing warehouse');Object.assign(record,JSON.parse(opts.body));value=[{...record}];}
    else throw Error('Unsupported test method '+method);
    return {ok:true,status:200,json:async()=>value}
   };
   try{
    const container=document.createElement('div');container.innerHTML=window.ZaviWarehouseV1.panel();document.body.appendChild(container);
    const panel=container.firstElementChild;
    await window.ZaviWarehouseV1.refresh(panel);
    if(panel.querySelectorAll('.zv-wh-row').length!==0)throw Error('Unexpected initial warehouse');
    const form=panel.querySelector('form[data-wh-add]');
    form.elements.warehouse_name.value='گدام اصلی';
    form.elements.warehouse_code.value='MAIN';
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    for(let i=0;i<30&&!records.length;i++)await new Promise(r=>setTimeout(r,20));
    for(let i=0;i<30&&panel.querySelectorAll('.zv-wh-row').length!==1;i++)await new Promise(r=>setTimeout(r,20));
    if(records.length!==1||panel.querySelectorAll('.zv-wh-row').length!==1)throw Error('Create warehouse not persisted in cloud mock');
    if(panel.querySelectorAll('.zv-wh-stock-row').length!==1)throw Error('Stock must be fetched and tenant filtered');
    if(!panel.querySelector('.zv-wh-stock-row').textContent.includes('3.5000'))throw Error('Original stock precision missing');
    if(panel.textContent.includes('PRIVATE')||panel.textContent.includes('SECRET-HISTORY'))throw Error('Cross-tenant warehouse data leaked');
    if(panel.querySelectorAll('.zv-wh-history .zv-wh-stock-row').length!==1)throw Error('Server movement history missing');
    const editButton=panel.querySelector('[data-wh-edit]');
    editButton.click();
    const editForm=panel.querySelector('[data-wh-edit-form]');
    if(!editForm)throw Error('Edit warehouse form not shown');
    editForm.elements.name.value='گدام مرکزی';
    editForm.elements.code.value='CENTER';
    editForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    for(let i=0;i<30&&records[0].code!=='CENTER';i++)await new Promise(r=>setTimeout(r,20));
    if(records[0].code!=='CENTER'||records[0].name!=='گدام مرکزی')throw Error('Warehouse rename not stored');
    for(let i=0;i<30&&panel.querySelector('[data-wh-edit-form]');i++)await new Promise(r=>setTimeout(r,20));
    const toggle=panel.querySelector('[data-wh-toggle]');
    toggle.click();
    for(let i=0;i<30&&records[0].is_active;i++)await new Promise(r=>setTimeout(r,20));
    if(records[0].is_active!==false)throw Error('Warehouse deactivate failed');
    window.zaviCloudRestoreInfo=()=>({workspace,role:'viewer'});
    await window.ZaviWarehouseV1.refresh(panel);
    if(!form.hidden||!panel.textContent.includes('مالک')||panel.querySelectorAll('.zv-wh-stock-row').length)throw Error('Owner-only guard failed');
    return {create:true,edit:true,deactivate:true,stockView:true,history:true,tenantFilter:true,deniedViewer:true,calls};
   }finally{
    window.zaviCloudRestoreInfo=saved.state;window.zaviCloudGetPublicConfig=saved.config;
    window.zaviCloudRefreshAuthSession=saved.session;window.fetch=saved.fetch;
   }
  });
  assert.equal(result.calls.filter(x=>x==='POST').length,1);assert.equal(result.calls.filter(x=>x==='PATCH').length,2);assert.equal(result.calls.filter(x=>x==='GET').length,12);
  assert.equal(result.create,true);assert.equal(result.edit,true);assert.equal(result.deactivate,true);assert.equal(result.history,true);assert.equal(result.stockView,true);assert.equal(result.tenantFilter,true);assert.equal(result.deniedViewer,true);
  console.log('Warehouse owner-only source-browser test passed',result);
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
