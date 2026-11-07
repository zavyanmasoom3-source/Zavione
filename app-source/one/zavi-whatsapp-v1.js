/* ZAVI ONE WhatsApp sharing. Short Dari messages; this only prepares links.
 * It never sends messages or changes accounting records.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ZaviWhatsappV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩';
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
  return [d.storeName||'فروشگاه','فاکتور: '+(d.code||''),'مشتری: '+(d.customer||''),'تاریخ: '+(d.date||''),
    'مبلغ: '+(d.total||''),'پرداخت: '+(d.paid||''),'مانده: '+(d.balance||''),'تشکر از خرید شما.'].join('\n');
 }
 function statement(data){
  const d=data||{};
  return ['سلام '+(d.customer||'')+' عزیز،','مانده حساب شما نزد '+(d.storeName||'فروشگاه')+' تا '+(d.date||'')+': '+(d.balance||'')+'.',
    ...(d.reminderDate?['تاریخ وعده: '+d.reminderDate]:[]),'اگر پرداخت کرده‌اید، لطفاً اطلاع بدهید. تشکر.'].join('\n');
 }
 function templates(data){
  const d=data||{},name=String(d.customer||'مشتری').trim()||'مشتری',store=String(d.storeName||'فروشگاه').trim()||'فروشگاه',
    balance=String(d.balance||'—'),date=String(d.date||''),paid=String(d.lastPayment||''),reminder=String(d.reminderDate||'');
  const rows=[
   ['debt_reminder','یادآوری قرض',['سلام '+name+' عزیز،','یادآوری دوستانه از '+store+': مانده حساب شما '+balance+(date?' تا '+date:'')+'.',reminder?'تاریخ وعده پرداخت: '+reminder+'.':'','اگر پرداخت کرده‌اید لطفاً خبر بدهید. تشکر.'].filter(Boolean).join('\n')],
   ['account_summary','خلاصه حساب',['سلام '+name+'،','خلاصه حساب شما نزد '+store+(date?' تا '+date:'')+':','مانده: '+balance+'.','برای جزئیات بیشتر با ما تماس بگیرید.'].join('\n')],
   ['payment_thanks','تشکر از پرداخت',['سلام '+name+' عزیز،',paid?'پرداخت '+paid+' شما دریافت شد.':'پرداخت شما دریافت شد.','از اعتماد شما به '+store+' تشکر می‌کنیم.'].join('\n')],
   ['settlement_request','درخواست تصفیه',['سلام '+name+' محترم،','لطفاً در صورت امکان مانده حساب '+balance+' را با '+store+' تصفیه کنید.','اگر قبلاً پرداخت کرده‌اید، لطفاً رسید یا خبر پرداخت را بفرستید. تشکر.'].join('\n')],
   ['friendly','احوال‌پرسی دوستانه',['سلام '+name+' جان،','امیدوارم جور و صحت‌مند باشید. از طرف '+store+' برایتان روز خوبی آرزو داریم.'].join('\n')],
   ['formal','پیام رسمی',['محترم '+name+'،','با احترام، این پیام از طرف '+store+' برای پیگیری حساب و ارتباط کاری شما ارسال شده است.','سپاس از همکاری شما.'].join('\n')],
   ['short','پیام کوتاه',['سلام '+name+'،','مانده حساب: '+balance+'.','تشکر — '+store].join('\n')]
  ];
  return rows.map(([id,label,message])=>Object.freeze({id,label,message}));
 }
 function message(kind,data){return templates(data).find(x=>x.id===kind)?.message||statement(data)}
 return Object.freeze({digits,links,invoice,statement,templates,message});
});
