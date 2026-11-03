/* Release parity audit: static source presence is not proof of correct runtime behavior.
 * This script refuses to label incomplete native/offline capabilities "production ready".
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const core={
 one:{
  shell:['index.html','sw.js','manifest.webmanifest'],
  accounting:['zavi-finance-stock-v18.js','cloud.js'],
  warehouse:['zavi-warehouses-v1.js','zavi-barcode-v641.js'],
  camera:['zavi-camera-scan-v635.js','zavi-zxing-offline-v1.js'],
  permissions:['zavi-staff-v648-core.js','offline-license-secure.js','zavi-store-v6579-auto-signed-offline.js'],
  locale:['zavi-i18n-v22.js','zavi-i18n-v6541-verified.js'],
  command:['zavi-dual-command-v6605.js','zavi-dual-command-v6605.css'],
  print:['invoice.html','receipt-ui.js'],
 },
 admin:{
  shell:['index.html','sw.js','manifest.webmanifest'],
  authorization:['app.js','account-control.js','admin-portal.js'],
  customer:['zavi-admin-services-v15.js','zavi-admin-service-whatsapp-v139.js'],
  locale:['en.json','fa.json','ps.json','zavi-i18n-v22.js'],
  command:['zavi-dual-command-v6605.js','zavi-dual-command-v6605.css'],
  print:['receipt-ui.js'],
 }
};
const missing=[],badRefs=[],matrix={};
for(const [app,sections] of Object.entries(core)){
 const base=path.join(root,'app-source',app);
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const rows={};
 for(const [section,names] of Object.entries(sections)){
  rows[section]={files:names.length,missing:[]};
  for(const name of names){
   const p=path.join(base,name);
   if(!fs.existsSync(p)){missing.push(app+'/'+name);rows[section].missing.push(name)}
   if(/\.css$|\.js$/.test(name)&&!html.includes(name)){
    badRefs.push(app+'/'+name+' is not loaded in index.html');
   }
  }
 }
 for(const match of html.matchAll(/(?:src|href)\s*=\s*["'](\.\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?["']/g)){
  const file=match[1].replace(/^\.\//,'');
  if(!fs.existsSync(path.join(base,file)))badRefs.push(app+'/index.html references nonexistent '+file);
 }
 matrix[app]=rows;
}
const activity=fs.readFileSync(path.join(root,'android-build/app/src/main/java/com/zavione/mobile/MainActivity.java'),'utf8');
const nativeVoice=activity.includes('ZaviAndroidLocalVoice')&&activity.includes('RECORD_AUDIO');
const offlineModel=fs.existsSync(path.join(root,'android-build/app/src/main/assets','ggml-base-q5_1.bin'));
const blocking=[
 ...(!nativeVoice?['Native offline speech bridge is absent from Android source']:[]),
 ...(!offlineModel?['Offline speech model not shipped (5 MB APK cannot claim embedded 55 MB model)']:[]),
 'Multi-warehouse financial posting/offline replay is not yet validated against production schema',
 'In-place upgrade from distributed V66.06 APK is blocked by package/certificate mismatch'
];
const report={
 generatedAt:new Date().toISOString(),
 branch:'fix/independent-source-release-20261103',
 kind:'SOURCE_PRESENCE_NOT_RUNTIME_CERTIFICATION',
 matrix,missing,badRefs,
 nativeVoice,offlineModel,
 releaseBlocking: blocking,
 productionReady:missing.length===0&&badRefs.length===0&&blocking.length===0
};
fs.writeFileSync(path.join(root,'qa-parity-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({missing,badRefs,nativeVoice,offlineModel,releaseBlocking:blocking,productionReady:report.productionReady},null,2));
assert.deepEqual(missing,[],'Expected source modules absent');
assert.deepEqual(badRefs,[],'Local web assets broken/unloaded');
if(process.env.ZAVI_REQUIRE_FULL_PARITY==='1')assert.equal(report.productionReady,true,'Production release blocked: unverified/absent capabilities');
