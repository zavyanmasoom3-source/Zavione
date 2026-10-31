"use strict";
const {app,BrowserWindow,Menu,shell,dialog}=require("electron");
const path=require("node:path");
const {startServer}=require("./desktop-server.cjs");
const pkg=require("./package.json");
const IS_ADMIN=pkg.name.includes("admin");
const PORT=IS_ADMIN?48362:48361;
let win=null,server=null;
app.setName(pkg.productName);
app.setPath("userData",path.join(app.getPath("appData"),IS_ADMIN?"ZAVI_ONE_ADMIN_Desktop":"ZAVI_ONE_Desktop"));
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on("second-instance",()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(async()=>{
    try{
      const started=await startServer(path.join(__dirname,"web"),PORT);
      server=started.server;
      win=new BrowserWindow({title:pkg.productName,width:1300,height:840,minWidth:790,minHeight:500,backgroundColor:"#071b39",show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
      const wc=win.webContents;
      wc.setWindowOpenHandler(({url})=>{
        if(url==="about:blank"||url===""||url.startsWith("http://127.0.0.1:"+PORT+"/"))return {action:"allow",overrideBrowserWindowOptions:{width:1024,height:840,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}}};
        if(/^https:\/\//i.test(url))shell.openExternal(url).catch(()=>{});
        return {action:"deny"};
      });
      wc.on("will-navigate",(event,url)=>{if(!url.startsWith("http://127.0.0.1:"+PORT+"/")){event.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url).catch(()=>{});}});
      wc.on("will-attach-webview",event=>event.preventDefault());
      wc.session.setPermissionRequestHandler((_wc,p,cb)=>cb(p==="clipboard-sanitized-write"));
      Menu.setApplicationMenu(Menu.buildFromTemplate([{label:"ZAVI ONE",submenu:[{label:"Reload / تازه‌سازی",accelerator:"CmdOrCtrl+R",click:()=>wc.reload()},{label:"Print / چاپ",accelerator:"CmdOrCtrl+P",click:()=>wc.print({silent:false})},{type:"separator"},{label:"Exit / خروج",role:"quit"}]},{label:"View / نمایش",submenu:[{label:"Full screen",role:"togglefullscreen"},{label:"Zoom in",role:"zoomIn"},{label:"Zoom out",role:"zoomOut"},{label:"Actual size",role:"resetZoom"}]}]));
      win.once("ready-to-show",()=>win.show());
      wc.on("did-fail-load",(_e,code,desc,url,isMain)=>{if(isMain)dialog.showErrorBox(pkg.productName,"بارگذاری برنامه ناموفق بود: "+desc+" ("+code+") "+url);});
      await win.loadURL(started.url);
    }catch(e){dialog.showErrorBox(pkg.productName,"اجرای برنامه ناموفق: "+e.message);app.quit();}
  });
}
app.on("window-all-closed",()=>app.quit());
app.on("before-quit",()=>{try{if(server)server.close();}catch{}});