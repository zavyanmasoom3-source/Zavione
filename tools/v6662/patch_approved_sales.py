#!/usr/bin/env python3
"""Approved sales-only UI for the pinned historical APK. No ledger formula changes."""
from pathlib import Path

def once(s,a,b):
    if s.count(a)!=1:
        raise ValueError("Sales anchor not unique: "+a[:100])
    return s.replace(a,b,1)

def forms(s):
    anchor="const schemaKeys=Object.keys(schema);"
    extra="""const saleExtra={
 gold:[S('jewelryType','نوع زیور',['لاکت','سیت','نیم‌سیت','انگشتر','زنجیر','دستبند','گوشواره','النگو']),F('stoneType','نوع سنگ')],
 mobile:[F('imei2','IMEI 2'),F('color','رنگ'),F('ram','RAM')],
 covers:[F('coverType','نوع کاور'),F('brand','برند')],
 accessories:[F('brand','برند'),F('power','توان')],
 clothing:[F('variantBarcode','بارکد رنگ و سایز')],
 cosmetics:[F('shade','شماره رنگ')],
 general:[F('brand','برند'),F('model','مدل'),F('unit','واحد')],
 electronics:[F('power','توان')],
 restaurant:[F('portion','اندازه پرس')],
 bookstore:[F('format','قطع کتاب')]
};
const saleHints={
 brand:['Samsung','Apple','Xiaomi','Oppo','Vivo','Honor','سایر'],
 color:['سیاه','سفید','آبی','سبز','سرخ','طلایی','شفاف'],
 coverType:['سیلیکونی','شفاف','چرمی','مگ‌سیف','ضد ضربه','کتابی'],
 material:['سیلیکون','TPU','چرم','پلاستیک'],
 stoneType:['بدون سنگ','الماس','یاقوت','زمرد'],
 memory:['64 GB','128 GB','256 GB','512 GB','1 TB'],
 ram:['4 GB','6 GB','8 GB','12 GB','16 GB'],
 item:['چارجر','کیبل','گلس','هندزفری','پاوربانک'],
 size:['XS','S','M','L','XL','XXL'],
 unit:['عدد','بسته','کارتن','کیلوگرام','متر','لیتر'],
 sourceCurrency:['AFN','USD','EUR','PKR','AED','IRR','CNY'],
 targetCurrency:['AFN','USD','EUR','PKR','AED','IRR','CNY'],
 format:['A4','A5','A6']
};
"""
    s=once(s,anchor,extra+anchor)
    s=once(s,"const fields=t=>schema[typeOf(t)];","const fields=t=>schema[typeOf(t)];\nconst saleFields=t=>[...fields(t),...(saleExtra[typeOf(t)]||[])];")
    s=once(s,"for(const f of fields(type)){","for(const f of (other.sale===true?saleFields(type):fields(type))){")
    s=once(s,"if(!f.options.includes(value))throw Error('انتخاب '+f.label+' نامعتبر است.');","if(!f.options.includes(value)&&other.sale!==true)throw Error('انتخاب '+f.label+' نامعتبر است.');if(value.length>140)throw Error(f.label+' طولانی است.');")
    s=once(s,"return {type,values:v};","if(type==='mobile'&&v.imei2&&!/^\\d{15}$/.test(textNum(v.imei2)))throw Error('IMEI 2 باید دقیقاً 15 رقم باشد.');\n return {type,values:v};")
    p=s.index("function display(details,limit=8)")
    s=s[:p]+"""function renderSale(type){
 const t=typeOf(type);
 const body=saleFields(t).map(f=>{
  const options=f.options.length?f.options:(saleHints[f.key]||[]);
  const choices=options.length?'<select aria-label="'+escape(f.label)+' — گزینه آماده" data-zsales-choice="'+escape(f.key)+'"><option value="">گزینه آماده / اختیاری</option>'+options.map(o=>'<option value="'+escape(o)+'">'+escape(o)+'</option>').join('')+'</select>':'';
  const input='<input data-z629-key="'+escape(f.key)+'" aria-label="'+escape(f.label)+'" type="'+(f.kind==='number'?'number':f.kind==='date'?'date':'text')+'" '+(f.kind==='number'?'min="0" step="any"':'')+' maxlength="140" placeholder="اختیاری">';
  return '<label class="z629-field"><span>'+escape(f.label)+'</span>'+input+choices+'</label>';
 }).join('');
 return '<details class="z629-industry zsales-optional" data-z629-type="'+escape(t)+'"><summary>مشخصات بیشتر <small>اختیاری · '+escape(label(t))+'</small></summary><div class="zsales-tools"><button type="button" class="btn subtle" data-zsales-load>از مشخصات گدام</button><button type="button" class="btn subtle" data-zsales-clear>پاک کردن</button></div><div class="z629-fields">'+body+'</div></details>';
}
function collectSale(container,type){
 const v={};if(container)for(const el of container.querySelectorAll('[data-z629-key]'))v[el.dataset.z629Key]=el.value;
 return normalize(type,v,{sale:true});
}
"""+s[p:]
    s=once(s,"return fields(t).filter(f=>val[f.key]!==undefined","return saleFields(t).filter(f=>val[f.key]!==undefined")
    return once(s,"fields,normalize,render,collect,fill,display,label,typeOf","fields,saleFields,normalize,render,renderSale,collect,collectSale,fill,display,label,typeOf")

CSS="""
<style id="zavi-approved-sales-style">
html #content .zsales-approved .page-head{height:auto!important;min-height:0!important;max-height:none!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;margin:0 0 12px!important}
html #content .zsales-approved .page-head>div:first-child{flex:0 1 auto!important;width:100%!important}
html #content .zsales-approved .page-head .action-group{width:100%!important;display:grid!important;grid-template-columns:1fr 1fr!important}
html #content .zsales-approved .page-head .btn.primary{color:white!important;-webkit-text-fill-color:white!important;background:#075be8!important}
html #content .zsales-approved .stat-grid{gap:8px!important;margin-bottom:10px!important}
html #content .zsales-approved .card{min-height:0!important}
html #content .zsales-approved .stat{padding:11px!important}
html #content .zsales-approved .empty{min-height:100px!important;height:auto!important;padding:20px 12px!important}
html #content .zsales-approved .zsales-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
html #content .zsales-approved .zsales-tabs button{flex:1 1 auto;min-width:0;font-size:12px;min-height:40px}
html #content .zsales-approved .zsales-tabs [aria-pressed=true]{background:#075be8!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
html #content .zsales-approved .zsales-archive{margin:8px 0!important;padding:10px!important}
html #content .zsales-archive>summary{cursor:pointer;min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700}
html #overlay .zsales-dialog .modal-head h3{color:var(--text,#153553)!important;-webkit-text-fill-color:currentColor!important;opacity:1!important}
html[data-zavi-theme=dark] #overlay .zsales-dialog .modal-head h3{color:#edf6ff!important}
html[data-zavi-theme=light] #overlay .zsales-dialog .modal-head h3{color:#153553!important}
html #overlay .zsales-dialog .order-line{display:block!important;min-width:0;padding:10px!important}
html #overlay .zsales-dialog .order-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px!important;gap:7px!important}
html #overlay .zsales-dialog .order-row [data-field=productName]{grid-column:1/-1!important}
html #overlay .zsales-dialog .order-row input{min-height:42px!important}
html #overlay .zsales-dialog .zsales-optional>summary{font-size:12px!important;padding:8px 10px!important;min-height:40px!important}
html #overlay .zsales-dialog .zsales-tools{display:flex;gap:6px;padding:8px}
html #overlay .zsales-dialog .z629-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
html #overlay .zsales-dialog .z629-field select{font-size:11px!important}
html #overlay .zsales-dialog .zavi-barcode-box{margin:6px 0!important;padding:8px!important}
html #overlay .zsales-dialog .modal-foot{justify-content:stretch!important}
html #overlay .zsales-dialog .modal-foot>button[type=submit]{flex:1!important;min-height:44px!important;color:white!important;-webkit-text-fill-color:white!important;background:#075be8!important}
@media(max-width:360px){html #overlay .zsales-dialog .z629-fields{grid-template-columns:1fr}}
</style>
"""
def index(s):
    dollar=chr(36)
    tick=chr(96)
    def expr(a):return dollar+"{"+a+"}"
    s=once(s,'function renderOrdersCore(type){','let zsalesFilter="all";\nfunction renderOrdersCore(type){')
    s=once(s,".toLowerCase().includes(q)});const result=z647Limit(rows,sale?'sales':'purchases')",
      """.toLowerCase().includes(q)}).filter(t=>!sale||zsalesFilter==='all'||(zsalesFilter==='returned'?t.type==='sale_return':t.type==='sale'&&(zsalesFilter==='cash'?txTotal(t)-num(t.paid)<=.009:txTotal(t)-num(t.paid)>.009)));const result=z647Limit(rows,sale?'sales':'purchases')""")
    tabs="""sale?'<div class="zsales-tabs">'+[['all','همه'],['cash','تسویه‌شده'],['credit','قرضی / قسمی'],['returned','برگشتی']].map(([k,l])=>'<button type="button" class="btn subtle" data-zsales-filter="'+k+'" aria-pressed="'+String(zsalesFilter===k)+'">'+l+'</button>').join('')+'</div>':''"""
    anchor=expr("recordsTable(visible)")+expr("window.ZaviPaging647.controls(result,sale?'sales':'purchases')")
    s=once(s,anchor,expr(tabs)+anchor)
    s=once(s,"return html+"+tick+"<section class=\"card\" style=\"margin-top:18px\"><div class=\"panel-head\"><h3>🧾 فاکتورهای ذخیره‌شده در سیستم</h3><span class=\"pill blue\">"+expr("faDigits(saved.length)")+" فاکتور</span></div>",
      "return '<div class=\"zsales-approved\">'+html+"+tick+"<details class=\"card zsales-archive\"><summary>فاکتورهای ذخیره‌شده <span class=\"pill blue\">"+expr("fmtQty(saved.length)")+" فاکتور</span></summary>")
    s=once(s,"</div></section><section class=\"card\" style=\"margin-top:16px\"><div class=\"panel-head\"><h3>🗂 فاکتورهای دستی </h3></div>",
      "</div></details><details class=\"card zsales-archive\"><summary>فاکتورهای دستی <span class=\"pill blue\">"+expr("fmtQty((db.manualInvoices||[]).length)")+"</span></summary><a class=\"btn subtle\" href=\"./invoice.html\" target=\"_blank\" rel=\"noopener\">ساخت فاکتور دستی</a>")
    s=once(s,"فاکتورهای ساخته‌شده در قالب دستی  در این بخش نمایش داده می‌شوند.</p>'}</div></section>"+tick+"}","فاکتورهای ساخته‌شده در قالب دستی  در این بخش نمایش داده می‌شوند.</p>'}</div></details></div>"+tick+"}")
    s=once(s,"const isSale=['sale','sale_return'].includes(kind),isReturn=kind.includes('_return'),isPurchase=!isSale;","const isSale=['sale','sale_return'].includes(kind),isReturn=kind.includes('_return'),isPurchase=!isSale,compactSale=kind==='sale';")
    old='<p class="z629-line-note">مشخصات مخصوص تجارت در زیر هر ردیف قرار دارد. قیمت و تعداد را خودتان بررسی کنید؛ این فورم مبلغ را خودکار تغییر نمی‌دهد.</p>'
    s=once(s,old,expr("compactSale?'':"+repr(old)))
    s=once(s,"if(orderDialog)orderDialog.classList.add('z645-order-dialog');","if(orderDialog){orderDialog.classList.add('z645-order-dialog');if(compactSale)orderDialog.classList.add('zsales-dialog');}")
    s=once(s,"if(row.dataset.z629MatchedId!==p.id){window.ZaviIndustryForms6529.fill(row.querySelector('.z629-industry'),orderIndustry,p.industryDetails);row.dataset.z629MatchedId=p.id;}",
      """if(row.dataset.z629MatchedId!==p.id){if(!compactSale)window.ZaviIndustryForms6529.fill(row.querySelector('.z629-industry'),orderIndustry,p.industryDetails);else if(row.dataset.z629MatchedId)window.ZaviIndustryForms6529.fill(row.querySelector('.z629-industry'),orderIndustry,null);row.dataset.z629MatchedId=p.id;}""")
    s=once(s,expr("window.ZaviIndustryForms6529.render(orderIndustry,null,{forOrder:true})"),
      expr("compactSale?window.ZaviIndustryForms6529.renderSale(orderIndustry):window.ZaviIndustryForms6529.render(orderIndustry,null,{forOrder:true})"))
    s=once(s,"industryDetails:window.ZaviIndustryForms6529.collect(row.querySelector('.z629-industry'),orderIndustry)",
      "industryDetails:compactSale?window.ZaviIndustryForms6529.collectSale(row.querySelector('.z629-industry'),orderIndustry):window.ZaviIndustryForms6529.collect(row.querySelector('.z629-industry'),orderIndustry)")
    anchor=" addLine();document.getElementById('addLine').onclick=addLine;"
    behavior=""" if(compactSale){
  box.addEventListener('change',e=>{
   const choice=e.target.closest('[data-zsales-choice]');if(!choice||!choice.value)return;
   const panel=choice.closest('.zsales-optional');
   const field=[...panel.querySelectorAll('[data-z629-key]')].find(x=>x.dataset.z629Key===choice.dataset.zsalesChoice);
   if(field){field.value=choice.value;field.dispatchEvent(new Event('input',{bubbles:true}));}choice.value='';
  });
  box.addEventListener('click',e=>{
   const load=e.target.closest('[data-zsales-load]'),clear=e.target.closest('[data-zsales-clear]');if(!load&&!clear)return;
   const panel=e.target.closest('.zsales-optional'),row=panel.closest('.order-line');
   if(clear){window.ZaviIndustryForms6529.fill(panel,orderIndustry,null);return;}
   const p=findNamedProduct(row.querySelector('[data-field="productName"]').value,row.querySelector('[data-field="productSku"]').value);
   if(!p||p.industryDetails?.type!==orderIndustry)return toast('مشخصات گدام برای این محصول موجود نیست.');
   if([...panel.querySelectorAll('[data-z629-key]')].some(x=>x.value)&&!confirm('مشخصات فعلی با معلومات گدام جایگزین شود؟'))return;
   window.ZaviIndustryForms6529.fill(panel,orderIndustry,p.industryDetails);
  });
 }
"""
    s=once(s,anchor,behavior+anchor)
    s=once(s,"const pagingButton=e.target.closest('[data-zavi-page]');","const salesFilterButton=e.target.closest('[data-zsales-filter]');if(salesFilterButton&&page==='sales'){zsalesFilter=salesFilterButton.dataset.zsalesFilter;z647Pages.sales=0;render();return;}\n const pagingButton=e.target.closest('[data-zavi-page]');")
    return s.replace("</head>",CSS+"</head>",1)

def modify(name,s):
    if name=="index.html":return index(s)
    if name=="zavi-industry-forms-v6529.js":return forms(s)
    return s

def run(directory):
    for name in ("index.html","zavi-industry-forms-v6529.js"):
        path=Path(directory)/name
        path.write_text(modify(name,path.read_text(encoding="utf-8")),encoding="utf-8")
