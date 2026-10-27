#!/usr/bin/env python3
"""V65.89 / ADMIN 1.4.35: viewport/rotation patch layered on all V65.88 business features."""
import sys,runpy,argparse,shutil,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=("one","admin"),required=True)
a=p.parse_args()
sys.argv=["apply_skin_v6588.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6588.py",run_name="__main__")
root=Path(a.web)
for name in ("zavi-landscape-v6589.css","zavi-landscape-v6589.js"):
    src=Path("design-system")/name
    assert src.exists() and src.stat().st_size>1700,name
    shutil.copy2(src,root/name)
index=root/"index.html"
s=index.read_text(encoding="utf8")
assert "</head>" in s and "</body>" in s
assert "zavi-three-sizes-v6588.js?v=65.88" in s
assert "zavi-landscape-v6589." not in s
s=s.replace("</head>",'<link rel="stylesheet" href="./zavi-landscape-v6589.css?v=65.89"></head>',1)
s=s.replace("</body>",'<script src="./zavi-landscape-v6589.js?v=65.89"></script></body>',1)
assert s.count("zavi-landscape-v6589.css")==1 and s.count("zavi-landscape-v6589.js")==1
assert s.index("zavi-three-sizes-v6588.css")<s.index("zavi-landscape-v6589.css")
index.write_text(s,encoding="utf8")
if a.app=="one":
    profile=root/"zavi-unified20-manifest.json"
    manifest=json.loads(profile.read_text(encoding="utf8"))
    assert len(manifest["profiles"])==20
    manifest["design_version"]="65.89-landscape-rotation-fix"
    profile.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
    assert (root/"annual-license.js").exists()
else:
    assert (root/"zavi-admin-v1428-offline-seven-days.js").exists()
    assert (root/"zavi-admin-v1423-lifetime.js").exists()
print("PASS viewport fix for",a.app,"without app code/ledger/auth/lease modifications")
