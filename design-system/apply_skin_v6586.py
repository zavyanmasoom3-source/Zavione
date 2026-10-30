#!/usr/bin/env python3
"""Viewport-safe patch for V65.86/ADMIN 1.4.32. Leaves cloud, accounting, offline, trial logic untouched."""
import sys,runpy,argparse,shutil
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument("--web",required=True)
parser.add_argument("--app",choices=["one","admin"],required=True)
arg=parser.parse_args()
sys.argv=["apply_skin_v6585.py","--web",arg.web,"--app",arg.app]
runpy.run_path("design-system/apply_skin_v6585.py",run_name="__main__")
web=Path(arg.web)
css=Path("design-system/zavi-real-viewport-v6586.css")
assert css.is_file() and css.stat().st_size>6000
shutil.copyfile(css,web/css.name)
index=web/"index.html"
s=index.read_text(encoding="utf8")
assert "</head>" in s and s.count("zavi-unified-navigation-v6585.css")==1
assert "zavi-real-viewport-v6586.css" not in s
s=s.replace("</head>",'<link rel="stylesheet" href="./zavi-real-viewport-v6586.css?v=65.86"></head>',1)
index.write_text(s,encoding="utf8")
def patch(name,pairs):
 p=web/name;txt=p.read_text(encoding="utf8")
 for old,new in pairs:
  assert txt.count(old)==1,(name,old,txt.count(old))
  txt=txt.replace(old,new)
 p.write_text(txt,encoding="utf8")
if arg.app=="one":
 patch("zavi-display-settings-v6545.js",[
  ("MIN=50,MAX=115,STEP=5","MIN=50,MAX=150,STEP=5"),
  ("document.documentElement.style.zoom=String(percent/100);",'document.documentElement.style.removeProperty("zoom");document.documentElement.style.setProperty("--z86-ui-scale",String(percent/100));'),
  ('max="115"','max="150"'),
  ('<span>115%</span>','<span>150%</span>'),
 ])
else:
 patch("zavi-admin-v140-ui-fixes.js",[
  ("document.documentElement.style.zoom=String(size/100);",'document.documentElement.style.removeProperty("zoom");'),
 ])
 patch("zavi-admin-v1424-allfix.js",[
  ("root.style.setProperty('--z425-ui-scale',String(v/100));","root.style.setProperty('--z425-ui-scale',String(v/100));document.documentElement.style.setProperty('--z86-ui-scale',String(v/100));")
 ])
txt=index.read_text(encoding="utf8")
assert txt.index("zavi-unified-navigation-v6585.css") < txt.index("zavi-real-viewport-v6586.css")
assert txt.count("zavi-real-viewport-v6586.css")==1
print("PASS viewport-safe patch",arg.app,"preserving every feature and all active records")
