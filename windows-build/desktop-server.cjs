"use strict";
const http=require("node:http"), fs=require("node:fs"), path=require("node:path");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".txt":"text/plain; charset=utf-8"};
const IMMUTABLE_EXTS=new Set([".css",".js",".json",".webmanifest",".png",".jpg",".jpeg",".svg",".ico",".woff",".woff2",".txt"]);
exports.startServer=async function(root,port){
  root=path.resolve(root);
  const server=http.createServer((req,res)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("X-Frame-Options","SAMEORIGIN");
    if(!["127.0.0.1:"+port,"localhost:"+port].includes(String(req.headers.host||"").toLowerCase())){res.writeHead(403);res.end();return;}
    if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);res.end();return;}
    let url;try{url=new URL(req.url,"http://127.0.0.1");}catch{res.writeHead(400);res.end();return;}
    let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
    if(decoded.includes("\\")||decoded.includes("\0")||decoded.split("/").includes("..")){res.writeHead(403);res.end();return;}
    const file=path.resolve(root,"."+(decoded.endsWith("/")?decoded+"index.html":decoded));
    if(!file.startsWith(root+path.sep) || !MIME[path.extname(file).toLowerCase()] ||path.basename(file).startsWith(".")){res.writeHead(404);res.end();return;}
    fs.stat(file,(e,s)=>{
      if(e||!s.isFile()){res.writeHead(404);res.end();return;}
      const ext=path.extname(file).toLowerCase(), isHtml=ext===".html";
      // The HTML shell is always revalidated so app updates are not hidden.
      // Static local assets are cached and validated to avoid rereading large JS/CSS on every reload.
      const etag='"'+s.size.toString(16)+"-"+Math.floor(s.mtimeMs).toString(16)+'"';
      res.setHeader("Content-Type",MIME[ext]);
      res.setHeader("Cache-Control",isHtml?"no-cache":"private, max-age=86400, must-revalidate");
      res.setHeader("ETag",etag);
      res.setHeader("Last-Modified",s.mtime.toUTCString());
      res.setHeader("Vary","Accept-Encoding");
      if(req.headers["if-none-match"]===etag || (!req.headers["if-none-match"]&&req.headers["if-modified-since"]&&new Date(req.headers["if-modified-since"]).getTime()>=Math.floor(s.mtimeMs/1000)*1000)){
        res.writeHead(304);return res.end();
      }
      res.setHeader("Content-Length",s.size);
      res.writeHead(200);
      if(req.method==="HEAD")return res.end();
      const stream=fs.createReadStream(file);
      stream.on("error",()=>{if(!res.headersSent)res.writeHead(500);res.destroy();});
      stream.pipe(res);
    });
  });
  server.maxConnections=128;
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
  return {server,url:"http://127.0.0.1:"+port+"/"};
};
