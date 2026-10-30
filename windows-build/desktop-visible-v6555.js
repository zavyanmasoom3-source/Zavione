/* Windows-only storefront assist: expose true empty-state and rendering errors; never modifies accounting records. */
(function(){
'use strict';
document.documentElement.classList.add('zavi-win-visible');
const id='zavi-windows-desktop-guide';
let errorCount=0,lastError='';
window.addEventListener('error',e=>{errorCount++;lastError=String(e.message||'Page rendering issue').slice(0,170);update();});
window.addEventListener('unhandledrejection',e=>{errorCount++;lastError=String(e.reason?.message||e.reason||'Background request failed').slice(0,170);update();});
function locale(){const s=String(document.documentElement.lang||'fa-AF').toLowerCase();return s.startsWith('en')?'en':s.startsWith('ps')?'ps':'fa';}
const T={
 fa:{empty:'این نصب کامپیوتر هنوز معلومات محلی ندارد.',hint:'اگر قبلاً در موبایل یا وب حساب ابری دارید، از بخش تنظیمات با همان حساب وارد شوید و همگام‌سازی را بررسی کنید. نصب جدید به‌طور خودکار اطلاعات مرورگر قدیمی را منتقل نمی‌کند.',btn:'بازکردن تنظیمات و حساب ابری',retry:'تلاش دوباره',error:'بخشی از صفحه به‌درستی بارگذاری نشده است.',detail:'فایل‌های برنامه یا اتصال را بررسی کنید. اطلاعات موجود پاک نمی‌شوند.'},
 ps:{empty:'په دې کمپیوټر کې لا ځايي معلومات نشته.',hint:'که په موبایل یا ویب کې مو کلاوډ حساب وي، له تنظیماتو هماغه حساب ته ننوځئ او همغږي تایید کړئ. نوې نصبونه پخواني ځايي معلومات په خپله نه لېږدوي.',btn:'تنظیمات او کلاوډ حساب',retry:'بیا هڅه وکړئ',error:'د پاڼې یوه برخه سمه نه ده پرانیستل شوې.',detail:'د پروګرام فایلونه یا اړیکه وګورئ. موجود معلومات نه پاکېږي.'},
 en:{empty:'There is no local store data on this computer yet.',hint:'If you already have cloud data on mobile or web, sign in with the same cloud account under Settings and check sync. A new desktop install cannot automatically import another browser’s local storage.',btn:'Open Settings / Cloud',retry:'Reload safely',error:'A part of this page failed to load.',detail:'Check the app files and connectivity. Existing records are not deleted.'}
};
function getDb(){try{return typeof db!=='undefined'&&db&&typeof db==='object'?db:null}catch{return null}}
function dataEmpty(){const v=getDb();return v&&['products','tx','contacts','accounts'].every(k=>Array.isArray(v[k]))&&v.products.length===0&&v.tx.length===0&&v.contacts.length===0;}
function docRoot(){return document.querySelector('#content');}
function go(){let b=document.querySelector('[data-go="settings"]');if(b){b.click();return}let nav=document.querySelector('.nav-btn[data-go="settings"]');if(nav)nav.click();}
function update(){
 const root=docRoot();if(!root||document.documentElement.classList.contains('zawi-locked'))return;
 const t=T[locale()],hasContent=String(root.innerText||'').trim().length>65;
 const isEmpty=dataEmpty(),showEmpty=Boolean(isEmpty),isError=errorCount>0&&(!hasContent||errorCount>=4);
 let notice=root.querySelector('#'+id);
 if(!showEmpty&&!isError){notice?.remove();return;}
 if(!notice){notice=document.createElement('aside');notice.id=id;notice.className='zavi-win-help';notice.setAttribute('role','status');const first=root.firstElementChild; if(first?.classList.contains('welcome'))first.insertAdjacentElement('afterend',notice);else root.insertBefore(notice,root.firstChild);}
 notice.classList.toggle('zavi-win-error',isError);
 notice.replaceChildren();
 const title=document.createElement('strong');title.textContent=isError?t.error:t.empty;
 const info=document.createElement('p');info.textContent=isError?t.detail:t.hint;
 const action=document.createElement('button');action.type='button';action.textContent=isError?t.retry:t.btn;
 action.addEventListener('click',()=>{if(isError)location.reload();else go()});
 notice.append(title,info,action);
}
function start(){update();document.addEventListener('click',()=>setTimeout(update,350));setInterval(update,5000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();