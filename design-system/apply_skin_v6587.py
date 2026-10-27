#!/usr/bin/env python3
"""One UI: three safe independent scales 50%-115% on ONE and owner ADMIN."""
import sys,runpy,shutil,argparse,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=("one","admin"),required=True)
a=p.parse_args()
sys.argv=["apply_skin_v6586.py","--web",a.web,"--app",a.app]
runpy.run_path("design-system/apply_skin_v6586.py",run_name="__main__")
root=Path(a.web)
for name in ["zavi-three-sizes-v6587.css","zavi-three-sizes-v6587.js"]:
 src=Path("design-system")/name
 assert src.exists() and src.stat().st_size>4000,src
 shutil.copyfile(src,root/name)
index=root/"index.html"
s=index.read_text(encoding="utf8")
assert "</head>" in s and "</body>" in s
assert "zavi-real-viewport-v6586.css" in s
assert "zavi-three-sizes-v6587.css" not in s
s=s.replace("</head>",'<link rel="stylesheet" href="./zavi-three-sizes-v6587.css?v=65.87"></head>',1)
s=s.replace("</body>",'<script data-zavi-app="'+a.app+'" src="./zavi-three-sizes-v6587.js?v=65.87"></script></body>',1)
index.write_text(s,encoding="utf8")
assert s.count('zavi-three-sizes-v6587.js')==1 and s.count('zavi-three-sizes-v6587.css')==1
assert s.index('zavi-real-viewport-v6586.css')<s.index('zavi-three-sizes-v6587.css')
if a.app=="one":
 old=root/"zavi-display-settings-v6545.js"
 t=old.read_text(encoding="utf8")
 assert "MIN=50,MAX=150,STEP=5" in t
 t=t.replace("MIN=50,MAX=150,STEP=5","MIN=50,MAX=115,STEP=5")
 t=t.replace('max="150"','max="115"').replace('<span>150%</span>','<span>115%</span>')
 old.write_text(t,encoding="utf8")
 mf=root/"zavi-unified20-manifest.json"
 data=json.loads(mf.read_text(encoding="utf8"))
 assert len(data["profiles"])==20
 data["design_version"]="65.87-independent-text-system-daily-sizes-50-to-115"
 mf.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf8")
 assert (root/"annual-license.js").exists()
else:
 assert (root/"zavi-admin-v1428-offline-seven-days.js").exists()
 assert (root/"zavi-admin-v1423-lifetime.js").exists()
print("PASS three independent settings scales 50..115",a.app,"all underlying modules preserved")
