/* Original ONE and ADMIN navigation across screens/themes. Synthetic data only. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const audit=[];
 try {
  for(const app of ['one','admin']){
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
   await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/'+app+'/index.html');
   await page.waitForFunction(()=>typeof window.ZaviThemeV29?.set==='function');
   const boot=await page.evaluate(app=>{
    if(app==='one'){
     KEY='zavi_qa_menu_do_not_sync';db=blankDB();zaviModules={};
     window.zaviCloudAfterSave=()=>{};window.zaviCloudCanEdit=()=>true;
     document.documentElement.classList.remove('zawi-locked');
     page='dashboard';render();
     return {items:[...document.querySelectorAll('#sidebarLinks [data-go],#sidebarLinks2 [data-go]')].map(x=>x.dataset.go),ledger:JSON.stringify(db)};
    }
    const demo=document.getElementById('demoBtn');
    if(!demo||demo.hidden)throw Error('Safe local demo mode not available');
    demo.click();
    if(document.getElementById('appScreen').hidden)throw Error('Original ADMIN demo login failed');
    return {items:[...document.querySelectorAll('#appScreen .nav-item[data-page]')].map(x=>x.dataset.page)};
   },app);
   assert.ok(boot.items.length>=10,app+': original menu should contain >=10 sections');
   assert.equal(new Set(boot.items).size,boot.items.length,app+': duplicate menu routes');
   for(const [width,height] of [[390,844],[1024,768],[768,1024]]){
    await page.setViewportSize({width,height});
    for(const theme of ['light','dark','glass']){
     await page.evaluate(x=>window.ZaviThemeV29.set(x),theme);
     const result=await page.evaluate(async ({app,items,expectedLedger})=>{
      const failed=[],outcomes=[];
      for(const section of items){
       const selector=app==='one'?'#sidebarLinks [data-go="'+section+'"],#sidebarLinks2 [data-go="'+section+'"]':'#appScreen .nav-item[data-page="'+section+'"]';
       const button=document.querySelector(selector);
       if(!button){failed.push({section,reason:'missing original menu button'});continue}
       if(button.disabled){failed.push({section,reason:'disabled menu'});continue}
       button.click();
       await new Promise(r=>setTimeout(r,3));
       const view=app==='one'?document.querySelector('#content'):document.querySelector('#view');
       const chars=(view?.textContent||'').trim().length;
       const actual=app==='one'?page:document.querySelector('#appScreen .nav-item.selected')?.dataset.page;
       if(actual!==section||chars<18)failed.push({section,actual,chars,reason:'route missing/empty'});
       if(app==='one'&&JSON.stringify(db)!==expectedLedger)failed.push({section,reason:'menu mutated ledger'});
       outcomes.push(section);
      }
      if(app==='one'&&localStorage.getItem('zavi_qa_menu_do_not_sync'))failed.push({reason:'menu persisted ledger unexpectedly'});
      return {failed,sections:outcomes.length,appearance:document.documentElement.getAttribute('data-zavi-appearance'),scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
     },{app,items:boot.items,expectedLedger:boot.ledger});
     assert.equal(result.appearance,theme,app+' '+theme+': appearance not applied');
     assert.ok(result.scrollWidth<=result.viewportWidth+2,app+' '+width+' '+theme+': horizontal overflow');
     assert.deepEqual(result.failed,[],app+' '+width+' '+theme+': broken original navigation');
     audit.push({app,width,height,theme,sections:result.sections,ledgerUnchanged:app==='one'});
    }
   }
   assert.deepEqual(errors,[],app+': unexpected page errors');
   await context.close();
  }
  fs.writeFileSync('menu-parity-results.json',JSON.stringify(audit,null,2)+'\n');
  console.log('Original menu navigation checks passed: '+audit.reduce((n,x)=>n+x.sections,0)+' route visits');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
