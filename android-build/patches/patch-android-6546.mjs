/* ZAVI ONE 65.46 – apply biometric + settings hierarchy + close thermal receipt in local Android assets.
   The PIN verifier remains unchanged. No plaintext PIN, biometric image or template is stored. */
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2],mode=process.argv[3]||'one';
if(!root||!['one','admin'].includes(mode))throw Error('Usage: patch-android-6546.mjs <web-dir> <one|admin>');
const p=f=>path.join(root,f),has=f=>fs.existsSync(p(f)),read=f=>fs.readFileSync(p(f),'utf8'),write=(f,s)=>fs.writeFileSync(p(f),s);
if(!has('index.html'))throw Error('index.html missing');
for(const name of ['zavi-settings-priority-v6546.js', ...(mode==='one'?['zavi-biometric-ui-v6546.js']:[])])
 fs.copyFileSync(new URL('./'+name,import.meta.url),p(name));
let html=read('index.html');
for(const name of ['zavi-settings-priority-v6546.js',...(mode==='one'?['zavi-biometric-ui-v6546.js']:[])]){
 if(!html.includes(name)){
  const script='<script defer src="./'+name+'?v=65.46"></script>';
  if(html.includes('</head>'))html=html.replace('</head>',script+'</head>');
  else if(html.includes('</body>'))html=html.replace('</body>',script+'</body>');
  else throw Error('Cannot locate script insertion point');
 }
}
if(mode==='one'){
  const original="localStorage.setItem(LOCK_KEY,JSON.stringify({salt,hash,createdAt:Date.now(),algorithm:'PBKDF2-SHA256'}));setTries({count:0,until:0});closeModal();toast('رمز خصوصی تغییر کرد.');";
  const changed="localStorage.setItem(LOCK_KEY,JSON.stringify({salt,hash,createdAt:Date.now(),algorithm:'PBKDF2-SHA256'}));setTries({count:0,until:0});document.dispatchEvent(new Event('zavi-pin-changed'));closeModal();toast('رمز خصوصی تغییر کرد.');";
  if(html.includes(original))html=html.replace(original,changed);
  if(has('zavi-business-plus-v644.js')){
   let source=read('zavi-business-plus-v644.js');
   const before='<nav class="toolbar"><button onclick="window.print()">چاپ رسید</button></nav>';
   const after=`<nav class="toolbar" role="toolbar" aria-label="چاپ و بستن رسید"><button type="button" onclick="window.print()">🖨 چاپ رسید</button><button type="button" aria-label="بستن پیش‌نمایش رسید و بازگشت به برنامه" onclick="if(window.opener&&!window.opener.closed){window.close()}else if(history.length>1){history.back()}else{window.location.replace('./index.html')}" style="background:#9b2730">✕ بستن</button></nav>`;
   if(source.includes(before))source=source.replace(before,after);
   if(!source.includes('✕ بستن'))throw Error('Thermal receipt toolbar not patched');
   write('zavi-business-plus-v644.js',source);
  }else throw Error('Thermal receipt JS not staged');
}
write('index.html',html);
for(const name of ['zavi-settings-priority-v6546.js',...(mode==='one'?['zavi-biometric-ui-v6546.js']:[])])
 if(!read('index.html').includes(name))throw Error('Missing referenced '+name);
console.log('ZAVI v65.46 applied to '+mode+' with Settings categories'+(mode==='one'?', Android biometric and thermal close':''));
