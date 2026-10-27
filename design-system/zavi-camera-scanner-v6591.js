/* ZAVI ONE 65.91: real iPad Safari + Windows camera barcode scanner.
 * Offline ZXing bundle is local; preserves existing SKU/form input/Enter handlers.
 * No storage, transaction, network, prices, or permission changes.
 */
(()=>{'use strict';
const dict={
 fa:{start:'اسکن بارکد با دوربین',close:'بستن دوربین',ready:'بارکد را مقابل دوربین قرار دهید.',secure:'برای استفاده از دوربین، برنامه باید با HTTPS یا از برنامه نصب‌شده اجرا شود.',unavailable:'دوربین این دستگاه در دسترس نیست. از بارکدخوان یا ورود دستی استفاده کنید.',denied:'اجازه دوربین داده نشد. اجازه Camera را در تنظیمات دستگاه فعال کنید.',retry:'دوربین متوقف شد. دوباره تلاش کنید.',label:'اسکن بارکد',hint:'اسکن خودکار کدهای EAN، Code 128 و QR · بدون اینترنت'},
 ps:{start:'په کمره بارکوډ سکن',close:'کمره بندول',ready:'بارکوډ د کمرې مخې ته ونیسئ.',secure:'کمره HTTPS یا نصب شوی اپ غواړي.',unavailable:'په دې وسیله کمره نشته. بارکوډ په لاس ولیکئ.',denied:'کمرې ته اجازه نه ده ورکړل شوې.',retry:'کمره بنده شوه. بیا هڅه وکړئ.',label:'د بارکوډ سکن',hint:'EAN، Code 128 او QR · بې له انټرنېټه'},
 en:{start:'Scan barcode with camera',close:'Close camera',ready:'Point the camera at the barcode.',secure:'Camera requires HTTPS or a secure installed app.',unavailable:'Camera not available. Enter the code or use a USB barcode reader.',denied:'Camera permission denied. Allow Camera in your device settings.',retry:'Camera stopped. Please try again.',label:'Barcode scanning',hint:'EAN, Code 128 and QR · Works offline'}
};
const targetIds=new Set(['zaviBarcodeScan','zaviWarehouseScan','fld_sku']);
let state=null,serial=0,raf=0;
function t(){const l=(document.querySelector('#zaviTopLanguage')?.value||document.documentElement.lang||'fa').toLowerCase();return dict[l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa']}
function say(value){if(typeof window.toast==='function')window.toast(value);else {const elem=document.getElementById('zaviScanStatus');if(elem)elem.textContent=value;else window.alert(value)}}
function stop(){
 ++serial;
 const s=state;state=null;
 if(raf)cancelAnimationFrame(raf);raf=0;
 if(!s)return;
 try{s.cancel?.()}catch(_){}
 try{s.stream?.getTracks().forEach(track=>track.stop())}catch(_){}
 try{if(s.video){s.video.pause();s.video.srcObject=null}}catch(_){}
 try{s.panel?.remove()}catch(_){}
}
function success(value,token){
 value=String(value||'').trim();
 if(token!==serial||!state||!value||value.length>70||/[\x00-\x1f\x7f]/.test(value))return;
 const id=state.id;
 const input=document.getElementById(id);
 if(!input||!input.isConnected){stop();return}
 stop();
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
 if(id!=='fld_sku')input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 input.focus({preventScroll:true});
}
async function loopNative(token){
 if(!state||token!==serial)return;
 const s=state;
 if(!s.input?.isConnected||!s.panel?.isConnected){stop();return}
 if(s.video.readyState>=2 && !s.checking){
  s.checking=true;
  try{
   const results=await s.detector.detect(s.video);
   if(token===serial&&results?.length)success(results[0].rawValue,token);
  }catch(e){s.failures=(s.failures||0)+1;if(s.failures>12){s.detector=null;try{s.cancel=await window.ZaviZXingV6591.start(s.stream,s.video,v=>success(v,token))}catch(_){stop();say(t().retry)}}}
  finally{if(state===s)s.checking=false}
 }
 if(state===s&&s.detector)raf=setTimeout(()=>{raf=requestAnimationFrame(()=>loopNative(token))},160);
}
function markup(s){
 const l=t();
 const panel=document.createElement('section');
 panel.id='zaviCameraPanel';panel.className='zavi-camera-panel zavi-camera-v6591';
 panel.setAttribute('aria-label',l.label);
 const header=document.createElement('header');header.className='zavi-camera-head';
 const title=document.createElement('strong');title.textContent=l.start;
 const close=document.createElement('button');close.type='button';close.className='zavi-camera-close';close.textContent='×';close.setAttribute('aria-label',l.close);close.addEventListener('click',stop);
 header.append(title,close);
 const area=document.createElement('div');area.className='zavi-camera-preview';
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('aria-label',l.ready);
 const frame=document.createElement('span');frame.className='zavi-camera-target';frame.setAttribute('aria-hidden','true');
 area.append(video,frame);
 const status=document.createElement('p');status.id='zaviScanStatus';status.className='zavi-camera-hint';status.setAttribute('role','status');status.textContent=l.ready;
 const footer=document.createElement('small');footer.className='zavi-camera-footer';footer.textContent=l.hint;
 panel.append(header,area,status,footer);
 s.video=video;s.panel=panel;
 s.input.closest('.zavi-barcode-box')?.append(panel)||
 s.input.closest('.field')?.append(panel)||
 s.input.parentElement.append(panel);
}
async function start(id='zaviBarcodeScan'){
 if(!targetIds.has(id))return;
 const input=document.getElementById(id);
 if(!input){say(t().unavailable);return}
 stop();
 const token=serial;
 if(!window.isSecureContext){say(t().secure);return}
 if(!navigator.mediaDevices?.getUserMedia){say(t().unavailable);return}
 const s={id,input,video:null,panel:null,stream:null,cancel:null,detector:null,checking:false};
 state=s;
 markup(s);
 try{
  // Must start getUserMedia during the actual click; Safari requires user activation.
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  if(token!==serial||state!==s||!input.isConnected){stream.getTracks().forEach(tr=>tr.stop());return}
  s.stream=stream;
  s.video.srcObject=stream;
  await s.video.play();
  if(token!==serial||state!==s)return;
  if(typeof window.BarcodeDetector==='function'){
   try{
    const preferred=['ean_13','ean_8','code_128','qr_code','upc_a','code_39'];
    const available=typeof window.BarcodeDetector.getSupportedFormats==='function'?await window.BarcodeDetector.getSupportedFormats():preferred;
    const formats=preferred.filter(x=>available.includes(x));
    if(formats.length)s.detector=new window.BarcodeDetector({formats});
   }catch(_){s.detector=null}
  }
  if(s.detector){loopNative(token)}
  else if(window.ZaviZXingV6591?.start){
   s.cancel=await window.ZaviZXingV6591.start(stream,s.video,value=>success(value,token));
   if(token!==serial||state!==s){s.cancel?.();return}
  }else{stop();say(t().unavailable)}
 }catch(error){
  if(token!==serial)return;
  stop();
  const denied=['NotAllowedError','PermissionDeniedError','SecurityError'].includes(error?.name);
  say(denied?t().denied:t().retry);
 }
}
document.addEventListener('click',e=>{
 const open=e.target.closest('[data-zavi-camera-open]');
 if(open){e.preventDefault();start(open.getAttribute('data-zavi-camera-open')||'zaviBarcodeScan');return}
 if(state&&(e.target.closest('#closeModal,#cancelModal')||e.target.id==='backdrop'))stop()
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('pagehide',stop);
window.ZaviCameraScan={start,stop};
})();
