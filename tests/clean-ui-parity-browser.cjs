/* Compact presentation audit; never submits financial or admin actions. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const observations=[];
 try{
  for(const app of ['one','admin']){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
   await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   await page.goto('http://127.0.0.1:8765/'+app+'/index.html');
   await page.waitForFunction(()=>typeof window.ZaviThemeV29?.set==='function');
   // Capture the actual login, not the animated ZAVI ONE / ADMIN intro overlay.
   await page.waitForTimeout(2000);
   await page.screenshot({path:'qa-clean-'+app+'-login.png'});
   const expected=app==='one'?['zavi-clean-professional-v6667.css','zavi-showcase-v6668.css']:['zavi-clean-professional-v1458.css','zavi-admin-showcase-v1459.css'];
   const initialized=await page.evaluate(({app,expected})=>{
    const linked=expected.every(css=>[...document.querySelectorAll('link[rel="stylesheet"]')].some(n=>n.href.includes(css)));
    if(!linked)throw Error('Clean UI stylesheet not loaded');
    if(app==='one'){
     KEY='zavi_qa_clean_ui_do_not_sync';db=blankDB();zaviModules={};
     window.zaviCloudCanEdit=()=>true;window.zaviCloudAfterSave=()=>{};
     document.documentElement.classList.remove('zawi-locked');
     page='dashboard';render();
     return {nav:[...document.querySelectorAll('#sidebarLinks [data-go],#sidebarLinks2 [data-go]')].map(n=>n.dataset.go),ledger:JSON.stringify(db)};
    }
    document.getElementById('demoBtn').click();
    if(document.getElementById('appScreen').hidden)throw Error('Owner demo screen did not open');
    return {nav:[...document.querySelectorAll('#appScreen .nav-item[data-page]')].map(n=>n.dataset.page)};
   },{app,expected});
   assert.ok(initialized.nav.length>=10,app+' lost original menu');
   // The original app intentionally starts splash AFTER login/demo transitions.
   // Allow that delayed animation to start, then require its full removal.
   await page.waitForTimeout(2200);
   await page.waitForFunction(app=>{
    if(app==='one')return !document.querySelector('.z6513-splash');
    const splash=document.querySelector('#zaviAdminSplash');
    return !splash||splash.classList.contains('is-hidden');
   },app,{timeout:7500});
   for(const [width,height,label] of [[390,844,'mobile'],[768,1024,'tablet'],[1180,800,'desktop']]){
    await page.setViewportSize({width,height});
    for(const theme of ['light','dark','glass']){
     await page.evaluate(theme=>window.ZaviThemeV29.set(theme),theme);
     const output=await page.evaluate(({app,theme,nav,ledger})=>{
      const root=document.documentElement,content=document.querySelector(app==='one'?'#content':'#view');
      const key=app==='one'?'--z68-surface':'--z59-panel';
      const color=getComputedStyle(root).getPropertyValue(key).trim();
      const items=app==='one'
       ? [...document.querySelectorAll('#sidebarLinks [data-go],#sidebarLinks2 [data-go]')]
       : [...document.querySelectorAll('#appScreen .nav-item[data-page]')];
      const current=items.map(n=>app==='one'?n.dataset.go:n.dataset.page);
      const unreadable=items.filter(n=>getComputedStyle(n).visibility==='hidden'||getComputedStyle(n).opacity==='0').length;
      const hero=content?.querySelector(app==='one'?'.z62-hero':'.admin-hero');
      const heroBackground=hero?getComputedStyle(hero).backgroundImage:'';
      const panelCss=content?getComputedStyle(content).color:'';
      const quick=app==='one'?content?.querySelector('section.z63-quick-panel button.z63-quick-tile'):null;
      const quickLabel=quick?.querySelector('span:not(.z63-quick-glyph)');
      const adminCTA=app==='admin'?content?.querySelector('.admin-hero button.button.primary'):null;
      const quickBg=quick?getComputedStyle(quick).backgroundColor:null;
      const quickInk=quickLabel?getComputedStyle(quickLabel).color:null;
      const adminCTAText=adminCTA?getComputedStyle(adminCTA).color:null;
      return {
       theme:root.getAttribute('data-zavi-appearance'),color,
       navPreserved:JSON.stringify(current)===JSON.stringify(nav),unreadable,
       heroBackground,panelCss,quickBg,quickInk,adminCTAText,bodyWidth:root.scrollWidth,viewport:innerWidth,
       populated:(content?.textContent||'').trim().length,
       ledgerIntact:app!=='one'||JSON.stringify(db)===ledger
      }
     },{app,theme,nav:initialized.nav,ledger:initialized.ledger});
     assert.equal(output.theme,theme,app+' '+theme+' theme not preserved');
     assert.ok(output.color.length>0,app+' '+theme+' showcase colors missing');
     assert.ok(output.panelCss.length>0,app+' '+theme+' content has no computed color');
     assert.ok(output.heroBackground.includes('gradient'),app+' '+theme+' approved gradient hero not applied');
     // Contrast safeguard: fail instead of packaging unreadable white/black controls.
     const rgb=value=>(String(value||'').match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
     if(theme==='light'&&app==='one'){
      const bg=rgb(output.quickBg),ink=rgb(output.quickInk);
      assert.ok(bg.length===3&&Math.min(...bg)>=205, 'Light quick actions must use bright cards: '+output.quickBg);
      assert.ok(ink.length===3&&Math.max(...ink)<=155, 'Light quick action labels must be dark: '+output.quickInk);
     }
     if(theme==='light'&&app==='admin'){
      const ink=rgb(output.adminCTAText);
      assert.ok(ink.length===3&&ink[0]<165&&ink[1]<165, 'Light ADMIN main action label must contrast with white: '+output.adminCTAText);
     }
     assert.equal(output.navPreserved,true,app+' menu removed after theme switch');
     assert.equal(output.unreadable,0,app+' hidden menu controls');
     assert.equal(output.ledgerIntact,true,app+' presentation mutated ledger');
     assert.ok(output.populated>20,app+' screen unexpectedly empty');
     assert.ok(output.bodyWidth<=output.viewport+2,app+' '+label+' '+theme+' page overflow');
     if(label==='mobile')await page.screenshot({path:'qa-clean-'+app+'-'+theme+'-mobile.png'});
     observations.push({app,label,theme,nav:initialized.nav.length,passed:true});
    }
   }
   assert.deepEqual(errors,[],app+' raised unexpected browser exceptions');
   await ctx.close();
  }
  fs.writeFileSync('ui-clean-audit.json',JSON.stringify(observations,null,2)+'\n');
  console.log('PASS: 18 responsive light/dark/glass UI snapshots with all original navigation and ledger untouched');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
