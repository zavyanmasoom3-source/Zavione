/* Historical V66.62 — genuine independent color stock using existing product ledger.
 * Each model+color is ONE original product (unique id, barcode and openingQty).
 * One commit() for the entire group. No new cloud table, no mock inventory.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){root.ZaviCaseVariants66=api;api.attach(root)}
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const norm=v=>String(v??'').trim().toLocaleLowerCase();
 const clean=v=>String(v??'').trim();
 const number=(v,field,max=1e11)=>{
  if(v===''||v===null||v===undefined)throw Error(field+' ضروری است.');
  const n=Number(v);
  if(!Number.isFinite(n)||n<0||n>max)throw Error(field+' نامعتبر است.');
  return n;
 };
 function build(input,existing,idFn){
  const name=clean(input.name),model=clean(input.model),material=clean(input.material),kind=clean(input.kind);
  if(!['covers','accessories'].includes(kind))throw Error('نوع کالای موبایل نامعتبر است.');
  if(!name||name.length>140||!model||model.length>100)throw Error('نام و مدل سازگار لازم است.');
  if(material.length>80)throw Error('مشخصات جنس طولانی است.');
  const salePrice=number(input.salePrice,'قیمت فروش'),purchasePrice=number(input.purchasePrice,'قیمت خرید');
  const reorder=number(input.reorder??5,'حداقل موجودی',1e6);
  const variants=input.variants||[];
  if(!Array.isArray(variants)||!variants.length||variants.length>20)throw Error('حداقل یک رنگ و حداکثر 20 رنگ انتخاب کنید.');
  const existingCodes=new Set(),names=new Set(),colorNames=new Set();
  for(const p of existing||[]){
   names.add(norm(p.name));
   for(const c of [p.sku,...(Array.isArray(p.barcodes)?p.barcodes:[])])if(clean(c))existingCodes.add(norm(c));
  }
  const group=idFn('vg'),records=[];
  for(const raw of variants){
   const color=clean(raw.color);
   if(!color||color.length>40||colorNames.has(norm(color)))throw Error('رنگ تکراری یا نامعتبر است.');
   colorNames.add(norm(color));
   const qty=number(raw.qty,'تعداد رنگ '+color,1e8);
   if(!Number.isInteger(qty))throw Error('تعداد هر رنگ باید عدد صحیح باشد.');
   const id=idFn('p');
   let barcode=clean(raw.barcode);
   if(!barcode)barcode='ZV-'+id.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(-25);
   if(barcode.length>70||!/^[A-Za-z0-9_.\\/-]+$/.test(barcode))throw Error('بارکد رنگ '+color+' نامعتبر است.');
   if(existingCodes.has(norm(barcode)))throw Error('بارکد تکراری برای '+color);
   existingCodes.add(norm(barcode));
   const productName=[name,model,color].filter(Boolean).join(' - ');
   if(productName.length>140||names.has(norm(productName)))throw Error('نام محصول تکراری یا بسیار طولانی است: '+productName);
   names.add(norm(productName));
   const values={model,material,color,variantGroup:group,variantBarcode:barcode};
   if(kind==='accessories'){values.item=name;delete values.material;values.serial=''}
   records.push({
    id,name:productName,sku:barcode,barcodes:[],category:kind==='covers'?'کاور و پوش موبایل':'لوازم جانبی موبایل',
    salePrice:Math.round(salePrice*100)/100,purchasePrice:Math.round(purchasePrice*100)/100,
    reorder,openingQty:qty,openingCost:Math.round(purchasePrice*100)/100,
    industryDetails:{type:kind,values}
   });
  }
  return records;
 }
 function attach(){
  if(typeof document==='undefined')return;
  const scope=()=>document.querySelector('#content');
  function maybeInstall(){
   const content=scope(),biz=window.zaviActiveIndustry?.();
   if(!content||!['mobile','covers','accessories'].includes(biz))return;
   const title=content.querySelector('.page-head h2')?.textContent||'';
   if(!/محصول|گدام|Products|Inventory/i.test(title))return;
   const actions=content.querySelector('.page-head .action-group')||content.querySelector('.page-head');
   if(!actions||actions.querySelector('#zvCaseVariantsAdd'))return;
   const button=document.createElement('button');button.type='button';
   button.id='zvCaseVariantsAdd';button.className='btn subtle';
   button.textContent='📱 ثبت چندرنگ کاور / لوازم موبایل';
   button.addEventListener('click',open);actions.append(button);
  }
  function open(){
   if(typeof db==='undefined'||typeof commit!=='function'||typeof showModal!=='function'){
    window.alert('فورم کالا در این نسخه فعال نیست.');return;
   }
   if(window.zaviCloudCanEdit?.()===false)return toast(window.zaviAccessDiagnostic?.()||'اجازه ثبت محصول ندارید.');
   const body=`<div class="zv-phone-product form-grid">
    <div class="field full"><label>نام محصول</label><input name="name" required maxlength="100" placeholder="کاور سیلیکونی / کابل شارژ"></div>
    <div class="field"><label>نوع</label><select name="kind"><option value="covers">کاور، پوش، پوزه</option><option value="accessories">لوازم جانبی موبایل</option></select></div>
    <div class="field"><label>مدل سازگار</label><input name="model" maxlength="100" required placeholder="Samsung A56 / iPhone 16"></div>
    <div class="field"><label>جنس / نوع</label><input name="material" maxlength="80" placeholder="سیلیکون، چرمی، شفاف"></div>
    <div class="field"><label>قیمت فروش (پول اصلی فروشگاه)</label><input name="salePrice" type="number" min="0" step="0.01" required value="0"></div>
    <div class="field"><label>قیمت خرید (پول اصلی فروشگاه)</label><input name="purchasePrice" type="number" min="0" step="0.01" required value="0"></div>
    <div class="field"><label>حداقل موجودی هر رنگ</label><input name="reorder" type="number" min="0" step="1" value="5"></div>
    <div class="field full"><strong>هر رنگ، بارکد و موجودی جداگانه</strong><small>بارکد خالی خودکار ساخته می‌شود. برای هر رنگ فقط یک محصول مستقل ثبت خواهد شد.</small></div>
    <div class="field full" id="zvPhoneColorRows"></div>
    <div class="field full"><label>رنگ دلخواه</label><div class="zv-phone-add-color"><input id="zvNewColor" maxlength="40" placeholder="مثلاً نارنجی"><button type="button" class="btn subtle" id="zvAddColor">افزودن رنگ</button></div></div>
    <div class="field full"><small>هر تغییر موجودی بعدی از اسناد فعلی فروش، خرید و تعدیل گدام استفاده می‌کند. این فورم اطلاعات قبلی را تغییر نمی‌دهد.</small></div>
   </div>`;
   showModal('ثبت محصول با چند رنگ',body,'ثبت تمام رنگ‌های انتخاب‌شده');
   const form=document.querySelector('#dialogForm');
   if(!form)return;
   const rows=form.querySelector('#zvPhoneColorRows'), seen=new Set();
   function addColor(c,checked=false){
    c=clean(c);if(!c||seen.has(norm(c))||seen.size>=20)return false;
    seen.add(norm(c));
    const row=document.createElement('div');row.className='zv-phone-color-row';
    const label=document.createElement('label');const input=document.createElement('input');
    input.type='checkbox';input.checked=checked;
    label.append(input,document.createTextNode(' '+c));
    const qty=document.createElement('input');qty.type='number';qty.min='0';qty.step='1';qty.placeholder='تعداد';qty.value='0';qty.disabled=!checked;
    const barcode=document.createElement('input');barcode.maxLength=70;barcode.placeholder='بارکد مستقل (اختیاری)';barcode.disabled=!checked;
    input.addEventListener('change',()=>{qty.disabled=barcode.disabled=!input.checked;});
    row.append(label,qty,barcode);row.dataset.color=c;row._zvInputs={input,qty,barcode};
    rows.append(row);return true;
   }
   ['سیاه','سفید','آبی','سرخ','سبز','صورتی','شفاف','طلایی'].forEach((v,i)=>addColor(v,i===0));
   form.querySelector('#zvAddColor').onclick=()=>{
    const input=form.querySelector('#zvNewColor');
    if(addColor(input.value,true))input.value='';
   };
   let saving=false;
   form.onsubmit=e=>{
    e.preventDefault();if(saving)return;
    saving=true;
    try{
     const f=form.elements;
     const variants=[...rows.children].filter(r=>r._zvInputs?.input.checked)
      .map(r=>({color:r.dataset.color,qty:r._zvInputs.qty.value,barcode:r._zvInputs.barcode.value}));
     const draft={name:f.name.value,model:f.model.value,kind:f.kind.value,material:f.material.value,
      salePrice:f.salePrice.value,purchasePrice:f.purchasePrice.value,reorder:f.reorder.value,variants};
     const records=build(draft,db.products,newId);
     if(window.zaviCloudCanEdit?.()===false)throw Error('صلاحیت ثبت محصول تأیید نشد.');
     const ok=commit(n=>{
      const codes=new Set(n.products.flatMap(p=>[p.sku,...(p.barcodes||[])]).filter(Boolean).map(norm));
      const productNames=new Set(n.products.map(p=>norm(p.name)));
      for(const p of records){
       if(codes.has(norm(p.sku))||productNames.has(norm(p.name)))throw Error('بارکد یا نام محصول هم‌زمان قبلاً ثبت شد.');
       codes.add(norm(p.sku));productNames.add(norm(p.name));n.products.push(p);
      }
     });
     if(ok){closeModal();toast(records.length+' محصول رنگی با موجودی مستقل ذخیره شد.');}
    }catch(err){toast(err.message||'خطا در ثبت محصول چندرنگ');}
    finally{saving=false}
   };
  }
  const start=()=>{
   const content=scope();if(!content)return;
   let scheduled=false;
   new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;maybeInstall()})})
    .observe(content,{childList:true,subtree:false});
   maybeInstall();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 }
 return Object.freeze({build,attach});
});
