/* V63 robust team navigation patch; customer app only.
   Critical: changes live outside renderNav-managed #sidebarLinks and
   appends assets only before LAST closing </body> (invoice templates may include HTML). */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function applyZaviV60(web){
 const index=path.join(web,'index.html');
 if(!fs.existsSync(index))throw Error('ZAVI V63: missing main index.html');
   let html=fs.readFileSync(index,'utf8');
 if(!html.includes('cloud.js')||!html.trimEnd().toLowerCase().endsWith('</html>'))throw Error('ZAVI V63: wrong or incomplete customer app');
 for(const ext of ['js','css']){
   const file='zavi-v63-team-operations.'+ext;
   fs.copyFileSync(path.join(here,file),path.join(web,file));
 }
 html=html.replace('<div id="z60TeamDashboard"></div>','');
 // A real, persistent navigation button directly after the "Daily Operations" heading.
 // renderNav() rewrites #sidebarLinks.innerHTML and erased the V62 dynamic item.
 const navigationAnchor='<div id="sidebarLinks"></div>';
 if(html.split(navigationAnchor).length!==2)throw Error('ZAVI V63: Daily Operations menu structure not found exactly once');
 const button='<button type="button" id="z63TeamMenu" class="nav-btn" aria-haspopup="dialog">'
   +'<span class="z63-icon" aria-hidden="true">👥</span>'
   +'<span>مدیریت همکاران (افزودن و حذف)</span></button>';
 html=html.replace(navigationAnchor,button+'\n'+navigationAnchor);
 // Avoid duplicate handlers if earlier web frontend contains V62 assets.
 html=html.replace(/<script\b[^>]*src=["'][^"']*zavi-v62-team-operations\.js[^"']*["'][^>]*><\/script>/gi,'');
 html=html.replace(/<link\b[^>]*href=["'][^"']*zavi-v62-team-operations\.css[^"']*["'][^>]*>/gi,'');
 const last=html.toLowerCase().lastIndexOf('</body>');
 if(last<0)throw Error('ZAVI V63: HTML close not found');
 const tags='<link rel="stylesheet" href="./zavi-v63-team-operations.css?v=63.1">'
  +'<script src="./zavi-v63-team-operations.js?v=63.1" defer></script>';
 html=html.slice(0,last)+tags+html.slice(last);
 if(html.split('id="z63TeamMenu"').length!==2 || html.split('src="./zavi-v63-team-operations.js').length!==2){
   throw Error('ZAVI V63: missing persistent colleagues navigation/loader');
 }
 fs.writeFileSync(index,html,'utf8');
 const sw=path.join(web,'sw.js');
 if(fs.existsSync(sw)){
   let s=fs.readFileSync(sw,'utf8');
   s=s.replace(/const CACHE_NAME\s*=\s*['"][^'"]+['"]/, "const CACHE_NAME='zavi-one-v63-team-navigation-20261018'");
   s=s.replace(/const CORE\s*=\s*\[/,'const CORE=["zavi-v63-team-operations.css","zavi-v63-team-operations.js",');
   fs.writeFileSync(sw,s,'utf8');
 }
 console.log('ZAVI V63: permanent Daily Operations > Manage Colleagues (Add/Delete). No dashboard card.');
}
