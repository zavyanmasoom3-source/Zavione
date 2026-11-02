/* ZAVI warehouse locations V66.36: non-financial catalog metadata.
   No quantity mutation: stock remains exclusively in the accounting ledger. */
(function(){
'use strict';
var KEY='zavi.warehouse.locations.v1';
function read(){try{var v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return {}}}
function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch(e){return false}}
function clean(s){return String(s||'').trim().slice(0,100)}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function mount(){
 var root=document.getElementById('content');if(!root||!root.querySelector('.transaction-table')||!root.textContent.includes('گدام'))return;
 if(root.querySelector('#zavi-location-manager'))return;
 var products=(typeof db!=='undefined'&&db&&Array.isArray(db.products))?db.products:[];
 // Access the application's real product register only; never invent inventory quantities.
 if(!products.length)return;
 var box=document.createElement('section');box.id='zavi-location-manager';box.className='card';
 box.style.cssText='margin:14px 0;padding:18px;border-radius:18px';
 box.innerHTML='<h3>موقعیت محصولات در گدام</h3><p class="muted">گدام، بخش و الماری هر محصول را ثبت کنید. این بخش فقط موقعیت جنس را ذخیره می‌کند و موجودی حسابداری را تغییر نمی‌دهد.</p><div class="zavi-location-grid"><label>محصول<select id="zavi-loc-product"></select></label><label>نام گدام<input id="zavi-loc-warehouse" maxlength="100" placeholder="گدام مرکزی"></label><label>بخش / راهرو<input id="zavi-loc-zone" maxlength="100" placeholder="بخش A"></label><label>الماری / قفسه<input id="zavi-loc-shelf" maxlength="100" placeholder="قفسه ۱"></label></div><button type="button" class="btn primary" id="zavi-loc-save">ثبت موقعیت</button><div id="zavi-loc-status" role="status"></div><div class="zavi-loc-list" id="zavi-loc-list"></div>';
 var select=box.querySelector('#zavi-loc-product');
 products.forEach(function(p){var o=document.createElement('option');o.value=String(p.id);o.textContent=String(p.name||p.sku||p.id);select.appendChild(o)});
 function update(){
  var v=read(),p=select.value,x=v[p]||{};
  box.querySelector('#zavi-loc-warehouse').value=x.warehouse||'';
  box.querySelector('#zavi-loc-zone').value=x.zone||'';
  box.querySelector('#zavi-loc-shelf').value=x.shelf||'';
  box.querySelector('#zavi-loc-list').innerHTML=products.filter(function(p){return v[p.id]}).map(function(p){var a=v[p.id];return '<div class="zavi-loc-row"><strong>'+esc(p.name)+'</strong><span>'+esc(a.warehouse)+' · '+esc(a.zone)+' · '+esc(a.shelf)+'</span></div>'}).join('')||'<p class="muted">هنوز موقعیت محصولی ثبت نشده است.</p>';
 }
 select.addEventListener('change',update);
 box.querySelector('#zavi-loc-save').addEventListener('click',function(){
  var id=select.value;if(!id)return;
  var v=read();v[id]={warehouse:clean(box.querySelector('#zavi-loc-warehouse').value),zone:clean(box.querySelector('#zavi-loc-zone').value),shelf:clean(box.querySelector('#zavi-loc-shelf').value)};
  box.querySelector('#zavi-loc-status').textContent=save(v)?'موقعیت محصول ذخیره شد.':'ذخیره انجام نشد؛ فضای ذخیره‌سازی را بررسی کنید.';update();
 });
 var scanner=root.querySelector('.z638-warehouse-scanner');
 if(scanner)scanner.insertAdjacentElement('afterend',box);else root.prepend(box);
 update();
}
var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;mount()})}
function init(){schedule();new MutationObserver(schedule).observe(document.getElementById('content')||document.body,{childList:true,subtree:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();