/* ZAVI ONE V65.28 - pure payables and ISO currency helpers.
   No ledger writes or automatic FX rates. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ZaviCreditors6528=api})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const popular=[['AFN','افغانی'],['USD','دالر امریکا'],['EUR','یورو'],['PKR','روپیه پاکستان'],['IRR','ریال ایران'],['CNY','یوان چین'],['GBP','پوند انگلیس'],['AED','درهم امارات'],['SAR','ریال سعودی'],['INR','روپیه هند'],['TRY','لیره ترکیه'],['CAD','دالر کانادا'],['AUD','دالر استرالیا'],['JPY','ین جاپان'],['CHF','فرانک سویس'],['RUB','روبل روسیه'],['QAR','ریال قطر'],['KWD','دینار کویت'],['BHD','دینار بحرین'],['OMR','ریال عمان']];
 // ISO 4217 current-currency/fund fallback for offline and older Android WebView engines (2026 baseline).
 const iso4217Fallback='AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD USN UYI UYU UYW UZS VND VUV WST XAD XAF XAG XAU XBA XBB XBC XBD XCD XCG XDR XOF XPD XPF XPT XSU XTS XUA XXX YER ZAR ZMW ZWG'.split(' ');
 function currencies(base='AFN'){
  let runtime=[];try{runtime=Intl.supportedValuesOf('currency')}catch(_){runtime=[]}
  const known=new Map(popular.map(([k,v])=>[k,v]));
  const baseCode=String(base||'AFN').toUpperCase();
  const retired=new Set(['ANG','BGN','CUC','HRK','MRO','SLL','STD','VEF','ZWL']);
  let codes=[...new Set([...iso4217Fallback,...runtime,...popular.map(x=>x[0]),baseCode])].filter(code=>/^[A-Z]{3}$/.test(code)&&(!retired.has(code)||code===baseCode));
  let titles;try{titles=new Intl.DisplayNames(['fa-AF','en'],{type:'currency'})}catch(_){titles=null}
  const main=popular.map(([code,label])=>[code,label+' ('+code+')']);
  const other=codes.filter(code=>!known.has(code)).sort().map(code=>[code,code+' — '+String(titles?.of(code)||code)]);
  return main.concat(other);
 }
 function positiveAmount(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)return null;return Math.round(n*100)/100}
 function positiveRate(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null}
 function convert(original,rate){const amount=positiveAmount(original),r=positiveRate(rate);if(amount===null||r===null)return null;const value=amount*r;return Number.isFinite(value)&&value>0&&value<1e13?Math.round(value*100)/100:null}
 function totals(contact,transactions){
  const opening=Number(contact?.openingPayable)||0;let added=0,paid=0;
  for(const t of transactions||[]){if(t.voided||t.contactId!==contact?.id)continue;
   let value=Number(t.amount)||0;
   if(t.type==='purchase'||t.type==='purchase_return'){
     let subtotal=Number(t.total);
     if(!Number.isFinite(subtotal)){
       subtotal=Array.isArray(t.items)?t.items.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0):value;
       subtotal+=Number(t.shipping)||0;subtotal-=Number(t.discount)||0;
     }
     value=Math.max(0,subtotal-(Number(t.paid)||0));
   }
   if(['supplier_debt','creditor_loan','purchase'].includes(t.type))added+=value;
   if(['supplier_payment','purchase_return'].includes(t.type))paid+=value;
  }
  const round=n=>Math.round(n*100)/100;
  return {opening:round(opening),added:round(added),paid:round(paid),remaining:round(opening+added-paid)};
 }
 function isCurrency(code,base='AFN'){const c=String(code||'').trim().toUpperCase();return currencies(base).some(([id])=>id===c)}
 return Object.freeze({currencies,isCurrency,positiveAmount,positiveRate,convert,totals});
});
