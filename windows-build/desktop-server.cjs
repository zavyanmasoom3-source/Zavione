"use strict";
const http=require("node:http"), fs=require("node:fs"), path=require("node:path");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".txt":"text/plain; charset=utf-8"};
exports.startServer=async function(root,port){
  root=path.resolve(root);
  const server=http.createServer((req,res)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    if(!["127.0.0.1:"+port,"localhost:"+port].includes(String(req.headers.host||"").toLowerCase())){res.writeHead(403);res.end();return;}
    if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);res.end();return;}
    let url;try{url=new URL(req.url,"http://127.0.0.1");}catch{res.writeHead(400);res.end();return;}
    const decoded=decodeURIComponent(url.pathname);
    if(decoded.includes("\\")||decoded.includes("\0")||decoded.split("/").includes("..")){res.writeHead(403);res.end();return;}
    const file=path.resolve(root,"."+ (decoded.endsWith("/")?decoded+"index.html":decoded));
    if(!file.startsWith(root+path.sep) || !MIME[path.extname(file).toLowerCase()] ||path.basename(file).startsWith(".")){res.writeHead(404);res.end();return;}
    fs.stat(file,(e,s)=>{
      if(e||!s.isFile()){res.writeHead(404);res.end();return;}
      res.setHeader("Content-Type",MIME[path.extname(file).toLowerCase()]);
      res.setHeader("Cache-Control","no-cache");
      res.setHeader("Content-Length",s.size);
      res.writeHead(200);
      if(req.method==="HEAD")return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
  return {server,url:"http://127.0.0.1:"+port+"/"};
};