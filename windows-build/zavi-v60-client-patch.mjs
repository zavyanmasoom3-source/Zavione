/* ZAVI ONE V62: patch the customer app staged for Android and Windows.
   Never append script at the first </body>, because inline invoice templates contain one. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function applyZaviV60(web){
 const index=path.join(web,'index.html');
 if(!fs.existsSync(index))throw Error('ZAVI V62: missing index.html');
 let html=fs.readFileSync(index,'utf8');
 if(!html.includes('cloud.js')||!html.trimEnd().toLowerCase().endsWith('</html>')){
   throw Error('ZAVI V62: unexpected or truncated customer web app');
 }
 for(const ext of ['js','css']){
   fs.copyFileSync(path.join(here,'zavi-v62-team-operations.'+ext),
     path.join(web,'zavi-v62-team-operations.'+ext));
 }
 // Remove a V60 dashboard injection when present, plus do not reinsert old V60 JS.
 html=html.replace('<div id="z60TeamDashboard"></div>','');
 const last=html.toLowerCase().lastIndexOf('</body>');
 if(last<0)throw Error('ZAVI V62: missing last body close');
 const assets='<link rel="stylesheet" href="./zavi-v62-team-operations.css?v=62.0">'
 +'<script defer src="./zavi-v62-team-operations.js?v=62.0"></script>';
 if(!html.includes('zavi-v62-team-operations.js'))html=html.slice(0,last)+assets+html.slice(last);
 if(html.split('src="./zavi-v62-team-operations.js').length!==2)throw Error('ZAVI V62: script injection failed');
 fs.writeFileSync(index,html,'utf8');
 const sw=path.join(web,'sw.js');
 if(fs.existsSync(sw)){
   let s=fs.readFileSync(sw,'utf8');
   s=s.replace(/const CACHE_NAME\s*=\s*['"][^'"]+['"]/, "const CACHE_NAME='zavi-one-v62-team-daily-operations'");
   s=s.replace(/const CORE\s*=\s*\[/,'const CORE=["zavi-v62-team-operations.css","zavi-v62-team-operations.js",');
   fs.writeFileSync(sw,s,'utf8');
 }
 console.log('ZAVI V62: colleague counter and add/remove are ONLY in Daily Operations.');
}