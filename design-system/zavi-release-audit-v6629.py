#!/usr/bin/env python3
"""Fail-closed QA for staged ZAVI ONE / ADMIN assets; no APK generated."""
from pathlib import Path
import sys, zipfile, re
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path("android-build/app/src/main/assets")
errors=[]
def require(condition,message):
 if not condition:errors.append(message)
index=root/"index.html"
require(index.is_file(),"index.html missing")
if index.is_file():
 html=index.read_text(encoding="utf-8")
 for asset in ("zavi-premium-interface-v6624.css","zavi-three-theme-v6627.js"):
  require(asset in html,"Not loaded by index: "+asset)
  require((root/asset).is_file(),"Missing themed asset: "+asset)
 for key in ("</head>","</body>"):
  require(key in html.lower(),"Missing HTML structure: "+key)
css=root/"zavi-premium-interface-v6624.css"
if css.exists():
 styles=css.read_text(encoding="utf-8")
 for section in ("dashboard","invoice","settings","report","customer","dark","light","glass"):
  require(section in styles,"Theme lacks coverage marker: "+section)
voice=root/"models"
models=list(voice.glob("ggml-*.bin")) if voice.exists() else []
require(bool(models),"Offline speech model absent")
for model in models:
 require(model.stat().st_size>15_000_000,"Truncated speech model: "+model.name)
print("ZAVI staged asset audit:", "PASS" if not errors else "FAIL")
print("Models:",[(m.name,round(m.stat().st_size/1048576,1)) for m in models])
for error in errors:print("ERROR:",error)
if errors:sys.exit(1)
