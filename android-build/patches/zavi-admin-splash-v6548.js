/* ZAVI ONE ADMIN branded splash restored on launch and successful login. */
(function(){'use strict';
var lastHidden=true,hideTimer=null;
function splash(){
 var el=document.getElementById('zaviAdminSplash');if(!el)return;
 clearTimeout(hideTimer);el.classList.remove('is-hidden');el.style.setProperty('display','grid','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');el.style.setProperty('z-index','2147483000','important');el.style.pointerEvents='auto';
 el.setAttribute('aria-hidden','false');
 var img=el.querySelector('img');if(img){img.onerror=function(){img.onerror=null;img.src='./icon.png'};}
 hideTimer=setTimeout(function(){el.classList.add('is-hidden');el.style.setProperty('opacity','0','important');el.style.setProperty('visibility','hidden','important');el.style.pointerEvents='none';el.setAttribute('aria-hidden','true')},window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches?450:1500);
}
function init(){
 var el=document.getElementById('zaviAdminSplash'),app=document.getElementById('appScreen');
 if(!el||!app)return;
 var style=document.createElement('style');style.id='zaviSplashReturn6548';
 style.textContent='#zaviAdminSplash .splash-content strong{color:#fff!important;font-size:clamp(25px,7vw,45px)!important;direction:ltr!important}#zaviAdminSplash .splash-content strong em{color:#1de0ef!important}#zaviAdminSplash .splash-content img{max-width:130px;width:29vw;border-radius:24px}#zaviAdminSplash .splash-progress i{animation:adminLoad 1.2s ease forwards}';
 document.head.appendChild(style);
 lastHidden=app.hidden;
 new MutationObserver(function(){var hidden=app.hidden;if(lastHidden&&!hidden)splash();lastHidden=hidden}).observe(app,{attributes:true,attributeFilter:['hidden']});
 splash();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();