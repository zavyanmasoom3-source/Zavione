#!/usr/bin/env python3
"""Fail-closed Android in-place upgrade identity preflight (no app data accessed).

For a non-destructive Android package upgrade the package name must match, the
new versionCode must increase, and the signer must match. A different signer may
be legal only with a separately verified APK Signature Scheme v3 signing lineage;
this tool intentionally BLOCKS rather than guessing lineage compatibility.

Never run an install/uninstall as part of this check.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

PKG = re.compile(r"\bpackage:\s+name='([^']+)'\s+versionCode='(\d+)'(?:\s+versionName='([^']*)')?")
CERT = re.compile(r"Signer #1 certificate SHA-256 digest:\s*([0-9A-Fa-f:]{64,95})")

class CheckError(Exception):
    pass

def parse_package(output):
    m = PKG.search(output)
    if not m:
        raise CheckError("aapt package/version identity missing")
    return {"package": m.group(1), "version_code": int(m.group(2)),
            "version_name": m.group(3) or ""}

def parse_signer(output):
    certs = CERT.findall(output)
    if len(certs) != 1:
        raise CheckError("expected one unambiguous APK signing certificate")
    return certs[0].replace(":", "").lower()

def check(old_badging, old_certs, candidate_badging, candidate_certs):
    issues = []
    try:
        old = parse_package(old_badging)
        new = parse_package(candidate_badging)
    except CheckError as exc:
        return {"safe_in_place_upgrade": False, "reasons": [str(exc)],
                "note": "Blocked without modifying installed apps or data."}
    try:
        old_sig = parse_signer(old_certs)
        new_sig = parse_signer(candidate_certs)
    except CheckError as exc:
        return {"safe_in_place_upgrade": False, "reasons": [str(exc)],
                "old": old, "new": new}
    if old["package"] != new["package"]:
        issues.append("PACKAGE_MISMATCH: Android installs into separate app data storage")
    if new["version_code"] <= old["version_code"]:
        issues.append("NON_INCREASING_VERSION_CODE: in-place upgrade version must increase")
    if old_sig != new_sig:
        issues.append("SIGNER_MISMATCH: no verified signing lineage; do not update existing customer app")
    return {"safe_in_place_upgrade": not issues, "old": old, "new": new,
            "old_certificate_sha256": old_sig,
            "candidate_certificate_sha256": new_sig,
            "reasons": issues, "signing_lineage_verified": False,
            "backup_restoration_verified": False,
            "scope": "Android install identity only, not financial or offline data validation"}

def run(*args):
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode:
        raise CheckError(f"verification command failed: {args[0]} (exit {proc.returncode})")
    return proc.stdout

def verify_apk(path, signer_tool, aapt):
    path = str(Path(path).resolve())
    if not Path(path).is_file():
        raise CheckError("APK missing")
    certs = run(signer_tool, "verify", "--verbose", "--print-certs", path)
    badging = run(aapt, "dump", "badging", path)
    return badging, certs

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--installed-reference", required=True, help="APK corresponding exactly to current installed app")
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--apksigner", required=True)
    parser.add_argument("--aapt", required=True)
    parser.add_argument("--json", required=True)
    args = parser.parse_args()
    try:
        a, b = verify_apk(args.installed_reference, args.apksigner, args.aapt)
        c, d = verify_apk(args.candidate, args.apksigner, args.aapt)
        report = check(a, b, c, d)
    except CheckError as exc:
        report = {"safe_in_place_upgrade": False, "reasons": [str(exc)],
                  "scope": "Android install identity only"}
    report["installed_reference_file"] = Path(args.installed_reference).name
    report["candidate_file"] = Path(args.candidate).name
    output = Path(args.json)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["safe_in_place_upgrade"] else 2)

if __name__ == "__main__":
    main()
