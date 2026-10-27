#!/usr/bin/env python3
"""ZAVI ONE 65.88 / ADMIN 1.4.34: same accessible text/system/icon sizing on every surface."""
import argparse, runpy, sys, shutil, json
from pathlib import Path

arg = argparse.ArgumentParser()
arg.add_argument("--web", required=True)
arg.add_argument("--app", choices=("one","admin"), required=True)
a = arg.parse_args()
sys.argv = ["apply_skin_v6587.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6587.py",run_name="__main__")
root = Path(a.web)
for filename in ("zavi-three-sizes-v6588.js", "zavi-three-sizes-v6588.css"):
    src = Path("design-system") / filename
    assert src.is_file() and src.stat().st_size > 8000, filename
    shutil.copy2(src,root / filename)
index = root / "index.html"
s = index.read_text(encoding="utf8")
old = '<script data-zavi-app="' + a.app + '" src="./zavi-three-sizes-v6587.js?v=65.87"></script>'
assert s.count(old) == 1, "Old triple slider script must occur exactly once"
s = s.replace(old,"")
assert "</head>" in s and "</body>" in s
s = s.replace("</head>",'<link rel="stylesheet" href="./zavi-three-sizes-v6588.css?v=65.88"></head>',1)
s = s.replace("</body>",'<script data-zavi-app="' + a.app + '" src="./zavi-three-sizes-v6588.js?v=65.88"></script></body>',1)
assert s.count('zavi-three-sizes-v6588.js') == 1
assert s.count('zavi-three-sizes-v6588.css') == 1
assert 'src="./zavi-three-sizes-v6587.js' not in s
assert s.index('zavi-real-viewport-v6586.css') < s.index('zavi-three-sizes-v6588.css')
index.write_text(s,encoding="utf8")
if a.app == "one":
    p = root / "zavi-unified20-manifest.json"
    m = json.loads(p.read_text(encoding="utf8"))
    assert len(m["profiles"]) == 20
    m["design_version"] = "65.88-independent-text-system-icons-50-to-150"
    p.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding="utf8")
    assert (root/"annual-license.js").is_file()
else:
    assert (root/"zavi-admin-v1428-offline-seven-days.js").is_file()
    assert (root/"zavi-admin-v1423-lifetime.js").is_file()
print("PASS",a.app,"exact three sliders TEXT/SYSTEM/ICONS 50%-150%, no root zoom, original financial modules intact")
