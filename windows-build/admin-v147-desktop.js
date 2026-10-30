/* ADMIN Desktop 1.4.7: display a recoverable loading error if the owner dashboard is blank.
 * No automatic data writes, no private log data, no replacement of server owner authorization. */
(()=>{'use strict';
document.documentElement.classList.add('zavi-admin-electron');
let faults=0;
function locale(){const l=String(document.documentElement.lang||'fa-AF').toLowerCase();return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa';}
const lang={
 fa:['صفحه مدیریت هنوز معلومات را نمایش نداده است.','با حساب مالک اصلی وارد شوید و اتصال ابری را بررسی کنید. در صورت نیاز دوباره بارگذاری کنید. اطلاعات موجود پاک نمی‌شوند.','تلاش دوباره'],
 ps:['د مدیریت معلومات لا نه دي ښکاره شوي.','د اصلي مالک حساب سره ننوځئ او کلاوډ اړیکه وګورئ. پخواني معلومات نه پاکېږي.','بیا هڅه وکړئ'],
 en:['The admin page has not loaded its information.','Sign in with the central owner account and check cloud connectivity. You can safely retry; existing records are not deleted.','Try again']
};
function check(){
 const app=document.getElementById('appScreen'),view=document.getElementById('view');
 if(!app||app.hidden||!view)return;
 const txt=String(view.textContent||'').trim();
 const present=txt.length>60;
 const old=view.querySelector('#zaviAdmin147Fallback');
 if(present&&faults<3){old?.remove();return;}
 if(old)return;
 const message=lang[locale()];
 const box=document.createElement('aside');box.id='zaviAdmin147Fallback';box.className='zavi-admin-desktop-alert';box.setAttribute('role','status');
 const h=document.createElement('strong');h.textContent=message[0];
 const p=document.createElement('p');p.textContent=message[1];
 const button=document.createElement('button');button.textContent=message[2];button.type='button';button.addEventListener('click',()=>location.reload());
 box.append(h,p,button);view.insertBefore(box,view.firstChild);
}
window.addEventListener('error',()=>{faults++;setTimeout(check,250)});
window.addEventListener('unhandledrejection',()=>{faults++;setTimeout(check,250)});
function start(){setTimeout(check,2800);setInterval(check,8000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();