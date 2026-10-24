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
 if(!html.includes('zaviAdminSplash')){
  const splash='<div id="zaviAdminSplash" class="zavi-admin-splash" role="status" aria-live="polite" aria-label="ZAVI ONE ADMIN loading"><div class="splash-glow"></div><div class="splash-content"><img src="./icon.png" alt="ZAVI ONE ADMIN" width="116" height="116"><strong>ZAVI ONE <em>ADMIN</em></strong><span>پنل مدیریت مرکزی</span><div class="splash-progress"><i></i></div><small>مدیریت امن و حرفه‌ای</small></div></div>';
  html=html.replace('</body>',splash+'</body>');
  if(!html.includes('id="zaviAdminSplash"'))throw Error('Cannot add admin splash markup');
 }
 const css='<style id="zaviAdminSplashRestoreStyles">#zaviAdminSplash{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#1677d7,#071b4c 64%,#030c25);color:#fff;overflow:hidden}#zaviAdminSplash.is-hidden{display:none!important;visibility:hidden!important;pointer-events:none!important}#zaviAdminSplash .splash-content{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:20px;animation:zavi6548In .65s ease}#zaviAdminSplash .splash-content img{width:118px;height:118px;object-fit:cover;border-radius:24px;box-shadow:0 0 35px #11a8ef70}#zaviAdminSplash .splash-content strong{font:900 clamp(27px,7vw,46px)/1.3 Arial,Tahoma,sans-serif;direction:ltr}#zaviAdminSplash .splash-content em{font-style:normal;color:#2de6ed}#zaviAdminSplash .splash-content span{font-size:17px;font-weight:700}#zaviAdminSplash .splash-progress{margin-top:12px;width:min(75vw,280px);height:5px;background:#ffffff44;overflow:hidden;border-radius:100px}#zaviAdminSplash .splash-progress i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#1682e6,#23e2e8);animation:zavi6548Bar 1.5s linear forwards}@keyframes zavi6548In{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}@keyframes zavi6548Bar{from{transform:translateX(-100%)}to{transform:translateX(0)}}@media(prefers-reduced-motion:reduce){#zaviAdminSplash *{animation:none!important}}</style>';
 if(!html.includes('zaviAdminSplashRestoreStyles'))html=html.replace('</head>',css+'</head>');
 if(!html.includes('zavi-admin-contact-v6547.js'))throw Error('Admin contacts panel must remain available');
}
 wr('index.html',html);
 console.log('V65.48 stage completed: '+mode);
