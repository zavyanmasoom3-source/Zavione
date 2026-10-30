#!/usr/bin/env python3
"""ZAVI ONE 65.90 & ADMIN 1.4.36 — preserve accounting, repair mobile overlay and viewport."""
import argparse,runpy,shutil,sys,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=("one","admin"),required=True)
a=p.parse_args()
sys.argv=["apply_skin_v6589.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6589.py",run_name="__main__")
web=Path(a.web)
for name in ("zavi-mobile-rescue-v6590.css","zavi-mobile-rescue-v6590.js"):
    src=Path("design-system")/name
    assert src.is_file() and src.stat().st_size>1500,name
    shutil.copyfile(src,web/name)
index=web/"index.html"
html=index.read_text(encoding="utf8")
assert "</head>" in html and "</body>" in html
assert html.count("zavi-landscape-v6589.css") == 1
assert "zavi-mobile-rescue-v6590." not in html
html=html.replace("</head>",'<link rel="stylesheet" href="./zavi-mobile-rescue-v6590.css?v=65.90"></head>',1)
assert html.rfind("</body>") > html.find("</head>"), "Missing actual closing body boundary"
html=html[:html.rfind("</body>")]+'<script src="./zavi-mobile-rescue-v6590.js?v=65.90"></script></body>'+html[html.rfind("</body>")+len("</body>"):]
assert html.count('zavi-mobile-rescue-v6590.css')==1
assert html.count('zavi-mobile-rescue-v6590.js')==1
assert html.index('zavi-landscape-v6589.css')<html.index('zavi-mobile-rescue-v6590.css')
index.write_text(html,encoding="utf8")
if a.app=="one":
    m=web/"zavi-unified20-manifest.json"
    data=json.loads(m.read_text(encoding="utf8"))
    assert len(data["profiles"])==20
    data["design_version"]="65.90-mobile-portrait-landscape-ai-overlay-scroll"
    m.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf8")
    assert (web/"annual-license.js").is_file()
    assert (web/"zavi-ai-v637.js").is_file()
else:
    assert (web/"zavi-admin-v1428-offline-seven-days.js").is_file()
    assert (web/"zavi-admin-v1423-lifetime.js").is_file()
print("PASS",a.app,"mobile overlay, scroll & viewport styles layered after 65.89; finance data untouched")
