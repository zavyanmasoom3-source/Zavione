/* Bundle at build-time with esbuild and @zxing/browser 0.2.1; works offline. */
import {BrowserMultiFormatReader} from '@zxing/browser';
const make=()=>new BrowserMultiFormatReader(undefined,{
 delayBetweenScanAttempts:170,
 delayBetweenScanSuccess:600
});
window.ZaviZXingV6591=Object.freeze({
 async start(stream,video,onCode){
   const reader=make();
   let stopped=false;
   const controls=await reader.decodeFromStream(stream,video,(result)=>{
     if(!stopped && result){
       const value=result.getText?.()||String(result.text||'');
       if(value) onCode(value);
     }
   });
   return ()=>{stopped=true;try{controls?.stop()}catch(_){}};
 },
 version:'6591-offline-zxing'
});
