#!/usr/bin/env python3
"""Move USD rate editing from Settings to a directly editable dashboard card.
Only presentation and the existing authorized commit handler are touched.
No historical transaction, inventory, currencies, or storage migration changes.
"""
from pathlib import Path
import sys
p=Path(sys.argv[1])
html=p.read_text(encoding='utf-8')
a=html.find('function zaviUsdRateDashboardCard(){')
b=html.find('function renderDashboard(){',a)
assert a>=0 and b>a and html.count('function zaviUsdRateDashboardCard(){')==1,"V65.53 dashboard function not found"
old=html[a:b]
assert 'data-go="settings"' in old and 'usdRateDashboardForm' not in old,"USD card already changed"
helper="""function zaviUsdRateDashboardCard(){
 const l=String(window.zaviPublicLanguage?.()||'fa-AF').toLowerCase();
 const en=l.startsWith('en'),ps=l.startsWith('ps');
 const title=en?'Today\\'s USD rate':ps?'د نن ورځې د ډالر نرخ':'نرخ امروز دالر';
 const note=en?'Set manually here on the dashboard':ps?'همدلته په ډشبورډ کې نرخ ثبت کړئ':'نرخ را مستقیم در داشبورد ثبت کنید';
 const field=en?'1 USD equals how many':ps?'۱ USD څو':'۱ دالر = چند';
 const submit=en?'Save rate':ps?'نرخ ثبت کړئ':'ذخیره نرخ دالر';
 const empty=en?'No rate set yet':ps?'نرخ لا نه دی ثبت شوی':'هنوز نرخی ثبت نشده';
 const updated=en?'Updated':ps?'وروستی ثبت':'آخرین ثبت';
 const unknown=en?'Not recorded':ps?'نه دی ثبت شوی':'ثبت نشده';
 const fixed=en?'USD is the accounting currency; rate is always 1':ps?'اصلي اسعار USD دي، نرخ ۱ دی':'واحد اصلی حساب USD است؛ نرخ آن همواره ۱ است';
 const cur=String(db.currency||'AFN');
 const usdBase=cur==='USD';
 const rate=usdBase?1:Number(db.usdRate);
 const valid=Number.isFinite(rate)&&rate>0;
 const current=valid?'<strong dir="ltr" class="zavi-usd-rate-value">1 USD = '+fmt(money(rate))+' '+escapeHtml(cur)+'</strong>':'<strong class="zavi-usd-rate-missing">'+empty+'</strong>';
 const dateObject=db.usdRateUpdatedAt?new Date(db.usdRateUpdatedAt):null;
 const date=dateObject&&!Number.isNaN(dateObject.getTime())?dateObject.toLocaleDateString(en?'en-GB':ps?'ps-AF':'fa-AF'):unknown;
 const canEdit=!window.zaviCloudCanEdit||window.zaviCloudCanEdit();
 const edit=usdBase
  ?'<p class="zavi-usd-fixed">'+fixed+'</p>'
  :'<form id="usdRateDashboardForm" class="zavi-usd-inline-form"><label for="zaviDashUsdRateInput">'+field+' '+escapeHtml(cur)+'؟</label><div class="zavi-usd-input-row"><input id="zaviDashUsdRateInput" type="number" name="usdRate" min="0.000001" step="any" inputmode="decimal" autocomplete="off" placeholder="75" value="'+(valid?escapeHtml(String(rate)):'')+'" required'+(canEdit?'':' disabled')+'><button class="btn primary" type="submit"'+(canEdit?'':' disabled')+'>'+submit+'</button></div></form>';
 return '<section class="zavi-usd-today-card" aria-label="'+title+'"><div class="zavi-usd-today-mark" aria-hidden="true">💱</div><div class="zavi-usd-today-info"><b>'+title+'</b>'+current+'<small>'+note+' · '+updated+': '+escapeHtml(date)+'</small></div>'+edit+'</section>';
}
"""
# Preserve only this one helper, leaving dashboard, sales and ledger logic unchanged.
html=html[:a]+helper+html[b:]
settings_start='<section class="card settings-card"><h3>نرخ دالر برای نمایش گدام (USD)</h3>'
settings_end='<section class="card settings-card"><h3>حساب‌های نقدی، بانکی و حواله</h3>'
start=html.find(settings_start)
finish=html.find(settings_end,start)
assert start>0 and finish>start and html.count(settings_start)==1,"Existing Settings card changed"
removed=html[start:finish]
assert 'id="usdRateForm"' in removed and 'shopForm' not in removed, "Settings markup mismatch"
html=html[:start]+html[finish:]
submit_old="if(e.target.id==='usdRateForm')"
submit_new="if(e.target.id==='usdRateDashboardForm')"
assert html.count(submit_old)==1,"USD rate submit handler changed"
html=html.replace(submit_old,submit_new,1)
html=html.replace("toast('نرخ دالر برای نمایش گدام ذخیره شد.')","toast('نرخ امروز دالر در داشبورد ذخیره شد.')",1)
html=html.replace('برای نمایش معادل افغانی، نرخ دالر را در تنظیمات ثبت کنید.','برای نمایش معادل افغانی، نرخ دالر را در داشبورد ثبت کنید.')
html=html.replace('نرخ دالر را در تنظیمات ثبت کنید','نرخ دالر را در داشبورد ثبت کنید')
css="""<style id="zavi-usd-inline-edit-v6554">
.zavi-usd-today-card{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.zavi-usd-inline-form{display:grid;gap:6px;flex:1 1 220px;min-width:0}
.zavi-usd-inline-form label{font-size:12px;font-weight:750}
.zavi-usd-input-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.zavi-usd-input-row input{flex:1 1 110px;min-width:100px;max-width:220px;box-sizing:border-box;height:44px;padding:8px 12px;border:1px solid var(--border,#92aec8);border-radius:11px;background:var(--card,#fff);color:inherit;font-size:17px;font-weight:700;direction:ltr;text-align:center}
.zavi-usd-input-row button{height:44px;min-width:105px;white-space:nowrap}
.zavi-usd-fixed{font-size:12px;margin:0;opacity:.85}
@media(max-width:420px){.zavi-usd-inline-form{flex-basis:100%}.zavi-usd-input-row input{min-width:90px;max-width:100%}}
@media print{.zavi-usd-inline-form{display:none!important}}
</style>"""
assert 'id="zavi-usd-inline-edit-v6554"' not in html
assert html.count('</head>')>=1
html=html.replace('</head>',css+'</head>',1)
assert html.count('id="usdRateDashboardForm"')==1
assert 'id="usdRateForm"' not in html
assert html.count('function renderDashboard(){')==1
assert html.count("if(e.target.id==='usdRateDashboardForm')")==1
p.write_text(html,encoding='utf-8')
print('PASS: USD edit moved to dashboard; removed only rate settings card; commit, FX and data preserved.')
