/* Applies the customer-facing density + unbranded invoice updates to the staged Android frontend.
   Does NOT touch the central ADMIN's official billing/subscription receipts. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2], mode=process.argv[3]||'one';
if(!root||!['one','admin'].includes(mode))throw Error('Usage: node patch-android-ui-v6544.mjs <web-dir> <one|admin>');
const get=f=>fs.readFileSync(path.join(root,f),'utf8');
const put=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const js='zavi-display-scale-v6544.js';
fs.copyFileSync(new URL('./'+js,import.meta.url),path.join(root,js));
function withScript(filename) {
 if(!fs.existsSync(path.join(root,filename)))return;
 let s=get(filename);
 if(!s.includes(js)){
  const tag='<script defer src="./'+js+'?v=65.44"></script>';
  if(!s.includes('</head>')&&!s.includes('</body>'))throw Error('No head/body closure in '+filename);
  s=s.includes('</head>')?s.replace('</head>',tag+'</head>'):s.replace('</body>',tag+'</body>');
  put(filename,s);
 }
}
withScript('index.html');
if(mode==='one'){
 withScript('invoice.html');
 withScript('invoice-a5.html');
 // Remove platform attribution from the invoice canvas; do not change business name.
 if(fs.existsSync(path.join(root,'index.html'))){
  let s=get('index.html');
  s=s.replace(/'POWERED BY ZAVI ONE'/g,"''").replace(/print\('ZAVI ONE',950,214,24,'#ffffff',700\);/g,'');
  put('index.html',s);
 }
 if(fs.existsSync(path.join(root,'zavi-business-plus-v644.js'))){
  let s=get('zavi-business-plus-v644.js');
  s=s.replace(/<small>ZAVI ONE • \$\{w\}mm<\/small>/g,'');
  put('zavi-business-plus-v644.js',s);
 }
 if(fs.existsSync(path.join(root,'invoice.html'))){
  let s=get('invoice.html');
  s=s.replace(/<div class="brand"><div class="mark">Z1<\/div><div><b>ZAVI ONE<\/b><small>زاوی وان<\/small><\/div><\/div>/g,
   '<div class="brand"><div><b id="zaviInvoiceMerchantTitle">نام تجارت</b><small>فاکتور فروشگاه</small></div></div>');
  const binding='<script>(function(){function update(){var x=document.querySelector(\'input[name="shop"]\');var b=document.getElementById("zaviInvoiceMerchantTitle");if(b)b.textContent=(x&&x.value.trim())||"نام تجارت";}document.addEventListener("input",function(e){if(e.target.matches(\'input[name="shop"]\'))update()});document.addEventListener("change",update);window.addEventListener("load",update);setTimeout(update,200);})();</script>';
  if(!s.includes('zaviInvoiceMerchantTitle'))throw Error('Invoice merchant heading not found');
  if(!s.includes('function update(){var x=document.querySelector'))s=s.replace('</body>',binding+'</body>');
  put('invoice.html',s);
 }
}
console.log('ZAVI Android UI v65.44 applied to',mode,'asset path:',root);
