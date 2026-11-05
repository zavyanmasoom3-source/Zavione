/* Offline local ZXing adapter. Runs entirely on-device, no CDN calls. */
import {BrowserMultiFormatReader} from '@zxing/browser';
window.ZaviZXingV6591=Object.freeze({
 async start(stream,video,onCode){
  const reader=new BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:170,delayBetweenScanSuccess:600});
  let stopped=false;
  const controls=await reader.decodeFromStream(stream,video,result=>{
   if(stopped||!result)return;
   const value=result.getText?.()||String(result.text||'');
   if(value)onCode(value);
  });
  return ()=>{stopped=true;try{controls.stop()}catch(_){}};
 },
 version:'6591-offline-zxing'
});
