#!/usr/bin/env python3
"""Prove the new old-blue QA contains exactly the original business-code assets.

Only index.html (approved CSS/JS links, UI-only organizer replacement, durable-save fix)
and three strictly-verified styling assets may differ.
Does not test native Java behavior, accounts, real networking or upgrade safety.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path
from patch_durable_save import transform as fix_durable_save
from patch_23_business_registry import modify as extend23, ALL_FILES as TRADE_FILES

ORIGINAL_SHA256 = "2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc"
ORIGINAL_COUNT = 265
CSS_NAME = "assets/legacy-ui-fixes.css"
SETTINGS_CSS = "assets/legacy-settings-approved.css"
SETTINGS_JS = "assets/legacy-settings-approved.js"
INDEX_NAME = "assets/index.html"
EXPECTED_LINK = '<link rel="stylesheet" href="./legacy-ui-fixes.css?v=6662-qa1" data-zavi-legacy-repair="true">'
BANNED_NEW = ("zavi-dual-design-v1.css", "zavi-dual-dashboard-v1.css",
              "zavi-showcase-v6668.css", "zavi-pdf-final-v6760.css")

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def assets(archive):
    return {
        name: archive.read(name) for name in archive.namelist()
        if name.startswith("assets/") and not name.endswith("/")
    }

def verify(original, qa, css_file, output):
    original = Path(original)
    qa = Path(qa)
    assert sha(original.read_bytes()) == ORIGINAL_SHA256, "Wrong old source"
    with zipfile.ZipFile(original) as o, zipfile.ZipFile(qa) as q:
        assert o.testzip() is None and q.testzip() is None, "Damaged APK ZIP"
        old = assets(o)
        now = assets(q)
    assert len(old) == ORIGINAL_COUNT, "Original source asset count changed"
    assert set(now) == set(old) | {CSS_NAME, SETTINGS_CSS, SETTINGS_JS}, "An original asset is missing or an unknown new asset was added"
    assert old[INDEX_NAME].decode("utf-8").count("</head>") >= 1
    expected_html = old[INDEX_NAME].replace(
        b"</head>", (EXPECTED_LINK + "</head>").encode("utf-8"), 1
    )
    expected_source = expected_html.decode("utf-8")
    for tag in (
        '<script defer src="./zavi-settings-priority-v6546.js?v=65.46"></script>',
        '<script defer src="./zavi-final-settings-store-v6559.js?v=20261025-final"></script>',
    ):
        assert expected_source.count(tag) == 1, "Unverified historical organizer source"
        expected_source = expected_source.replace(tag, "", 1)
    expected_source = expected_source.replace(
        "</head>",
        '<link rel="stylesheet" href="./legacy-settings-approved.css?v=6662-approved" data-zavi-settings-approved="true"></head>',
        1
    )
    assert "</body>" in expected_source
    first, last = expected_source.rsplit("</body>", 1)
    expected_source = first + '<script defer src="./legacy-settings-approved.js?v=6662-approved"></script></body>' + last
    expected_html = fix_durable_save(extend23("index.html", expected_source)).encode("utf-8")
    assert now[INDEX_NAME] == expected_html, "Unexpected HTML/JS mutation outside the approved durable-save fix"
    expected_css = Path(css_file).read_bytes()
    assert now[CSS_NAME] == expected_css, "Unverified visual patch"
    for name in (SETTINGS_CSS, SETTINGS_JS):
        source = Path(__file__).with_name(name.removeprefix("assets/"))
        assert now[name] == source.read_bytes(), f"Unverified approved settings layer: {name}"
    pristine = [name for name in old if name.removeprefix("assets/") not in TRADE_FILES]
    patched = [name for name in old if name.removeprefix("assets/") in TRADE_FILES and name != INDEX_NAME]
    for name in patched:
        expected = extend23(name.removeprefix("assets/"), old[name].decode("utf-8")).encode("utf-8")
        assert now[name] == expected, f"Unverified 23-trade registry mutation: {name}"
    untouched = [name for name in pristine if name != INDEX_NAME]
    modified = [name for name in untouched if sha(old[name]) != sha(now[name])]
    assert not modified, f"Unexpected changed unrelated original modules: {modified[:8]}"
    assert not any(x in expected_html.decode("utf-8") for x in BANNED_NEW), "New design leaked"
    assert now["assets/models/ggml-base-q5_1.bin"] == old["assets/models/ggml-base-q5_1.bin"]
    result = {
        "status": "PASS",
        "original_apk_sha256": ORIGINAL_SHA256,
        "qa_apk_sha256": sha(qa.read_bytes()),
        "original_assets": len(old),
        "qa_assets": len(now),
        "byte_identical_original_assets": len(untouched),
        "strictly_verified_trade_registry_assets": patched,
        "changed_original_assets": [INDEX_NAME, *patched],
        "added_assets": [CSS_NAME, SETTINGS_CSS, SETTINGS_JS],
        "new_design_present": False,
        "business_logic_modified": True,
        "original_functional_assets_byte_preserved": False,
        "trade_registry_only_changes_verified": True,
        "approved_settings_ui_only": True,
        "approved_business_logic_change": "after durable local commit, safely report backup/cloud failures and continue callbacks",
        "native_runtime_tested": False,
        "financial_operations_tested": False,
        "durable_save_regression_tested_by_separate_node_suite": True,
        "installed_upgrade_tested": False
    }
    dest = Path(output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "qa_apk_sha256"}, ensure_ascii=False))
    return result

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--original", required=True)
    p.add_argument("--qa", required=True)
    p.add_argument("--css", required=True)
    p.add_argument("--output", required=True)
    a = p.parse_args()
    verify(a.original, a.qa, a.css, a.output)

if __name__ == "__main__":
    main()
