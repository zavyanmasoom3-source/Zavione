const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/one/index.html');
  const result=await page.evaluate(async()=>{
   const api=window.ZaviWarehouseTransfersV1;
   if(!api||!window.ZaviWarehouseV1)throw Error('Warehouse transfer source integration missing');
   const ws='11111111-1111-4111-8111-111111111111';
   const w1={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',workspace_id:ws,name:'گدام اول',code:'ONE',is_active:true};
   const w2={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',workspace_id:ws,name:'گدام دوم',code:'TWO',is_active:true};
   const original={state:window.zaviCloudRestoreInfo,auth:window.zaviCloudGetAuthSession,cfg:window.zaviCloudGetPublicConfig,refresh:window.zaviCloudRefreshAuthSession,can:window.zaviCloudCanEdit,fetch:window.fetch,whrefresh:window.ZaviWarehouseV1.refresh};
   const origDB=db;
   let ownerRole='owner',failPost=false,posts=0,refreshCount=0,swapOnRefresh=false,user='00000000-0000-4000-8000-000000000000';
   const saved=new Map(),ids=[];
   window.zaviCloudRestoreInfo=()=>({workspace:ws,role:ownerRole});
   window.zaviCloudGetAuthSession=()=>({user:{id:user}});
   window.zaviCloudGetPublicConfig=()=>({url:'https://warehouse-transfers-qa.invalid',key:'qa-public-key'});
   window.zaviCloudRefreshAuthSession=async()=>{if(swapOnRefresh){user='other-user';swapOnRefresh=false}return {access_token:'qa-owner-jwt'}};
   window.zaviCloudCanEdit=()=>true;
   window.ZaviWarehouseV1.refresh=async()=>{refreshCount++};
   window.fetch=async(url,init={})=>{
    const u=new URL(url);if(u.hostname!=='warehouse-transfers-qa.invalid')return original.fetch(url,init);
    if(init.headers?.Authorization!=='Bearer qa-owner-jwt'||init.headers?.apikey!=='qa-public-key')throw Error('Missing owner token');
    if(init.method==='GET'){
     const id=u.searchParams.get('id')?.replace(/^eq\./,'');
     return {ok:true,status:200,json:async()=>id&&saved.has(id)?[saved.get(id)]:[]};
    }
    if(init.method==='POST'&&u.pathname.endsWith('/rpc/zavi_warehouse_post_movement')){
     const body=JSON.parse(init.body);posts++;ids.push(body.p_operation_id);
     if(body.p_workspace_id!==ws||body.p_from_warehouse_id!==w1.id||body.p_to_warehouse_id!==w2.id||body.p_product_ref!=='P1'||body.p_quantity!=='1.2500')throw Error('Wrong RPC data or precision');
     saved.set(body.p_operation_id,{id:body.p_operation_id,workspace_id:ws,from_warehouse_id:body.p_from_warehouse_id,to_warehouse_id:body.p_to_warehouse_id,product_ref:body.p_product_ref,quantity:body.p_quantity,reference:body.p_reference});
     if(failPost)throw new TypeError('Simulated lost response AFTER server commit');
     return {ok:true,status:200,json:async()=>body.p_operation_id};
    }
    throw Error('Unexpected fetch '+init.method+' '+u.pathname);
   };
   db=blankDB();db.products=[{id:'P1',name:'QA product',purchasePrice:100}];
   const before=JSON.stringify(db);
   const container=document.createElement('div');container.innerHTML=window.ZaviWarehouseV1.panel();document.body.appendChild(container);
   const box=container.firstElementChild;
   // The production warehouse catalog renders these rows before activating transfers.
   const catalog=box.querySelector('.zv-wh-list');
   for(const warehouse of [w1,w2]){
    const row=document.createElement('div');row.className='zv-wh-row';
    const toggle=document.createElement('button');toggle.dataset.whToggle=warehouse.id;
    row.appendChild(toggle);catalog.appendChild(row);
   }
   const delay=async ok=>{for(let i=0;i<100&&!ok();i++)await new Promise(r=>setTimeout(r,15));if(!ok())throw Error('Timed out waiting for server-side transfer state '+JSON.stringify({posts,refreshCount,status:box.querySelector('.zv-wh-transfer')?.textContent,pending:api.pending({user:'00000000-0000-4000-8000-000000000000',workspace:ws}),form:!!box.querySelector('[data-zv-transfer-form]')}))};
   try{
    api.mount(box,[w1,w2]);
    const submitFirst=()=>{
     const f=box.querySelector('[data-zv-transfer-form]');if(!f)throw Error('Owner transfer form not available');
     f.elements.quantity.value='۱٫۲۵۰۰';
     f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    };
    submitFirst();
    await delay(()=>posts===1&&refreshCount===1&&!api.pending({user:'00000000-0000-4000-8000-000000000000',workspace:ws}));
    const first=ids[0];
    if(!first||!saved.has(first))throw Error('First transfer not confirmed by server');
    if(JSON.stringify(db)!==before)throw Error('Transfer incorrectly modified historical accounting ledger');
    api.mount(box,[w1,w2]);failPost=true;submitFirst();
    await delay(()=>posts===2&&box.querySelector('[data-zv-retry-transfer]'));
    const second=ids[1];
    if(second===first||!saved.has(second))throw Error('Second server commit was not tracked');
    failPost=false;
    // Same operation ID with a different quantity must never be acknowledged.
    const actualRecord={...saved.get(second)};
    saved.get(second).quantity='9.0000';
    box.querySelector('[data-zv-retry-transfer]').click();
    await new Promise(r=>setTimeout(r,60));
    if(!api.pending({user:'00000000-0000-4000-8000-000000000000',workspace:ws})||refreshCount!==1||posts!==2)throw Error('Mismatched transfer was incorrectly confirmed');
    saved.set(second,actualRecord);
    box.querySelector('[data-zv-retry-transfer]').click();
    await delay(()=>refreshCount===2&&!api.pending({user:'00000000-0000-4000-8000-000000000000',workspace:ws}));
    if(posts!==2)throw Error('Lost response retry duplicated server transfer');
    if(JSON.stringify(db)!==before)throw Error('Historical accounting balance changed after retry');
    // Changing users during token refresh, even within the same workspace,
    // must preserve the old user's pending operation and never send their POST.
    api.mount(box,[w1,w2]);swapOnRefresh=true;submitFirst();
    await delay(()=>user==='other-user'&&!box.querySelector('[data-zv-transfer-form]'));
    if(posts!==2||!api.pending({user:'00000000-0000-4000-8000-000000000000',workspace:ws}))throw Error('Account switch posted or lost the pending transfer');
    user='00000000-0000-4000-8000-000000000000';api.mount(box,[w1,w2]);
    box.querySelector('[data-zv-retry-transfer]').click();
    await delay(()=>posts===3&&refreshCount===3&&!api.pending({user,workspace:ws}));
    ownerRole='viewer';api.mount(box,[w1,w2]);
    if(box.querySelector('[data-zv-transfer-form]')||box.querySelector('[data-zv-retry-transfer]'))throw Error('Viewer could access transfer form');
    return {posts,confirmed:saved.size,retriesWithoutPosting:true,ownerOnly:true,ledgerIntact:true};
   }finally{
    container.remove();
    db=origDB;window.zaviCloudRestoreInfo=original.state;window.zaviCloudGetAuthSession=original.auth;
    window.zaviCloudGetPublicConfig=original.cfg;window.zaviCloudRefreshAuthSession=original.refresh;
    window.zaviCloudCanEdit=original.can;window.fetch=original.fetch;window.ZaviWarehouseV1.refresh=original.whrefresh;
   }
  });
  assert.deepEqual(errors,[]);
  assert.equal(result.posts,3);assert.equal(result.confirmed,3);
  assert.equal(result.ownerOnly,true);assert.equal(result.ledgerIntact,true);
  console.log('Warehouse owner-only transfer; durable idempotent retry after lost response; untouched invoices PASSED',result);
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
