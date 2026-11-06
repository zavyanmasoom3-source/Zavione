const fs=require('fs');
for(const app of ['one','admin']){
 const base='app-source/'+app+'/';
 const d=Object.fromEntries(['fa','ps','en'].map(l=>[l,JSON.parse(fs.readFileSync(base+l+'.json','utf8'))]));
 const keys=Object.keys(d.fa);
 for(const lang of ['ps','en']){
  const missing=keys.filter(k=>!Object.hasOwn(d[lang],k)||!String(d[lang][k]).trim());
  if(missing.length)throw Error(app+' '+lang+' missing: '+missing.slice(0,10).join(', '));
 }
 console.log(app+': '+keys.length+' keys in all three languages');
}
