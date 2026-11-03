/* ZAVI ONE V63.5 - optional local-only camera barcode scanning.
 * No network call or analytics. Existing invoice SKU validation remains the authority.
 * Camera is requested ONLY on a click and all tracks are stopped on exit.
 */
(()=>{'use strict';
 const messages={
  fa:{start:'اسکن با دوربین',close:'بستن دوربین',ready:'بارکد را در تصویر دوربین قرار دهید.',unavailable:'اسکن دوربینی در این مرورگر پشتیبانی نمی‌شود. از بارکدخوان یا ورود دستی استفاده کنید.',secure:'دوربین فقط از صفحه امن HTTPS یا برنامه نصب‌شده قابل استفاده است.',denied:'دسترسی دوربین فراهم نشد. اجازه دوربین را بررسی کنید یا کد را دستی وارد کنید.',wrong:'کد شناسایی‌شده معتبر نیست. بارکد را دوباره اسکن کنید.'},
  ps:{start:'د کمرې سکن',close:'کمره بنده کړئ',ready:'بارکوډ د کمرې مخې ته ونیسئ.',unavailable:'دا براوزر د کمرې سکن نه لري. بارکوډ یا لاسي کوډ وکاروئ.',secure:'کمره یوازې په خوندي HTTPS پاڼه کې کار کوي.',denied:'د کمرې اجازه نشته. کوډ په لاس ولیکئ.',wrong:'بارکوډ سم نه دی.'},
  en:{start:'Scan with camera',close:'Close camera',ready:'Hold the barcode in front of your camera.',unavailable:'Camera barcode scanning is unavailable in this browser. Use a scanner or enter the code manually.',secure:'Camera requires HTTPS or a secure installed application.',denied:'Camera access failed. Check camera permission or enter the code manually.',wrong:'The scanned barcode is invalid.'}
 };
 const msg=k=>(messages[document.documentElement.lang==='en'?'en':document.documentElement.lang==='ps-AF'?'ps':'fa'])[k];
 let active=false,stream=null,detector=null,view=null,raf=0,checking=false,lastScan='',lastTime=0,targetId='zaviBarcodeScan';
 const formats=['ean_13','ean_8','code_128','qr_code'];
 function notify(value){if(typeof window.toast==='function')window.toast(value);else window.alert(value)}
 function stop(){active=false;if(raf)cancelAnimationFrame(raf);raf=0;const s=stream;stream=null;if(s)for(const t of s.getTracks())try{t.stop()}catch(_){};if(view){view.remove();view=null;}detector=null;checking=false;}
 async function start(nextTarget='zaviBarcodeScan'){
  if(active)return;
  lastScan='';
  if(!['zaviBarcodeScan','zaviWarehouseScan','fld_sku'].includes(nextTarget))return;
  const input=document.getElementById(nextTarget);
  if(!input)return;
  targetId=nextTarget;
  if(!window.isSecureContext){notify(msg('secure'));return;}
  if(typeof window.BarcodeDetector!=='function'||!navigator.mediaDevices?.getUserMedia){notify(msg('unavailable'));return;}
  try{
   const supported=typeof BarcodeDetector.getSupportedFormats==='function'?await BarcodeDetector.getSupportedFormats():formats;
   const matching=formats.filter(f=>supported.includes(f));
   if(!matching.length){notify(msg('unavailable'));return;}
   detector=new BarcodeDetector({formats:matching});
   active=true;
   view=document.createElement('div');view.className='zavi-camera-panel';view.id='zaviCameraPanel';
   const close=document.createElement('button');close.type='button';close.className='btn subtle';close.textContent=msg('close');close.addEventListener('click',stop);
   const video=document.createElement('video');video.id='zaviCameraVideo';video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('aria-label',msg('ready'));
   const hint=document.createElement('p');hint.className='field-hint';hint.setAttribute('role','status');hint.textContent=msg('ready');
   view.append(close,video,hint);
   (input.closest('.zavi-barcode-box')||input.closest('.field')||input.parentElement).append(view);
   const obtained=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
   // User may have closed the invoice before permission was granted.
   if(!active||!input.isConnected||!view?.isConnected){for(const t of obtained.getTracks())t.stop();stop();return;}
   stream=obtained;video.srcObject=obtained;
   try{await video.play()}catch(_){};
   raf=requestAnimationFrame(loop);
  }catch(err){stop();if(err?.name!=='AbortError')notify(err?.name==='NotAllowedError'?msg('denied'):msg('denied'));}
 }
 async function loop(){
  if(!active)return;
  const input=document.getElementById(targetId),video=view?.querySelector('video');
  if(!input||!input.isConnected||!view?.isConnected||!video){stop();return;}
  const ts=performance.now();
  if(!checking&&ts-lastTime>=180&&video.readyState>=2){
   lastTime=ts;checking=true;
   try{
    const found=await detector.detect(video);
    if(!active||!view?.isConnected)return;
    for(const entry of found){
     const value=String(entry?.rawValue||'').trim();
     if(!value||value.length>70||/[\x00-\x1f\x7f]/.test(value))continue;
     // The camera stops immediately after a valid scan. Do not suppress scanning the same
     // physical barcode in a NEW session: repeated product sales must be possible.
     lastScan=value;
     stop();
     input.value=value;
     // Invoice and warehouse share existing catalog validation. Product form only fills SKU.
     input.dispatchEvent(new Event('input',{bubbles:true}));
     if(targetId!=='fld_sku')input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
     input.focus();return;
    }
   }catch(_){/* transient camera/video frame errors are expected */}
   finally{checking=false;}
  }
  if(active)raf=requestAnimationFrame(loop);
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-zavi-camera-open]')){event.preventDefault();start(event.target.closest('[data-zavi-camera-open]').getAttribute('data-zavi-camera-open')||'zaviBarcodeScan');}
  else if(active&&(event.target.closest('#closeModal,#cancelModal')||event.target.id==='backdrop'))stop();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 const mo=new MutationObserver(()=>{if(active&&(!view?.isConnected||!document.getElementById(targetId)))stop()});
 mo.observe(document.documentElement,{subtree:true,childList:true});
 window.ZaviCameraScan={start,stop};
})();
