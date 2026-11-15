'use strict';
/* Design contract and theme-state smoke tests. This does NOT certify app workflows. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const app of ['one','admin']){
 const base=path.join(root,'app-source',app);
 const read=name=>fs.readFileSync(path.join(base,name),'utf8');
 const html=read('index.html'),style=read('zavi-dual-design-v1.css');
 const theme=read('zavi-theme-v29.js'),sw=read('sw.js');
 const rawHead=html.slice(0,html.indexOf('</head>'));
 assert(!rawHead.includes(String.fromCharCode(92)+'n<'),app+': escaped newline text must never leak from HTML head into rendered UI');
 const script=html.match(/<script id="zavi-theme-bootstrap-v29">([\s\S]*?)<\/script>/);
 assert(script,app+': early theme bootstrap absent');
 new vm.Script(script[1],{filename:app+'-bootstrap.js'});
 new vm.Script(theme,{filename:app+'-theme.js'});
 new vm.Script(sw,{filename:app+'-sw.js'});
 assert.equal((html.match(/zavi-dual-design-v1\.css/g)||[]).length,1,app+': final CSS must load once');
 assert(html.lastIndexOf('zavi-dual-design-v1.css')>html.lastIndexOf('zavi-showcase'),app+': final CSS must follow old showcase styles');
 assert(sw.includes("'zavi-dual-design-v1.css'"),app+': dual CSS must be in offline CORE cache');
 assert(style.includes('--zui-canvas:#EAF2FF'),app+': light token missing');
 assert(style.includes('--zui-canvas:#0B1220'),app+': dark token missing');
 assert(style.includes('data-zavi-theme-choice="glass"'),app+': compatibility guard absent');
 assert(theme.includes("['light','dark','auto']"),app+': three preferences missing');
 assert(!theme.includes("button.setAttribute('data-zavi-theme-choice','glass')"),app+': legacy glass option is still created');
 const rootElement={lang:'fa-AF',attributes:{},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]}};
 const media={matches:false,handler:null,addEventListener(type,fn){if(type==='change')this.handler=fn}};
 const storage={value:'auto',getItem(k){return this.value},setItem(k,v){this.value=v}};
 const document={
  documentElement:rootElement,readyState:'loading',
  querySelector(){return null},querySelectorAll(){return []},
  addEventListener(){},dispatchEvent(){},getElementById(){return null}
 };
 const context={
  window:{matchMedia:()=>media,addEventListener(){}},
  document,localStorage:storage,
  CustomEvent:function(type,detail){this.type=type;this.detail=detail},
  MutationObserver:function(){this.observe=()=>{}},
  requestAnimationFrame(fn){fn()}
 };
 vm.runInNewContext(theme,context,{filename:app+'-theme.js'});
 const api=context.window.ZaviThemeV29;
 assert(api&&typeof api.set==='function',app+': theme API missing');
 api.set('auto');
 assert.equal(rootElement.attributes['data-zavi-theme'],'light',app+': auto must follow light OS');
 media.matches=true;media.handler();
 assert.equal(rootElement.attributes['data-zavi-theme'],'dark',app+': auto must follow dark OS');
 api.set('light');
 media.matches=false;media.handler();
 assert.equal(rootElement.attributes['data-zavi-theme'],'light',app+': manual preference cannot be overridden by OS');
 api.set('glass');
 assert.equal(rootElement.attributes['data-zavi-theme'],'dark',app+': legacy glass must migrate to dark');
 assert.equal(rootElement.attributes['data-zavi-theme-preference'],'dark',app+': migration must not expose a third palette');
 if(app==='one'){
  const invoice=read('invoice.html');
  const invoiceCss=read('zavi-dual-invoice-v1.css');
  const invoiceBootstrap=invoice.split('<script id="zavi-theme-bootstrap-v29">')[1]?.split('</script>')[0];
  assert(invoiceBootstrap, 'invoice theme bootstrap missing');
  new vm.Script(invoiceBootstrap,{filename:'invoice-theme-bootstrap.js'});
  assert(invoice.includes('zavi-dual-design-v1.css')&&invoice.includes('zavi-dual-invoice-v1.css'),
    'invoice must load both palette and print-safe UI stylesheet');
  assert(sw.includes("'zavi-dual-invoice-v1.css'"),'invoice UI must be available offline');
  assert(invoiceCss.includes('@media print')&&!invoiceCss.includes('width:148mm!important'),
    'new theme must not hardcode a print format');
  assert(read('zavi-dual-dashboard-v1.css').includes('z63-quick-grid'),'dashboard layout missing');
  assert(sw.includes("'zavi-dual-dashboard-v1.css'"),'dashboard UI must be cached');
 }
 console.log('PASS '+app+': bootstrap, CSS, SW and dual-theme state machine');
}
