#!/usr/bin/env python3
"""Targeted financial UI fixes for staged ZAVI ONE index, without DB migrations."""
from pathlib import Path
import sys
path=Path(sys.argv[1]); source=path.read_text(encoding="utf-8")
def replace_once(old,new,label):
 global source
 count=source.count(old)
 if count!=1:raise SystemExit(f"{label}: expected one source match, got {count}")
 source=source.replace(old,new,1)
replace_once(
 "return db.contacts.filter(c=>c.type==='customer'||c.type==='both').map(c=>({...c,amount:money(b[c.id]?.receivable||0)})).filter(c=>c.amount>0.001)",
 "return db.contacts.filter(c=>money(b[c.id]?.receivable||0)>0.001).map(c=>({...c,amount:money(b[c.id]?.receivable||0)})).filter(c=>c.amount>0.001)",
 "Show all customers with receivable balances in debtors, regardless of stale contact type")
replace_once(
 "${stat('موجودی حساب‌ها',t.cash,'مجموع صندوق‌ها','wallet','orange')}",
 "${stat('موجودی حساب‌ها',t.cash,'مجموع صندوق‌ها','wallet','orange')}${(()=>{const cash=cashBalances();const account=db.accounts.find(a=>a.id==='a_cash'||/صندوق نقدی|cash/i.test(a.name||''));return account?stat('صندوق نقدی',cash[account.id]||0,'موجودی نقد','wallet','green'):''})()}",
 "Add distinct cashbox balance to dashboard summary")
replace_once("header('مشتریان و عرضه‌کنندگان','نام، شماره تماس، قرض، دریافت و صورت‌حساب هر مشتری'","header('مشتریان و عرضه‌کنندگان','مدیریت اشخاص و حساب‌ها'","Shorten contacts subtitle")
replace_once("header('حساب قرضداران','ثبت قرض، شماره تماس، پرداخت‌ها و فرستادن عکس حساب به مشتری'","header('قرضداران','قرض‌های باز مشتریان'","Shorten debtors subtitle")
path.write_text(source,encoding="utf-8")
print("PASS: debtor balances, cashbox card and concise headings patched")
