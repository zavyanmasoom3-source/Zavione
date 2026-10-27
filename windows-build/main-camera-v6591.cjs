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
      wc.session.setPermissionCheckHandler((_webContents,permission,origin)=>{
        const local=String(origin||"").startsWith("http://127.0.0.1:"+PORT+"/");
        return local && (permission==="media"||permission==="videoCapture"||permission==="clipboard-sanitized-write");
      });
      wc.session.setPermissionRequestHandler(async (_webContents,permission,callback,details)=>{
        if(permission==="clipboard-sanitized-write")return callback(true);
        const requestingUrl=String(details?.requestingUrl||"");
        const types=Array.isArray(details?.mediaTypes)?details.mediaTypes:[];
        const local=requestingUrl.startsWith("http://127.0.0.1:"+PORT+"/");
        if(permission==="media"&&local&&(!types.length||types.includes("video"))&&!types.includes("audio")){
          try{
            const result=await dialog.showMessageBox(win,{
              type:"question",
              title:pkg.productName+" - Camera",
              message:"اجازه استفاده از دوربین برای اسکن بارکد را می‌دهید؟",
              detail:"Camera access is requested only by this local ZAVI ONE application.",
              buttons:["اجازه می‌دهم / Allow","رد / Deny"],
              defaultId:1,cancelId:1,noLink:true
            });
            return callback(result.response===0);
          }catch{ return callback(false); }
        }
        callback(false);
      });
      Menu.setApplicationMenu(Menu.buildFromTemplate([{label:"ZAVI ONE",submenu:[{label:"Reload / تازه‌سازی",accelerator:"CmdOrCtrl+R",click:()=>wc.reload()},{label:"Print / چاپ",accelerator:"CmdOrCtrl+P",click:()=>wc.print({silent:false})},{type:"separator"},{label:"Exit / خروج",role:"quit"}]},{label:"View / نمایش",submenu:[{label:"Full screen",role:"togglefullscreen"},{label:"Zoom in",role:"zoomIn"},{label:"Zoom out",role:"zoomOut"},{label:"Actual size",role:"resetZoom"}]}]));
      win.once("ready-to-show",()=>win.show());
      wc.on("did-fail-load",(_e,code,desc,url,isMain)=>{if(isMain)dialog.showErrorBox(pkg.productName,"بارگذاری برنامه ناموفق بود: "+desc+" ("+code+") "+url);});
      await win.loadURL(started.url);
    }catch(e){dialog.showErrorBox(pkg.productName,"اجرای برنامه ناموفق: "+e.message);app.quit();}
  });
}
app.on("window-all-closed",()=>app.quit());
app.on("before-quit",()=>{try{if(server)server.close();}catch{}});