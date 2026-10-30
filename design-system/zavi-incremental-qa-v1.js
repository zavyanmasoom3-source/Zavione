/* ZAVI ONE + ADMIN 2026-10-28: non-destructive, QA-only UI foundation.
   No changes to invoice, database, authentication, offline license or privileges. */
(()=>{'use strict';
 if(window.ZaviIncrementalQA)return;
 const APP=document.currentScript?.dataset?.zaviApp==='admin'?'admin':'one';
 const STORAGE='zavi_'+APP+'_incremental_prefs_v1';
 const locales=['fa-AF','ps-AF','en'];
 const L={ 'fa-AF':{language:'زبان',solar:'هجری شمسی',gregorian:'میلادی',motion:'کاهش انیمیشن'},
  'ps-AF':{language:'ژبه',solar:'هجري لمريز',gregorian:'میلادي',motion:'حرکتونه کمول'},
  en:{language:'Language',solar:'Solar Hijri',gregorian:'Gregorian',motion:'Reduce motion'}};
 const safeRead=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return {}}};
 const pref=safeRead();
 let locale=locales.includes(pref.locale)?pref.locale:'fa-AF';
 let reduceMotion=pref.reduceMotion===true;
 const dateFormat=(input=new Date())=>{
  const d=input instanceof Date?input:new Date(input);if(Number.isNaN(d.getTime()))return '';
  return {solar:new Intl.DateTimeFormat('fa-AF-u-ca-persian',{dateStyle:'medium',timeZone:'Asia/Kabul'}).format(d),
   gregorian:new Intl.DateTimeFormat(locale==='en'?'en-GB':'fa-AF-u-ca-gregory-nu-latn',
    {dateStyle:'medium',timeZone:'Asia/Kabul'}).format(d)};
 };
 function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({locale,reduceMotion}))}catch(_){}}
 function apply(){
  document.documentElement.dataset.zaviQaLocale=locale;
  document.documentElement.dataset.zaviQaReduceMotion=reduceMotion?'1':'0';
  if(document.documentElement.lang!=='en'&&document.documentElement.lang!=='ps-AF'&&document.documentElement.lang!=='fa-AF')return;
  document.documentElement.dir=locale==='en'?'ltr':'rtl';
 }
 function selectLocale(next){
  if(!locales.includes(next))return false;
  locale=next;persist();apply();
  const selectors=['#zaviSettingsLanguage','#zaviAdminLanguage','#zaviTopLanguage','#zaviGateLanguage','select[name="language"]'];
  for(const s of selectors){const el=document.querySelector(s);
   if(el&&String(el.value)!==next){const possibilities=next==='fa-AF'?['fa-AF','fa']:next==='ps-AF'?['ps-AF','ps']:['en','en-GB'];
    const v=possibilities.find(v=>[...el.options].some(o=>o.value===v));
    if(v){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));}
   }
  }
  document.dispatchEvent(new CustomEvent('zavi:qa-language',{detail:{locale,app:APP}}));return true;
 }
 const matchSelector='#zaviSettingsLanguage,#zaviAdminLanguage,#zaviTopLanguage,#zaviGateLanguage,select[name="language"]';
 document.addEventListener('change',e=>{
  const el=e.target;if(!el?.matches?.(matchSelector))return;
  const n=String(el.value||'').toLowerCase();
  const v=n.startsWith('en')?'en':n.startsWith('ps')?'ps-AF':'fa-AF';
  if(v!==locale){locale=v;persist();apply();}
 });
 function setReduceMotion(value){reduceMotion=value===true;persist();apply();return reduceMotion;}
 apply();
 window.ZaviIncrementalQA=Object.freeze({app:APP,locale:()=>locale,selectLocale,
  reduceMotion:()=>reduceMotion,setReduceMotion,formatDualDate:dateFormat,labels:()=>L[locale]});
})();