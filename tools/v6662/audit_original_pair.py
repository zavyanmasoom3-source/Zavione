#!/usr/bin/env python3
"""Read-only integrity audit of BOTH historical V66.62-labeled APK asset trees.

These APKs are a reference to the desired OLD visuals; their Android versionNames
are NOT proven to equal the release tag. This tool never edits a customer database,
the original APK, or the repo's app-source folders.
"""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path, PurePosixPath

BASELINES = {
    "one": {
        "filename": "ZAVI_one_V6662_DEBUG_QA.apk",
        "bytes": 62226180,
        "sha256": "2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc",
        "asset_count": 265,
        "manifest_version_name": "66.23",
    },
    "admin": {
        "filename": "ZAVI_admin_V6662_DEBUG_QA.apk",
        "bytes": 61815754,
        "sha256": "7d42cd47fe0f82274fd648d5d215612faf1d8fec068c624354fd1f5d69a8d63b",
        "asset_count": 174,
        "manifest_version_name": "1.4.54",
    },
}
MODEL = "models/ggml-base-q5_1.bin"
MODEL_SHA256 = "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898"
MODEL_BYTES = 59707625
BANNED = ("zavi-dual-design-v1.css", "zavi-dual-dashboard-v1.css",
          "zavi-showcase-v6668.css", "zavi-pdf-final-v6760.css")
REF = re.compile(r'<(?:script|link)\b[^>]+?(?:src|href)=["\'](\./[^"\']+)["\']', re.I)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def inspect(app, path, dest=None):
    spec = BASELINES[app]
    apk = Path(path)
    assert apk.stat().st_size == spec["bytes"], f"{app}: wrong APK size"
    assert digest(apk.read_bytes()) == spec["sha256"], f"{app}: SHA-256 mismatch (wrong historical APK)"
    if dest is not None:
        dest = Path(dest)
        assert not dest.exists(), f"{app}: destination already exists; never merge new-design assets"
        dest.mkdir(parents=True, exist_ok=False)
    with zipfile.ZipFile(apk) as archive:
        assert archive.testzip() is None, f"{app}: damaged archive"
        entries = [entry for entry in archive.infolist()
                   if entry.filename.startswith("assets/") and not entry.is_dir()]
        assert len(entries) == spec["asset_count"], f"{app}: asset count changed"
        hashed = {}
        for item in entries:
            name = item.filename[len("assets/"):]
            component = PurePosixPath(name)
            assert name and not component.is_absolute() and ".." not in component.parts, \
                f"{app}: unsafe asset filename"
            assert name not in hashed, f"{app}: duplicate asset {name}"
            content = archive.read(item)
            hashed[name] = digest(content)
            if dest is not None:
                target = dest.joinpath(*component.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
        assert "index.html" in hashed, f"{app}: index missing"
        assert MODEL in hashed, f"{app}: model missing"
        assert hashed[MODEL] == MODEL_SHA256, f"{app}: model content differs"
        assert archive.getinfo("assets/" + MODEL).file_size == MODEL_BYTES
        html = archive.read("assets/index.html").decode("utf-8")
        assert "<html" in html.lower() and "</html>" in html.lower()
        assert "<head" in html.lower() and "</head>" in html.lower()
        assert not any(b in html for b in BANNED), f"{app}: new redesign found in baseline"
        references = sorted(set(REF.findall(html)))
        missing = [r for r in references
                   if r.split("?", 1)[0][2:] not in hashed]
        assert not missing, f"{app}: unresolved local references: {missing[:8]}"
        # Byte-preserving extraction is mandatory: no silent source rewrite.
        if dest is not None:
            for name, sha in hashed.items():
                assert digest(dest.joinpath(*PurePosixPath(name).parts).read_bytes()) == sha
        return {
            "app": app,
            "label": "V66.62 historical release (not proven Android versionName)",
            "manifest_version_name_from_prior_aapt_audit": spec["manifest_version_name"],
            "original_apk_bytes": spec["bytes"],
            "original_apk_sha256": spec["sha256"],
            "asset_count": len(hashed),
            "referenced_local_files": len(references),
            "missing_local_files": missing,
            "model_bytes": MODEL_BYTES,
            "model_sha256": MODEL_SHA256,
            "new_design_present": False,
            "files": dict(sorted(hashed.items())),
            "notes": [
                "This validates APK embedded assets, not the historical native Java source.",
                "Does not test Android signing, installed upgrades, finance or live sync.",
                "Keep reference APKs unchanged; rebuilding uses a distinct QA identifier.",
            ],
        }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--one", required=True, help="Original 62 MB ZAVI ONE APK")
    p.add_argument("--admin", required=True, help="Original 61 MB ZAVI ONE ADMIN APK")
    p.add_argument("--output", required=True, help="JSON provenance manifest")
    p.add_argument("--one-dest", help="Optional new, empty output directory for ONE assets")
    p.add_argument("--admin-dest", help="Optional new, empty output directory for ADMIN assets")
    args = p.parse_args()
    result = {
        "baseline": "original-blue-design",
        "reconstructed_from_exact_historical_apk_files": True,
        "release_ready": False,
        "apps": {
            "one": inspect("one", args.one, args.one_dest),
            "admin": inspect("admin", args.admin, args.admin_dest),
        },
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PASS",
        "one_assets": result["apps"]["one"]["asset_count"],
        "admin_assets": result["apps"]["admin"]["asset_count"],
        "models_equal": result["apps"]["one"]["model_sha256"] == result["apps"]["admin"]["model_sha256"],
        "report": str(out),
        "release_ready": False,
    }, ensure_ascii=False))

if __name__ == "__main__":
    main()
