#!/usr/bin/env python3
"""Prove the new old-blue QA contains exactly the original business-code assets.

Only index.html (one CSS link) and legacy-ui-fixes.css may differ.
Does not test native Java behavior, accounts, real networking or upgrade safety.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ORIGINAL_SHA256 = "2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc"
ORIGINAL_COUNT = 265
CSS_NAME = "assets/legacy-ui-fixes.css"
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
    assert set(now) == set(old) | {CSS_NAME}, "An original asset is missing or an unknown new asset was added"
    assert old[INDEX_NAME].decode("utf-8").count("</head>") >= 1
    expected_html = old[INDEX_NAME].replace(
        b"</head>", (EXPECTED_LINK + "</head>").encode("utf-8"), 1
    )
    assert now[INDEX_NAME] == expected_html, "Unexpected HTML/JS mutation"
    expected_css = Path(css_file).read_bytes()
    assert now[CSS_NAME] == expected_css, "Unverified visual patch"
    unchanged = [name for name in old if name != INDEX_NAME]
    modified = [name for name in unchanged if sha(old[name]) != sha(now[name])]
    assert not modified, f"Unexpected changed original modules: {modified[:8]}"
    assert not any(x in expected_html.decode("utf-8") for x in BANNED_NEW), "New design leaked"
    assert now["assets/models/ggml-base-q5_1.bin"] == old["assets/models/ggml-base-q5_1.bin"]
    result = {
        "status": "PASS",
        "original_apk_sha256": ORIGINAL_SHA256,
        "qa_apk_sha256": sha(qa.read_bytes()),
        "original_assets": len(old),
        "qa_assets": len(now),
        "byte_identical_original_assets": len(unchanged),
        "changed_original_assets": [INDEX_NAME],
        "added_assets": [CSS_NAME],
        "new_design_present": False,
        "business_logic_modified": False,
        "native_runtime_tested": False,
        "financial_operations_tested": False,
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
