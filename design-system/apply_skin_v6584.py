#!/usr/bin/env python3
"""Apply one graphical system to all existing signed APK frontends, preserving code."""
import argparse,shutil,re,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",required=True,choices=("one","admin"))
args=p.parse_args()
out=Path(args.web)
for name in ("zavi-unified-v6584.css","zavi-unified-v6584.js"):
 src=Path("design-system")/name
 assert src.is_file(),src
 shutil.copyfile(src,out/name)
 assert (out/name).stat().st_size>300
edited=[]
for page in out.glob("*.html"):
 t=page.read_text(encoding="utf8")
 if "</head>" not in t or "</body>" not in t:continue
 assert "zavi-unified-v6584.css" not in t and "zavi-unified-v6584.js" not in t,page
 # As final style it overrides the incompatible multiple legacy size controls;
 # all previous JS business modules still execute untouched.
 t=t.replace("</head>",'<link rel="stylesheet" href="./zavi-unified-v6584.css?v=65.84"><script src="./zavi-unified-v6584.js?v=65.84"></script></head>',1)
 page.write_text(t,encoding="utf8")
 edited.append(page.name)
assert 'index.html' in edited,edited
index=(out/"index.html").read_text(encoding="utf8")
assert index.count("zavi-unified-v6584.css")==1
assert index.count("zavi-unified-v6584.js")==1
if args.app=="one":
  manifest=out/"zavi-unified20-manifest.json"
  if manifest.is_file():
    meta=json.loads(manifest.read_text(encoding="utf8"))
    assert len(meta["profiles"])==20
    meta["design_version"]="65.84-one-ui-phone-tablet-landscape-desktop"
    manifest.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf8")
  for f in ["annual-license.js","zavi-unified20.js","zavi-store-v6582-trial7-simple.js"]:
    assert (out/f).is_file(),f
else:
  for f in ["account-control.js","zavi-admin-v1428-offline-seven-days.js","zavi-admin-v1423-lifetime.js"]:
    assert (out/f).is_file(),f
print("PASS unified graphical design",args.app,len(edited),"HTML pages",", ".join(edited))
