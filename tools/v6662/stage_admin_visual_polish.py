#!/usr/bin/env python3
"""Stage and verify CSS-only polish for the immutable historical ADMIN QA.

Does not alter accounting, owner permissions, JS, external services, native
Android files or the original historical APK. Fail closed on asset mismatch.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ORIGINAL_SHA = "7d42cd47fe0f82274fd648d5d215612faf1d8fec068c624354fd1f5d69a8d63b"
ORIGINAL_SIZE = 61_815_754
ORIGINAL_ASSETS = 174
CSS = "admin-legacy-ui-polish.css"
LINK = '<link rel="stylesheet" href="./admin-legacy-ui-polish.css?v=6662-admin-qa1" data-zavi-admin-polish="true">'
THIS_DIR = Path(__file__).resolve().parent


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source_assets(original_apk):
    original_apk = Path(original_apk)
    assert original_apk.stat().st_size == ORIGINAL_SIZE, "Unexpected historical ADMIN APK size"
    assert sha(original_apk.read_bytes()) == ORIGINAL_SHA, "Unexpected historical ADMIN APK SHA-256"
    with zipfile.ZipFile(original_apk) as archive:
        assert archive.testzip() is None, "Corrupt original ADMIN APK"
        assets = {p: archive.read(p) for p in archive.namelist()
                  if p.startswith("assets/") and not p.endswith("/")}
    assert len(assets) == ORIGINAL_ASSETS, "Original ADMIN source asset count changed"
    assert "assets/index.html" in assets
    assert "assets/models/ggml-base-q5_1.bin" in assets
    return assets


def expected(old):
    assert old.count(b"</head>") >= 1, "Original ADMIN HTML missing head close"
    assert b"data-zavi-admin-polish" not in old, "Original ADMIN HTML already patched"
    return old.replace(b"</head>", (LINK + "</head>").encode(), 1)


def stage(original_apk, asset_dir, report):
    original = source_assets(original_apk)
    asset_dir = Path(asset_dir)
    actual = {
        "assets/" + str(p.relative_to(asset_dir)).replace("\\", "/"): p.read_bytes()
        for p in asset_dir.rglob("*") if p.is_file()
    }
    assert set(actual) == set(original), "Historical ADMIN staging is incomplete or mixed"
    for name, contents in original.items():
        assert actual[name] == contents, "ADMIN asset differs before polish: " + name

    css = (THIS_DIR / CSS).read_bytes()
    assert css.startswith(b"/* V66.62 historical ADMIN"), "Unexpected ADMIN CSS source"
    index = asset_dir / "index.html"
    index.write_bytes(expected(original["assets/index.html"]))
    (asset_dir / CSS).write_bytes(css)
    assert len([x for x in asset_dir.rglob("*") if x.is_file()]) == ORIGINAL_ASSETS + 1
    summary = {
        "status": "CSS_ONLY_STAGED", "baseline_sha256": ORIGINAL_SHA,
        "unchanged_historical_assets": ORIGINAL_ASSETS - 1,
        "changed_historical_assets": ["assets/index.html"],
        "new_assets": ["assets/" + CSS], "financial_logic_changed": False,
        "owner_auth_changed": False, "release_ready": False,
    }
    Path(report).write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


def verify(original_apk, qa_apk, report):
    old = source_assets(original_apk)
    qa_apk = Path(qa_apk)
    with zipfile.ZipFile(qa_apk) as archive:
        assert archive.testzip() is None, "Corrupt polished ADMIN APK"
        now = {p: archive.read(p) for p in archive.namelist()
               if p.startswith("assets/") and not p.endswith("/")}
    assert set(now) == set(old) | {"assets/" + CSS}, "Unexpected assets inserted or removed"
    for name, original_content in old.items():
        expected_content = expected(original_content) if name == "assets/index.html" else original_content
        assert now[name] == expected_content, "Historical ADMIN source modified: " + name
    assert now["assets/" + CSS] == (THIS_DIR / CSS).read_bytes(), "Admin CSS mismatch"
    result = {
        "status": "PASS_CSS_ONLY", "original_asset_count": ORIGINAL_ASSETS,
        "qa_asset_count": ORIGINAL_ASSETS + 1,
        "unchanged_historical_assets": ORIGINAL_ASSETS - 1,
        "index_only_change": True,
        "new_css_sha256": sha(now["assets/" + CSS]),
        "qa_sha256": sha(qa_apk.read_bytes()), "qa_bytes": qa_apk.stat().st_size,
        "financial_logic_changed": False, "release_ready": False,
        "real_device_tested": False,
    }
    Path(report).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=("stage", "verify"))
    p.add_argument("--original", required=True)
    p.add_argument("--assets")
    p.add_argument("--qa")
    p.add_argument("--report", required=True)
    args = p.parse_args()
    if args.mode == "stage":
        assert args.assets and not args.qa
        stage(args.original, args.assets, args.report)
    else:
        assert args.qa and not args.assets
        verify(args.original, args.qa, args.report)


if __name__ == "__main__":
    main()
