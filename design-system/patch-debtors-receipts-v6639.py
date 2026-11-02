#!/usr/bin/env python3
"""Simplify debtor cards and derive customer receipts from the canonical payment ledger.
No new financial writes, no duplicate receipts, no accounting changes.
"""
from pathlib import Path
import sys
path=Path(sys.argv[1]); s=path.read_text(encoding="utf-8")
def once(old,new):
 global s
 n=s.count(old)
 if n!=1:raise SystemExit(f"Expected one matching debtor UI anchor, found {n}: {old[:85]}")
 s=s.replace(old,new,1)

# The payment journal is the single source of truth. Voided transactions are excluded.
anchor="function renderDebtors(){"
receipts="""function renderCustomerReceipts(){
 const entries=orderByDate(db.tx.filter(t=>!t.voided&&t.type==='customer_payment'&&t.contactId));
 const contacts=new Map(db.contacts.map(c=>[String(c.id),c]));
 const total=money(entries.reduce((a,t)=>a+num(t.amount),0));
 return `<details class="card zavi-receipts-panel" id="zaviCustomerReceipts"><summary>رسیدهای دریافت پول <span class="pill green">${fmtQty(entries.length)} رسید · ${currency(total)}</span></summary>
 <p class="muted">هر بار که «ثبت دریافت پول» انجام شود، رسید همان مشتری به‌صورت خودکار در این فهرست دیده می‌شود.</p>
 ${entries.length?`<div class="zavi-receipt-list">${entries.map(t=>{const c=contacts.get(String(t.contactId));return `<div class="zavi-receipt-item"><div><strong>${escapeHtml(c?.name||'مشتری حذف‌شده')}</strong><small>${escapeHtml(c?.phone||'')} · ${fmtDate(t.date)} · ${escapeHtml(t.code||'بدون شماره')}</small></div><b class="amount">${currency(t.amount)}</b></div>`}).join('')}</div>`:'<p class="muted">هنوز رسیدی ثبت نشده است.</p>'}</details>`;
}
"""
once(anchor,receipts+anchor)
once(' <div class="card" style="margin-bottom:17px"><div class="table-bar">',' ${renderCustomerReceipts()}\\n <div class="card" style="margin-bottom:17px"><div class="table-bar">')
old="""<div class="dc-actions"><button class="btn tiny primary" data-ledger="${c.id}">${icon('chart')} صورت‌حساب</button>${z20Option('customerShare')?`<button class="btn tiny subtle" data-statement="${c.id}">${icon('download')} عکس حساب</button>`:''}<button class="btn tiny" data-collect="${c.id}">${icon('check')} گرفتن اوگرایی / وصول قرض</button>${z20Option('debtorOgrai')?`<button type="button" class="btn tiny z660-loan" data-z660-loan="${escapeHtml(c.id)}">↗ دادن اوگرایی</button>`:''}<button class="btn tiny" data-wa="${c.id}">${icon('arrow')} واتساپ</button></div>"""
new="""<div class="dc-actions"><button class="btn tiny primary" data-ledger="${c.id}">${icon('chart')} صورت‌حساب</button><button class="btn tiny" data-collect="${c.id}">${icon('check')} دریافت پول</button><button class="btn tiny" data-wa="${c.id}">${icon('arrow')} واتساپ</button><details class="zavi-more-actions"><summary>گزینه‌های بیشتر</summary><div class="zavi-more-actions-inner">${z20Option('customerShare')?`<button class="btn tiny subtle" data-statement="${c.id}">${icon('download')} عکس حساب</button>`:''}${z20Option('debtorOgrai')?`<button type="button" class="btn tiny z660-loan" data-z660-loan="${escapeHtml(c.id)}">↗ دادن اوگرایی</button>`:''}</div></details></div>"""
once(old,new)
# Clear mobile layout: only receipt summary and account cards, extra actions tucked away.
style="""<style id="zavi-receipts-clean-ui">
.zavi-receipts-panel{margin:0 0 14px;padding:14px 16px}
.zavi-receipts-panel>summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:750;list-style:none}
.zavi-receipts-panel>summary::-webkit-details-marker{display:none}
.zavi-receipt-list{display:grid;gap:8px;margin-top:12px;max-height:380px;overflow:auto}
.zavi-receipt-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-radius:12px;background:rgba(110,145,200,.10)}
.zavi-receipt-item>div{min-width:0;display:grid;gap:4px}
.zavi-receipt-item small{opacity:.75;overflow-wrap:anywhere}
.zavi-more-actions{width:100%;margin-top:5px}
.zavi-more-actions>summary{cursor:pointer;padding:10px;border:1px solid rgba(140,165,205,.3);border-radius:10px;text-align:center;list-style:none}
.zavi-more-actions-inner{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}
.debt-card .dc-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.debt-card .dc-actions>.btn{min-width:0;white-space:normal}
.debt-card .dc-actions .zavi-more-actions{grid-column:1/-1}
@media(max-width:420px){.zavi-receipt-item{align-items:flex-start}.zavi-more-actions-inner{grid-template-columns:1fr}}
</style>"""
s=s.replace('</head>',style+'\n</head>',1)
path.write_text(s,encoding="utf-8")
print("PASS: receipt ledger and simplified debtor actions")
