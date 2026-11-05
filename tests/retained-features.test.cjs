/* Feature preservation: earlier independent-source modules stay linked.
 * Does not certify native voice, legacy APK upgrade or production data.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const baseline=require('./retained-features-baseline.json');
function collect(html,type){
 const regex=type==='scripts'
  ? /<script\b[^>]*\bsrc=["']\.\/([^"']+)["'][^>]*>/gi
  : /<link\b[^>]*\bhref=["']\.\/([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
 return new Set([...html.matchAll(regex)].map(x=>x[1].split('?')[0]));
}
for(const app of ['one','admin']){
 test('All source-linked '+app+' features and styles remain packaged',()=>{
  const root=path.join(__dirname,'..','app-source',app);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const type of ['scripts','styles']){
   const actual=collect(html,type),expected=baseline.apps[app][type];
   assert.ok(expected.length>=25,'Unexpectedly small source-feature baseline');
   const removed=expected.filter(asset=>!actual.has(asset));
   assert.deepEqual(removed,[],app+' '+type+' lost or renamed');
   const missing=[...actual].filter(asset=>!fs.existsSync(path.join(root,asset)));
   assert.deepEqual(missing,[],app+' '+type+' reference a nonexistent asset');
  }
 });
}
test('Showcase stylesheets load in the real document, not a printable invoice HTML literal',()=>{
 for(const [app,file] of [['one','zavi-showcase-v6668.css'],['admin','zavi-admin-showcase-v1459.css']]){
  const html=fs.readFileSync(path.join(__dirname,'..','app-source',app,'index.html'),'utf8');
  const href='./'+file;
  const index=html.indexOf(href),closeBody=html.lastIndexOf('</body>');
  assert.ok(index>html.lastIndexOf('</script>')&&index<closeBody,
    app+' approved stylesheet must load after every original app script and before document close');
  assert.equal(html.indexOf(href,index+1),-1,app+' duplicated approved stylesheet');
 }
});
test('New presentation preserves theme variants and original routes',()=>{
 const one=fs.readFileSync(path.join(__dirname,'../app-source/one/zavi-clean-professional-v6667.css'),'utf8');
 const admin=fs.readFileSync(path.join(__dirname,'../app-source/admin/zavi-clean-professional-v1458.css'),'utf8');
 for(const [app,css] of [['one',one],['admin',admin]]){
  assert.match(css,/data-zavi-appearance="glass"/,'Keep real glass mode '+app);
  assert.match(css,/data-zavi-theme="light"/,'Keep readable light theme '+app);
  assert.match(css,/data-zavi-theme="dark"/,'Keep readable dark theme '+app);
  assert.doesNotMatch(css,/(?:#appScreen|#content|#view|\.sidebar)[^{]*\{\s*display:\s*none/i,'Do not hide critical pages');
 }
});
