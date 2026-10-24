/* Stage UI scale (settings-only 50–115%), remove obsolete floating overlay, preserve merchant invoices. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2],mode=process.argv[3]||'one';
if(!root||!['one','admin'].includes(mode))throw Error('Usage: patch-android-ui-v6545.mjs <dir> <one|admin>');
const exists=f=>fs.existsSync(path.join(root,f));
const get=f=>fs.readFileSync(path.join(root,f),'utf8');
const put=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const js='zavi-display-settings-v6545.js';
fs.copyFileSync(new URL('./'+js,import.meta.url),path.join(root,js));
const old='zavi-display-scale-v6544.js';
for(const file of ['index.html','invoice.html','invoice-a5.html']){
 if(!exists(file))continue;
 let s=get(file);
 s=s.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*zavi-display-scale-v6544\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
 if(file==='index.html'){
  if(!s.includes(js)){
    const tag='<script defer src="./'+js+'?v=65.45"></script>';
    if(s.includes('</head>'))s=s.replace('</head>',tag+'</head>');
    else if(s.includes('</body>'))s=s.replace('</body>',tag+'</body>');
    else throw Error('Index missing closing head/body');
  }
 }
 put(file,s);
}
if(exists(old))fs.rmSync(path.join(root,old));
if(!exists('index.html')||!get('index.html').includes(js))throw Error('Settings slider not injected');
if(get('index.html').includes(old))throw Error('Legacy floating overlay not removed');
if(mode==='one'){
 if(exists('index.html')){
  let s=get('index.html');
  s=s.replace(/'POWERED BY ZAVI ONE'/g,"''").replace(/print\('ZAVI ONE',950,214,24,'#ffffff',700\);/g,'');
  put('index.html',s);
 }
 if(exists('zavi-business-plus-v644.js')){
  let s=get('zavi-business-plus-v644.js');
  s=s.replace(/<small>ZAVI ONE • \$\{w\}mm<\/small>/g,'');
  put('zavi-business-plus-v644.js',s);
 }
 if(exists('invoice.html')){
  let s=get('invoice.html');
  s=s.replace(/<div class="brand"><div class="mark">Z1<\/div><div><b>ZAVI ONE<\/b><small>زاوی وان<\/small><\/div><\/div>/g,'<div class="brand"><div><b id="zaviInvoiceMerchantTitle">نام تجارت</b><small>فاکتور فروشگاه</small></div></div>');
  const binding='<script>(function(){function update(){var x=document.querySelector(\'input[name="shop"]\');var b=document.getElementById("zaviInvoiceMerchantTitle");if(b)b.textContent=(x&&x.value.trim())||"نام تجارت";}document.addEventListener("input",function(e){if(e.target.matches(\'input[name="shop"]\'))update()});document.addEventListener("change",update);window.addEventListener("load",update);setTimeout(update,200);})();</script>';
  if(s.includes('zaviInvoiceMerchantTitle')&&!s.includes('function update(){var x=document.querySelector'))s=s.replace('</body>',binding+'</body>');
  put('invoice.html',s);
 }
}
console.log('v65.45 settings-only display slider applied',mode,root);
