/* Additive APK staging patch v65.47. Never delete existing modules or accounting records. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2], mode=process.argv[3]||'one';
if(!root||!['one','admin'].includes(mode))throw Error('Usage: node patch-zavi-ux-v6547.mjs <web> <one|admin>');
const p=(name)=>path.join(root,name), exists=(name)=>fs.existsSync(p(name));
const read=(name)=>fs.readFileSync(p(name),'utf8'),write=(name,content)=>fs.writeFileSync(p(name),content);
const assets=mode==='one'
  ? ['zavi-mobile-ux-safe-v6547.js','zavi-account-contact-v6547.js','zavi-country-dials-v6547.json']
  : ['zavi-mobile-ux-safe-v6547.js','zavi-admin-contact-v6547.js'];
for(const file of assets){
 const from=new URL('./'+file,import.meta.url);
 if(!exists('index.html'))throw Error('Root index missing');
 fs.copyFileSync(from,p(file));
}
let html=read('index.html');
for(const file of assets.filter(x=>x.endsWith('.js'))){
 const tag='<script defer src="./'+file+'?v=65.47"></script>';
 if(!html.includes(file)){
  if(html.includes('</head>'))html=html.replace('</head>',tag+'</head>');
  else if(html.includes('</body>'))html=html.replace('</body>',tag+'</body>');
  else throw Error('HTML closure not found');
 }
}
write('index.html',html);
if(mode==='one'){
 if(!exists('cloud.js'))throw Error('Cloud auth script missing — prevent broken signup');
 let cloud=read('cloud.js');
 const from="const res=await request(endpoint,{method:'POST',body:{email,password},auth:false});";
 const to="const contact=signup?window.ZaviAccountContactV6547?.getValidated?.():null; const res=await request(endpoint,{method:'POST',body:signup?{email,password,data:{zavi_contact:contact}}:{email,password},auth:false});";
 if(!cloud.includes(from))throw Error('Cloud signup API signature changed; patch requires review');
 cloud=cloud.replace(from,to);
 const hook="function afterRender(){refreshTop();";
 if(!cloud.includes(hook))throw Error('Cloud afterRender hook missing');
 cloud=cloud.replace(hook,"function afterRender(){refreshTop();if(session?.user?.id)window.ZaviAccountContactV6547?.sync?.(session,request).catch(()=>{});");
 write('cloud.js',cloud);
 const check=read('cloud.js');
 if(!check.includes('zavi_contact:contact')||!check.includes('ZaviAccountContactV6547?.sync'))throw Error('Contact signup not wired');
}
if(mode==='admin'&&!read('index.html').includes('zavi-admin-contact-v6547.js'))throw Error('Missing admin contacts script');
console.log('ZAVI '+mode+' UX v65.47 applied, assets:',assets.join(', '));
