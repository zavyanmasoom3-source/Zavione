#!/usr/bin/env python3
"""Apply screenshot-matched visual layout after 65.84 base skin; no business logic changes."""
import sys,runpy,argparse,shutil,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=["one","admin"],required=True)
a=p.parse_args()
sys.argv=["apply_skin_v6584.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6584.py",run_name="__main__")
root=Path(a.web)
src=Path("design-system/zavi-unified-navigation-v6585.css")
assert src.exists() and src.stat().st_size>4000
shutil.copyfile(src,root/src.name)
edited=0
for p in root.glob("*.html"):
 page=p.read_text(encoding="utf8")
 if "zavi-unified-v6584.css" not in page:continue
 assert "zavi-unified-navigation-v6585.css" not in page
 assert "</head>" in page
 page=page.replace("</head>",'<link rel="stylesheet" href="./zavi-unified-navigation-v6585.css?v=65.85"></head>',1)
 p.write_text(page,encoding="utf8")
 edited+=1
assert edited>=1
index=(root/"index.html").read_text(encoding="utf8")
assert index.find("zavi-unified-v6584.css")<index.find("zavi-unified-navigation-v6585.css")
assert index.count("zavi-unified-navigation-v6585.css")==1
if a.app=="one":
 manifest=root/"zavi-unified20-manifest.json"
 m=json.loads(manifest.read_text(encoding="utf8"))
 assert len(m["profiles"])==20
 m["design_version"]="65.85-uniform-all-sections-general-dashboard-portrait-landscape"
 manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding="utf8")
 for name in ["annual-license.js","zavi-store-v6582-trial7-simple.js"]:
  assert (root/name).is_file()
else:
 for name in ["zavi-admin-v1428-offline-seven-days.js","zavi-admin-v1423-lifetime.js"]:
  assert (root/name).is_file()
print("PASS 65.85 screenshot-matched unified navigation for",a.app,"in",edited,"HTML pages")
