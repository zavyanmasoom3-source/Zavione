/* ZAVI ONE 67.20 — in-transit purchase orders.
 * Orders are logistics records inside the offline-first workspace payload.
 * They NEVER affect stock or cash. A partial/full receipt only changes accounting
 * after the existing reviewed Purchase form is opened, reviewed and submitted.
 */
(()=>{'use strict';
const VERSION=1, PENDING='zavi_v6720_pending_receipt_';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto?.randomUUID?.()||('z672_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
const num=x=>{const n=Number(x);return Number.isFinite(n)?n:NaN};
const round=x=>Math.round((Number(x)+Number.EPSILON)*100)/100;
const ctx=()=>window.zaviCloudRestoreInfo?.()?.workspace||'local';
const pendingKey=()=>PENDING+ctx();
const orders=()=>Array.isArray(db?.inTransitOrders)?db.inTransitOrders:[];
const currencies=()=>window.ZaviCreditors6528?.currencies?.(db?.currency||'AFN')||[['AFN','AFN'],['USD','USD'],['EUR','EUR']];
const warehouseOptions=()=>window.ZaviInvoiceWarehouseV6710?.options?.()||[];
const productOptions=()=>Array.isArray(db?.products)?db.products:[];
function savePending(p){localStorage.setItem(pendingKey(),JSON.stringify(p))}
function loadPending(){try{const p=JSON.parse(localStorage.getItem(pendingKey())||'null');return p&&p.workspace===ctx()?p:null}catch{return null}}
function clearPending(){localStorage.removeItem(pendingKey())}
function mutate(fn){
 if(typeof commit!=='function')throw Error('ذخیره‌سازی حسابداری آماده نیست.');
 let ok=false;const saved=commit(n=>{if(!Array.isArray(n.inTransitOrders))n.inTransitOrders=[];n.inTransitSchemaVersion=VERSION;fn(n.inTransitOrders,n);ok=true});if(saved===false||!ok)throw Error('سفارش ذخیره نشد.');
 return true;
}
function statusOf(o){
 const total=o.items.reduce((s,i)=>s+Number(i.orderedQty||0),0),received=o.items.reduce((s,i)=>s+Number(i.receivedQty||0),0);
 if(o.status==='cancelled')return ['لغو شده','red',received,total];
 if(received<=0)return ['در راه','amber',received,total];
 if(received+1e-9>=total)return ['تحویل کامل','green',received,total];
 return ['تحویل مرحله‌ای','blue',received,total];
}
function money(n,c){try{return new Intl.NumberFormat(document.documentElement.lang?.startsWith('en')?'en-US':'fa-AF',{maximumFractionDigits:2}).format(Number(n)||0)+' '+c}catch{return String(n)+' '+c}}
function whName(id){const w=warehouseOptions().find(([v])=>String(v)===String(id));return w?.[1]||'—'}
function productDatalist(){return '<datalist id="z672Products">'+productOptions().map(p=>'<option value="'+esc(p.name)+'" label="'+esc(p.sku||'')+'"></option>').join('')+'</datalist>'}
function itemRow(pref={}){
 return '<div class="z672-item-row" data-z672-item="'+esc(pref.id||uid())+'"><input data-z672="name" list="z672Products" maxlength="140" placeholder="نام محصول" value="'+esc(pref.name||'')+'" required><input data-z672="sku" maxlength="70" placeholder="کود / مدل" value="'+esc(pref.sku||'')+'"><input data-z672="qty" type="number" min="0.001" step="0.001" placeholder="تعداد" value="'+esc(pref.orderedQty||1)+'" required><input data-z672="price" type="number" min="0" step="any" placeholder="قیمت واحد" value="'+esc(pref.unitPriceOriginal||0)+'" required><button type="button" class="btn tiny subtle" data-z672-remove>×</button></div>';
}
function addItem(host,pref){host.insertAdjacentHTML('beforeend',itemRow(pref))}
function readItems(host){
 const items=[...host.querySelectorAll('.z672-item-row')].map(row=>{
  const name=row.querySelector('[data-z672="name"]').value.trim(),sku=row.querySelector('[data-z672="sku"]').value.trim(),qty=num(row.querySelector('[data-z672="qty"]').value),price=num(row.querySelector('[data-z672="price"]').value);
  if(!name||name.length>140||!(qty>0)||price<0||!Number.isFinite(price))throw Error('نام، تعداد و قیمت هر محصول را درست وارد کنید.');
  const p=productOptions().find(p=>String(p.name).trim().toLowerCase()===name.toLowerCase()&&(sku?String(p.sku||'').trim().toLowerCase()===sku.toLowerCase():true));
  return {id:row.dataset.z672Item||uid(),productId:p?.id||'',name,sku:sku||p?.sku||'',orderedQty:qty,unitPriceOriginal:round(price),receivedQty:Number(row.dataset.received||0)};
 });
 if(!items.length)throw Error('حداقل یک محصول لازم است.');
 return items;
}
function createOrder(existingId=''){
 const old=orders().find(o=>o.id===existingId);
 const wh=warehouseOptions();
 if(!wh.length){window.ZaviInvoiceWarehouseV6710?.sync?.().then(()=>{if(!warehouseOptions().length)toast('ابتدا یک گدام فعال بسازید و موجودی آن را آماده کنید.');else createOrder(existingId)});return}
 const curr=currencies(),base=db.currency||'AFN';
 const currencyOptions=curr.map(([v,l])=>'<option value="'+esc(v)+'" '+((old?.currency||base)===v?'selected':'')+'>'+esc(l)+'</option>').join('');
 const warehouseHtml=wh.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(old?.warehouseId||'')===String(v)?'selected':'')+'>'+esc(l)+'</option>').join('');
 showModal(old?'اصلاح سفارش در راه':'سفارش در راه جدید',`<div class="form-grid z672-order-form">
 <div class="field"><label>عرضه‌کننده / شرکت</label><input name="supplierName" maxlength="100" value="${esc(old?.supplierName||'')}" required></div>
 <div class="field"><label>کشور خرید</label><input name="country" maxlength="80" value="${esc(old?.country||'')}" placeholder="نام کشور را آزاد بنویسید" required></div>
 <div class="field"><label>شماره پیگیری</label><input name="trackingNumber" maxlength="100" value="${esc(old?.trackingNumber||'')}" placeholder="Tracking / AWB / Container"></div>
 <div class="field"><label>تاریخ تقریبی رسیدن</label><input name="etaDate" type="date" value="${esc(old?.etaDate||'')}"></div>
 <div class="field"><label>ارز سفارش</label><select name="currency">${currencyOptions}</select></div>
 <div class="field"><label>نرخ تبدیل: ۱ ارز = چند ${esc(base)}</label><input name="exchangeRate" type="number" min="0.000001" step="any" value="${esc(old?.exchangeRate??1)}" required></div>
 <div class="field"><label>گدام مقصد</label><select name="warehouseId">${warehouseHtml}</select></div>
 <div class="field"><label>حمل‌ونقل</label><input name="freightOriginal" type="number" min="0" step="any" value="${esc(old?.freightOriginal||0)}"></div>
 <div class="field"><label>گمرک</label><input name="customsOriginal" type="number" min="0" step="any" value="${esc(old?.customsOriginal||0)}"></div>
 <div class="field"><label>سایر مصارف</label><input name="otherCostsOriginal" type="number" min="0" step="any" value="${esc(old?.otherCostsOriginal||0)}"></div>
 </div><div class="z672-items-head"><b>کالاهای سفارش</b><button type="button" class="btn tiny subtle" id="z672AddItem">+ محصول</button></div>
 <div id="z672Items">${(old?.items?.length?old.items:[{}]).map(itemRow).join('')}</div>${productDatalist()}
 <p class="z672-note">ثبت سفارش در راه هیچ موجودی، صندوق یا قرضی را تغییر نمی‌دهد. فقط هنگام تأیید تحویل، فاکتور خرید واقعی ساخته می‌شود.</p>`,'ذخیره سفارش');
 const form=document.getElementById('dialogForm'),host=document.getElementById('z672Items');
 old?.items?.forEach((it,i)=>{const row=host.children[i];if(row)row.dataset.received=String(it.receivedQty||0)});
 document.getElementById('z672AddItem').onclick=()=>addItem(host,{});
 host.addEventListener('click',e=>{const b=e.target.closest('[data-z672-remove]');if(!b)return;if(host.children.length<=1)return toast('حداقل یک محصول لازم است.');b.closest('.z672-item-row').remove()});
 const syncRate=()=>{if(form.elements.currency.value===base){form.elements.exchangeRate.value='1';form.elements.exchangeRate.readOnly=true}else form.elements.exchangeRate.readOnly=false};form.elements.currency.addEventListener('change',syncRate);syncRate();
 form.onsubmit=e=>{e.preventDefault();try{
  const currency=form.elements.currency.value,rate=num(form.elements.exchangeRate.value),country=form.elements.country.value.trim(),supplier=form.elements.supplierName.value.trim();
  if(!supplier||!country)throw Error('عرضه‌کننده و کشور خرید را وارد کنید.');
  if(!curr.some(([c])=>c===currency))throw Error('ارز معتبر ISO را انتخاب کنید.');
  if(!(rate>0))throw Error('نرخ تبدیل همان معامله را وارد کنید.');
  const costs=['freightOriginal','customsOriginal','otherCostsOriginal'].map(k=>num(form.elements[k].value||0));if(costs.some(n=>n<0||!Number.isFinite(n)))throw Error('مصارف سفارش معتبر نیست.');
  const items=readItems(host);if(old){for(const it of items){const before=old.items.find(x=>x.id===it.id);if(before&&it.orderedQty+1e-9<Number(before.receivedQty||0))throw Error('تعداد سفارش نمی‌تواند از مقدار تحویل‌شده کمتر شود.');it.receivedQty=Number(before?.receivedQty||0)}}
  const record={id:old?.id||uid(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),supplierName:supplier,country,currency,exchangeRate:rate,trackingNumber:form.elements.trackingNumber.value.trim(),etaDate:form.elements.etaDate.value||'',warehouseId:form.elements.warehouseId.value,freightOriginal:round(costs[0]),customsOriginal:round(costs[1]),otherCostsOriginal:round(costs[2]),items,receipts:Array.isArray(old?.receipts)?old.receipts:[],status:old?.status==='cancelled'?'cancelled':'in_transit'};
  mutate(list=>{const i=list.findIndex(x=>x.id===record.id);if(i>=0)list[i]=record;else list.push(record)});
  closeModal();toast('سفارش در راه ذخیره شد. موجودی تغییر نکرد.');openManager();
 }catch(err){toast(err.message||'سفارش ذخیره نشد.')}};
}
function receive(id){
 const o=orders().find(x=>x.id===id);if(!o||o.status==='cancelled')return;
 const remaining=o.items.map(i=>({...i,remaining:Math.max(0,Number(i.orderedQty)-Number(i.receivedQty||0))})).filter(i=>i.remaining>1e-9);
 if(!remaining.length)return toast('این سفارش کامل تحویل شده است.');
 showModal('ثبت تحویل مرحله‌ای',`<p class="z672-note">فقط مقدار واقعاً رسیده را وارد کنید. تا ثبت فاکتور خرید بعدی، موجودی تغییر نمی‌کند.</p><div id="z672ReceiveRows">${remaining.map(i=>'<label class="z672-receive-row"><span>'+esc(i.name)+'<small>باقی: '+esc(i.remaining)+'</small></span><input type="number" min="0" max="'+esc(i.remaining)+'" step="0.001" value="0" data-item="'+esc(i.id)+'"></label>').join('')}</div><div class="field full"><label>اختلاف / کمبود / آسیب (اختیاری)</label><textarea name="discrepancy" maxlength="350"></textarea></div>`,'بازکردن فاکتور تحویل');
 const form=document.getElementById('dialogForm');
 form.onsubmit=e=>{e.preventDefault();try{
  const qtys=[...document.querySelectorAll('#z672ReceiveRows input[data-item]')].map(input=>({itemId:input.dataset.item,qty:num(input.value||0)})).filter(x=>x.qty>0);
  if(!qtys.length)throw Error('حداقل یک مقدار تحویل‌شده وارد کنید.');
  for(const q of qtys){const item=remaining.find(i=>i.id===q.itemId);if(!item||q.qty>item.remaining+1e-9)throw Error('مقدار تحویل از مقدار باقی‌مانده بیشتر است.')}
  const token=uid(),pending={version:VERSION,workspace:ctx(),token,orderId:o.id,items:qtys,discrepancy:form.elements.discrepancy.value.trim(),createdAt:Date.now()};savePending(pending);
  closeModal();openOrder('purchase','',String(o.country||'').trim().toLowerCase()!=='افغانستان');
  setTimeout(()=>prefillPurchase(o,pending),50);
 }catch(err){toast(err.message||'تحویل آماده نشد.')}};
}
function prefillPurchase(o,pending){
 const form=document.getElementById('dialogForm'),box=document.getElementById('orderItems');if(!form||!box)return;
 form.dataset.z672ReceiptToken=pending.token;
 if(form.elements.freeContactName)form.elements.freeContactName.value=o.supplierName||'';
 if(form.elements.purchaseOrigin)form.elements.purchaseOrigin.value=o.country||'';
 if(form.elements.originalCurrency){form.elements.originalCurrency.value=o.currency||db.currency;form.elements.originalCurrency.dispatchEvent(new Event('change',{bubbles:true}))}
 if(form.elements.exchangeRate)form.elements.exchangeRate.value=String(o.exchangeRate||1);
 if(form.elements.warehouseId)form.elements.warehouseId.value=String(o.warehouseId||'');
 const totalValue=o.items.reduce((s,i)=>s+Number(i.orderedQty||0)*Number(i.unitPriceOriginal||0),0);
 const receiptValue=pending.items.reduce((s,r)=>{const i=o.items.find(x=>x.id===r.itemId);return s+(i?Number(r.qty)*Number(i.unitPriceOriginal||0):0)},0);
 const ratio=totalValue>0?Math.min(1,receiptValue/totalValue):pending.items.reduce((s,r)=>s+r.qty,0)/Math.max(1,o.items.reduce((s,i)=>s+Number(i.orderedQty||0),0));
 for(const [name,value] of [['shippingOriginal',o.freightOriginal],['customsOriginal',o.customsOriginal],['otherCostsOriginal',o.otherCostsOriginal]])if(form.elements[name])form.elements[name].value=String(round(Number(value||0)*ratio));
 while(box.querySelectorAll('.order-line').length<pending.items.length)document.getElementById('addLine')?.click();
 const rows=[...box.querySelectorAll('.order-line')];
 pending.items.forEach((r,index)=>{const item=o.items.find(x=>x.id===r.itemId),row=rows[index];if(!item||!row)return;
  row.querySelector('[data-field="productName"]').value=item.name;row.querySelector('[data-field="productSku"]').value=item.sku||'';
  row.querySelector('[data-field="qty"]').value=String(r.qty);row.querySelector('[data-field="price"]').value=String(item.unitPriceOriginal||0);
  row.querySelector('[data-field="productName"]').dispatchEvent(new Event('change',{bubbles:true}));
 });
 if(form.elements.note)form.elements.note.value='تحویل سفارش در راه '+(o.trackingNumber||o.id)+(pending.discrepancy?' · اختلاف: '+pending.discrepancy:'');
 form.dispatchEvent(new Event('input',{bubbles:true}));
 toast('فاکتور تحویل آماده شد؛ اطلاعات را بررسی و سپس ثبت کنید.');
}
function currentInvoiceMeta(){
 const p=loadPending(),form=document.getElementById('dialogForm');
 if(!p||Date.now()-Number(p.createdAt||0)>30*60*1000||form?.dataset?.z672ReceiptToken!==p.token)return null;
 return {inTransitOrderId:p.orderId,inTransitReceiptToken:p.token,inTransitReceiptItems:p.items,inTransitDiscrepancy:p.discrepancy||'',inTransitSchemaVersion:VERSION};
}
function applyReceiptFromInvoice(tx){
 if(!tx?.inTransitOrderId||!tx.inTransitReceiptToken||!Array.isArray(tx.inTransitReceiptItems))return false;
 let changed=false;
 mutate(list=>{const o=list.find(x=>x.id===tx.inTransitOrderId);if(!o)return;if(!Array.isArray(o.receipts))o.receipts=[];
  if(o.receipts.some(r=>r.token===tx.inTransitReceiptToken))return;
  for(const r of tx.inTransitReceiptItems){const item=o.items.find(x=>x.id===r.itemId);if(!item)continue;item.receivedQty=Math.min(Number(item.orderedQty)||0,round(Number(item.receivedQty||0)+Number(r.qty||0)))}
  o.receipts.push({token:tx.inTransitReceiptToken,invoiceId:tx.id,date:tx.date,createdAt:tx.created||new Date().toISOString(),items:tx.inTransitReceiptItems,discrepancy:tx.inTransitDiscrepancy||''});
  const st=statusOf(o);o.status=st[2]+1e-9>=st[3]?'received':'partial';o.updatedAt=new Date().toISOString();changed=true;
 });return changed;
}
function reconcile(){
 const tagged=(db?.tx||[]).filter(t=>!t.voided&&t.type==='purchase'&&t.inTransitOrderId&&t.inTransitReceiptToken);
 for(const tx of tagged){try{applyReceiptFromInvoice(tx)}catch(e){console.warn('ZAVI in-transit reconcile',e)}}
 const p=loadPending();if(p&&tagged.some(t=>t.inTransitReceiptToken===p.token))clearPending();
}
function cancelOrder(id){const o=orders().find(x=>x.id===id);if(!o)return;if(o.items.some(i=>Number(i.receivedQty||0)>0))return toast('سفارشی که تحویل مرحله‌ای دارد لغو کامل نمی‌شود.');mutate(list=>{const x=list.find(v=>v.id===id);if(x){x.status='cancelled';x.updatedAt=new Date().toISOString()}});openManager()}
function openManager(){
 reconcile();
 const list=[...orders()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const body=`<div class="z672-manager-head"><p>کالای در راه تا زمان ثبت فاکتور تحویل وارد موجودی قابل فروش نمی‌شود.</p><button type="button" class="btn primary" id="z672New">+ سفارش در راه</button></div><div class="z672-order-list">${list.length?list.map(o=>{const [label,color,received,total]=statusOf(o);return '<article class="z672-order-card"><div class="z672-order-top"><div><strong>'+esc(o.supplierName)+'</strong><small>'+esc(o.country)+' · '+esc(o.trackingNumber||'بدون شماره پیگیری')+'</small></div><span class="pill '+color+'">'+esc(label)+'</span></div><div class="z672-order-meta"><span>ETA: <b>'+esc(o.etaDate||'—')+'</b></span><span>گدام: <b>'+esc(whName(o.warehouseId))+'</b></span><span>ارز: <b>'+esc(o.currency)+'</b></span><span>تحویل: <b>'+esc(received)+' / '+esc(total)+'</b></span></div><div class="z672-order-actions">'+(o.status!=='cancelled'&&received<total?'<button type="button" class="btn tiny primary" data-z672-receive="'+esc(o.id)+'">ثبت تحویل</button>':'')+'<button type="button" class="btn tiny subtle" data-z672-edit="'+esc(o.id)+'">ویرایش</button>'+(o.status!=='cancelled'&&received===0?'<button type="button" class="btn tiny subtle" data-z672-cancel="'+esc(o.id)+'">لغو</button>':'')+'</div></article>'}).join(''):'<div class="z672-empty">هنوز سفارش در راه ثبت نشده است.</div>'}</div>`;
 showModal('سفارش‌های در راه',body,'',false);
 document.getElementById('z672New').onclick=()=>createOrder('');
 const overlay=document.getElementById('overlay');overlay?.addEventListener('click',e=>{const r=e.target.closest('[data-z672-receive]'),ed=e.target.closest('[data-z672-edit]'),c=e.target.closest('[data-z672-cancel]');if(r)receive(r.dataset.z672Receive);else if(ed)createOrder(ed.dataset.z672Edit);else if(c)cancelOrder(c.dataset.z672Cancel)});
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action="purchase_internal"],[data-action="in_transit_orders"]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.dataset.action==='purchase_internal')openOrder('purchase','',false);else openManager();
},true);
window.addEventListener('zavi:invoice-saved',e=>{const tx=(db?.tx||[]).find(t=>t.id===e.detail?.invoiceId);if(tx&&applyReceiptFromInvoice(tx)){const p=loadPending();if(p?.token===tx.inTransitReceiptToken)clearPending()}});
window.addEventListener('zavi-cloud-workspace-selected',()=>setTimeout(reconcile,400));
window.ZaviInTransitV6720=Object.freeze({open:openManager,currentInvoiceMeta,reconcile});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reconcile,{once:true});else reconcile();
})();