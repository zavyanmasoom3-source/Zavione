const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:8765/one/index.html');
  await page.waitForFunction(()=>Boolean(window.ZaviZXingV6591?.start&&window.ZaviCameraScan?.start));
  const setup=await page.evaluate(()=>{
   const input=document.createElement('input');input.id='fld_sku';document.body.appendChild(input);
   const trigger=document.createElement('button');trigger.type='button';trigger.dataset.zaviCameraOpen='fld_sku';document.body.appendChild(trigger);
   let stopped=0,entered=0,changed=0;
   input.addEventListener('input',()=>entered++);
   input.addEventListener('change',()=>changed++);
   const media=new MediaStream();media.getTracks=()=>[{stop(){stopped++}}];
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>media}});
   Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
   HTMLMediaElement.prototype.play=async function(){};
   HTMLMediaElement.prototype.pause=function(){};
   let cancelCount=0,callback=null;
   window.ZaviZXingV6591={start:async(_stream,_video,fn)=>{callback=fn;return ()=>{cancelCount++}}};
   window.__barcodeQA={trigger,media,read:()=>({stopped,entered,changed,cancelCount,callback}),callback:()=>callback};
   trigger.click();
   return {secure:window.isSecureContext};
  });
  assert.equal(setup.secure,true,'localhost must be a secure context');
  await page.waitForFunction(()=>typeof window.__barcodeQA.callback()==='function');
  await page.evaluate(()=>window.__barcodeQA.callback()('5901234123457'));
  const one=await page.evaluate(()=>({value:document.getElementById('fld_sku').value,
    panel:!!document.getElementById('zaviCameraPanel'),...window.__barcodeQA.read(),callback:null}));
  assert.equal(one.value,'5901234123457');
  assert.equal(one.panel,false,'camera closed automatically after scan');
  assert.equal(one.entered,1,'one input event per valid scan');
  assert.equal(one.changed,1,'one change event per valid scan');
  assert.equal(one.stopped,1,'camera track stopped');
  assert.equal(one.cancelCount,1,'ZXing worker stopped after scan');
  await page.evaluate(()=>{window.__barcodeQA.trigger.click()});
  await page.waitForFunction(()=>typeof window.__barcodeQA.callback()==='function'&&document.getElementById('zaviCameraPanel'));
  await page.evaluate(()=>window.ZaviCameraScan.stop());
  const two=await page.evaluate(()=>window.__barcodeQA.read());
  assert.equal(two.stopped,2,'camera closes without leaked tracks');
  assert.equal(two.cancelCount,2,'decoder closed on exit');
  console.log('Offline camera fallback, one-scan guard, manual input and stop cleanup passed');
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
