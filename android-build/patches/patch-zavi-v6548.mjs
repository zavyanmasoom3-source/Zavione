/* V65.48 incremental Android patch: only at account signup WhatsApp, never on sign-in.
   The v65.47 menu / barcode / biometrics / invoices stay unchanged. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2],mode=process.argv[3];
if(!root||!['one','admin'].includes(mode))throw Error('Usage: patch-v6548.mjs root one|admin');
const p=n=>path.join(root,n),rd=n=>fs.readFileSync(p(n),'utf8'),wr=(n,s)=>fs.writeFileSync(p(n),s);
let html=rd('index.html');
if(mode==='one'){
 const newName='zavi-signup-whatsapp-once-v6548.js';
 fs.copyFileSync(new URL('./'+newName,import.meta.url),p(newName));
 html=html.replace(/<script\b[^>]*src=["'][^"']*zavi-account-contact-v6547\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
 if(html.includes('zavi-account-contact-v6547.js'))throw Error('Old inline contact collector reference remains');
 fs.rmSync(p('zavi-account-contact-v6547.js'),{force:true});
 html=html.replace('</head>','<script defer src="./'+newName+'?v=65.48"></script></head>');
 let cloud=rd('cloud.js');
 const prev="const contact=signup?window.ZaviAccountContactV6547?.getValidated?.():null; const res=await request(endpoint,{method:'POST',body:signup?{email,password,data:{zavi_contact:contact}}:{email,password},auth:false});";
 const current="const contact=signup?await window.ZaviSignupOnceV6548.collect():null; const res=await request(endpoint,{method:'POST',body:signup?{email,password,data:{zavi_contact:contact}}:{email,password},auth:false});";
 if(!cloud.includes(prev))throw Error('Cloud signup has changed; do not create broken APK');
 cloud=cloud.replace(prev,current);
 cloud=cloud.replace('if(session?.user?.id)window.ZaviAccountContactV6547?.sync?.(session,request).catch(()=>{});','');
 if(cloud.includes('ZaviAccountContactV6547'))throw Error('Old sign-in contact sync remains');
 if(!cloud.includes('await window.ZaviSignupOnceV6548.collect()'))throw Error('New signup not wired');
 wr('cloud.js',cloud);
 if(!html.includes(newName))throw Error('New registration asset missing');
}else{
 const newName='zavi-admin-splash-v6548.js';
 fs.copyFileSync(new URL('./'+newName,import.meta.url),p(newName));
 if(!html.includes(newName))html=html.replace('</body>','<script defer src="./'+newName+'?v=65.48"></script></body>');
 if(!html.includes('zaviAdminSplash'))throw Error('Missing branded splash markup');
 if(!html.includes('zavi-admin-contact-v6547.js'))throw Error('Admin contacts panel must remain available');
}
 wr('index.html',html);
 console.log('V65.48 stage completed: '+mode);
