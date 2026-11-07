/* ZAVI ONE 67.10 — invoice/warehouse bridge.
 * Server stock is authoritative for selected independent warehouses.
 * A cached snapshot is read-only and used for offline display/preflight only.
 * Server writes use stable UUID operations and the atomic batch RPC.
 */
(function(root){'use strict';
 const VERSION=1,MAX_ROWS=5000,MAX_LINES=200;
 const tr=(fa,ps,en)=>{const l=String(root.document?.documentElement?.lang||'fa-AF').toLowerCase();return l.startsWith('en')?en:l.startsWith('ps')?ps:fa};
 function identity(){
  const info=root.zaviCloudRestoreInfo?.(),cfg=root.zaviCloudGetPublicConfig?.(),session=root.zaviCloudGetAuthSession?.();
  if(info?.role!=='owner'||!info.workspace||!session?.user?.id||!cfg?.url||!/^https:\/\/[a-z0-9.-]+$/i.test(cfg.url)||!cfg.key)return null;
  return {workspace:String(info.workspace),user:String(session.user.id),url:String(cfg.url).replace(/\/$/,''),key:String(cfg.key)};
 }
 const cacheKey=id=>'zavi_wh_invoice_v6710_'+id.user+'_'+id.workspace;
 function cleanWarehouse(w){return w&&w.id&&w.workspace_id?{id:String(w.id),workspace_id:String(w.workspace_id),name:String(w.name||''),code:String(w.code||''),is_active:!!w.is_active}:null}
 function cleanStock(x){
  const q=Number(x?.quantity);
  return x&&x.warehouse_id&&x.product_ref&&Number.isFinite(q)?{warehouse_id:String(x.warehouse_id),product_ref:String(x.product_ref),quantity:q}:null;
 }
 function cached(){
  const id=identity();if(!id)return null;
  try{
   const raw=JSON.parse(root.localStorage.getItem(cacheKey(id))||'null');
   if(!raw||raw.version!==VERSION||raw.workspace!==id.workspace||!Array.isArray(raw.warehouses)||!Array.isArray(raw.stock))return null;
   return raw;
  }catch{return null}
 }
 function save(id,snapshot){
  try{root.localStorage.setItem(cacheKey(id),JSON.stringify(snapshot));}catch(_){}
  root.document?.dispatchEvent(new CustomEvent('zavi:warehouse-snapshot',{detail:{workspace:id.workspace,fetchedAt:snapshot.fetchedAt}}));
  return snapshot;
 }
 async function request(id,path,method='GET',body){
  if(root.navigator?.onLine===false)throw Error('OFFLINE');
  const before=identity();if(!before||before.user!==id.user||before.workspace!==id.workspace)throw Error('SESSION_CHANGED');
  const auth=await root.zaviCloudRefreshAuthSession?.();
  const now=identity();
  if(!auth?.access_token||!now||now.user!==id.user||now.workspace!==id.workspace)throw Error('SESSION_CHANGED');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  try{
   const headers={apikey:id.key,Authorization:'Bearer '+auth.access_token};
   if(body!==undefined){headers['Content-Type']='application/json';headers.Prefer='return=representation'}
   const response=await root.fetch(id.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
   let data=null;try{data=await response.json()}catch(_){}
   if(!response.ok){const e=new Error(String(data?.message||data?.error||'HTTP '+response.status));e.status=response.status;throw e}
   return data;
  }finally{clearTimeout(timer)}
 }
 async function load(){
  const id=identity();if(!id)throw Error('OWNER_SESSION_REQUIRED');
  const [warehouses,stock]=await Promise.all([
   request(id,'/rest/v1/zavi_warehouses?select=id,name,code,is_active,workspace_id&workspace_id=eq.'+encodeURIComponent(id.workspace)+'&is_active=eq.true&order=created_at.asc&limit=200'),
   request(id,'/rest/v1/zavi_warehouse_stock_summary?select=warehouse_id,product_ref,quantity,workspace_id&workspace_id=eq.'+encodeURIComponent(id.workspace)+'&order=warehouse_id,product_ref&limit='+MAX_ROWS)
  ]);
  const cleanW=(Array.isArray(warehouses)?warehouses:[]).map(cleanWarehouse).filter(x=>x&&x.workspace_id===id.workspace&&x.is_active);
  const ids=new Set(cleanW.map(x=>x.id));
  const cleanS=(Array.isArray(stock)?stock:[]).map(cleanStock).filter(x=>x&&ids.has(x.warehouse_id));
  return save(id,{version:VERSION,workspace:id.workspace,fetchedAt:new Date().toISOString(),warehouses:cleanW,stock:cleanS,truncated:Array.isArray(stock)&&stock.length>=MAX_ROWS});
 }
 function quantity(snapshot,warehouseId,productRef){
  if(!snapshot||!warehouseId||!productRef)return null;
  const row=snapshot.stock.find(x=>x.warehouse_id===String(warehouseId)&&x.product_ref===String(productRef));
  return row?Number(row.quantity)||0:0;
 }
 function options(snapshot){
  return Array.isArray(snapshot?.warehouses)?snapshot.warehouses.map(w=>({value:w.id,label:(w.name||tr('گدام','ګدام','Warehouse'))+(w.code?' · '+w.code:'')})):[];
 }
 function uuid(){if(typeof root.crypto?.randomUUID==='function')return root.crypto.randomUUID();throw Error('SECURE_UUID_UNAVAILABLE')}
 function buildLines(items){
  if(!Array.isArray(items)||items.length<1||items.length>MAX_LINES)throw Error('INVALID_WAREHOUSE_LINES');
  return items.map(item=>{
   const qty=Number(item.qty),ref=String(item.productId||item.product_ref||'').trim();
   if(!ref||ref.length>160||!Number.isFinite(qty)||qty<=0)throw Error('INVALID_WAREHOUSE_LINE');
   return {operation_id:String(item.warehouseOperationId||uuid()),product_ref:ref,quantity:Math.round(qty*10000)/10000};
  });
 }
 async function postDocument(input){
  const id=identity();if(!id)throw Error('OWNER_SESSION_REQUIRED');
  if(!input||!input.warehouseId||!input.documentRef||!['in','out'].includes(input.direction))throw Error('INVALID_WAREHOUSE_DOCUMENT');
  const lines=buildLines(input.lines);
  const result=await request(id,'/rest/v1/rpc/zavi_warehouse_post_document_movements','POST',{
   p_workspace_id:id.workspace,
   p_warehouse_id:String(input.warehouseId),
   p_document_ref:String(input.documentRef).trim().slice(0,150),
   p_direction:input.direction,
   p_lines:lines
  });
  await load().catch(()=>{});
  return {result,lines};
 }
 function describeError(error){
  const m=String(error?.message||error||'');
  if(m.includes('Insufficient warehouse stock'))return tr('موجودی گدام انتخابی کافی نیست.','د ټاکلي ګدام موجودي کافي نه ده.','Selected warehouse has insufficient stock.');
  if(m==='OFFLINE'||error?.name==='AbortError')return tr('اینترنت در دسترس نیست؛ حرکت گدام در صف همگام‌سازی می‌ماند.','انټرنېټ نشته؛ د ګدام حرکت د همغږۍ په کتار کې پاتې کېږي.','Offline: warehouse movement remains pending sync.');
  if(m.includes('unauthorized')||m.includes('Authentication')||m.includes('SESSION_CHANGED'))return tr('اجازه مالک یا نشست حساب برای گدام معتبر نیست.','د مالک اجازه یا ناسته سمه نه ده.','Owner authorization or session is invalid.');
  return m.slice(0,180)||tr('همگام‌سازی گدام انجام نشد.','د ګدام همغږي ونه شوه.','Warehouse sync failed.');
 }
 root.ZaviWarehouseInvoiceV6710=Object.freeze({cached,load,quantity,options,buildLines,postDocument,describeError});
})(window);