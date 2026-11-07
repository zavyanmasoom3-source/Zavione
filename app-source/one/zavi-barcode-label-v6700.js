/* ZAVI ONE 67.00 — offline Code 128 label studio.
 * Presentation/printing only: never mutates products, stock, invoices or ledger state.
 */
(()=>{'use strict';
const PATTERNS=[
'212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212',
'112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131',
'311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321',
'112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121',
'313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
'314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114',
'122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212',
'124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113',
'114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'
];
const sizes={
 '40x25':{w:40,h:25},'50x30':{w:50,h:30},'58x30':{w:58,h:30},'80x40':{w:80,h:40}
};
const words={
 fa:{launch:'ساخت لیبل بارکد',title:'لیبل بارکد',product:'محصول',code:'بارکد / کود',type:'نوع بارکد',size:'اندازه لیبل',count:'تعداد چاپ',preview:'پیش‌نمایش',print:'چاپ لیبل',close:'بستن',none:'هیچ محصولی دارای بارکد یا کود نیست.',bad:'Code 128 فقط حروف و اعداد استاندارد ASCII را می‌پذیرد.',choose:'یک محصول را انتخاب کنید.'},
 ps:{launch:'د بارکوډ لیبل',title:'د بارکوډ لیبل',product:'محصول',code:'بارکوډ / کوډ',type:'د بارکوډ ډول',size:'د لیبل اندازه',count:'د چاپ شمېر',preview:'مخکتنه',print:'لیبل چاپول',close:'بندول',none:'هیڅ محصول بارکوډ یا کوډ نه لري.',bad:'Code 128 یوازې معیاري ASCII توري او شمېرې مني.',choose:'یو محصول وټاکئ.'},
 en:{launch:'Barcode labels',title:'Barcode labels',product:'Product',code:'Barcode / SKU',type:'Barcode type',size:'Label size',count:'Print quantity',preview:'Preview',print:'Print labels',close:'Close',none:'No product has a barcode or SKU.',bad:'Code 128 supports printable ASCII characters only.',choose:'Choose a product.'}
};
const lang=()=>{const l=(document.documentElement.lang||'fa').toLowerCase();return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa'};
const t=k=>words[lang()][k]||words.fa[k]||k;
const products=()=>{try{return typeof db!=='undefined'&&Array.isArray(db.products)?db.products:[]}catch(_){return[]}};
const codes=p=>[p?.sku,...(Array.isArray(p?.barcodes)?p.barcodes:[])].map(v=>String(v??'').trim()).filter((v,i,a)=>v&&a.indexOf(v)===i);
function code128Values(text){
 const raw=String(text??'');
 if(!raw||[...raw].some(ch=>{const c=ch.charCodeAt(0);return c<32||c>126}))throw new Error(t('bad'));
 const data=[...raw].map(ch=>ch.charCodeAt(0)-32);
 let checksum=104;
 data.forEach((v,i)=>checksum+=v*(i+1));
 return [104,...data,checksum%103,106];
}
function barcodeSvg(text){
 const values=code128Values(text),quiet=10,module=1.25,height=54;
 let x=quiet,black=true,segments=[];
 for(const value of values){
  const pattern=PATTERNS[value];
  for(const widthChar of pattern){
   const width=Number(widthChar)*module;
   if(black)segments.push({x,w:width});
   x+=width;black=!black;
  }
 }
 const total=x+quiet;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox',`0 0 ${total} ${height}`);
 svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Code 128 '+text);
 const bg=document.createElementNS(svg.namespaceURI,'rect');bg.setAttribute('x','0');bg.setAttribute('y','0');bg.setAttribute('width',String(total));bg.setAttribute('height',String(height));bg.setAttribute('fill','white');svg.append(bg);
 for(const seg of segments){const r=document.createElementNS(svg.namespaceURI,'rect');r.setAttribute('x',String(seg.x));r.setAttribute('y','1');r.setAttribute('width',String(seg.w));r.setAttribute('height',String(height-2));r.setAttribute('fill','black');svg.append(r)}
 return svg;
}
function makeLabel(product,code,sizeKey){
 const d=sizes[sizeKey]||sizes['50x30'];
 const label=document.createElement('article');label.className='z700-label';label.style.setProperty('--z700-w',d.w+'mm');label.style.setProperty('--z700-h',d.h+'mm');
 const name=document.createElement('strong');name.className='z700-name';name.textContent=String(product?.name||'');
 const svg=barcodeSvg(code);svg.classList.add('z700-bars');
 const raw=document.createElement('span');raw.className='z700-code';raw.textContent=code;
 label.append(name,svg,raw);
 if(Number(product?.salePrice)>0){const price=document.createElement('small');price.className='z700-price';let curr='AFN';try{curr=String(db?.currency||'AFN')}catch(_){}price.textContent=new Intl.NumberFormat(lang()==='en'?'en-US':'fa-AF',{maximumFractionDigits:2}).format(Number(product.salePrice))+' '+curr;label.append(price)}
 return label;
}
function selectedProduct(select){return products().find(p=>String(p.id)===String(select.value))||null}
function refillCodes(product,select){
 select.replaceChildren();
 for(const c of codes(product)){const o=document.createElement('option');o.value=c;o.textContent=c;select.append(o)}
}
function refresh(panel){
 const product=selectedProduct(panel.querySelector('[data-z700-product]'));
 const codeSelect=panel.querySelector('[data-z700-code]');
 const preview=panel.querySelector('[data-z700-preview]');
 preview.replaceChildren();
 if(!product){preview.textContent=t('choose');return}
 if(!codeSelect.options.length)refillCodes(product,codeSelect);
 const code=String(codeSelect.value||'').trim();
 if(!code){preview.textContent=t('none');return}
 try{preview.append(makeLabel(product,code,panel.querySelector('[data-z700-size]').value))}
 catch(e){preview.textContent=e.message||t('bad')}
}
function open(){
 close();
 const available=products().filter(p=>codes(p).length);
 const layer=document.createElement('div');layer.id='z700LabelStudio';layer.className='z700-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 const panel=document.createElement('section');panel.className='z700-panel';
 const head=document.createElement('header');const title=document.createElement('h2');title.textContent=t('title');const x=document.createElement('button');x.type='button';x.className='btn subtle';x.textContent=t('close');x.addEventListener('click',close);head.append(title,x);
 const form=document.createElement('div');form.className='z700-form';
 const field=(label,node)=>{const wrap=document.createElement('label');wrap.className='z700-field';const span=document.createElement('span');span.textContent=label;wrap.append(span,node);return wrap};
 const product=document.createElement('select');product.dataset.z700Product='1';
 for(const p of available){const o=document.createElement('option');o.value=String(p.id);o.textContent=String(p.name||p.sku||p.id);product.append(o)}
 const code=document.createElement('select');code.dataset.z700Code='1';
 const type=document.createElement('select');const typeOption=document.createElement('option');typeOption.value='code128';typeOption.textContent='Code 128';type.append(typeOption);
 const size=document.createElement('select');size.dataset.z700Size='1';for(const key of Object.keys(sizes)){const o=document.createElement('option');o.value=key;o.textContent=key+' mm';size.append(o)}size.value='50x30';
 const count=document.createElement('input');count.type='number';count.min='1';count.max='200';count.step='1';count.value='1';count.inputMode='numeric';count.dataset.z700Count='1';
 form.append(field(t('product'),product),field(t('code'),code),field(t('type'),type),field(t('size'),size),field(t('count'),count));
 const previewTitle=document.createElement('h3');previewTitle.textContent=t('preview');
 const preview=document.createElement('div');preview.className='z700-preview';preview.dataset.z700Preview='1';
 const actions=document.createElement('div');actions.className='z700-actions';const print=document.createElement('button');print.type='button';print.className='btn primary';print.textContent=t('print');print.addEventListener('click',()=>printLabels(panel));actions.append(print);
 panel.append(head,form,previewTitle,preview,actions);layer.append(panel);document.body.append(layer);
 if(available.length){refillCodes(available[0],code);refresh(panel)}else preview.textContent=t('none');
 product.addEventListener('change',()=>{const p=selectedProduct(product);refillCodes(p,code);refresh(panel)});
 code.addEventListener('change',()=>refresh(panel));size.addEventListener('change',()=>refresh(panel));
 layer.addEventListener('click',e=>{if(e.target===layer)close()});
}
function persistPdfLabelPrefs(product,code,sizeKey,count){
 try{
  window.ZaviPdfDesign?.update?.({barcode:{
   lastProductId:product?.id||null,lastCode:String(code||''),
   defaultSize:sizeKey,copies:count,symbology:'code128'
  }});
 }catch(_){}
}
function printLabels(panel){
 const product=selectedProduct(panel.querySelector('[data-z700-product]'));if(!product)return;
 const code=String(panel.querySelector('[data-z700-code]').value||'').trim();
 const sizeKey=panel.querySelector('[data-z700-size]').value;
 const n=Math.max(1,Math.min(200,Math.trunc(Number(panel.querySelector('[data-z700-count]').value)||1)));
 let sheet=document.getElementById('z700PrintSheet');if(sheet)sheet.remove();sheet=document.createElement('main');sheet.id='z700PrintSheet';
 try{for(let i=0;i<n;i++)sheet.append(makeLabel(product,code,sizeKey))}catch(e){panel.querySelector('[data-z700-preview]').textContent=e.message||t('bad');return}
 document.body.append(sheet);document.body.classList.add('z700-printing');
 const cleanup=()=>{document.body.classList.remove('z700-printing');sheet.remove();window.removeEventListener('afterprint',cleanup)};
 window.addEventListener('afterprint',cleanup,{once:true});
 try{window.print()}finally{setTimeout(()=>{persistPdfLabelPrefs(product,code,sizeKey,n);if(document.body.classList.contains('z700-printing'))cleanup()},1500)}
}
function close(){document.getElementById('z700LabelStudio')?.remove()}
function onProductsPage(){
 try{if(typeof page!=='undefined'&&page==='products')return true}catch(_){}
 return !!document.querySelector('[data-page="products"].active,[data-go="products"].active,[data-route="products"].active');
}
function ensureLauncher(){
 if(!onProductsPage())return;
 const content=document.getElementById('content');if(!content||content.querySelector('[data-z700-launch]'))return;
 const bar=document.createElement('div');bar.className='z700-toolbar';const b=document.createElement('button');b.type='button';b.className='btn subtle';b.dataset.z700Launch='1';b.textContent='▥ '+t('launch');b.addEventListener('click',open);bar.append(b);content.prepend(bar);
}
const observer=new MutationObserver(()=>ensureLauncher());observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-z700-launch]'))open()});
document.addEventListener('zavi:language-changed',ensureLauncher);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureLauncher,{once:true});else ensureLauncher();
window.ZaviBarcodeLabelsV6700=Object.freeze({open,close,code128Values});
})();