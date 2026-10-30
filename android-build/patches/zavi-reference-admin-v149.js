/* Visual-preview toolbar only. No billing, authorization, routes or data modifications. */
(function(){
 "use strict";
 function init(){
   const top=document.querySelector("#appScreen .top-actions");
   if(!top||top.querySelector(".zavi-ref-top-tools"))return;
   const bar=document.createElement("div");
   bar.className="zavi-ref-top-tools";
   bar.setAttribute("aria-label","حالت روشن و تیره");
   bar.innerHTML='<button type="button" data-zavi-theme-choice="light" title="حالت روشن">☀️</button>'+
     '<button type="button" data-zavi-theme-choice="dark" title="حالت تیره">🌙</button>';
   top.insertBefore(bar,top.firstChild);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
