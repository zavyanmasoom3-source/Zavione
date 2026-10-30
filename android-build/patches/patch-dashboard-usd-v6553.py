#!/usr/bin/env python3
"""Display USD exchange rate from store Settings, no network, no accounting changes."""
from pathlib import Path
import sys
p=Path(sys.argv[1]);html=p.read_text(encoding='utf-8')
assert html.count('function renderDashboard(){')==1,'Dashboard function changed'
assert html.count("if(e.target.id==='usdRateForm')")==1,'Settings form changed'
assert 'function zaviUsdRateDashboardCard(){' not in html,'Already patched'
helper="""function zaviUsdRateDashboardCard(){
 const l=String(window.zaviPublicLanguage?.()||'fa-AF').toLowerCase();
 const en=l.startsWith('en'),ps=l.startsWith('ps');
 const title=en?'USD exchange rate':ps?'د نن ورځې د ډالر نرخ':'نرخ امروز دالر';
 const note=en?'Manually entered in Settings':ps?'په تنظیماتو کې ثبت شوی نرخ':'نرخ دستی ثبت‌شده در تنظیمات';
 const empty=en?'No USD rate set':ps?'د ډالر نرخ نه دی ثبت شوی':'نرخ دالر هنوز تنظیم نشده';
 const update=en?'Set rate':ps?'نرخ تنظیم کړئ':'تنظیم نرخ';
 const updated=en?'Last updated':ps?'وروستی ثبت':'آخرین ثبت';
 const unknown=en?'Date not recorded':ps?'نېټه معلومه نه ده':'تاریخ نرخ ثبت نشده';
 const cur=String(db.currency||'AFN');
 const amount=cur==='USD'?1:Number(db.usdRate);
 const valid=Number.isFinite(amount)&&amount>0;
 const stamp=db.usdRateUpdatedAt?new Date(db.usdRateUpdatedAt):null;
 const date=stamp&&!Number.isNaN(stamp.getTime())?stamp.toLocaleDateString(en?'en-GB':ps?'ps-AF':'fa-AF'):unknown;
 const value=valid?'<strong dir="ltr" class="zavi-usd-rate-value">1 USD = '+fmt(money(amount))+' '+escapeHtml(cur)+'</strong>':'<strong class="zavi-usd-rate-missing">'+empty+'</strong>';
 return '<section class="zavi-usd-today-card" aria-label="'+title+'"><div class="zavi-usd-today-mark" aria-hidden="true">💱</div><div class="zavi-usd-today-info"><b>'+title+'</b>'+value+'<small>'+note+' · '+updated+': '+escapeHtml(date)+'</small></div><button class="btn tiny subtle zavi-usd-today-button" data-go="settings" type="button">'+update+' ↗</button></section>';
}
"""
html=html.replace('function renderDashboard(){',helper+'function renderDashboard(){',1)
start=html.index('function renderDashboard(){');end=html.index('function recordsTable(',start)
segment=html[start:end];dollar=chr(36)+'{'
boundary='</section>'+dollar+'z6524CareLauncher()}'
assert segment.count(boundary)==1,'Dashboard hero structure changed'
segment=segment.replace(boundary,'</section>'+dollar+'zaviUsdRateDashboardCard()}'+dollar+'z6524CareLauncher()}',1)
html=html[:start]+segment+html[end:]
before="if(commit(n=>{n.usdRate=value})){toast('نرخ دالر برای نمایش گدام ذخیره شد.')}"
after="if(commit(n=>{n.usdRate=value;n.usdRateUpdatedAt=new Date().toISOString()})){toast('نرخ دالر برای نمایش گدام ذخیره شد.')}"
assert html.count(before)==1,'Rate settings save handler changed'
html=html.replace(before,after,1)
style='''<style id="zavi-usd-dashboard-v6553">.zavi-usd-today-card{display:flex;align-items:center;gap:13px;flex-wrap:wrap;border:1px solid var(--border,#399bd43b);border-radius:16px;padding:13px 16px;margin:0 0 16px;background:linear-gradient(112deg,rgba(34,128,244,.13),rgba(3,189,206,.08));color:inherit;box-shadow:0 6px 16px #163a6813}.zavi-usd-today-mark{display:grid;place-items:center;width:46px;height:46px;flex:0 0 46px;font-size:22px;border-radius:14px;background:linear-gradient(130deg,#1c7aec,#09a6c9);color:white}.zavi-usd-today-info{display:grid;gap:3px;flex:1 1 170px;min-width:0}.zavi-usd-today-info>b{font-size:14px;font-weight:850}.zavi-usd-rate-value{font-size:clamp(15px,4vw,21px);font-weight:900;unicode-bidi:isolate;overflow-wrap:anywhere}.zavi-usd-rate-missing{font-size:14px}.zavi-usd-today-info small{font-size:11px;color:var(--muted,#9ab0c6);line-height:1.6}.zavi-usd-today-button{min-height:38px;white-space:nowrap}@media(max-width:370px){.zavi-usd-today-card{gap:9px;padding:11px}.zavi-usd-today-mark{width:38px;height:38px;flex-basis:38px}}</style>'''
assert html.find('</head>')<html.find('function renderDashboard(){')
html=html.replace('</head>',style+'</head>',1)
p.write_text(html,encoding='utf8')
print('USD settings -> dashboard: card present, existing features retained')
