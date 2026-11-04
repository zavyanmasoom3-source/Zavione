const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const app of ['one','admin']){
   const ctx=await browser.newContext({serviceWorkers:'block'});
   await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
   const page=await ctx.newPage();
   await page.goto('http://127.0.0.1:8765/'+app+'/index.html');
   await page.waitForFunction(()=>window.ZaviDisplaySettingsV6588&&window.ZaviVisualRescueV6590&&window.ZaviViewportV6589);
   const result=await page.evaluate(()=>{
    const api=window.ZaviDisplaySettingsV6588;
    const before={text:api.get('text'),system:api.get('system'),icons:api.get('icons')};
    api.set('text',115);api.set('system',105);api.set('icons',110);
    const root=document.documentElement;
    const result={before,text:api.get('text'),system:api.get('system'),icons:api.get('icons'),
      textStyle:root.style.getPropertyValue('--z87-text-scale'),
      uiStyle:root.style.getPropertyValue('--z87-system-scale'),
      iconStyle:root.style.getPropertyValue('--z87-icon-scale'),
      landscape:!!window.ZaviViewportV6589,
      mobile:!!window.ZaviVisualRescueV6590,
      tablet:!!window.ZaviAdminTabletV1438
    };
    api.reset();return result;
   });
   assert.equal(result.text,115);assert.equal(result.system,105);assert.equal(result.icons,110);
   assert.equal(result.textStyle,'1.15');assert.equal(result.uiStyle,'1.05');assert.equal(result.iconStyle,'1.1');
   assert.equal(result.landscape,true);assert.equal(result.mobile,true);
   if(app==='admin')assert.equal(result.tablet,true);
   // A newly mounted empty picker and a live locale switch must both work.
   await page.evaluate(()=>{const picker=document.createElement('div');picker.className='zavi-theme-picker';picker.id='qaThemePicker';document.body.appendChild(picker)});
   for(const [lang,label] of [['en-US','Glass'],['ps','ښیښه‌یي'],['fa-AF','شیشه‌ای']]){
    await page.evaluate(lang=>document.documentElement.lang=lang,lang);
    await page.waitForFunction(label=>document.querySelector('#qaThemePicker [data-zavi-theme-choice="glass"]')?.textContent===label,label);
    assert.equal(await page.locator('#qaThemePicker [data-zavi-theme-choice="glass"]').count(),1);
   }
   console.log('Restored three sliders + viewport controls PASS '+app);
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
