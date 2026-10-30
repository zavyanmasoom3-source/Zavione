#!/usr/bin/env python3
"""Layer renewal UI on the existing 65.92 / ADMIN 1.4.38 without modifying customer data."""
from pathlib import Path
import argparse,sys,runpy,shutil,json
a=argparse.ArgumentParser()
a.add_argument("--web",required=True)
a.add_argument("--app",choices=("one","admin"),required=True)
p=a.parse_args()
sys.argv=["apply_skin_v6592.py","--web",p.web,"--app",p.app]
runpy.run_path("design-system/apply_skin_v6592.py",run_name="__main__")
web=Path(p.web)
index=web/"index.html";h=index.read_text(encoding="utf8")
css="zavi-premium-renewal-v6593.css"
shutil.copy2(Path("design-system")/css,web/css)
assert "</head>" in h and h.rfind("</body>")>h.index("</head>")
assert h.count("zavi-premium-renewal-v6593.css")==0
h=h.replace("</head>",'<link rel="stylesheet" href="./zavi-premium-renewal-v6593.css?v=65.93"></head>',1)
if p.app=="admin":
    fn="zavi-admin-renewal-v1439.js"
    shutil.copy2(Path("design-system")/fn,web/fn)
    pos=h.rfind("</body>")
    h=h[:pos]+'<script src="./zavi-admin-renewal-v1439.js?v=1.4.39" defer></script>'+h[pos:]
    assert h.count('zavi-admin-renewal-v1439.js')==1
    assert (web/'zavi-admin-v1428-offline-seven-days.js').exists()
    assert (web/'zavi-admin-v1423-lifetime.js').exists()
else:
    m=web/'zavi-unified20-manifest.json'
    data=json.loads(m.read_text(encoding="utf8"))
    assert len(data["profiles"])==20
    data["design_version"]="65.93-renewal-polish"
    m.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf8")
    assert (web/'zavi-zxing-bundle-v6591.js').exists()
sw=web/'sw.js'
if sw.exists():
    content=sw.read_text(encoding="utf8")
    assert 'const CORE=[' in content
    new=[css]+(["zavi-admin-renewal-v1439.js"] if p.app=="admin" else [])
    content=content.replace('const CORE=[','const CORE='+json.dumps(new,ensure_ascii=False)+'.concat([',1)
    # Close the newly introduced concat construct at the existing core array end,
    # before any normal OPTIONAL references. Avoid syntax surgery by adding to CACHE install below:
    # Instead of rewriting list syntax, revert and prefix entries directly.
    content=sw.read_text(encoding="utf8")
    content=content.replace('const CORE=[','const CORE='+json.dumps(new,ensure_ascii=False)[:-1]+',',1)
    previous="zavi-admin-v1438-ipad" if p.app=="admin" else "zavi-store-v6591-camera"
    assert previous in content, "Unexpected service worker cache signature"
    content=content.replace(previous,"zavi-admin-v1439-renewal" if p.app=="admin" else "zavi-store-v6593-premium")
    sw.write_text(content,encoding="utf8")
assert 'zavi-premium-renewal-v6593.css?v=65.93' in h
index.write_text(h,encoding='utf8')
print('PASS '+p.app+': renewal reminder and clean layout loaded, existing accounting modules untouched')
