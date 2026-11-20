#!/usr/bin/env python3
"""Rebuild the OLD 62 MB ZAVI ONE WebView asset tree, not the new dev design.
Input is the immutable GitHub V6662 QA release APK; output is Android staging.
No customer data, server state, permissions, or financial rules are modified.
"""
import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path

ORIGINAL_SHA256 = "2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc"
EXPECTED_BYTES = 62_226_180
EXPECTED_ASSETS = 265
BANNED_NEW_DESIGN = ("zavi-dual-design-v1.css", "zavi-dual-dashboard-v1.css",
                     "zavi-showcase-v6668.css", "zavi-pdf-final-v6760.css")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--apk", required=True)
    p.add_argument("--dest", required=True)
    p.add_argument("--report", required=True)
    args = p.parse_args()
    apk = Path(args.apk)
    dest = Path(args.dest)
    original = apk.read_bytes()
    sha = hashlib.sha256(original).hexdigest()
    assert len(original) == EXPECTED_BYTES and sha == ORIGINAL_SHA256, (
        f"Unsafe V66.62 source substitution! bytes={len(original)} sha256={sha}")
    assert not dest.exists(), "Expected empty staging directory; do not merge new app-source!"
    dest.mkdir(parents=True)
    files = {}
    with zipfile.ZipFile(apk) as z:
        assert z.testzip() is None, "Original APK is corrupt"
        entries = [x for x in z.infolist() if x.filename.startswith("assets/") and not x.is_dir()]
        assert len(entries) == EXPECTED_ASSETS, "Historical resource count changed"
        for entry in entries:
            relative = Path(entry.filename.removeprefix("assets/"))
            assert not relative.is_absolute() and ".." not in relative.parts
            file = dest / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            content = z.read(entry)
            file.write_bytes(content)
            files[str(relative)] = hashlib.sha256(content).hexdigest()
    html_file = dest / "index.html"
    old = html_file.read_text(encoding="utf-8")
    assert old.lower().count("</head>") >= 1  # Embedded invoice templates also contain closing tags
    assert old.lower().count("</html>") >= 1
    assert not any(t in old for t in BANNED_NEW_DESIGN), "Design regression in historical baseline"
    assert "function go(p)" in old and "function render()" in old, "Original live SPA logic missing"
    # Layer only targeted bug fixes AFTER the historical design styles. Do not remove functionality.
    patch_file = Path(__file__).with_name("legacy-ui-fixes.css")
    assert patch_file.is_file()
    (dest / patch_file.name).write_bytes(patch_file.read_bytes())
    updated = old.replace("</head>", '<link rel="stylesheet" href="./legacy-ui-fixes.css?v=6662-qa1" data-zavi-legacy-repair="true"></head>', 1)
    # Approved Settings V66.62: old UI-only organizers conflict and one removes
    # the original "enable all features" control. Supersede ONLY those organizers;
    # retain their original JS assets and every functional/settings handler.
    redundant_organizers = (
        "zavi-settings-priority-v6546.js",
        "zavi-final-settings-store-v6559.js",
    )
    disabled_organizers = []
    for name in redundant_organizers:
        pattern = r'<script\\b[^>]*\\bsrc=["\\\']\\./' + re.escape(name) + r'\\?[^"\\\']*["\\\'][^>]*>\\s*</script>'
        updated, count = re.subn(pattern, "", updated, flags=re.I)
        assert count == 1, f"Unexpected old settings organizer references: {name}: {count}"
        disabled_organizers.append(name)
    css_name = "legacy-settings-approved.css"
    js_name = "legacy-settings-approved.js"
    for name in (css_name, js_name):
        src = Path(__file__).with_name(name)
        assert src.is_file(), f"Missing approved settings layer: {name}"
        (dest / name).write_bytes(src.read_bytes())
    assert updated.count("</body>") == 1, "Unexpected historical body closure"
    updated = updated.replace("</head>", '<link rel="stylesheet" href="./legacy-settings-approved.css?v=6662-approved" data-zavi-settings-approved="true"></head>', 1)
    updated = updated.replace("</body>", '<script defer src="./legacy-settings-approved.js?v=6662-approved"></script></body>', 1)
    assert 'id="zaviEnableAllFeatures"' in updated, "Original enable-all control changed"
    assert 'data-module-id=' in updated and 'data-z20-option=' in updated
    html_file.write_text(updated, encoding="utf-8")
    # Ensure every local stylesheet and script in the exact historical HTML still exists.
    references = re.findall(r'<(?:script|link)\b[^>]+?(?:src|href)=["\'](\./[^"\']+)["\']', updated, re.I)
    missing = [ref for ref in references if not (dest / ref.split("?",1)[0].removeprefix("./")).is_file()]
    assert not missing, f"Missing embedded assets: {missing[:30]}"
    # Validate all original Javascript assets before packing the APK.
    failures = []
    for js in dest.rglob("*.js"):
        checked = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if checked.returncode:
            failures.append([str(js.relative_to(dest)), checked.stderr[:250]])
    assert not failures, f"Broken original JavaScript: {failures[:10]}"
    assert (dest / "models/ggml-base-q5_1.bin").stat().st_size == 59_707_625
    original_after = dict(files)
    # Every single original resource must remain byte-identical apart from index.html.
    for relative, original_hash in original_after.items():
        if relative == "index.html":
            continue
        assert hashlib.sha256((dest/relative).read_bytes()).hexdigest() == original_hash, f"Changed legacy resource: {relative}"
    report = {"baseline_apk_sha256":sha,"baseline_bytes":len(original),
              "original_resources":len(files),"extra_stylesheets":["legacy-ui-fixes.css",css_name],
              "extra_scripts":[js_name],"superseded_ui_organizers":disabled_organizers,
              "changed_original_resources":["index.html"],
              "preserved_original_resources":len(files)-1,
              "model_size":(dest/"models/ggml-base-q5_1.bin").stat().st_size,
              "no_new_design_confirmed":True,
              "render_test":"NOT_VERIFIED",
              "finance_and_sync_test":"NOT_VERIFIED",
              "original_package_upgrade":"NOT_SUPPORTED_without_matching_signing_key"}
    Path(args.report).parent.mkdir(parents=True,exist_ok=True)
    Path(args.report).write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n", encoding="utf-8")
    print(json.dumps(report,indent=2))

if __name__ == "__main__":
    main()
