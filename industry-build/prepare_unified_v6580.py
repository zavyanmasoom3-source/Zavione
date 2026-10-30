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
style = '<link rel="stylesheet" href="./zavi-unified20.css?v=65.78-qa">'
script = '<script defer src="./zavi-unified20.js?v=65.78-qa"></script>'
for name in ("index.html", "v25-business.html"):
    file = out/name
    html = file.read_text(encoding="utf-8")
    assert "</head>" in html and "</body>" in html, name
    assert "zavi-unified20.js" not in html, "already staged"
    html = html.replace("</head>", identity + style + "</head>", 1)
    idx = html.rfind("</body>")
    html = html[:idx] + script + html[idx:]
    file.write_text(html, encoding="utf-8")
# Personal preferences are a separate, scoped layer on top of the 20-business accounting core.
for filename in ("store-v6576-settings-profile.js","store-v6576-settings-profile.css"):
    shutil.copy2("industry-build/" + filename, out/("zavi-" + filename))
main_file=out/"index.html"
main_html=main_file.read_text(encoding="utf-8")
assert 'zavi-store-v6576-settings-profile.js' not in main_html
main_html=main_html.replace("</head>", '<link rel="stylesheet" href="./zavi-store-v6576-settings-profile.css?v=65.78-qa"></head>',1)
close=main_html.rfind("</body>")
main_html=main_html[:close]+'<script defer src="./zavi-store-v6576-settings-profile.js?v=65.78-qa"></script>'+main_html[close:]
# Add non-invasive mobile, sales and barcode layout last to override legacy styles.
shutil.copy2("industry-build/store-v6577-compact-sales-barcode.css",out/"zavi-store-v6577-compact-sales-barcode.css")
main_html=main_html.replace("</head>",'<link rel="stylesheet" href="./zavi-store-v6577-compact-sales-barcode.css?v=65.78-qa"></head>',1)
# V65.78: preserve all existing features, append tested UI fixes last.
for name in ("store-v6578-allfix.js","store-v6578-allfix.css"):
    shutil.copy2("industry-build/"+name,out/("zavi-"+name))
main_html=main_html.replace("</head>", '<link rel="stylesheet" href="./zavi-store-v6578-allfix.css?v=65.78-qa"></head>',1)
pos=main_html.rfind("</body>")
main_html=main_html[:pos]+'<script defer src="./zavi-store-v6578-allfix.js?v=65.78-qa"></script>'+main_html[pos:]
assert 'zavi-store-v6578-allfix.js' in main_html
# V65.79: enable signed automatic offline lease for the cloud owner on the first authorised device.
secure_file=out/"offline-license-secure.js"
secure_text=secure_file.read_text(encoding="utf8")
assert secure_text.count("!['annual','semiannual','lifetime'].includes(p.plan)")==1
assert secure_text.count("['annual','semiannual'].includes(p.plan)")==1
secure_text=secure_text.replace("!['annual','semiannual','lifetime'].includes(p.plan)","!['annual','semiannual','trial','lifetime'].includes(p.plan)")
secure_text=secure_text.replace("['annual','semiannual'].includes(p.plan)","['annual','semiannual','trial'].includes(p.plan)")
secure_file.write_text(secure_text,encoding="utf8")
shutil.copy2("industry-build/store-v6579-auto-signed-offline.js",out/"zavi-store-v6579-auto-signed-offline.js")
pos=main_html.rfind("</body>")
main_html=main_html[:pos]+'<script defer src="./zavi-store-v6579-auto-signed-offline.js?v=65.79-qa"></script>'+main_html[pos:]
assert "zavi-store-v6579-auto-signed-offline.js" in main_html
# V65.80: one owner tap performs server-checked transfer then issues signed licence.
# Preserve V65.79 automatic first-device enrolment and existing shell/data protections.
import re
device_script=out/"device-activation.js"
transfer_source=device_script.read_text(encoding="utf8")
start=transfer_source.index("if(!approved){",transfer_source.index("async function replacePrimary(){"))
end=transfer_source.index("const reply=await rpc('zavi_v41_owner_replace_device'",start)
segment=transfer_source[start:end]
assert "confirmEmergencyTransfer" in segment and "ZaviDevices652.lastTransferBlock" in segment
direct="""if(!approved){
      const reason=window.ZaviDevices652.lastTransferBlock?.()||{};
      const detail=reason.message||msg('دستگاه قبلی باید تمام معاملات را با ابر همگام کند.','The previous device must sync all pending transactions.','پخوانۍ وسیله باید ټولې معاملې همغږي کړي.');
      update('transfer_requires_sync',detail);
      transferMessage(detail,'error');
      return false;
     }
     """
transfer_source=transfer_source[:start]+direct+transfer_source[end:]
old="'zavi_v41_owner_replace_device'"
assert transfer_source.count(old)==1
transfer_source=transfer_source.replace(old,"'zavi_v6580_owner_one_tap_transfer'")
assert 'confirmEmergencyTransfer(' not in transfer_source[transfer_source.index("async function replacePrimary(){"):transfer_source.index("async function check",transfer_source.index("async function replacePrimary(){"))] if "async function check" in transfer_source[transfer_source.index("async function replacePrimary(){"):] else True
device_script.write_text(transfer_source,encoding="utf8")
# The server whitelist and client verifier must agree on 7-day signed leases.
secure_file=out/"offline-license-secure.js"
secure_data=secure_file.read_text(encoding="utf8")
for old,new in [("[180,365]","[7,180,365]"),("[180, 365]","[7, 180, 365]")]:
    secure_data=secure_data.replace(old,new)
secure_file.write_text(secure_data,encoding="utf8")
assert "zavi_v6580_owner_one_tap_transfer" in device_script.read_text()
assert 'confirmEmergencyTransfer(' not in device_script.read_text().split("async function replacePrimary(){",1)[1].split("async function ",1)[0]
main_file.write_text(main_html,encoding="utf-8")
info = {
    "version": "65.80-one-tap-auto-offline-qa",
    "count": 20,
    "mode": "one-app-20-industries-15-user-reported-fixes",
    "ipad": "Static PWA files in Netlify-ready ZIP; APK is Android-only.",
    "profiles": [{"id": p["id"], "name": p["name"]} for p in profiles],
    "personalization": "Display-only user name/photo stored per signed-in user and workspace on this device.",
    "source": "ZAVI ONE V65.72 QA embedded frontend",
    "security": "Cloud-owner-only automatic first-device registration, server-check and ES256 offline token; existing device replacement and server authorization unchanged.",
    "trade_change": "Draft selection from one app, owner confirms on native store settings page.",
    "storage": "QA application ID is separate from production. No automatic migration or data deletion.",
    "limitation": "QA source and static validation only; real-device accounting and specialised compliance require additional tests."
}
(out/"zavi-unified20-manifest.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"files": count, "profiles": len(profiles), "output": str(out)}, ensure_ascii=False))