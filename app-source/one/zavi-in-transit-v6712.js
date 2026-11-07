/* ZAVI ONE V67.12 — server-backed in-transit purchase orders.
 * Orders do not affect sellable stock. Stock is posted only by the receive RPC.
 */
(()=>{'use strict';
const ROOT='zavi6712Transit';
const PENDING_PREFIX='zavi_v6712_pending_receipt_';
let current={products:[],currencies:[],baseCurrency:'AFN',formatNumber:n=>String(n??0)};

function ctx(){
 const info=window.zaviCloudRestoreInfo?.()||{},session=window.zaviCloudGetAuthSession?.()||{},cfg=window.zaviCloudGetPublicConfig?.()||{};
 if(info.role!=='owner'||!info.workspace||!session?.user?.id||!cfg?.url||!cfg?.key)return null;
 return {workspace:String(info.workspace),user:String(session.user.id),url:String(cfg.url).replace(/\/$/,''),key:String(cfg.key)};
}
function uuid(){
 const c=globalThis.crypto;
 if(c?.randomUUID)return c.randomUUID();
 if(!c?.getRandomValues)throw Error('ساخت شناسه امن در این دستگاه پشتیبانی نمی‌شود.');
 const b=new Uint8Array(16);c.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*10000)/10000;
const statusName=s=>({draft:'پیش‌نویس',ordered:'ثبت سفارش',shipped:'ارسال شده',partially_received:'بخشی رسیده',received:'کامل رسیده',cancelled:'لغو شده'})[s]||s;
const format=n=>current.formatNumber?current.formatNumber(n):new Intl.NumberFormat('fa-AF',{maximumFractionDigits:4}).format(num(n));
const pendingKey=(x,lineId)=>PENDING_PREFIX+x.workspace+'_'+lineId;

async function token(x){
 const s=await window.zaviCloudRefreshAuthSession?.();
 const now=ctx();
 if(!s?.access_token||!now||now.workspace!==x.workspace||now.user!==x.user)throw Error('نشست ابری تغییر کرده است.');
 return s.access_token;
}
async function request(x,path,method='GET',body,extraHeaders={}){
 const access=await token(x);
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
 try{
  const r=await fetch(x.url+path,{method,headers:{apikey:x.key,Authorization:'Bearer '+access,...(body?{'Content-Type':'application/json'}:{}),...extraHeaders},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:ctrl.signal});
  const data=await r.json().catch(()=>null);
  if(!r.ok){const e=Error(String(data?.message||data?.error_description||data?.error||('HTTP '+r.status)));e.status=r.status;throw e}
  return data;
 }finally{clearTimeout(timer)}
}
function close(){document.getElementById(ROOT)?.remove()}
function shell(title){
 close();
 const layer=document.createElement('div');layer.id=ROOT;layer.className='z6712-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 const panel=document.createElement('section');panel.className='z6712-panel';
 const head=document.createElement('header');const h=document.createElement('h2');h.textContent=title;
 const x=document.createElement('button');x.type='button';x.className='btn subtle';x.textContent='بستن';x.onclick=close;
 head.append(h,x);const body=document.createElement('div');body.className='z6712-body';panel.append(head,body);layer.append(panel);document.body.append(layer);
 layer.addEventListener('click',e=>{if(e.target===layer)close()});
 return body;
}
function showError(host,e){
 const box=host.querySelector?.('[data-z6712-error]')||host;
 if(box){box.textContent=e?.message||String(e||'خطای ناشناخته');box.classList?.add('z6712-error')}
}
function currencyList(){
 let list=current.currencies;
 if(!Array.isArray(list)||!list.length){
  try{list=Intl.supportedValuesOf('currency').map(c=>[c,c])}catch(_){list=[['AFN','AFN'],['USD','USD'],['EUR','EUR'],['GBP','GBP'],['CNY','CNY'],['PKR','PKR'],['IRR','IRR'],['AED','AED']]}
 }
 return list.map(v=>Array.isArray(v)?[String(v[0]),String(v[1]||v[0])]:[String(v),String(v)]);
}
function warehouseList(){
 return window.ZaviInvoiceWarehouseV6710?.options?.()||[];
}
function productOptions(selected=''){
 return '<option value="">محصول جدید / نام آزاد</option>'+current.products.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===String(selected)?'selected':'')+'>'+esc(p.name)+(p.sku?' · '+esc(p.sku):'')+'</option>').join('');
}
async function loadOrders(x){
 return request(x,'/rest/v1/zavi_in_transit_order_summary?select=id,workspace_id,destination_warehouse_id,supplier_name,country_name,currency_code,exchange_rate,purchase_total_original,freight_original,customs_original,other_costs_original,tracking_number,carrier,expected_date,status,ordered_qty,received_qty,landed_total_original,landed_total_base,created_at,updated_at&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&order=updated_at.desc&limit=200');
}
async function loadLines(x,orderId){
 return request(x,'/rest/v1/zavi_in_transit_lines?select=id,order_id,product_ref,product_name,sku,ordered_qty,received_qty,unit_price_original&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&order_id=eq.'+encodeURIComponent(orderId)+'&order=created_at.asc');
}
async function loadReceipts(x,orderId){
 return request(x,'/rest/v1/zavi_in_transit_receipts?select=id,line_id,product_ref,quantity,discrepancy_qty,note,received_at,warehouse_movement_id&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&order_id=eq.'+encodeURIComponent(orderId)+'&order=received_at.desc');
}
function renderCards(body,orders){
 const list=document.createElement('div');list.className='z6712-list';
 if(!orders.length){list.innerHTML='<div class="z6712-empty"><b>سفارش در راهی ثبت نشده است.</b><span>سفارش جدید را ایجاد کنید؛ موجودی فقط پس از تأیید دریافت زیاد می‌شود.</span></div>';body.append(list);return}
 for(const o of orders){
  const card=document.createElement('article');card.className='z6712-card';
  const progress=num(o.ordered_qty)>0?Math.min(100,Math.round(num(o.received_qty)/num(o.ordered_qty)*100)):0;
  card.innerHTML='<div class="z6712-card-head"><div><strong>'+esc(o.supplier_name)+'</strong><small>'+esc(o.country_name)+' · '+esc(o.currency_code)+' · '+esc(o.tracking_number||'بدون شماره پیگیری')+'</small></div><span class="z6712-status" data-status="'+esc(o.status)+'">'+esc(statusName(o.status))+'</span></div>'+
   '<div class="z6712-progress"><i style="width:'+progress+'%"></i></div>'+
   '<div class="z6712-meta"><span>سفارش: <b>'+format(o.ordered_qty)+'</b></span><span>رسیده: <b>'+format(o.received_qty)+'</b></span><span>تمام‌شده: <b>'+format(o.landed_total_original)+' '+esc(o.currency_code)+'</b></span></div>'+
   '<div class="z6712-card-foot"><small>ETA: '+esc(o.expected_date||'—')+' · '+esc(o.carrier||'حمل نامشخص')+'</small><button type="button" class="btn tiny primary">جزئیات / دریافت</button></div>';
  card.querySelector('button').onclick=()=>void openDetail(xFromBody(body),o.id);
  list.append(card);
 }
 body.append(list);
}
function xFromBody(body){return body.__zaviContext||ctx()}
async function openManager(opts={}){
 current={...current,...opts,products:Array.isArray(opts.products)?opts.products:current.products,currencies:Array.isArray(opts.currencies)?opts.currencies:current.currencies};
 const x=ctx();if(!x)return alert('برای سفارش‌های در راه باید مالک فروشگاه با حساب ابری وارد شده باشد.');
 const body=shell('سفارش‌های در راه');body.__zaviContext=x;
 const top=document.createElement('div');top.className='z6712-top';
 top.innerHTML='<div><b>کالای در راه وارد موجودی فروش نیست</b><small>فقط «تأیید دریافت» موجودی گدام را افزایش می‌دهد.</small></div>';
 const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='+ سفارش جدید';add.onclick=()=>openCreate(current);
 top.append(add);body.append(top);
 const wait=document.createElement('div');wait.className='z6712-loading';wait.textContent='در حال خواندن سفارش‌ها…';body.append(wait);
 try{const orders=await loadOrders(x);wait.remove();renderCards(body,Array.isArray(orders)?orders:[])}
 catch(e){wait.remove();showError(body,e)}
}
function addLineRow(host,pref={}){
 const row=document.createElement('div');row.className='z6712-line';
 row.dataset.id=pref.id||uuid();
 row.innerHTML='<label>محصول<select data-f="product">'+productOptions(pref.product_ref||'')+'</select></label>'+
  '<label>نام محصول<input data-f="name" maxlength="160" value="'+esc(pref.product_name||'')+'" required></label>'+
  '<label>کود / مدل<input data-f="sku" maxlength="100" value="'+esc(pref.sku||'')+'"></label>'+
  '<label>تعداد<input data-f="qty" type="number" min="0.0001" step="0.0001" value="'+esc(pref.ordered_qty||1)+'" required></label>'+
  '<label>قیمت واحد<input data-f="price" type="number" min="0" step="0.0001" value="'+esc(pref.unit_price_original||0)+'" required></label>'+
  '<button type="button" class="z6712-remove" aria-label="حذف">×</button>';
 const product=row.querySelector('[data-f="product"]'),name=row.querySelector('[data-f="name"]'),sku=row.querySelector('[data-f="sku"]');
 product.onchange=()=>{const p=current.products.find(v=>String(v.id)===product.value);if(p){name.value=p.name||'';sku.value=p.sku||''}};
 row.querySelector('.z6712-remove').onclick=()=>{if(host.querySelectorAll('.z6712-line').length>1)row.remove()};
 host.append(row);
}
function collectLines(host){
 return [...host.querySelectorAll('.z6712-line')].map(row=>{
  const ref=row.querySelector('[data-f="product"]').value||null,name=row.querySelector('[data-f="name"]').value.trim(),sku=row.querySelector('[data-f="sku"]').value.trim()||null;
  const qty=money(row.querySelector('[data-f="qty"]').value),price=money(row.querySelector('[data-f="price"]').value);
  if(!name||qty<=0||price<0)throw Error('نام، تعداد و قیمت هر ردیف را درست وارد کنید.');
  return {id:row.dataset.id,product_ref:ref,product_name:name,sku,ordered_qty:qty,unit_price_original:price};
 });
}
function openCreate(opts={}){
 current={...current,...opts};
 const x=ctx();if(!x)return alert('ورود مالک لازم است.');
 const wh=warehouseList();if(!wh.length)return alert('ابتدا یک گدام فعال بسازید و همگام‌سازی گدام را انجام دهید.');
 const body=shell('سفارش جدید در راه');body.__zaviContext=x;
 const form=document.createElement('form');form.className='z6712-form';
 const currencies=currencyList(),base=current.baseCurrency||'AFN';
 form.innerHTML='<div data-z6712-error></div><div class="z6712-grid">'+
  '<label>عرضه‌کننده / شرکت<input name="supplier" maxlength="120" required></label>'+
  '<label>کشور خرید<input name="country" maxlength="80" placeholder="نام کشور را آزاد بنویسید" required></label>'+
  '<label>گدام مقصد<select name="warehouse">'+wh.map(([id,label])=>'<option value="'+esc(id)+'">'+esc(label)+'</option>').join('')+'</select></label>'+
  '<label>ارز<select name="currency">'+currencies.map(([c,l])=>'<option value="'+esc(c)+'" '+(c===base?'selected':'')+'>'+esc(c)+' · '+esc(l)+'</option>').join('')+'</select></label>'+
  '<label>نرخ تبدیل به '+esc(base)+'<input name="rate" type="number" min="0.00000001" step="0.00000001" value="1" required></label>'+
  '<label>شماره پیگیری<input name="tracking" maxlength="120"></label>'+
  '<label>شرکت حمل<input name="carrier" maxlength="120"></label>'+
  '<label>تاریخ تقریبی رسیدن<input name="eta" type="date"></label>'+
  '<label>حمل‌ونقل<input name="freight" type="number" min="0" step="0.0001" value="0"></label>'+
  '<label>گمرک<input name="customs" type="number" min="0" step="0.0001" value="0"></label>'+
  '<label>مصارف دیگر<input name="other" type="number" min="0" step="0.0001" value="0"></label>'+
  '<label>وضعیت<select name="status"><option value="ordered">ثبت سفارش</option><option value="shipped">ارسال شده</option><option value="draft">پیش‌نویس</option></select></label>'+
  '<label class="z6712-full">یادداشت<textarea name="notes" maxlength="1200"></textarea></label></div>'+
  '<div class="z6712-lines-head"><b>کالاهای سفارش</b><button type="button" class="btn tiny subtle" data-add>+ ردیف</button></div><div data-lines></div>'+
  '<div class="z6712-actions"><button type="button" class="btn subtle" data-cancel>انصراف</button><button class="btn primary" type="submit">ثبت سفارش</button></div>';
 body.append(form);
 const lines=form.querySelector('[data-lines]');addLineRow(lines);
 form.querySelector('[data-add]').onclick=()=>addLineRow(lines);
 form.querySelector('[data-cancel]').onclick=()=>openManager(current);
 form.elements.currency.onchange=()=>{if(form.elements.currency.value===base)form.elements.rate.value='1'};
 form.onsubmit=async e=>{
  e.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;form.querySelector('[data-z6712-error]').textContent='';
  try{
   const lineData=collectLines(lines),orderId=uuid();
   const merchandise=lineData.reduce((a,l)=>a+num(l.ordered_qty)*num(l.unit_price_original),0);
   const payload={
    p_order_id:orderId,p_workspace_id:x.workspace,p_destination_warehouse_id:form.elements.warehouse.value,
    p_supplier_name:form.elements.supplier.value.trim(),p_country_name:form.elements.country.value.trim(),
    p_currency_code:form.elements.currency.value,p_exchange_rate:num(form.elements.rate.value),
    p_purchase_total_original:money(merchandise),p_freight_original:money(form.elements.freight.value),
    p_customs_original:money(form.elements.customs.value),p_other_costs_original:money(form.elements.other.value),
    p_tracking_number:form.elements.tracking.value.trim()||null,p_carrier:form.elements.carrier.value.trim()||null,
    p_expected_date:form.elements.eta.value||null,p_status:form.elements.status.value,p_notes:form.elements.notes.value.trim()||null,
    p_lines:lineData
   };
   await request(x,'/rest/v1/rpc/zavi_v671_create_in_transit','POST',payload);
   await openManager(current);
  }catch(err){showError(form,err);submit.disabled=false}
 };
}
async function openDetail(x,orderId){
 if(!x)x=ctx();if(!x)return;
 const body=shell('جزئیات سفارش در راه');body.__zaviContext=x;
 const loading=document.createElement('div');loading.className='z6712-loading';loading.textContent='در حال خواندن جزئیات…';body.append(loading);
 try{
  const [orders,lines,receipts]=await Promise.all([
   request(x,'/rest/v1/zavi_in_transit_order_summary?select=*&workspace_id=eq.'+encodeURIComponent(x.workspace)+'&id=eq.'+encodeURIComponent(orderId)+'&limit=1'),
   loadLines(x,orderId),loadReceipts(x,orderId)
  ]);
  const o=orders?.[0];if(!o)throw Error('سفارش پیدا نشد.');loading.remove();
  const hero=document.createElement('div');hero.className='z6712-detail-hero';
  hero.innerHTML='<div><small>'+esc(o.country_name)+' · '+esc(o.currency_code)+'</small><h3>'+esc(o.supplier_name)+'</h3><span>'+esc(statusName(o.status))+'</span></div><div><b>'+format(o.received_qty)+' / '+format(o.ordered_qty)+'</b><small>دریافت‌شده / سفارش</small></div>';body.append(hero);

  const track=document.createElement('form');track.className='z6712-track';
  track.innerHTML='<label>شماره پیگیری<input name="tracking" maxlength="120" value="'+esc(o.tracking_number||'')+'"></label>'+
   '<label>شرکت حمل<input name="carrier" maxlength="120" value="'+esc(o.carrier||'')+'"></label>'+
   '<label>ETA<input name="eta" type="date" value="'+esc(o.expected_date||'')+'"></label>'+
   '<label>وضعیت<select name="status"><option value="ordered">ثبت سفارش</option><option value="shipped">ارسال شده</option><option value="cancelled">لغو شده</option></select></label>'+
   '<button class="btn subtle" type="submit">ذخیره پیگیری</button><div data-z6712-error></div>';
  if(['partially_received','received'].includes(o.status)){track.elements?.status}
  body.append(track);
  const statusSelect=track.querySelector('[name="status"]');if(['ordered','shipped','cancelled'].includes(o.status))statusSelect.value=o.status;else{statusSelect.value='shipped';statusSelect.disabled=true}
  track.onsubmit=async e=>{
   e.preventDefault();const b=track.querySelector('button');b.disabled=true;
   try{
    const patch={tracking_number:track.elements.tracking.value.trim()||null,carrier:track.elements.carrier.value.trim()||null,expected_date:track.elements.eta.value||null};
    if(!statusSelect.disabled)patch.status=statusSelect.value;
    await request(x,'/rest/v1/zavi_in_transit_orders?workspace_id=eq.'+encodeURIComponent(x.workspace)+'&id=eq.'+encodeURIComponent(orderId),'PATCH',patch,{'Prefer':'return=minimal'});
    await openDetail(x,orderId);
   }catch(err){showError(track,err);b.disabled=false}
  };

  const costs=document.createElement('div');costs.className='z6712-costs';
  costs.innerHTML='<span>کالا: <b>'+format(o.purchase_total_original)+' '+esc(o.currency_code)+'</b></span><span>حمل: <b>'+format(o.freight_original)+' '+esc(o.currency_code)+'</b></span><span>گمرک: <b>'+format(o.customs_original)+' '+esc(o.currency_code)+'</b></span><span>تمام‌شده: <b>'+format(o.landed_total_original)+' '+esc(o.currency_code)+'</b></span><span>معادل پایه: <b>'+format(o.landed_total_base)+' '+esc(current.baseCurrency||'AFN')+'</b></span>';body.append(costs);

  const linesHost=document.createElement('div');linesHost.className='z6712-detail-lines';
  for(const l of lines||[]){
   const remain=Math.max(0,num(l.ordered_qty)-num(l.received_qty));
   const card=document.createElement('article');card.className='z6712-detail-line';
   card.innerHTML='<div><strong>'+esc(l.product_name)+'</strong><small>'+esc(l.sku||'بدون کود')+'</small></div><div><span>سفارش '+format(l.ordered_qty)+'</span><span>رسیده '+format(l.received_qty)+'</span><span>باقی '+format(remain)+'</span></div>';
   if(o.status!=='cancelled'&&o.status!=='received'){
    const rec=document.createElement('form');rec.className='z6712-receive';
    rec.innerHTML='<label>محصول گدام<select name="product">'+productOptions(l.product_ref||'')+'</select></label><label>تعداد دریافت<input name="qty" type="number" min="0.0001" step="0.0001" value="'+esc(remain>0?remain:1)+'" required></label><label>یادداشت / اختلاف<input name="note" maxlength="500"></label><button class="btn tiny primary" type="submit">تأیید دریافت</button><div data-z6712-error></div>';
    if(l.product_ref)rec.elements.product.value=l.product_ref;
    rec.onsubmit=async e=>{
     e.preventDefault();const productRef=rec.elements.product.value,qty=money(rec.elements.qty.value),note=rec.elements.note.value.trim()||null;
     if(!productRef)return showError(rec,Error('محصول گدام را مشخص کنید؛ کالای جدید باید ابتدا در محصولات ثبت شود.'));
     if(qty<=0)return showError(rec,Error('تعداد دریافت معتبر نیست.'));
     const key=pendingKey(x,l.id);let pending=null;
     try{pending=JSON.parse(localStorage.getItem(key)||'null')}catch(_){}
     const wanted={orderId,lineId:l.id,quantity:qty,productRef,note};
     if(pending&&(pending.orderId!==wanted.orderId||pending.lineId!==wanted.lineId||num(pending.quantity)!==qty||pending.productRef!==productRef||String(pending.note||'')!==String(note||''))){
      return showError(rec,Error('یک دریافت قبلی در انتظار تأیید شبکه است؛ همان دریافت را دوباره امتحان کنید.'));
     }
     if(!pending){pending={...wanted,receiptId:uuid()};localStorage.setItem(key,JSON.stringify(pending))}
     const b=rec.querySelector('button');b.disabled=true;
     try{
      await request(x,'/rest/v1/rpc/zavi_v671_receive_in_transit','POST',{
       p_receipt_id:pending.receiptId,p_order_id:orderId,p_line_id:l.id,p_quantity:qty,p_product_ref:productRef,p_note:note
      });
      localStorage.removeItem(key);
      await window.ZaviInvoiceWarehouseV6710?.sync?.().catch?.(()=>{});
      await openDetail(x,orderId);
     }catch(err){showError(rec,err);b.disabled=false}
    };
    card.append(rec);
   }
   linesHost.append(card);
  }
  body.append(linesHost);

  if(receipts?.length){
   const hist=document.createElement('section');hist.className='z6712-history';hist.innerHTML='<h3>تاریخچه دریافت</h3>';
   for(const r of receipts){const div=document.createElement('div');div.innerHTML='<span>'+esc(new Date(r.received_at).toLocaleString('fa-AF'))+'</span><b>'+format(r.quantity)+'</b><small>'+(num(r.discrepancy_qty)?'اختلاف: '+format(r.discrepancy_qty):'بدون اختلاف')+'</small>';hist.append(div)}
   body.append(hist);
  }
  const back=document.createElement('button');back.type='button';back.className='btn subtle';back.textContent='بازگشت به سفارش‌ها';back.onclick=()=>openManager(current);body.append(back);
 }catch(e){loading.remove();showError(body,e)}
}
function open(opts={}){return openManager(opts)}
window.ZaviInTransitV6712=Object.freeze({open,openCreate,openDetail,close});
})();