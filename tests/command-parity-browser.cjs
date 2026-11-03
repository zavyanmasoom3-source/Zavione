const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for (const app of ['one','admin']) {
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto('http://127.0.0.1:8765/'+app+'/index.html');
   await page.waitForFunction(()=>Boolean(window.ZaviDualCommand605&&window.ZaviDualCommand605.parseCommand));
   const result=await page.evaluate((appName)=>{
    const api=window.ZaviDualCommand605;
    const navigation=api.parseCommand(appName==='admin'?'تنظیمات باز کن':'فروش باز کن');
    const forbidden=api.parseCommand('حذف تمام مشتریان');
    return {
     app:api.app,version:api.version,
     navigation,navigateText:api.parseCommand('open settings'),
     forbidden,launcher:document.querySelectorAll('#z605-launch').length,
     star:document.querySelector('#z605-launch')?.textContent,
     nativeVoice:!!window.ZaviAndroidLocalVoice?.postMessage,
     bridgeClaim:document.querySelector('#z605-mic')?.disabled
    }
   },app);
   assert.equal(result.app,app,'Command center app identity must match');
   assert.equal(result.launcher,1,'Only one command launcher');
   assert.notEqual(result.star,'✦','No decorative star launcher');
   assert.equal(result.navigation.kind,'navigate');
   assert.equal(result.navigateText.kind,'navigate');
   assert.equal(result.forbidden.kind,'refuse','Delete commands must be blocked');
   assert.equal(result.nativeVoice,false,'Build without offline native model must not fake speech');
   if(app==='one'){
    const response=await page.evaluate(()=>{
     document.documentElement.classList.add('zawi-locked');
     const blocked=window.ZaviDualCommand605.execute('فروش باز کن','text');
     document.documentElement.classList.remove('zawi-locked');
     const target=window.ZaviDualCommand605.findNavigation('sales');
     if(!target)throw Error('Sales navigation control not present');
     let clicked=0;target.addEventListener('click',()=>clicked++,{once:true});
     const opened=window.ZaviDualCommand605.execute('فروش باز کن','text');
     return {blocked,opened,clicked};
    });
    assert.equal(response.blocked.kind,'blocked','Lock screen must prevent commands');
    assert.equal(response.opened.kind,'navigate','Text command must navigate');
    assert.equal(response.clicked,1,'Existing real sales control must receive click');
   }
   if(errors.length)throw Error('Page errors for '+app+': '+errors.slice(0,5).join(' | '));
   console.log('Assistant source parity passed',app,JSON.stringify({navigation:result.navigation.key,forbidden:result.forbidden.kind,launcher:result.launcher}));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
