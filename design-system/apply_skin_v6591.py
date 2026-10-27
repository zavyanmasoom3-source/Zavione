#!/usr/bin/env python3
"""Apply 65.91 store camera fallback and tablet/desktop design without modifying finance or owner auth."""
import argparse,runpy,sys,shutil,re,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=("one","admin"),required=True)
a=p.parse_args()
sys.argv=["apply_skin_v6590.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6590.py",run_name="__main__")
root=Path(a.web)
for name in ("zavi-camera-menu-v6591.css",):
    shutil.copy2(Path("design-system")/name,root/name)
index=root/"index.html";html=index.read_text(encoding="utf8")
assert "</head>" in html and "</body>" in html
assert "zavi-camera-menu-v6591.css" not in html
html=html.replace("</head>",'<link rel="stylesheet" href="./zavi-camera-menu-v6591.css?v=65.91"></head>',1)
if a.app=="one":
    bundled=Path("design-system/zavi-zxing-bundle-v6591.js")
    assert bundled.exists() and bundled.stat().st_size>80000,"Offline ZXing bundle missing or incomplete"
    shutil.copy2(bundled,root/bundled.name)
    shutil.copy2("design-system/zavi-camera-scanner-v6591.js",root/"zavi-camera-scan-v635.js")
    old='<script src="./zavi-camera-scan-v635.js?v=63.5" defer></script>'
    assert html.count(old)==1, "Camera scanner tag must occur exactly once"
    html=html.replace(old,'<script src="./zavi-zxing-bundle-v6591.js?v=65.91" defer></script><script src="./zavi-camera-scan-v635.js?v=65.91" defer></script>',1)
    assert html.index('zavi-zxing-bundle-v6591.js') < html.index('zavi-camera-scan-v635.js?v=65.91')
    manifest=root/"zavi-unified20-manifest.json"
    data=json.loads(manifest.read_text(encoding="utf8"))
    assert len(data['profiles'])==20
    data['design_version']='65.91-camera-ipad-windows-menu-design'
    manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf8")
    assert (root/"annual-license.js").exists() and (root/"zavi-barcode-v641.js").exists()
    sw=root/"sw.js"
    if sw.exists():
        source=sw.read_text(encoding="utf8")
        assert "const CORE=" in source
        if "const OPTIONAL=" in source:
            source=source.replace("const OPTIONAL=",'''CORE.push("zavi-zxing-bundle-v6591.js","zavi-camera-menu-v6591.css");
const OPTIONAL=''',1)
        else:
            source=source.replace("const SCOPE=",'''CORE.push("zavi-zxing-bundle-v6591.js","zavi-camera-menu-v6591.css");
const SCOPE=''',1)
        source=re.sub(r"(const CACHE_NAME\s*=\s*['\"])[^'\"]+(['\"])",r"\1zavi-store-v6591-camera\2",source,count=1)
        sw.write_text(source,encoding="utf8")
else:
    assert (root/"zavi-admin-v1428-offline-seven-days.js").exists()
    assert (root/"zavi-admin-v1423-lifetime.js").exists()
    sw=root/"sw.js"
    if sw.exists():
        source=sw.read_text(encoding="utf8")
        if 'const CORE=' in source:
            if 'const OPTIONAL=' in source:source=source.replace('const OPTIONAL=',"CORE.push('zavi-camera-menu-v6591.css');\nconst OPTIONAL=",1)
            elif 'const SCOPE=' in source:source=source.replace('const SCOPE=',"CORE.push('zavi-camera-menu-v6591.css');\nconst SCOPE=",1)
        source=re.sub(r"(const CACHE_NAME\s*=\s*['\"])[^'\"]+(['\"])",r"\1zavi-admin-v1437-design\2",source,count=1)
        sw.write_text(source,encoding="utf8")
assert html.count('zavi-camera-menu-v6591.css')==1
assert html.rfind('</body>')>html.find('</head>')
index.write_text(html,encoding="utf8")
print('PASS',a.app,'barcodes vendor local (store only), premium menu on iPad and computer, current finance modules untouched')
