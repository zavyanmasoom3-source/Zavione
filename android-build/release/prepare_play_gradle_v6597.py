#!/usr/bin/env python3
"""Prepare original Android app for Google Play distribution, preserving canonical package IDs.
No private signing material is committed, logged, or generated here.
"""
from pathlib import Path
import argparse, re

p=argparse.ArgumentParser()
p.add_argument("--mode",choices=("one","admin"),required=True)
p.add_argument("--gradle",default="android-build/app/build.gradle")
args=p.parse_args()
f=Path(args.gradle)
s=f.read_text(encoding="utf8")
expected={
    "package":"applicationId admin ? 'com.zavione.one.admin' : 'com.zavione.one'",
    "versionCode":"versionCode admin ? 4127 : 6554",
    "versionName":"versionName admin ? '1.3.7' : '65.54'",
    "releaseSigning":"signingConfig signingConfigs.debug"
}
for key,token in expected.items():
    assert s.count(token)==1, f"Changed original Android config {key}: stop release"
s=s.replace(expected["versionCode"],"versionCode admin ? 4430 : 6597")
s=s.replace(expected["versionName"],"versionName admin ? '1.4.43' : '65.97'")
# CRITICAL: release AAB MUST NOT be signed with an ephemeral debug key.
# bundleRelease now produces unsigned app-release.aab. A separate owner-controlled
# upload key signs it in CI ONLY when ALL four secrets are present.
s=s.replace(expected["releaseSigning"],"signingConfig null")
assert "com.zavione.one.browserqa" not in s
assert "com.zavione.one.admin.browserqa" not in s
assert expected["package"] in s
assert "targetSdk 36" in s
f.write_text(s,encoding="utf8")
print(f"Prepared {args.mode}: stable package, release codes, Android API 36, and NO DEBUG SIGNING")
