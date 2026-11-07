/* Removes accidental source/debug text from visible app surfaces. */
(()=>{'use strict';
 const source=/document\\.body\\.appendChild|function\\s+renderDashboard|ZaviIndustryFocus|querySelector\\(['"][#.]z\\d+/;
 const scan=()=>{
  const root=document.getElementById('content')||document.body;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const bad=[];
  for(let n;(n=walk.nextNode());){
   const p=n.parentElement;if(!p||/SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE/.test(p.tagName))continue;
   if(source.test(n.nodeValue||''))bad.push(p);
  }
  for(const el of bad){
   const host=el.closest('pre,code,[data-source-debug],.source-debug,.debug-source')||el;
   if(host===root)continue;
   host.replaceChildren();
   host.setAttribute('data-zavi-source-leak','removed');
   host.classList.add('zavi-source-leak-removed');
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 new MutationObserver(()=>scan()).observe(document.body,{subtree:true,childList:true});
 window.ZaviPdfViewport={scan};
})();