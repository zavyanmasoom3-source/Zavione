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
  await page.setViewportSize({width:390,height:844});
  const contrast=await page.evaluate(()=>{
   window.ZaviThemeV29.set('light');
   // Presentation-only fixture; does not authenticate or fetch any account.
   const fixture=document.createElement('div');fixture.id='z24Root';
   fixture.innerHTML='<table class="v24-table"><tbody><tr><td><b>QA account</b><small>QA label</small></td><td><div class="v24-actions"><button>QA</button></div></td></tr></tbody></table>';
   document.body.appendChild(fixture);
   const row=fixture.querySelector('tr'),label=fixture.querySelector('small');
   const result={background:getComputedStyle(row).backgroundColor,color:getComputedStyle(label).color};
   fixture.remove();return result;
  });
  assert.equal(contrast.background,'rgb(255, 255, 255)');
  assert.equal(contrast.color,'rgb(21, 41, 68)');
  console.log('ADMIN owner-gated restored renewal and message controls passed');
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
