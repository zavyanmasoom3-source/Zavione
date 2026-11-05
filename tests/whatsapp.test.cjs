const test=require('node:test');
const assert=require('node:assert/strict');
const wa=require('../app-source/one/zavi-whatsapp-v1.js');
test('International and Afghanistan WhatsApp numbers are validated without guessing unrelated countries',()=>{
 assert.equal(wa.digits('0780 123 456'),'93780123456');
 assert.equal(wa.digits('+93 780 123 456'),'93780123456');
 assert.equal(wa.digits('۰۰۹۳۷۸۰۱۲۳۴۵۶'),'93780123456');
 assert.equal(wa.digits('+44 7700 900123'),'447700900123');
 assert.equal(wa.digits('00971-50-1234567'),'971501234567');
 for(const invalid of ['1234','0','+001','++93780123456','+930000000000000000','<script>','000',''])assert.equal(wa.digits(invalid),'',invalid);
});
test('WhatsApp link preserves line breaks and requires the user to press send in WhatsApp',()=>{
 const message='مشتری: احمد\nمانده: ۱۲۳ AFN';
 const a=wa.links('0780123456',message);
 assert.equal(a.recipient,'93780123456');
 assert.equal(a.valid,true);
 assert.equal(a.personal,'https://wa.me/93780123456?text='+encodeURIComponent(message));
 assert.equal(a.business,'https://api.whatsapp.com/send?phone=93780123456&text='+encodeURIComponent(message));
 const invalid=wa.links('abc',message);
 assert.equal(invalid.valid,false);
 assert.equal(invalid.recipient,'');
 assert.ok(!invalid.personal.includes('/abc'));
});
test('Short Dari invoice and statement preserve supplied currency, date and remaining balance',()=>{
 const invoice=wa.invoice({storeName:'زاوی وان',code:'A-123',customer:'احمد',date:'۱۴۰۵/۸/۱۳',total:'۱۲۰ AFN',paid:'۲۰ AFN',balance:'۱۰۰ AFN'});
 assert.match(invoice,/A-123/);assert.match(invoice,/۱۴۰۵\/۸\/۱۳/);assert.match(invoice,/۱۰۰ AFN/);
 const statement=wa.statement({storeName:'زاوی وان',customer:'احمد',date:'۱۴۰۵/۸/۱۳',balance:'۱۰۰ AFN',reminderDate:'۱۴۰۵/۸/۲۰'});
 assert.match(statement,/۱۰۰ AFN/);assert.match(statement,/۱۴۰۵\/۸\/۲۰/);
 assert.equal(statement.split('\n').length,4);
});
