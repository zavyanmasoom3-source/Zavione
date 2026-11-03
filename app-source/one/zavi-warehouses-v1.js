/* Server-backed warehouse catalog for the original owner, no synthetic local stock. */
(function(){'use strict';
var ID='zaviWarehouseManagerV1', rows=[], activeWorkspace='', requestNo=0, busy=false;
function tr(fa,ps,en){var l=document.documentElement.lang||'fa-AF';return l==='en'?en:l.indexOf('ps')===0?ps:fa}
function owner(){
 var s=window.zaviCloudRestoreInfo&&window.zaviCloudRestoreInfo(),c=window.zaviCloudGetPublicConfig&&window.zaviCloudGetPublicConfig();
 if(!s||s.role!=='owner'||!s.workspace||!c||!/^https:\/\/[a-z0-9.-]+$/i.test(c.url||'')||!c.key)return null;
 return {id:s.workspace,url:c.url,key:c.key}
}
async function rest(path,method,body){
 var c=owner();if(!c)throw Error(tr('حساب مالک ابری فعال نیست.','د مالک کلاوډ حساب فعال نه دی.','Cloud owner account is not active.'));
 var a=window.zaviCloudRefreshAuthSession&&await window.zaviCloudRefreshAuthSession();
 if(!a||!a.access_token||owner()?.id!==c.id)throw Error(tr('نشست حساب تغییر کرد.','د حساب ناسته بدله شوه.','Account session changed.'));
 var h={apikey:c.key,Authorization:'Bearer '+a.access_token};
 if(body) {h['Content-Type']='application/json';h.Prefer='return=representation'}
 var response=await fetch(c.url+path,{method:method||'GET',headers:h,body:body?JSON.stringify(body):undefined});
 var data;try{data=await response.json()}catch(e){}
 if(!response.ok)throw Error(response.status===401||response.status===403?tr('دسترسی گدام تأیید نشد.','د ګدام لاسرسی رد شو.','Warehouse access denied.'):response.status===409?tr('کود گدام تکراری است.','د ګدام کوډ تکراري دی.','Warehouse code already exists.'):(data&&data.message)||tr('خطای سرور.','د سرور تېروتنه.','Server error.'));
 if(owner()?.id!==c.id)throw Error(tr('فروشگاه تغییر کرد.','پلورنځی بدل شو.','Store changed.'));
 return data
}
function panel(){
 return '<section class="card zv-wh-manager" id="'+ID+'"><header class="zv-wh-head"><h3>'+tr('گدام‌های مستقل','جلا ګدامونه','Separate warehouses')+'</h3><button type="button" class="btn subtle" data-wh-refresh>'+tr('تازه‌سازی','نوی کول','Refresh')+'</button></header>'+
 '<p class="zv-wh-note">'+tr('گدام‌ها روی سرور ثبت می‌شوند؛ موجودی فاکتورهای قبلی هنوز جداگانه است.','ګدامونه په سرور کې ثبتېږي؛ د پخوانیو رسیدونو موجودي لا بېله ده.','Warehouses are stored on the server; existing invoice stock is still separate.')+'</p>'+
 '<div class="zv-wh-status" role="status" aria-live="polite"></div><form data-wh-add class="zv-wh-form"><label>'+tr('نام گدام','د ګدام نوم','Warehouse name')+'<input name="warehouse_name" maxlength="90" required autocomplete="off"></label><label>'+tr('کود گدام','د ګدام کوډ','Warehouse code')+'<input name="warehouse_code" maxlength="32" required dir="ltr" autocomplete="off"></label><button class="btn primary" type="submit">'+tr('افزودن گدام','ګدام زیاتول','Add warehouse')+'</button></form><div class="zv-wh-list"></div></section>'
}
function message(box,msg){var el=box.querySelector('.zv-wh-status');if(el)el.textContent=msg}
function element(tag,className,text){var e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e}
function draw(box){
 var el=box.querySelector('.zv-wh-list');if(!el)return;el.replaceChildren();
 if(!rows.length){el.appendChild(element('p','zv-wh-note',tr('هنوز گدامی ثبت نشده است.','تر اوسه ګدام نشته.','No warehouses yet.')));return}
 rows.forEach(function(w){
  var row=element('div','zv-wh-row'),name=element('strong','',w.name),code=element('small','',w.code),status=element('span','',w.is_active?tr('فعال','فعال','Active'):tr('غیرفعال','غیرفعال','Inactive')),button=element('button','btn tiny subtle',w.is_active?tr('غیرفعال‌سازی','غیرفعالول','Deactivate'):tr('فعال‌سازی','فعالول','Activate'));
  button.type='button';button.dataset.whToggle=w.id;button.dataset.whState=String(!w.is_active);
  row.append(name,code,status,button);el.appendChild(row)
 })
}
async function refresh(box){
 box=box||document.getElementById(ID);if(!box)return;
 var ticket=++requestNo,c=owner(),form=box.querySelector('[data-wh-add]');
 if(!c){rows=[];activeWorkspace='';if(form)form.hidden=true;draw(box);message(box,tr('برای افزودن گدام، وارد حساب ابری مالک شوید.','د ګدام لپاره د مالک کلاوډ حساب ته ننوځئ.','Sign in as cloud owner to manage warehouses.'));return}
 activeWorkspace=c.id;if(form)form.hidden=false;message(box,tr('دریافت از سرور…','له سرور څخه ترلاسه کېږي…','Loading from server…'));
 try{
  var data=await rest('/rest/v1/zavi_warehouses?select=id,name,code,is_active,workspace_id&workspace_id=eq.'+encodeURIComponent(c.id)+'&order=created_at.asc','GET');
  if(ticket!==requestNo||!box.isConnected||activeWorkspace!==c.id)return;
  rows=Array.isArray(data)?data:[];draw(box);message(box,tr('از دیتابیس دریافت شد.','له ډیټابېس څخه ترلاسه شول.','Loaded from database.'))
 }catch(e){if(ticket!==requestNo||!box.isConnected)return;rows=[];draw(box);message(box,e.message)}
}
async function mutate(box,path,method,data){
 if(busy||!box)return;busy=true;box.querySelectorAll('input,button').forEach(function(x){x.disabled=true});
 try{await rest(path,method,data);await refresh(box);return true}
 catch(e){message(box,e.message);return false}
 finally{busy=false;box.querySelectorAll('input,button').forEach(function(x){x.disabled=false})}
}
document.addEventListener('submit',function(e){
 var form=e.target;if(!form.matches||!form.matches('[data-wh-add]'))return;e.preventDefault();
 var box=form.closest('#'+ID),c=owner();if(!box||!c)return;
 var name=form.elements.warehouse_name.value.trim(),code=form.elements.warehouse_code.value.trim().toUpperCase();
 if(!name||name.length>90||!/^[A-Z0-9_-]{1,32}$/.test(code)){message(box,tr('نام یا کود نامعتبر است.','نوم یا کوډ ناسم دی.','Invalid name or code.'));return}
 mutate(box,'/rest/v1/zavi_warehouses','POST',{workspace_id:c.id,name:name,code:code}).then(function(ok){if(ok&&box.isConnected)form.reset()})
});
document.addEventListener('click',function(e){
 var button=e.target.closest&&e.target.closest('[data-wh-refresh],[data-wh-toggle]');if(!button)return;
 var box=button.closest('#'+ID);if(!box)return;
 if(button.hasAttribute('data-wh-refresh')){refresh(box);return}
 var id=button.dataset.whToggle,record=rows.find(function(x){return x.id===id});
 if(!record||!owner()||owner().id!==activeWorkspace)return;
 mutate(box,'/rest/v1/zavi_warehouses?id=eq.'+encodeURIComponent(id)+'&workspace_id=eq.'+encodeURIComponent(activeWorkspace),'PATCH',{is_active:button.dataset.whState==='true'})
});
window.ZaviWarehouseV1={panel:panel,afterRender:function(){refresh()},refresh:refresh};
})();