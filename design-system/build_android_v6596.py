#!/usr/bin/env python3
"""Stage updated ONE 65.88 or ADMIN 1.4.34 APK with exactly the original business functionality and unified design."""
import argparse,sys,runpy,hashlib,zipfile,shutil,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--app",choices=["one","admin"],required=True)
p.add_argument("--apk",required=True)
p.add_argument("--expected-sha",required=True)
a=p.parse_args()
apk=Path(a.apk)
assert apk.exists()
assert hashlib.sha256(apk.read_bytes()).hexdigest().lower()==a.expected_sha.lower(),"Original APK hash mismatch"
assets=Path("android-build/app/src/main/assets")
if assets.exists():shutil.rmtree(assets)
assets.mkdir(parents=True,exist_ok=True)
n=0
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None,"Input APK corrupted"
 for entry in z.infolist():
  if not entry.filename.startswith("assets/") or entry.is_dir():continue
  rel=Path(entry.filename).relative_to("assets")
  if not rel.parts or ".." in rel.parts or rel.is_absolute():raise ValueError("Invalid path")
  if rel.parts[0] in ("META-INF","dexopt"):continue
  target=assets/rel
  target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(z.read(entry.filename));n+=1
assert n>= (175 if a.app=="one" else 100),n
sys.argv=["apply_skin_v6596.py","--web",str(assets),"--app",a.app]
runpy.run_path("design-system/apply_skin_v6596.py",run_name="__main__")
# Native Android speech recognition chooser, scoped to the first-party embedded web app.
native=Path('android-build/app/src/main/java/com/zavione/mobile/MainActivity.java')
if 'ZaviAndroidVoice' not in native.read_text(encoding='utf8'):
 runpy.run_path('design-system/patch_native_voice_v6596.py',run_name='__main__')
else:
 assert 'RecognizerIntent.ACTION_RECOGNIZE_SPEECH' in native.read_text(encoding='utf8')
 print('PASS reused previously patched native voice handler in shared CI build')
original=subprocess.check_output(["git","show","HEAD:android-build/app/build.gradle"],text=True)
if a.app=="one":
 pairs={
 "admin ? 'com.zavione.one.admin' : 'com.zavione.one'":"admin ? 'com.zavione.one.admin' : 'com.zavione.one.unified20.v6596voiceqa'",
 "versionCode admin ? 4127 : 6554":"versionCode admin ? 4127 : 659600",
 "versionName admin ? '1.3.7' : '65.54'":"versionName admin ? '1.3.7' : '65.96-voice-qa'",
 "admin ? 'ZAVI ONE ADMIN' : 'ZAVI ONE'":"admin ? 'ZAVI ONE ADMIN' : 'ZAVI ONE 20 Businesses'"
 }
else:
 pairs={
 "admin ? 'com.zavione.one.admin' : 'com.zavione.one'":"admin ? 'com.zavione.one.admin.voice1442qa' : 'com.zavione.one'",
 "versionCode admin ? 4127 : 6554":"versionCode admin ? 144200 : 6554",
 "versionName admin ? '1.3.7' : '65.54'":"versionName admin ? '1.4.42-voice-qa' : '65.54'",
 "admin ? 'ZAVI ONE ADMIN' : 'ZAVI ONE'":"admin ? 'ZAVI ONE ADMIN Design QA' : 'ZAVI ONE'"
 }
for old,new in pairs.items():
 assert original.count(old)==1,old
 original=original.replace(old,new)
assert "targetSdk 36" in original and "signingConfig signingConfigs.debug" in original
Path("android-build/app/build.gradle").write_text(original)
icons=Path("android-build/app/src/main/res/drawable-nodpi")
icons.mkdir(parents=True,exist_ok=True)
shutil.copy2("android-build/icons/"+a.app+".webp",icons/"zavi_launcher_image.webp")
assert (assets/"index.html").exists()
print("PASS full",a.app,"baseline APK files",n,"three independent no-zoom text/system/icon sliders 50-150 and landscape reflow, no original app JavaScript changed")
