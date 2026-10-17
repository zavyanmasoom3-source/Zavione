#!/usr/bin/env python3
"""Only patch the packaged ZAVI ONE Android frontend. No cloud deployment changes."""
from pathlib import Path
import sys

assets=Path(sys.argv[1] if len(sys.argv)>1 else "android-build/app/src/main/assets")
htmlpath=assets/"index.html"
css_source=Path(__file__).resolve().parent/"zavi-one-mobile-dashboard.css"
assert htmlpath.is_file(), htmlpath
html=htmlpath.read_text(encoding="utf-8")
needle='<div class="layout-2" style="margin-bottom:18px"><section class="card"><div class="panel-head"><h3>فروش ماهوار'
assert html.count(needle)==1, f"Unexpected mobile dashboard markup: {html.count(needle)}"
html=html.replace(needle,'<div class="layout-2 zavi-apk-dashboard-cards" style="margin-bottom:18px"><section class="card"><div class="panel-head"><h3>فروش ماهوار',1)
chart_head='</div></div>\n  <div class="z45-chart-scroll z47-chart-scroll z27-chart-scroll"'
assert html.count(chart_head)==1, f"Unexpected monthly chart header: {html.count(chart_head)}"
hint='''</div></div>
  <div class="zavi-apk-chart-hint" aria-hidden="true">${tr('↔ برای دیدن هر ۱۲ ماه نمودار را به چپ و راست بکشید','↔ د ټولو ۱۲ میاشتو لیدو لپاره ګراف چپ او راست ته کش کړئ','↔ Swipe horizontally to view all 12 months')}</div>
  <div class="z45-chart-scroll z47-chart-scroll z27-chart-scroll"'''
html=html.replace(chart_head,hint,1)
assert html.count('</head>')==1
html=html.replace('</head>','<link rel="stylesheet" href="./zavi-apk-mobile-dashboard.css?v=20261017-chart-stock">\n</head>',1)
htmlpath.write_text(html,encoding="utf-8")
(assets/"zavi-apk-mobile-dashboard.css").write_bytes(css_source.read_bytes())
assert len(list(assets.glob("zavi-apk-mobile-dashboard.css")))==1
print("APK-only monthly chart horizontal swipe + dashboard two cards constrained to viewport.")
