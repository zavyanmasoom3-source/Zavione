/* Removes accidental source/debug text from visible app surfaces. */
(()=>{'use strict';
 const codeMarker=/(?:\bfunction\s+[A-Za-z_$][\w$]*\s*\(|\bconst\s+[A-Za-z_$][\w$]*\s*=|=>|\$\{[^}]+\}|\.innerHTML\s*=|escapeHtml\s*\(|querySelector\s*\(|document\.)/g;
 const isSourceText=(value)=>{
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if(text.length<40)return false;
  codeMarker.lastIndex=0;
  let hits=0; while(codeMarker.exec(text)&&hits<4)hits++;
  return hits>=2 || /(?:ZaviIndustryFocus|zaviBusinessTypeV\d+|No transactions recorded yet|function\s+zavi)/.test(text);
 };
 const scan=()=>{
  const root=document.getElementById('content')||document.body;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const bad=[];
  for(let n;(n=walk.nextNode());){
   const p=n.parentElement;
   if(!p||/SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE/.test(p.tagName))continue;
   if(isSourceText(n.nodeValue))bad.push({node:n,parent:p});
  }
  for(const {node,parent} of bad){
   if(!node.isConnected)continue;
   const marked=parent.closest('[data-source-debug],.source-debug,.debug-source,pre,code');
   if(marked){marked.replaceChildren();marked.setAttribute('data-zavi-source-leak','removed');continue}
   node.remove();
  }
 };
 const schedule=()=>{if(!window.__zaviSourceScan){window.__zaviSourceScan=1;queueMicrotask(()=>{window.__zaviSourceScan=0;scan()})}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
 window.ZaviPdfViewport=Object.assign(window.ZaviPdfViewport||{},{scan});
})();