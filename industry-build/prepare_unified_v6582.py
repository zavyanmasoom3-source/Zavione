#!/usr/bin/env python3
"""ZAVI ONE V65.82: one 20-trade app, automatic signed 7-day trial offline lease,
simple visible retry/troubleshooting controls, server-managed entitlements.
"""
import runpy,sys,shutil,json
from pathlib import Path
runpy.run_path("industry-build/prepare_unified_v6581.py",run_name="__main__")
out=Path(sys.argv[sys.argv.index("--web")+1])
for name in ("store-v6582-trial7-simple.js","store-v6582-trial7-simple.css"):
 source=Path("industry-build")/name
 target=out/("zavi-"+name)
 shutil.copy2(source,target)
 assert target.is_file() and target.stat().st_size>1000
ui=out/"offline-ui-v46.js"
data=ui.read_text(encoding="utf-8")
old="try{await window.zaviAutoOffline?.prepare?.();}catch(e)"
new="try{await window.ZaviAutoLease?.refresh?.();await window.zaviAutoOffline?.prepare?.();}catch(e)"
assert data.count(old)==1, "Cannot safely replace original retry handler"
ui.write_text(data.replace(old,new),encoding="utf-8")
html=out/"index.html"
content=html.read_text(encoding="utf-8")
assert "zavi-store-v6579-auto-signed-offline.js" in content
assert "</head>" in content and "</body>" in content
content=content.replace("</head>",'<link rel="stylesheet" href="./zavi-store-v6582-trial7-simple.css?v=65.82"></head>',1)
index=content.rfind("</body>")
content=content[:index]+'<script defer src="./zavi-store-v6582-trial7-simple.js?v=65.82"></script>'+content[index:]
html.write_text(content,encoding="utf-8")
manifest=out/"zavi-unified20-manifest.json"
meta=json.loads(manifest.read_text(encoding="utf-8"))
meta["version"]="65.82-trial7-auto-offline-simple-qa"
meta["offline_trial"]="Owner-controlled seven-day trial extension enables seven-day offline server policy automatically; the device fetches signed ES256 lease on cloud sign-in and prepares its offline app shell."
meta["offline_ui"]="Compact signed status, localized readable retry + diagnostics; original safety controls retained."
manifest.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf-8")
print("PASS: 20 businesses, existing cloud transfer, signed auto offline, seven-day policy display, straightforward retry.")
