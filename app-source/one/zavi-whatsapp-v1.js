/* ZAVI ONE WhatsApp sharing.
 * Prepares local text/links only; never sends automatically and never mutates accounting.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ZaviWhatsappV1=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩';
 const lang=()=>{const l=String(root?.document?.documentElement?.lang||'fa-AF').toLowerCase();return l.startsWith('en')?'en':l.startsWith('ps')?'ps':'fa'};
 const pick=(faText,psText,enText)=>({fa:faText,ps:psText,en:enText})[lang()]||faText;
 function digits(value){
  let s=String(value??'').trim().replace(/[۰-۹]/g,c=>String(fa.indexOf(c))).replace(/[٠-٩]/g,c=>String(ar.indexOf(c)));
  s=s.replace(/[\s().-]/g,'');
  if(s.startsWith('+'))s=s.slice(1);
  else if(s.startsWith('00'))s=s.slice(2);
  else if(/^0[0-9]{9}$/.test(s))s='93'+s.slice(1);
  return /^[1-9][0-9]{7,14}$/.test(s)?s:'';
 }
 function links(phone,message){
  const recipient=digits(phone),encoded=encodeURIComponent(String(message??'').slice(0,3500));
  return Object.freeze({
   recipient,valid:!!recipient,
   personal:recipient?'https://wa.me/'+recipient+'?text='+encoded:'https://wa.me/?text='+encoded,
   business:recipient?'https://api.whatsapp.com/send?phone='+recipient+'&text='+encoded:'https://api.whatsapp.com/send?text='+encoded
  });
 }
 function invoice(data){
  const d=data||{};
  if(lang()==='en')return [
   d.storeName||'Store','Invoice: '+(d.code||''),'Customer: '+(d.customer||''),'Date: '+(d.date||''),
   'Total: '+(d.total||''),'Paid: '+(d.paid||''),'Balance: '+(d.balance||''),'Thank you for your purchase.'
  ].join('\n');
  if(lang()==='ps')return [
   d.storeName||'دوکان','بل: '+(d.code||''),'پېرودونکی: '+(d.customer||''),'نېټه: '+(d.date||''),
   'ټول: '+(d.total||''),'ورکړل شوي: '+(d.paid||''),'پاتې: '+(d.balance||''),'ستاسو له پېرود څخه مننه.'
  ].join('\n');
  return [
   d.storeName||'فروشگاه','فاکتور: '+(d.code||''),'مشتری: '+(d.customer||''),'تاریخ: '+(d.date||''),
   'مبلغ: '+(d.total||''),'پرداخت: '+(d.paid||''),'مانده: '+(d.balance||''),'تشکر از خرید شما.'
  ].join('\n');
 }
 function statement(data){
  const d=data||{},name=d.customer||pick('مشتری','پېرودونکی','Customer'),store=d.storeName||pick('فروشگاه','دوکان','Store');
  if(lang()==='en')return [
   'Hello '+name+',','Your balance with '+store+' as of '+(d.date||'today')+': '+(d.balance||'—')+'.',
   ...(d.reminderDate?['Payment reminder date: '+d.reminderDate+'.']:[]),'If you have already paid, please let us know. Thank you.'
  ].join('\n');
  if(lang()==='ps')return [
   'سلام '+name+'،','ستاسو پاتې حساب له '+store+' سره'+(d.date?' تر '+d.date:'')+': '+(d.balance||'—')+'.',
   ...(d.reminderDate?['د تادیې د یادونې نېټه: '+d.reminderDate+'.']:[]),'که مو تادیه کړې وي، مهرباني وکړئ خبر راکړئ. مننه.'
  ].join('\n');
  return [
   'سلام '+name+' عزیز،','مانده حساب شما نزد '+store+(d.date?' تا '+d.date:'')+': '+(d.balance||'—')+'.',
   ...(d.reminderDate?['تاریخ وعده: '+d.reminderDate]:[]),'اگر پرداخت کرده‌اید، لطفاً اطلاع بدهید. تشکر.'
  ].join('\n');
 }
 function templates(data){
  const d=data||{},name=String(d.customer||pick('مشتری','پېرودونکی','Customer')).trim()||pick('مشتری','پېرودونکی','Customer'),
    store=String(d.storeName||pick('فروشگاه','دوکان','Store')).trim()||pick('فروشگاه','دوکان','Store'),
    balance=String(d.balance||'—'),date=String(d.date||''),paid=String(d.lastPayment||''),reminder=String(d.reminderDate||'');
  let rows;
  if(lang()==='en'){
   rows=[
    ['debt_reminder','Debt reminder',['Hello '+name+',','A friendly reminder from '+store+': your balance is '+balance+(date?' as of '+date:'')+'.',reminder?'Payment reminder date: '+reminder+'.':'','If you have already paid, please let us know. Thank you.'].filter(Boolean).join('\n')],
    ['account_summary','Account summary',['Hello '+name+',','Your account summary with '+store+(date?' as of '+date:'')+':','Balance: '+balance+'.','Contact us if you need the detailed statement.'].join('\n')],
    ['payment_thanks','Payment thanks',['Hello '+name+',',paid?'We received your payment of '+paid+'.':'We received your payment.','Thank you for your trust in '+store+'.'].join('\n')],
    ['settlement_request','Settlement request',['Dear '+name+',','Please settle the remaining balance of '+balance+' with '+store+' when convenient.','If you have already paid, please send the receipt or confirmation. Thank you.'].join('\n')],
    ['friendly','Friendly greeting',['Hi '+name+',','Hope you are doing well. Best wishes from '+store+'.'].join('\n')],
    ['formal','Formal message',['Dear '+name+',','This message is from '+store+' regarding your account and business communication.','Thank you for your cooperation.'].join('\n')],
    ['short','Short message',['Hello '+name+',','Balance: '+balance+'.','Thank you — '+store].join('\n')]
   ];
  }else if(lang()==='ps'){
   rows=[
    ['debt_reminder','د پور یادونه',['سلام '+name+'،','د '+store+' دوستانه یادونه: ستاسو پاتې حساب '+balance+(date?' تر '+date:'')+'.',reminder?'د تادیې د یادونې نېټه: '+reminder+'.':'','که مو تادیه کړې وي، مهرباني وکړئ خبر راکړئ. مننه.'].filter(Boolean).join('\n')],
    ['account_summary','د حساب لنډیز',['سلام '+name+'،','ستاسو د '+store+' حساب لنډیز'+(date?' تر '+date:'')+':','پاتې: '+balance+'.','د بشپړ حساب لپاره له موږ سره اړیکه ونیسئ.'].join('\n')],
    ['payment_thanks','د تادیې مننه',['سلام '+name+'،',paid?'ستاسو '+paid+' تادیه ترلاسه شوه.':'ستاسو تادیه ترلاسه شوه.','په '+store+' د باور لپاره مننه.'].join('\n')],
    ['settlement_request','د حساب تصفیه',['محترم '+name+'،','مهرباني وکړئ د '+balance+' پاتې حساب له '+store+' سره تصفیه کړئ.','که مو مخکې تادیه کړې وي، رسید یا خبر راولېږئ. مننه.'].join('\n')],
    ['friendly','دوستانه سلام',['سلام '+name+' جان،','هیله ده روغ او جوړ یاست. د '+store+' له خوا مو ورځ ښه.'].join('\n')],
    ['formal','رسمي پیغام',['محترم '+name+'،','دا پیغام د '+store+' له خوا د حساب او کاري اړیکو لپاره استول شوی.','ستاسو له همکارۍ مننه.'].join('\n')],
    ['short','لنډ پیغام',['سلام '+name+'،','پاتې حساب: '+balance+'.','مننه — '+store].join('\n')]
   ];
  }else{
   rows=[
    ['debt_reminder','یادآوری قرض',['سلام '+name+' عزیز،','یادآوری دوستانه از '+store+': مانده حساب شما '+balance+(date?' تا '+date:'')+'.',reminder?'تاریخ وعده پرداخت: '+reminder+'.':'','اگر پرداخت کرده‌اید لطفاً خبر بدهید. تشکر.'].filter(Boolean).join('\n')],
    ['account_summary','خلاصه حساب',['سلام '+name+'،','خلاصه حساب شما نزد '+store+(date?' تا '+date:'')+':','مانده: '+balance+'.','برای جزئیات بیشتر با ما تماس بگیرید.'].join('\n')],
    ['payment_thanks','تشکر از پرداخت',['سلام '+name+' عزیز،',paid?'پرداخت '+paid+' شما دریافت شد.':'پرداخت شما دریافت شد.','از اعتماد شما به '+store+' تشکر می‌کنیم.'].join('\n')],
    ['settlement_request','درخواست تصفیه',['سلام '+name+' محترم،','لطفاً در صورت امکان مانده حساب '+balance+' را با '+store+' تصفیه کنید.','اگر قبلاً پرداخت کرده‌اید، لطفاً رسید یا خبر پرداخت را بفرستید. تشکر.'].join('\n')],
    ['friendly','احوال‌پرسی دوستانه',['سلام '+name+' جان،','امیدوارم جور و صحت‌مند باشید. از طرف '+store+' برایتان روز خوبی آرزو داریم.'].join('\n')],
    ['formal','پیام رسمی',['محترم '+name+'،','با احترام، این پیام از طرف '+store+' برای پیگیری حساب و ارتباط کاری شما ارسال شده است.','سپاس از همکاری شما.'].join('\n')],
    ['short','پیام کوتاه',['سلام '+name+'،','مانده حساب: '+balance+'.','تشکر — '+store].join('\n')]
   ];
  }
  return rows.map(([id,label,message])=>Object.freeze({id,label,message}));
 }
 function message(kind,data){return templates(data).find(x=>x.id===kind)?.message||statement(data)}
 return Object.freeze({digits,links,invoice,statement,templates,message});
});