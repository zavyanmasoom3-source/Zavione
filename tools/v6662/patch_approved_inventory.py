#!/usr/bin/env python3
"""Approved inventory presentation on exact V66.62. Location metadata is NOT an independent stock ledger."""
from patch_approved_sales import once
from pathlib import Path

CSS="""<style id="zavi-approved-inventory-style">
html #content .zinv .page-head{height:auto!important;min-height:0!important;max-height:none!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:8px!important;margin:0 0 10px!important}
html #content .zinv .page-head>div:first-child{flex:0 1 auto!important;width:100%!important}
html #content .zinv .action-group{gap:7px!important;flex-wrap:wrap!important}
html #content .zinv .page-head .action-group>.btn{flex:1 1 42%!important;min-height:42px!important}
html #content .zinv .page-head .btn.primary{background:#075be8!important;color:white!important;-webkit-text-fill-color:white!important}
html #content .zinv-tabs{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0}
html #content .zinv-tabs .btn{flex:1 1 auto;min-height:40px;padding:7px 9px;font-size:12px}
html #content .zinv-tabs [aria-pressed=true]{background:#075be8!important;color:white!important;-webkit-text-fill-color:white!important}
html #content .zinv .report-grid{gap:8px!important;margin:10px 0!important}
html #content .zinv .stat{min-height:0!important;padding:11px!important}
html #content .zinv .z638-warehouse-scanner{padding:10px!important;margin:8px 0!important}
html #content .zinv .z638-scanner-head p{font-size:11px!important;line-height:1.45!important;margin:3px 0!important}
html #content .zinv .record-card{padding:10px!important;margin:6px 0!important}
html #content .zinv .empty{min-height:90px!important;height:auto!important;padding:16px!important}
html #content .zinv .zinv-note{padding:10px;line-height:1.6;font-size:12px}
html #content .zinv .zinv-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-bottom:1px solid var(--border,#7891b533)}
html #content .zinv .zinv-row:last-child{border-bottom:0}
html #content .zinv .zinv-label-preview{background:white!important;color:#111!important;padding:12px;text-align:center;border:1px solid #9ca3af;border-radius:6px;max-width:100%;overflow:auto}
html #content .zinv .zinv-label-preview svg{display:block;width:100%;max-width:320px;margin:6px auto}
html #content .zinv .zinv-label-preview *{color:#111!important;-webkit-text-fill-color:#111!important}
html #overlay .zinv-dialog .modal-head h3{color:var(--text,#153553)!important;-webkit-text-fill-color:currentColor!important;opacity:1!important}
html[data-zavi-theme=dark] #overlay .zinv-dialog .modal-head h3{color:#edf6ff!important}
html[data-zavi-theme=light] #overlay .zinv-dialog .modal-head h3{color:#153553!important}
html #overlay .zinv-dialog .form-grid{gap:9px!important}
html #overlay .zinv-dialog .zavi-barcode-box{padding:8px!important;margin:0!important}
html #overlay .zinv-dialog .zavi-barcode-actions{display:flex!important;flex-wrap:wrap!important;gap:6px!important}
html #overlay .zinv-dialog .zavi-barcode-actions .btn{min-height:42px!important;height:auto!important;flex:1 1 100px!important}
html #overlay .zinv-dialog .z641-product-match.empty-code{display:none!important}
html #overlay .zinv-dialog details.zinv-optional{grid-column:1/-1;min-width:0}
html #overlay .zinv-dialog details.zinv-optional>summary{cursor:pointer;padding:9px;min-height:42px;font-size:13px}
html #overlay .zinv-dialog .z629-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
html #overlay .zinv-dialog .z629-field select{font-size:11px!important}
html #overlay .zinv-dialog .modal-foot>button[type=submit]{flex:1;min-height:44px;background:#075be8!important;color:white!important;-webkit-text-fill-color:white!important}
html:has(#overlay .zinv-dialog) :is(#z637AiButton,.z637-ai-button,#z605-launch){visibility:hidden!important}
@media(max-width:360px){html #overlay .zinv-dialog .z629-fields{grid-template-columns:1fr}}
</style>"""

JS="""let zinvTab='products',zinvFilter='all';
const zinvCategories={
 general:['عمومی','کالا','خدمات'],supermarket:['مواد خوراکی','نوشیدنی','شوینده','لبنیات'],pharmacy:['تابلیت','کپسول','شربت','آمپول','کریم'],laboratory:['آزمایش','مواد مصرفی','تجهیزات'],gold:['انگشتر','لاکت','سیت','نیم‌سیت','زنجیر','دستبند','گوشواره','النگو'],mobile:['موبایل نو','موبایل دست دوم','تبلت'],wholesale:['کارتن','بسته','بوجی'],distribution:['محصول توزیعی','بسته','کارتن'],clothing:['پیراهن','پتلون','کرتی','لباس زنانه','لباس طفلانه'],footwear:['ورزشی','رسمی','بوت','صندل'],bookstore:['کتاب','قلم','کتابچه','کاغذ'],cosmetics:['عطر','کریم','شامپو','آرایش'],electronics:['تلویزیون','کمپیوتر','چراغ','کیبل','وسایل صوتی'],furniture:['میز','چوکی','الماری','مبل','تخت'],hardware:['ابزار دستی','ابزار برقی','دریل'],construction:['سمنت','سیخ گول','ریگ','خشت'],exchange:['ارز','خدمات صرافی'],contractor:['مصالح','تجهیزات','خدمات پروژه'],services:['خدمات','مواد مصرفی'],company:['کالا','خدمات','تجهیزات'],restaurant:['غذا','نوشیدنی','مواد اولیه'],covers:['کاور','پوش مگنت','پوزه موبایل','گلس'],accessories:['چارجر','کیبل','هندزفری','پاوربانک','گلس']
};
function zinvWarehouses(){return [{id:'main',name:'گدام اصلی',code:'WH-001'},...(Array.isArray(db.zinvLocations)?db.zinvLocations.filter(x=>x&&typeof x.id==='string'&&x.id!=='main'&&typeof x.name==='string'&&typeof x.code==='string'):[])];}
function zinvWarehouseEditor(id){
 const w=zinvWarehouses().find(x=>x.id===id);
 if(id==='main')return toast('گدام اصلی ثابت است.');
 showModal(w?'ویرایش نام گدام':'افزودن گدام', '<div class="form-grid">'+field('name','نام گدام',w?.name||'','text','required maxlength="100"')+field('code','کود گدام',w?.code||'','text','required maxlength="40"')+'</div><p class="tiny-note">این ثبت فقط نام و کود موقعیت است؛ موجودی حسابداری فعلاً مشترک است.</p>');
 const form=document.getElementById('dialogForm');form.closest('.modal')?.classList.add('zinv-dialog');
 form.onsubmit=e=>{e.preventDefault();const name=form.elements.name.value.trim(),code=form.elements.code.value.trim();if(!name||!code)return toast('نام و کود لازم است.');
 if(zinvWarehouses().some(x=>x.id!==id&&(normalizeName(x.name)===normalizeName(name)||normalizeName(x.code)===normalizeName(code))))return toast('نام یا کود تکراری است.');
 if(commit(n=>{const list=Array.isArray(n.zinvLocations)?n.zinvLocations:[];n.zinvLocations=w?list.map(x=>x.id===id?{...x,name,code}:x):[...list,{id:newId('wh'),name,code}];})){closeModal();toast('نام گدام ذخیره شد.');}
 };
}
function zinvLocationPanel(){
 return '<section class="card zinv-note"><p>نام و کود گدام‌ها · موجودی فعلاً در دفتر مشترک ثبت می‌شود. انتقال مالی و مقدار مستقل هنوز فعال نیست.</p><button class="btn primary" data-zinv-new>+ گدام جدید</button>'+zinvWarehouses().map(w=>'<div class="zinv-row"><div><strong>'+escapeHtml(w.name)+'</strong><small dir="ltr"> · '+escapeHtml(w.code)+'</small></div>'+(w.id==='main'?'<small>دفتر مشترک</small>':'<button class="btn tiny subtle" data-zinv-edit="'+escapeHtml(w.id)+'">ویرایش</button>')+'</div>').join('')+'</section>';
}
function zinvMovementRows(){
 const result=[];
 for(const t of orderByDate(db.tx)){
  if(t.voided)continue;
  const factor=({purchase:1,sale:-1,sale_return:1,purchase_return:-1})[t.type];
  if(factor){for(const item of t.items||[])if(item.productId)result.push({date:t.date,code:t.code||'',name:item.productName||productName(item.productId),delta:factor*num(item.qty),type:txLabel(t),note:t.note||''});}
  else if(t.type==='stock_adjust')result.push({date:t.date,code:t.code||'',name:productName(t.productId),delta:num(t.delta),type:'اصلاح موجودی',note:t.note||''});
 }
 return result;
}
function zinvMovements(){
 const rows=zinvMovementRows().filter(x=>normalizeName(x.name+' '+x.code+' '+x.note).includes(normalizeName(search)));
 const r=z647Limit(rows,'products');
 return '<section class="card"><div class="table-bar"><input id="searchInput" aria-label="جستجوی حرکت" placeholder="محصول، کود یا دلیل" value="'+escapeHtml(search)+'"></div><div class="zinv-note">حرکات واقعی دفتر موجودی؛ بدون تغییر حساب.</div>'+ (r.rows.length?r.rows.map(x=>'<div class="zinv-row"><div><strong>'+escapeHtml(x.name)+'</strong><div><small>'+escapeHtml(x.type)+' · '+escapeHtml(x.code)+'</small></div><small>'+escapeHtml(toLatin(fmtDate(x.date)))+' · '+escapeHtml(x.date||'')+'</small>'+(x.note?'<div class="muted">'+escapeHtml(x.note)+'</div>':'')+'</div><b dir="ltr">'+(x.delta>0?'+':'')+fmtQty(x.delta)+'</b></div>').join(''):emptyView('product','حرکتی یافت نشد',''))+'</section>'+window.ZaviPaging647.controls(r,'products');
}
const zinv128Patterns='212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
function zinvBarcode(code,type){
 code=String(code||'');
 let bits='';
 if(type==='EAN-13'){
  if(!/^[0-9]{13}$/.test(code))throw Error('EAN-13 به 13 رقم معتبر نیاز دارد.');
  const a=[...code].map(Number),sum=a.slice(0,12).reduce((s,x,i)=>s+x*(i%2?3:1),0);
  if((10-sum%10)%10!==a[12])throw Error('رقم کنترل EAN-13 معتبر نیست.');
  const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  const invert=s=>s.replace(/[01]/g,c=>c==='1'?'0':'1');
  bits='101'+a.slice(1,7).map((v,i)=>parity[a[0]][i]==='L'?L[v]:[...invert(L[v])].reverse().join('')).join('')+'01010'+a.slice(7).map(v=>invert(L[v])).join('')+'101';
 }else{
  if(!/^[ -~]{1,40}$/.test(code))throw Error('Code128: کود انگلیسی 1 تا 40 حرف یا رقم.');
  const data=[...code].map(c=>c.charCodeAt(0)-32),check=(104+data.reduce((s,x,i)=>s+x*(i+1),0))%103;
  bits=[104,...data,check,106].map(v=>[...zinv128Patterns[v]].map((n,i)=>(i%2?'0':'1').repeat(Number(n))).join('')).join('');
 }
 const pad=11,w=bits.length+pad*2;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' 54" role="img" aria-label="barcode" shape-rendering="crispEdges"><rect width="'+w+'" height="54" fill="white"/>'+[...bits].map((b,i)=>b==='1'?'<rect x="'+(i+pad)+'" y="2" width="1" height="50" fill="black"/>':'').join('')+'</svg>';
}
function zinvLabels(){
 return '<section class="card zinv-note"><h3>چاپ لیبل</h3><div class="form-grid">'+selectField('zinvProduct','محصول',db.products.map(p=>[p.id,p.name]))+selectField('zinvType','نوع بارکد',[['Code128','Code128'],['EAN-13','EAN-13']])+selectField('zinvSize','سایز لیبل',[['50x30','50 × 30 mm'],['40x30','40 × 30 mm'],['60x40','60 × 40 mm']])+field('zinvCount','تعداد',1,'number','min="1" max="200" step="1"')+'</div><div class="zinv-row"><label><input type="checkbox" id="zinvName" checked> نام</label><label><input type="checkbox" id="zinvPrice" checked> قیمت</label><label><input type="checkbox" id="zinvCode" checked> کود</label></div><button class="btn primary" data-zinv-preview>پیش‌نمایش</button> <button class="btn subtle" data-zinv-print>چاپ لیبل</button><div id="zinvPreview"></div><small>چاپ از مسیر چاپ سیستم؛ اتصال چاپگر حرارتی باید روی دستگاه بررسی شود.</small></section>';
}
function zinvLabel(print=false){
 const val=n=>document.querySelector('[name="'+n+'"]')?.value;
 const p=db.products.find(x=>x.id===val('zinvProduct'));if(!p)return toast('محصول را انتخاب کنید.');
 const code=p.sku||(p.barcodes||[])[0],type=val('zinvType'),count=Number(val('zinvCount'));
 if(!Number.isInteger(count)||count<1||count>200)return toast('تعداد لیبل از 1 تا 200.');
 const size=val('zinvSize');if(!['50x30','40x30','60x40'].includes(size))return;
 try{
  const svg=zinvBarcode(code,type),checked=id=>document.getElementById(id)?.checked;
  const label='<div class="zinv-label-preview">'+(checked('zinvName')?'<strong>'+escapeHtml(p.name)+'</strong>':'')+(checked('zinvPrice')?'<div>'+escapeHtml(currency(p.salePrice))+'</div>':'')+svg+'<div dir="ltr">'+escapeHtml(code)+'</div>'+(checked('zinvCode')&&p.sku&&p.sku!==code?'<small>'+escapeHtml(p.sku)+'</small>':'')+'</div>';
  document.getElementById('zinvPreview').innerHTML=label;
  if(print){const w=window.open('','_blank');if(!w)return toast('پنجره چاپ باز نشد.');const [a,b]=size.split('x');w.document.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:'+a+'mm '+b+'mm;margin:0}body{margin:0;font:10px Arial}.zinv-label-preview{box-sizing:border-box;width:'+a+'mm;height:'+b+'mm;overflow:hidden;padding:2mm;text-align:center;page-break-after:always}.zinv-label-preview:last-child{page-break-after:auto}svg{width:100%;height:12mm;display:block}</style></head><body>'+label.repeat(count)+'</body></html>');w.document.close();w.focus();w.print();}
 }catch(e){toast(e.message||'بارکد معتبر نیست.')}
}
function renderProducts(){
 const labels=[['products','محصولات'],['warehouses','گدام‌ها'],['moves','حرکت‌ها'],['labels','چاپ لیبل']];
 const tabs='<div class="zinv-tabs">'+labels.map(([k,l])=>'<button class="btn subtle" type="button" data-zinv-tab="'+k+'" aria-pressed="'+String(zinvTab===k)+'">'+l+'</button>').join('')+'</div>';
 const body=zinvTab==='products'?renderProductsBase():header('محصولات و گدام‌ها','',button('product','محصول جدید'))+(zinvTab==='warehouses'?zinvLocationPanel():zinvTab==='moves'?zinvMovements():zinvLabels());
 return '<div class="zinv">'+tabs+body+'</div>';
}
document.addEventListener('click',e=>{
 if(page!=='products')return;
 const tab=e.target.closest('[data-zinv-tab]');if(tab){zinvTab=tab.dataset.zinvTab;search='';z647Pages.products=0;render();return;}
 if(e.target.closest('[data-zinv-new]'))return zinvWarehouseEditor('');
 const edit=e.target.closest('[data-zinv-edit]');if(edit)return zinvWarehouseEditor(edit.dataset.zinvEdit);
 if(e.target.closest('[data-zinv-preview]'))return zinvLabel();
 if(e.target.closest('[data-zinv-print]'))return zinvLabel(true);
});
document.addEventListener('change',e=>{if(page==='products'&&e.target.id==='zinvFilter'){zinvFilter=e.target.value;z647Pages.products=0;render();}});
"""


# Replace the remaining legacy inventory landing page, not the financial handlers.
COMPACT_CSS = "\n<style id=\"zavi-approved-inventory-compact-v2\">\nhtml #content .zinv .zinv-compact-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:0!important;margin:0 0 10px!important;min-height:0!important;height:auto!important}\nhtml #content .zinv .zinv-compact-head h2{font-size:18px!important;line-height:1.35!important;margin:0!important}\nhtml #content .zinv .zinv-compact-head .btn{min-height:42px!important;white-space:nowrap!important}\nhtml #content .zinv .zinv-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;margin:0 0 12px!important}\nhtml #content .zinv .zinv-tabs .btn{min-width:0!important;font-size:11px!important;padding:7px 2px!important;white-space:normal!important;line-height:1.25!important}\nhtml #content .zinv .zinv-summary{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;margin:0 0 10px!important}\nhtml #content .zinv .zinv-summary .card{padding:9px!important;min-height:0!important;height:auto!important;margin:0!important;display:grid!important;gap:4px!important}\nhtml #content .zinv .zinv-summary small{font-size:11px!important;line-height:1.2!important}\nhtml #content .zinv .zinv-summary b{font-size:22px!important;line-height:1.2!important;font-variant-numeric:tabular-nums}\nhtml #content .zinv .zinv-good{color:var(--success,#15803d)!important}\nhtml #content .zinv .zinv-low{color:var(--warning,#b45309)!important}\nhtml #content .zinv .zinv-out{color:var(--danger,#dc2626)!important}\nhtml #content .zinv .zinv-toolbar{padding:9px!important;margin:0 0 8px!important;display:grid!important;gap:8px!important;min-height:0!important;height:auto!important}\nhtml #content .zinv .zinv-toolbar .searchbox{width:100%!important;min-width:0!important;flex:1!important}\nhtml #content .zinv .zinv-searchrow{display:flex!important;align-items:center!important;gap:6px!important}\nhtml #content .zinv .zinv-searchrow .btn{flex:0 0 auto!important;min-height:42px!important}\nhtml #content .zinv .zinv-filterrow{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}\nhtml #content .zinv .zinv-filterrow select{min-width:0!important;width:100%!important;min-height:40px!important}\nhtml #content .zinv .zinv-extra{margin:0 0 8px!important;padding:8px!important;min-height:0!important;height:auto!important}\nhtml #content .zinv .zinv-extra>summary{font-size:12px!important;cursor:pointer;min-height:30px;display:flex;align-items:center;gap:6px}\nhtml #content .zinv .zinv-extra>summary:before{content:\"+\";font-weight:bold}\nhtml #content .zinv .zinv-extra[open]>summary:before{content:\"−\"}\nhtml #content .zinv .zinv-extra .action-group{display:flex!important;flex-wrap:wrap!important;margin-top:8px!important}\nhtml #content .zinv .zinv-extra .z638-warehouse-scanner{margin:6px 0 0!important;padding:8px!important}\nhtml #content .zinv .zinv-list{display:grid!important;gap:8px!important;margin:0!important}\nhtml #content .zinv .zinv-product-card{padding:10px!important;margin:0!important;min-height:0!important;height:auto!important;display:grid!important;gap:8px!important}\nhtml #content .zinv .zinv-product-top{display:flex!important;gap:8px!important;align-items:center!important;min-width:0!important}\nhtml #content .zinv .zinv-product-top .product-photo{width:44px!important;height:44px!important;flex:0 0 44px!important;object-fit:cover;border-radius:10px!important}\nhtml #content .zinv .zinv-product-title{min-width:0!important;flex:1!important;overflow-wrap:anywhere}\nhtml #content .zinv .zinv-product-title strong{font-size:14px!important;line-height:1.4!important;display:block!important}\nhtml #content .zinv .zinv-product-title small{font-size:11px!important;display:block!important;line-height:1.4!important}\nhtml #content .zinv .zinv-product-bottom{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:6px!important;border-top:1px solid var(--border,#7891b533);padding-top:8px!important}\nhtml #content .zinv .zinv-product-bottom>div{min-width:0!important;display:grid!important;gap:3px!important}\nhtml #content .zinv .zinv-product-bottom small{font-size:10px!important}\nhtml #content .zinv .zinv-product-bottom b{font-size:13px!important;overflow-wrap:anywhere}\nhtml #content .zinv .zinv-product-top .btn{min-width:38px!important;min-height:38px!important;padding:6px!important}\nhtml #content .zinv .zinv-location-note{margin:5px 0 0!important;font-size:11px!important;line-height:1.4!important}\nhtml #overlay .zinv-dialog .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}\nhtml #overlay .zinv-dialog .form-grid>.field:has([name=name]),html #overlay .zinv-dialog .form-grid>.field:has([name=sku]),html #overlay .zinv-dialog .form-grid>.field:has([name=category]){grid-column:1/-1!important}\nhtml #overlay .zinv-dialog .form-grid .field{min-width:0!important}\nhtml #overlay .zinv-dialog .form-grid .field label{font-size:12px!important}\nhtml #overlay .zinv-dialog .form-grid .field input,html #overlay .zinv-dialog .form-grid .field select{min-width:0!important;min-height:40px!important}\n@media(min-width:760px){html #content .zinv .zinv-list{grid-template-columns:repeat(2,minmax(0,1fr))!important}}\n</style>"
COMPACT_PRODUCTS = "function renderProductsBase(){\n const stock=stockState(),all=db.products,quantity=p=>num(stock[p.id]?.qty),low=p=>quantity(p)>0&&quantity(p)<=num(p.reorder),out=p=>quantity(p)<=0;\n const found=all.filter(p=>normalizeName(p.name+' '+(p.sku||'')+' '+(p.category||'')+' '+zaviProductCodes(p).join(' ')).includes(normalizeName(search))).filter(p=>zinvFilter==='all'||(zinvFilter==='low'?low(p):out(p)));\n const result=z647Limit(found,'products'),items=result.rows;\n const summary=(label,count,cls)=>'<div class=\"card\"><small>'+label+'</small><b dir=\"ltr\" class=\"'+cls+'\">'+fmtQty(count)+'</b></div>';\n const top='<div class=\"zinv-compact-head\"><h2>محصولات و گدام‌ها</h2>'+button('product','محصول جدید')+'</div>';\n const stats='<div class=\"zinv-summary\">'+summary('محصولات',all.length,'')+summary('کم‌موجودی',all.filter(low).length,'zinv-low')+summary('ناموجود',all.filter(out).length,'zinv-out')+'</div>';\n const controls='<section class=\"card zinv-toolbar\"><div class=\"zinv-searchrow\"><div class=\"searchbox\">'+icon('search')+'<input id=\"searchInput\" placeholder=\"نام، کود یا بارکد\" value=\"'+escapeHtml(search)+'\"></div><button type=\"button\" class=\"btn subtle\" data-zinv-scan aria-label=\"اسکن بارکد\">'+icon('search')+' اسکن</button></div><div class=\"zinv-filterrow\"><select id=\"zinvFilter\" aria-label=\"فیلتر موجودی\">'+[['all','همه محصولات'],['low','کم‌موجودی'],['out','ناموجود']].map(([k,l])=>'<option value=\"'+k+'\" '+(zinvFilter===k?'selected':'')+'>'+l+'</option>').join('')+'</select><select id=\"stockCurrency\" '+(z20Option('usdStock')?'':'disabled')+'><option value=\"AFN\" '+(stockDisplayCurrency==='AFN'?'selected':'')+'>پول اصلی</option><option value=\"USD\" '+(stockDisplayCurrency==='USD'?'selected':'')+'>USD</option></select></div><small class=\"zinv-location-note\">موجودی مشترک تمام گدام‌ها · '+fmtQty(result.total)+' محصول</small></section>';\n const scanner='<details class=\"card zinv-extra\" id=\"zinvScanPanel\"><summary>اسکن بارکد</summary>'+zaviWarehousePanel()+'</details>';\n const value=Object.values(stock).reduce((s,v)=>s+v.value,0),total=Object.values(stock).reduce((s,v)=>s+v.qty,0);\n const extras='<details class=\"card zinv-extra\"><summary>امکانات بیشتر و ارزش گدام</summary><div class=\"zinv-row\"><span>مجموع موجودی</span><b>'+fmtQty(total)+'</b></div><div class=\"zinv-row\"><span>بهای گدام</span><b>'+currency(value)+'</b></div><div class=\"zinv-row\"><span>ارزش به دالر (فقط نمایش)</span><b>'+usdValue(value)+'</b></div><div class=\"action-group\">'+button('stock_adjust','اصلاح موجودی','transfer','subtle')+'<label class=\"btn file-button subtle\">'+icon('upload')+' ورود فهرست محصول <input type=\"file\" id=\"productCsvImport\" accept=\".csv,text/csv\"></label>'+button('product_template','نمونه CSV','download','subtle')+'</div></details>';\n const cards='<div class=\"zinv-list\">'+items.map(p=>{const q=quantity(p),cls=out(p)?'zinv-out':low(p)?'zinv-low':'zinv-good';return '<article class=\"card zinv-product-card\"><div class=\"zinv-product-top\">'+zaviPhotoMarkup(p)+'<div class=\"zinv-product-title\"><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.category||'بدون دسته')+' · '+escapeHtml(p.sku||'بدون کود')+'</small>'+(p.industryDetails?.values&&Object.keys(p.industryDetails.values).length?'<small class=\"z629-item-meta\">'+window.ZaviIndustryForms6529.display(p.industryDetails,2).map(([a,b])=>escapeHtml(a+': '+b)).join(' · ')+'</small>':'')+'</div><button class=\"btn tiny\" data-action=\"edit_product\" data-id=\"'+escapeHtml(p.id)+'\" aria-label=\"ویرایش محصول\">'+icon('edit')+'</button></div><div class=\"zinv-product-bottom\"><div><small>قیمت فروش</small><b>'+displayStock(p.salePrice)+'</b></div><div><small>قیمت خرید</small><b>'+displayStock(p.purchasePrice??unitCost(p.id))+'</b></div><div><small>موجودی</small><b class=\"'+cls+'\">'+fmtQty(q)+' عدد</b></div></div></article>';}).join('')+'</div>';\n return top+stats+controls+scanner+extras+(items.length?cards:emptyView('product','محصولی یافت نشد','برای شروع، محصول جدید اضافه کنید.'))+window.ZaviPaging647.controls(result,'products');\n}"

def compact_inventory(s):
 start=s.index('function renderProductsBase(){')
 end=s.index('\nfunction ',start+len('function renderProductsBase(){'))
 old=s[start:end]
 for token in ('stockState()','productCsvImport','stockCurrency','zaviWarehousePanel()','edit_product','ZaviPaging647.controls'):
  assert token in old, 'Unexpected inventory baseline: '+token
 s=s[:start]+COMPACT_PRODUCTS+'\n'+s[end:]
 s=once(s,"if(e.target.closest('[data-zinv-new]'))", "if(e.target.closest('[data-zinv-scan]')){const panel=document.getElementById('zinvScanPanel');if(panel){panel.open=true;document.getElementById('zaviWarehouseScan')?.focus();}return;}\n if(e.target.closest('[data-zinv-new]'))")
 s=once(s,"header('محصولات و گدام‌ها','',button('product','محصول جدید'))", "'<div class=\"zinv-compact-head\"><h2>'+({warehouses:'گدام‌ها',moves:'حرکت‌ها',labels:'چاپ لیبل'}[zinvTab]||'محصولات و گدام‌ها')+'</h2></div>'")
 s=once(s,"showModal(edit?'ویرایش محصول و تعداد گدام':'ثبت محصولی جدید',body,'ثبت و ذخیره');", "showModal(edit?'ویرایش محصول':'محصول جدید',body,'ذخیره');")
 return s.replace('</head>',COMPACT_CSS+'</head>',1)

def modify(name,s):
 if name!="index.html":return s
 E=lambda x:chr(36)+"{"+x+"}"
 s=once(s,"function renderProducts(){let stock=stockState()",JS+"function renderProductsBase(){let stock=stockState()")
 s=once(s,".includes(normalizeName(search)));const result=z647Limit(found,'products')",".includes(normalizeName(search))).filter(p=>zinvFilter==='all'||(zinvFilter==='low'?num(stock[p.id]?.qty)<=num(p.reorder):num(stock[p.id]?.qty)<=0));const result=z647Limit(found,'products')")
 s=once(s,"header('محصول و موجودی گدام','ثبت محصول، قیمت خرید و فروش، کمبود موجودی و ارزش گدام'","header('محصولات و گدام‌ها','مدیریت موجودی و بارکد'")
 s=once(s,'<span class="muted">قیمت‌ها به:</span><select id="stockCurrency"', '<select id="zinvFilter" aria-label="فیلتر موجودی">'+E("[['all','همه محصولات'],['low','کم‌موجودی'],['out','ناموجود']].map(([k,l])=>'<option value=\"'+k+'\" '+(zinvFilter===k?'selected':'')+'>'+l+'</option>').join('')")+'</select><select id="stockCurrency"')
 s=once(s,'جستجوی نام، بارکد اصلی یا اضافی، دسته‌بندی','نام، کود یا بارکد')
 s=once(s,'با دوربین، بارکدخوان USB / Bluetooth یا نوشتن کود، محصول و قیمت واقعی همان گدام را ببینید.','دوربین، USB، Bluetooth یا ورود دستی')
 s=once(s,"const productIndustry=(edit&&['covers','accessories'].includes(p.industryDetails?.type))?p.industryDetails.type:zaviBusinessTypeV638();","const productIndustry=(edit&&window.ZaviIndustryForms6529.types.includes(p.industryDetails?.type))?p.industryDetails.type:zaviBusinessTypeV638();")
 s=once(s,"const catData="+chr(96)+'<datalist id="zawiCategoryOptions">'+E("[...PRODUCT_CATS,'سایر'].map(x=>"+chr(96)+'<option value="'+E("escapeHtml(x)")+'"></option>'+chr(96)+").join('')")+'</datalist>'+chr(96)+";",
 'const catData='+chr(96)+'<datalist id="zawiCategoryOptions">'+E("[...new Set([...(zinvCategories[productIndustry]||PRODUCT_CATS),...(p.category?[p.category]:[]),'سایر'])].map(x=>"+chr(96)+'<option value="'+E("escapeHtml(x)")+'"></option>'+chr(96)+").join('')")+'</datalist>'+chr(96)+";")
 s=once(s,'📷 گرفتن بارکد با دوربین برای محصول</button><small class="field-hint">برای USB یا Bluetooth، مکان‌نما را روی فیلد «کود / مدل» قرار دهید و اسکن کنید. بارکد تکراری هنگام ذخیره رد می‌شود.</small>','دوربین</button><button type="button" class="btn subtle" id="zinvAutoCode">کود خودکار</button><small class="field-hint">USB / Bluetooth · در خانه کود اسکن کنید.</small>')
 s=once(s,'<div class="field full"><label for="zaviExtraBarcodes">بارکدهای اضافی (هر کود در یک خط)</label>','<details class="field full zinv-optional"><summary>بارکدهای اضافی (اختیاری)</summary><label for="zaviExtraBarcodes">هر کود در یک خط</label>')
 s=once(s,'بارکد محصول خودش دوباره ثبت نمی‌شود.</small></div>','بارکد محصول خودش دوباره ثبت نمی‌شود.</small></details>')
 s=once(s,E("window.ZaviIndustryForms6529.render(productIndustry,p.industryDetails,{expanded:!!p.industryDetails})"),E("window.ZaviIndustryForms6529.renderSale(productIndustry).replace(/<div class=\"zsales-tools\">.*?<[/]div>/,'').replace('zsales-optional','zinv-optional')"))
 s=once(s,"const productForm=document.getElementById('dialogForm');","""const productForm=document.getElementById('dialogForm');
 productForm.closest('.modal')?.classList.add('zinv-dialog');
 const spec=productForm.querySelector('.z629-industry.zinv-optional');
 window.ZaviIndustryForms6529.fill(spec,productIndustry,p.industryDetails);
 spec?.addEventListener('change',e=>{const c=e.target.closest('[data-zsales-choice]');if(!c||!c.value)return;const input=[...spec.querySelectorAll('[data-z629-key]')].find(x=>x.dataset.z629Key===c.dataset.zsalesChoice);if(input)input.value=c.value;c.value='';});
 document.getElementById('zinvAutoCode').onclick=()=>{let code;do{code='PR-'+newId('p').replace(/[^a-zA-Z0-9]/g,'').slice(-14).toUpperCase();}while(db.products.some(x=>zaviProductCodes(x).includes(normalizeName(code))));productForm.elements.sku.value=code;refreshProductBarcodeNotice();};
 """)
 s=once(s,"window.ZaviIndustryForms6529.collect(productForm.querySelector('.z629-industry'),productIndustry)","window.ZaviIndustryForms6529.collectSale(productForm.querySelector('.z629-industry'),productIndustry)")
 s=once(s,'<div class="tiny-note">عکس کوچک و فشرده ذخیره می‌شود. برای نگهداری تعداد زیاد عکس، پشتیبان JSON بگیرید.</div>','<label class="btn subtle">دوربین<input id="zinvCameraPhoto" type="file" accept="image/*" capture="environment" hidden></label>')
 s=once(s,"document.getElementById('zaviProductPhotoClear').onclick=","document.getElementById('zinvCameraPhoto').onchange=document.getElementById('zaviProductPhotoInput').onchange;\n document.getElementById('zaviProductPhotoClear').onclick=")
 s=once(s,"if(industryDetails.type==='mobile'&&industryDetails.values.imei){","if(industryDetails.type==='mobile'&&(industryDetails.values.imei||industryDetails.values.imei2)){")
 s=once(s,"const imei=industryDetails.values.imei;","const imeis=[industryDetails.values.imei,industryDetails.values.imei2].filter(Boolean);if(new Set(imeis).size!==imeis.length)return toast('IMEI 1 و IMEI 2 باید متفاوت باشند.');")
 s=once(s,"x.industryDetails.values?.imei===imei","[x.industryDetails.values?.imei,x.industryDetails.values?.imei2].some(v=>v&&imeis.includes(v))")
 return compact_inventory(s.replace("</head>",CSS+"</head>",1))

def run(directory):
 path=Path(directory)/"index.html"
 path.write_text(modify("index.html",path.read_text(encoding="utf-8")),encoding="utf-8")
