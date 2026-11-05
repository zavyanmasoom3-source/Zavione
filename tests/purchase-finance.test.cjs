const test=require('node:test'),assert=require('node:assert/strict');
const money=require('../app-source/one/zavi-decimal-v636.js');
const creditors=require('../app-source/one/zavi-creditors-simple-v6528.js');
test('fractional quantities and multiple landed costs',()=>{
 const cost=money.sumMoney(['0.10','0.20','1.05']);
 assert.equal(cost,1.35);
 assert.deepEqual(money.invoiceTotals([{qty:'1.250',price:'20.50'}],'0.63',cost,'10'),{gross:25.63,discount:.63,shipping:1.35,total:26.35,paid:10,remaining:16.35});
});
test('FX rounds decimal half-cent consistently',()=>{assert.equal(money.convertMoney('1','1.005'),1.01);assert.equal(money.convertMoney('0.10','70.55'),7.06)});
test('Dari numbers and high precision FX',()=>assert.equal(money.convertMoney('۱۲.۵۰','۷۰.۱۲۳۴۵۶۷۸'),876.54));
test('invalid rates never become zero or NaN',()=>{for(const r of ['0','-1','NaN','Infinity','bad'])assert.throws(()=>money.convertMoney('12',r))});
test('overpayment rejected',()=>assert.throws(()=>money.invoiceTotals([{qty:1,price:10}],0,0,11)));
test('negative cost rejected',()=>assert.throws(()=>money.invoiceTotals([{qty:1,price:10}],0,-1,0)));
test('recorded base total is used by supplier debt report',()=>assert.equal(creditors.totals({id:'supplier'},[{type:'purchase',contactId:'supplier',total:1.01,items:[{qty:1,price:1}],paid:0}]).remaining,1.01));
