import fs from "node:fs";
import {applyZaviV60} from "./zavi-v60-client-patch.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const mode=process.argv[2];
const configs={
  one:{base:"https://zavione1.netlify.app/",folder:"ZAVI_ONE",productName:"ZAVI ONE",name:"zavi-one-desktop",version:"61.0.0",appId:"com.zavione.accounting",exe:"Setup_ZAVI_ONE_Windows_x64_V61.exe"},
  admin:{base:"https://zavione0.netlify.app/",folder:"ZAVI_ONE_ADMIN",productName:"ZAVI ONE ADMIN",name:"zavi-one-admin-desktop",version:"41.2.0",appId:"com.zavione.admin",exe:"Setup_ZAVI_ONE_ADMIN_Windows_x64_41_2.exe"}
};
const c=configs[mode];
if(!c)throw Error("Usage: node windows-build/fetch-and-stage.mjs one|admin");
const root=path.resolve("windows-output",c.folder), web=path.join(root,"web");
fs.mkdirSync(web,{recursive:true});
const base=new URL(c.base);
const manifest=fs.readFileSync(path.join(here,"asset-list.txt"),"utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const queued=new Set([...manifest,"index.html"]);
const downloaded=new Set();
const failures=new Set();
const queue=[...queued];
const contentRefs=new Set();
function enqueue(input){
  if(!input||/^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(input))return;
  let u;try{u=new URL(input,base);}catch{return;}
  if(u.origin!==base.origin)return;
  let p=decodeURIComponent(u.pathname.replace(/^\//,""));
  if(!p||p.includes("..")||p.includes("\\")||p.startsWith("."))return;
  if(!/\.(?:html|js|css|json|webmanifest|png|jpg|jpeg|svg|ico|woff2?|txt)$/i.test(p))return;
  if(!queued.has(p)){queued.add(p);queue.push(p);}
}
function collectRefs(text,type){
  if(type==="html"){
    for(const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi))enqueue(m[1]);
    for(const m of text.matchAll(/(?:src|href)\s*=\s*([^"'\s>]+)/gi))enqueue(m[1]);
  }
  if(type==="css"){
    for(const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))enqueue(m[1]);
    for(const m of text.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/gi))enqueue(m[1]);
  }
}
async function get(u){
  let err;
  for(let i=0;i<3;i++){
    try{
      let res=await fetch(u,{redirect:"follow",signal:AbortSignal.timeout(25000),headers:{"User-Agent":"ZAVI-Windows-installer-build/1.0"}});
      if(res.status===404)return null;
      if(!res.ok)throw Error("HTTP "+res.status+" "+u);
      let ab=await res.arrayBuffer();return Buffer.from(ab);
    }catch(e){err=e;await new Promise(r=>setTimeout(r,1000*(i+1)));}
  }
  throw err;
}
for(let i=0;i<queue.length;i++){
  let p=queue[i];
  try{
    let buff=await get(new URL(p,base));
    if(buff===null){failures.add(p);continue;}
    if(/(?:\.html|\.css|\.js|\.json|\.txt|\.webmanifest)$/i.test(p)&& buff.subarray(0,120).toString().toLowerCase().includes("<!doctype html") && !/\.html$/i.test(p)){
      failures.add(p);console.log("BAD asset served as HTML: "+p);continue;
    }
    const dest=path.join(web,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,buff);
    downloaded.add(p);
    if(p.endsWith(".html"))collectRefs(buff.toString("utf8"),"html");
    if(p.endsWith(".css"))collectRefs(buff.toString("utf8"),"css");
  }catch(e){failures.add(p);console.log("FAILED "+p+" : "+e.message);}
}
if(!downloaded.has("index.html"))throw Error("Cannot download root/index.html from "+c.base);
const html=fs.readFileSync(path.join(web,"index.html"),"utf8");
const broken=[];
for(const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)){
  let tag=match[0];
  if(!/^<script\b/i.test(tag)&& !/(?:stylesheet|manifest)/i.test(tag))continue;
  let attr=tag.match(/(?:src|href)\s*=\s*["']([^"']+)["']/i);
  if(!attr)continue;
  let url;try{url=new URL(attr[1],base);}catch{continue;}
  if(url.origin!==base.origin)continue;
  let p=decodeURIComponent(url.pathname.slice(1));
  if(p&&!downloaded.has(p))broken.push(p);
}
if(broken.length)throw Error("Critical HTML scripts/CSS missing: "+[...new Set(broken)].join(", "));
if(downloaded.size<20)throw Error("Only "+downloaded.size+" web files downloaded, aborting unsafe incomplete desktop setup.");
fs.copyFileSync(path.join(here,"main.cjs"),path.join(root,"main.cjs"));
fs.copyFileSync(path.join(here,"desktop-server.cjs"),path.join(root,"desktop-server.cjs"));
const pkg={
  name:c.name, productName:c.productName,version:c.version,private:true,
  description:c.productName+" Windows 10/11 x64 bundled desktop app",
  main:"main.cjs",scripts:{"test":"node --check main.cjs && node --check desktop-server.cjs","dist:win":"electron-builder --win nsis --x64"},
  devDependencies:{electron:"^38.0.0","electron-builder":"^26.0.0"},
  build:{
    appId:c.appId,productName:c.productName,asar:true,
    directories:{output:"dist"},
    files:["main.cjs","desktop-server.cjs","web/**/*","package.json","!**/*.map"],
    win:{icon:mode==="one"?"web/icon-512.png":"web/icon.png",target:[{target:"nsis",arch:["x64"]}],requestedExecutionLevel:"asInvoker"},
    nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,
      createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:c.productName,
      artifactName:c.exe,deleteAppDataOnUninstall:false}
  }
};
fs.writeFileSync(path.join(root,"package.json"),JSON.stringify(pkg,null,2));
let report={product:c.productName,source:c.base,generated:new Date().toISOString(),files:downloaded.size,
  missingOptional:[...failures].sort(),criticalReferences:0,
  warning:"Files fetched from live Netlify deployment, not an independently verified matching V41 local archive. Verify accounting, login, updates and offline behavior on Windows before client distribution."};
if(mode==="one"){applyZaviV60(web);report.version="V61 repair of critical inline HTML / script break; V60 team management retained";report.patch="zavi-v60-client-patch.mjs";}
fs.writeFileSync(path.join(root,"BUILD_SOURCE_REPORT.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({message:"Web assets staged for Electron",mode,folder:root,downloaded:downloaded.size,missing:failures.size},null,2));