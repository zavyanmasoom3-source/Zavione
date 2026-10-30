/* ZAVI ONE ADMIN V1.4.19: seven-day trial/renewal for chosen store.
   Sole write path: public.zavi_admin_grant_trial_7days with server-side billing-admin check.
   No financial/customer record mutations in browser, no preview/demo writes. */
(()=>{'use strict';
 const q=(s,p=document)=>p.querySelector(s);
 const words={
 fa:{title:'تمدید آزمایشی ۷ روزه',subtitle:'برای امتحان سیستم؛ رایگان، با تاریخ پایان مشخص. در صورت داشتن اشتراک فعال، ۷ روز به باقیماندۀ آن اضافه می‌شود.',btn:'ثبت ۷ روز آزمایشی',reason:'یادداشت اختیاری',hint:'برای مشتریانی که می‌خواهند قبل از خرید، سیستم را امتحان کنند.',confirm:'۷ روز به اشتراک همین فروشگاه اضافه شود؟',select:'ابتدا فروشگاه را انتخاب کنید.',locked:'فقط حساب واقعی مالک مرکزی می‌تواند مجوز صادر کند.',working:'در حال ثبت تمدید آزمایشی...',done:'تمدید ۷ روزه ثبت شد. پایان اعتبار: ',err:'مجوز ثبت نشد: ',life:'اشتراک دائمی نیاز به تمدید آزمایشی ندارد.',free:'رایگان • هزینه: ۰ افغانی'},
 en:{title:'7-day free trial',subtitle:'Free evaluation with a defined expiry. Adds 7 days to an existing subscription without losing remaining days.',btn:'Grant seven days',reason:'Optional internal note',hint:'For customers who want to test ZAVI ONE before purchasing.',confirm:'Add exactly seven days to this store’s subscription?',select:'Choose a store first.',locked:'Only the signed-in central owner may issue trials.',working:'Saving 7-day trial...',done:'Seven days added. Expires: ',err:'Trial not granted: ',life:'Lifetime access does not need trial extension.',free:'Cost: 0 AFN'},
 ps:{title:'۷ ورځنۍ ازمایښتي موده',subtitle:'وړیا ازموینه؛ د اعتبار وروستۍ نېټه ښکاره کېږي. د پاتې ګډون ورځې خوندي دي.',btn:'۷ ورځې ورکړئ',reason:'اختیاري یادښت',hint:'هغه پېرودونکو ته چې غواړي له پېرلو مخکې سیسټم وازمويي.',confirm:'دې دوکان ته ۷ ورځې ورزیاتې شي؟',select:'لومړی دوکان غوره کړئ.',locked:'یوازې مرکزي مالک دا اجازه ورکولای شي.',working:'۷ ورځې ثبتېږي...',done:'۷ ورځې ثبت شوې. تر دې نېټې: ',err:'جواز ثبت نه شو: ',life:'دایمي ګډون ته ازمایښتي موده نه پکارېږي.',free:'لګښت: ۰ افغانۍ'}
 };
 const lang=()=>{let v=(q('#zaviAdminLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return v.startsWith('en')?'en':v.startsWith('ps')?'ps':'fa'};
 const mk=(tag,cl,txt)=>{const e=document.createElement(tag);e.className=cl||'';e.textContent=txt||'';return e};
 let inflight=false;
 function install(){
  const overlay=q('#z70-overlay'), panel=q('#z70-overlay .z70-panel'),select=q('#z70-store');
  if(!overlay||!panel||!select||q('#z72-trial',panel))return;
  const w=words[lang()],section=mk('section','z72-trial','');section.id='z72-trial';
  const heading=mk('div','z72-trial-heading','');heading.append(mk('strong','',w.title),mk('small','',w.subtitle));
  const note=mk('input','z72-trial-note','');note.type='text';note.maxLength=500;note.placeholder=w.reason;
  const status=mk('p','z72-trial-status',w.hint);status.setAttribute('role','status');
  const actions=mk('div','z72-trial-actions','');const badge=mk('span','z72-trial-free',w.free);
  const button=mk('button','z72-trial-btn',w.btn);button.type='button';
  button.addEventListener('click',async()=>{
   if(inflight)return;
   const a=window.ZaviAdminAPI,ws=select.value,stores=a?.getRows?.()||[];
   if(!a||a.getMode?.()!=='live')return status.textContent=w.locked;
   if(!ws||!stores.some(x=>x.workspace_id===ws))return status.textContent=w.select;
   if(stores.find(x=>x.workspace_id===ws)?.plan==='lifetime')return status.textContent=w.life;
   if(!window.confirm(w.confirm))return;
   inflight=true;button.disabled=true;status.textContent=w.working;
   try{
    const result=await a.request('/rest/v1/rpc/zavi_admin_grant_trial_7days',
       {method:'POST',body:{p_workspace_id:ws,p_reason:note.value.trim()||'7 day free trial'}});
    if(!overlay.isConnected)return;
    const obj=Array.isArray(result)?result[0]:result;
    const date=obj?.expires_at&&Number.isFinite(new Date(obj.expires_at).getTime())?new Date(obj.expires_at).toLocaleDateString(lang()==='en'?'en-GB':'fa-AF'):'—';
    status.textContent=w.done+date;note.value='';
    window.dispatchEvent(new CustomEvent('zavi-admin-trial-granted',{detail:{workspace_id:ws}}));
    // Original remote rows are not overwritten; reload the actual workspace through admin's refresh route.
   }catch(e){status.textContent=w.err+(e?.message||String(e))}
   finally{inflight=false;button.disabled=false}
  });
  select.addEventListener('change',()=>{if(section.isConnected)status.textContent=w.hint});
  actions.append(badge,button);
  section.append(heading,note,status,actions);
  const info=q('#z70-info',panel);if(info)info.before(section);else panel.append(section);
  if(window.ZaviAdminAPI?.getMode?.()!=='live'){button.disabled=true;status.textContent=w.locked}
 }
 function start(){
  const root=q('#appScreen');if(!root)return;
  const observer=new MutationObserver(m=>{if(m.some(x=>Array.from(x.addedNodes).some(n=>n.nodeType===1&&(n.id==='z70-overlay'||n.querySelector?.('#z70-overlay')))))install()});
  observer.observe(root,{childList:true,subtree:false});
  install();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();