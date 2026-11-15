'use strict';
/* Regression: Afghan Solar/Gregorian text must preserve Latin date fragments.
 * No financial, localStorage, authentication or backend mutation.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('app-source/one/zavi-dashboard-polish-v6562.js','utf8');
const start=source.indexOf('function localeDate(){');
const end=source.indexOf('function ensure(){',start);
assert(start>=0&&end>start,'Dashboard date formatter missing');
const evaluator=new Function('Date','Intl','lang','document',
 source.slice(start,end)+'return localeDate()');
class FixedDate extends Date {
 constructor(...args){super(...(args.length?args:['2026-11-15T12:00:00Z']))}
}
const document={querySelector:()=>null};
for(const locale of ['fa','ps','en']){
 const text=evaluator(FixedDate,Intl,()=>locale,document);
 assert(text.includes('15 Nov 2026'),locale+': Gregorian month and digits changed unexpectedly: '+text);
 assert(text.includes('1405'),locale+': Afghan Solar year must use English digits: '+text);
 assert(!/[۰-۹٠-٩]/.test(text),locale+': Arabic-script numerals leaked: '+text);
 assert(!text.includes('1582--'),locale+': former malformed date regression');
 console.log('PASS',locale,text);
}
