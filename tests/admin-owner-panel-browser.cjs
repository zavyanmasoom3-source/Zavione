const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8765/admin/index.html');
  await page.waitForFunction(()=>document.querySelector('#z139-nav')&&document.querySelector('#z141-menu'));
  const actual=await page.evaluate(()=>{
   if(!document.getElementById('appScreen').hidden)throw Error('Admin should be locked at initial launch');
   document.getElementById('z139-nav').click();
   document.getElementById('z141-menu').click();
   return {
    renewalOpen:!!document.querySelector('#z139-dialog:not([hidden])'),
    centerOpen:!!document.querySelector('#z141-center:not([hidden])'),
    messageCenterNav:!!document.getElementById('z141-menu'),
    renewalNav:!!document.getElementById('z139-nav'),
    ownerOnly:window.ZaviAdminAPI?.getMode?.()!=='live'
   }
  });
  assert.equal(actual.renewalOpen,false,'Unauthenticated user must not open renewal data');
  assert.equal(actual.centerOpen,false,'Unauthenticated user must not open central control');
  assert.equal(actual.ownerOnly,true,'Test must be unauthenticated');
  console.log('ADMIN owner-gated restored renewal and message controls passed');
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
