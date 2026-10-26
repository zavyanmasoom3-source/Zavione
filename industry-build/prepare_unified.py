#!/usr/bin/env python3
"""Stage one offline-capable ZAVI ONE Android app with 20 selectable trade profiles.

Never resets accounting records or assigns subscription/owner privileges.
Master embedded assets are extracted from an independently SHA-checked QA APK.
"""
from __future__ import annotations
import argparse
import json
import shutil
import zipfile
from pathlib import Path

arg = argparse.ArgumentParser()
arg.add_argument("--apk", required=True)
arg.add_argument("--web", required=True)
args = arg.parse_args()
master = Path(args.apk)
out = Path(args.web)
out.mkdir(parents=True, exist_ok=True)
raw = json.loads(Path("industry-build/industry-profiles.json").read_text(encoding="utf-8"))
profiles = raw["profiles"]
identifiers = [x["id"] for x in profiles]
assert len(profiles) == 20 and len(set(identifiers)) == 20, "expected twenty unique trade profiles"
assert "general" in identifiers and "exchange" in identifiers and "pharmacy" in identifiers
count = 0
with zipfile.ZipFile(master) as package:
    for entry in package.infolist():
        if entry.is_dir() or not entry.filename.startswith("assets/"):
            continue
        relative = Path(entry.filename).relative_to("assets")
        if ".." in relative.parts or relative.is_absolute() or not relative.parts:
            raise ValueError("unsafe APK member")
        if relative.parts[0] in ("META-INF", "dexopt"):
            continue
        path = out / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(package.read(entry.filename))
        count += 1
assert count >= 95, "base master assets incomplete"
assets = ["index.html", "v25-business.html", "zavi-industry-kit-v6525.js",
          "zavi-industry-engine-v6526.js", "zavi-industry-forms-v6529.js",
          "zavi-v6572-store-trial7.js", "zavi-v6572-offline-accounting-assistant.js",
          "zavi-v6570-store-offline.js", "offline-license-secure.js"]
for name in assets:
    assert (out/name).is_file(), "missing verified master file: " + name
shutil.copy2("industry-build/unified20.js", out/"zavi-unified20.js")
shutil.copy2("industry-build/unified20.css", out/"zavi-unified20.css")
payload = json.dumps(profiles, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
identity = '<script>window.ZAVI_UNIFIED_PROFILES=' + payload + ';</script>'
style = '<link rel="stylesheet" href="./zavi-unified20.css?v=65.74-qa">'
script = '<script defer src="./zavi-unified20.js?v=65.74-qa"></script>'
for name in ("index.html", "v25-business.html"):
    file = out/name
    html = file.read_text(encoding="utf-8")
    assert "</head>" in html and "</body>" in html, name
    assert "zavi-unified20.js" not in html, "already staged"
    html = html.replace("</head>", identity + style + "</head>", 1)
    idx = html.rfind("</body>")
    html = html[:idx] + script + html[idx:]
    file.write_text(html, encoding="utf-8")
info = {
    "version": "65.74-unified20-qa",
    "count": 20,
    "mode": "one-app-saved-tenant-profile",
    "profiles": [{"id": p["id"], "name": p["name"]} for p in profiles],
    "source": "ZAVI ONE V65.72 QA embedded frontend",
    "security": "Original cloud login, store workspace, server-side grants and signed offline lease remain unchanged.",
    "trade_change": "Draft selection from one app, owner confirms on native store settings page.",
    "storage": "QA application ID is separate from production. No automatic migration or data deletion.",
    "limitation": "QA source and static validation only; real-device accounting and specialised compliance require additional tests."
}
(out/"zavi-unified20-manifest.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"files": count, "profiles": len(profiles), "output": str(out)}, ensure_ascii=False))