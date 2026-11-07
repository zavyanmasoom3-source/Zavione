/* ZAVI ONE 67.10 — warehouse-aware invoices with durable offline movement queue.
 * Accounting invoices stay in the existing payload. Warehouse stock stays in the
 * append-only server movement ledger. Stable UUIDs persisted on invoice lines make
 * retries idempotent and prevent double stock posting.
 */
(()=>{'use strict';
const CACHE_PREFIX='zavi_v671_warehouse_cache_';
const QUEUE_PREFIX='zavi_v671_warehouse_queue_';
let syncing=false;

function context(){
 const info=window.zaviCloudRestoreInfo?.()||{},session=window.zaviCloudGetAuthSession?.()||{},cfg=window.zaviCloudGetPublicConfig?.()||{};
 if(info.role!=='owner'||!info.workspace||!session?.user?.id||!cfg?.url||!cfg?.key)return null;
 return {workspace:String(info.workspace),user:String(session.user.id),url:String(cfg.url).replace(/\/$/,''),key:String(cfg.key)};
}
const scope=x=>x.user+'_'+x.workspace;
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function cacheKey(x){return CACHE_PREFIX+scope(x)}
function queueKey(x){return QUEUE_PREFIX+scope(x)}
function cache(x=context()){
 if(!x)return {warehouses:[],stock:[],updatedAt:0};
 const c=read(cacheKey(x),null);
 if(!c||c.workspace!==x.workspace||!Array.isArray(c.warehouses)||!Array.isArray(c.stock))return {workspace:x.workspace,warehouses:[],stock:[],updatedAt:0};
 return c;
}
function queue(x=context()){
 if(!x)return [];
 const q=read(queueKey(x),[]);
 return Array.isArray(q)?q.filter(validOperation):[];
}
function saveQueue(x,q){write(queueKey(x),q)}
function activeWarehouses(){
 const x=context();if(!x)return [];
 return cache(x).warehouses.filter(w=>w&&w.is_active===true&&w.workspace_id===x.workspace)
  .map(w=>({id:String(w.id),name:String(w.name||''),code:String(w.code||'')}))
}
function options(){return activeWarehouses().map(w=>[w.id,w.name+(w.code?' · '+w.code:'')])}
function enabled(){return options().length>0}
function pendingDelta(q,warehouseId,productRef){
 let total=0;
 for(const o of q){
  if(o.product_ref!==productRef)continue;
  if(o.to_warehouse_id===warehouseId)total+=Number(o.quantity)||0;
  if(o.from_warehouse_id===warehouseId)total-=Number(o.quantity)||0;
 }
 return total;
}
function stock(warehouseId,productRef){
 const x=context();if(!x||!warehouseId||!productRef)return null;
 const c=cache(x);
 const row=c.stock.find(r=>r.warehouse_id===warehouseId&&r.product_ref===productRef&&r.workspace_id===x.workspace);
 const base=Number(row?.quantity)||0;
 return Math.round((base+pendingDelta(queue(x),warehouseId,productRef))*10000)/10000;
}
function validOperation(o){
 return !!(o&&/^[0-9a-f-]{36}$/i.test(String(o.id||''))&&o.workspace_id&&o.warehouse_id&&o.product_ref&&Number(o.quantity)>0&&['in','out'].includes(o.direction));
}
function opMatches(o,row){
 return !!row&&String(row.id)===String(o.id)&&String(row.workspace_id)===String(o.workspace_id)&&
  String(row.product_ref)===String(o.product_ref)&&Number(row.quantity)===Number(o.quantity)&&
  String(row.from_warehouse_id||'')===String(o.direction==='out'?o.warehouse_id:'')&&
  String(row.to_warehouse_id||'')===String(o.direction==='in'?o.warehouse_id:'');
}
async function auth(x){
 const s=await window.zaviCloudRefreshAuthSession?.();
 const now=context();
 if(!s?.access_token||!now||now.workspace!==x.workspace||now.user!==x.user)throw Error('WAREHOUSE_SESSION_CHANGED');
 return s.access_token;
}
async function request(x,path,method='GET',body){
 const token=await auth(x);
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),17000);
 try{
  const r=await fetch(x.url+path,{method,headers:{apikey:x.key,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:ctrl.signal});
  const data=await r.json().catch(()=>null);
  if(!r.ok){const e=Error(String(data?.message||data?.error||('HTTP '+r.status)));e.status=r.status;throw e}
  return data;
 }finally{clearTimeout(timer)}
}
async function refresh(){
 const x=context();if(!x||navigator.onLine===false)return cache(x);
 const [warehouses,stockRows]=await Promise.all([
  request(x,'/rest/v1/zavi_warehouses?select=id,name,code,is_active,workspace_id&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&order=created_at.asc'),
  request(x,'/rest/v1/zavi_warehouse_stock_summary?select=warehouse_id,product_ref,quantity,workspace_id&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&limit=5000')
 ]);
 if(!Array.isArray(warehouses)||!Array.isArray(stockRows))throw Error('WAREHOUSE_RESPONSE_INVALID');
 const current=context();if(!current||current.workspace!==x.workspace||current.user!==x.user)throw Error('WAREHOUSE_SESSION_CHANGED');
 const next={workspace:x.workspace,warehouses:warehouses.filter(w=>w.workspace_id===x.workspace),stock:stockRows.filter(r=>r.workspace_id===x.workspace),updatedAt:Date.now()};
 write(cacheKey(x),next);
 window.dispatchEvent(new CustomEvent('zavi:warehouse-cache-updated',{detail:{workspace:x.workspace}}));
 return next;
}
async function reconcile(x,o){
 const rows=await request(x,'/rest/v1/zavi_warehouse_movements?select=id,workspace_id,from_warehouse_id,to_warehouse_id,product_ref,quantity&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&id=eq.'+encodeURIComponent(o.id)+'&limit=1');
 if(!Array.isArray(rows))throw Error('WAREHOUSE_RECONCILE_INVALID');
 if(!rows.length)return false;
 if(rows.length!==1||!opMatches(o,rows[0]))throw Error('WAREHOUSE_OPERATION_COLLISION');
 return true;
}
async function postBatch(x,ops){
 if(!Array.isArray(ops)||!ops.length||ops.length>200)throw Error('WAREHOUSE_BATCH_INVALID');
 const first=ops[0];
 if(ops.some(o=>o.workspace_id!==first.workspace_id||o.warehouse_id!==first.warehouse_id||o.direction!==first.direction||o.reference!==first.reference))throw Error('WAREHOUSE_BATCH_MISMATCH');
 const body={
  p_workspace_id:x.workspace,
  p_warehouse_id:first.warehouse_id,
  p_document_ref:first.reference,
  p_direction:first.direction,
  p_lines:ops.map(o=>({operation_id:o.id,product_ref:o.product_ref,quantity:o.quantity}))
 };
 const result=await request(x,'/rest/v1/rpc/zavi_warehouse_post_document_movements','POST',body);
 if(!Array.isArray(result)||result.length!==ops.length)throw Error('WAREHOUSE_BATCH_CONFIRMATION_MISMATCH');
 const ids=new Set(result.map(r=>String(r?.operation_id||'')));
 if(ops.some(o=>!ids.has(String(o.id))))throw Error('WAREHOUSE_BATCH_CONFIRMATION_MISMATCH');
}
async function flush(){
 const x=context();if(!x||navigator.onLine===false||syncing)return false;
 syncing=true;
 try{
  let q=queue(x),changed=false;
  while(q.length){
   const first=q[0];
   const batch=q.filter(o=>o.workspace_id===first.workspace_id&&o.warehouse_id===first.warehouse_id&&o.direction===first.direction&&o.reference===first.reference).slice(0,200);
   try{
    await postBatch(x,batch);
    const done=new Set(batch.map(o=>o.id));
    q=q.filter(item=>!done.has(item.id));saveQueue(x,q);changed=true;
   }catch(e){
    if(e?.name==='AbortError'||/network|fetch|offline/i.test(String(e?.message||'')))break;
    console.warn('ZAVI warehouse invoice queue:',e);
    window.dispatchEvent(new CustomEvent('zavi:warehouse-sync-error',{detail:{workspace:x.workspace,message:String(e?.message||e).slice(0,180),count:q.length}}));
    break;
   }
  }
  if(changed||q.length===0)await refresh().catch(()=>{});
  return q.length===0;
 }finally{syncing=false}
}
function stage(tx){
 const x=context();if(!x||!tx||!tx.warehouseId||!Array.isArray(tx.items))return false;
 const direction=tx.type==='purchase'||tx.type==='sale_return'?'in':tx.type==='sale'||tx.type==='purchase_return'?'out':'';
 if(!direction)return false;
 const wh=String(tx.warehouseId);
 if(!activeWarehouses().some(w=>w.id===wh))throw Error('گدام انتخاب‌شده فعال نیست.');
 let q=queue(x),changed=false;
 tx.items.forEach((line,index)=>{
  const id=String(line.warehouseMovementId||'');
  const qty=Number(line.qty),product=String(line.productId||'');
  const o={id,workspace_id:x.workspace,warehouse_id:wh,product_ref:product,quantity:qty,direction,reference:String('invoice:'+String(tx.code||tx.id||'')).slice(0,150)};
  if(!validOperation(o))throw Error('شناسه حرکت گدام در فاکتور معتبر نیست.');
  const old=q.find(v=>v.id===id);
  if(old){
   if(JSON.stringify(old)!==JSON.stringify(o))throw Error('شناسه حرکت گدام با اطلاعات دیگری استفاده شده است.');
   return;
  }
  q.push(o);changed=true;
 });
 if(changed)saveQueue(x,q);
 if(navigator.onLine!==false)void flush();
 window.dispatchEvent(new CustomEvent('zavi:warehouse-pending',{detail:{workspace:x.workspace,count:q.length}}));
 return true;
}
function pendingCount(){const x=context();return x?queue(x).length:0}
async function sync(){if(navigator.onLine===false)return false;await flush();return refresh().then(()=>true).catch(()=>false)}
window.ZaviInvoiceWarehouseV6710=Object.freeze({options,enabled,stock,stage,flush,refresh,sync,pendingCount});
window.addEventListener('online',()=>void sync());
window.addEventListener('zavi-cloud-workspace-selected',()=>void sync());
window.addEventListener('focus',()=>{if(navigator.onLine!==false)void flush()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(navigator.onLine!==false)void sync()},{once:true});else if(navigator.onLine!==false)void sync();
})();