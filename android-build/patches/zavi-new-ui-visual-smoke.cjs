"use strict";
const {chromium}=require("playwright-core");
const {execSync}=require("node:child_process");
const assert=require("node:assert/strict");
const path=require("node:path");
const fs=require("node:fs");
async function run(){
 const mode=process.argv[2]||"one";
 const chrome=execSync("command -v google-chrome || command -v chromium || command -v chromium-browser",{encoding:"utf8"}).trim().split("\n")[0];
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto("http://127.0.0.1:18765/",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForTimeout(1600);
 if(mode==="one"){
   await page.evaluate(()=>{
     const g=document.querySelector("#zawiPrivateGate");
     if(g)g.style.setProperty("display","none","important");
     try{if(typeof window.render==="function")window.render();else if(typeof window.go==="function")window.go("dashboard");}catch(e){console.warn("Dashboard QA render",e.message);}
   });
 }else{
   const demo=page.locator("#demoBtn");
   assert(await demo.count()>0,"ADMIN preview demo control missing");
   await demo.click({timeout:7000});
 }
 const hero=mode==="one"?"#content > .welcome":"#view .admin-hero";
 const metric=mode==="one"?"#content > .stat-grid .stat":"#view .admin-kpis .admin-kpi";
 await page.waitForSelector(hero,{state:"visible",timeout:12000});
 await page.waitForSelector(metric,{state:"visible",timeout:12000});
 await page.waitForSelector(".zavi-ref-top-tools",{state:"attached",timeout:12000});
 fs.mkdirSync("visual",{recursive:true});
 const styles=[];
 for(const theme of ["dark","light"]){
  await page.evaluate(t=>{if(window.ZaviThemeV29?.set)window.ZaviThemeV29.set(t);else document.documentElement.dataset.zaviTheme=t;},theme);
  await page.waitForTimeout(400);
  const actual=await page.locator(metric).first().evaluate(el=>{
   const st=getComputedStyle(el);return {border:st.borderTopWidth,color:st.color,background:st.backgroundColor};
  });
  assert.equal(actual.border,"3px","Reference metric styling not applied: "+mode+"/"+theme);
  const bodyColor=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  styles.push(bodyColor);
  const image="visual/"+(mode==="one"?"store":"admin")+"-"+theme+"-desktop.png";
  await page.screenshot({path:image,fullPage:false});
  console.log("PASS actual dashboard",mode,theme,image,JSON.stringify(actual),"body",bodyColor);
 }
 assert.notEqual(styles[0],styles[1],"Light/dark appearance did not change background");
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:"visual/"+(mode==="one"?"store":"admin")+"-light-phone.png",fullPage:false});
 await browser.close();
}
run().catch(e=>{console.error(e);process.exitCode=1;});
