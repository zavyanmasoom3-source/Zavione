#!/usr/bin/env python3
"""Build full standalone Electron Windows shell from the *exact* SHA-256 matched APK web assets.
Do not run APK bytecode or fake a Windows converter; preserve the bundled frontend unmodified.
"""
import argparse, hashlib, json, re, shutil, zipfile
from pathlib import Path

CONFIG = {
  "one": {
    "sha": "fee4ae8ec59a8d433f95c631fe26dfd46fcb8d4916aca01ed5b3090cf5a4d018",
    "title": "ZAVI ONE",
    "name": "zavi-one-20-businesses-windows-qa",
    "version": "65.83.0",
    "app_id": "com.zavione.one.windows.v6583qa",
    "exe": "Setup_ZAVI_ONE_V65_83_Windows_x64_QA.exe",
    "icon": "web/icon-512.png",
    "userdata": "ZAVI_ONE_V6583_Windows_Desktop",
    "minimum": 175,
  },
  "admin": {
    "sha": "4d06d6e76f6e7238ea01b4759f617087c195741267f191d89e0a865aff3f1eea",
    "title": "ZAVI ONE ADMIN",
    "name": "zavi-one-admin-windows-qa",
    "version": "1.4.29",
    "app_id": "com.zavione.one.admin.windows.v1429qa",
    "exe": "Setup_ZAVI_ONE_ADMIN_V1_4_29_Windows_x64_QA.exe",
    "icon": "web/icon.png",
    "userdata": "ZAVI_ONE_ADMIN_V1429_Windows_Desktop",
    "minimum": 100,
  },
}
arg=argparse.ArgumentParser()
arg.add_argument('--mode',choices=CONFIG,required=True)
arg.add_argument('--apk',required=True)
arg.add_argument('--output',required=True)
a=arg.parse_args()
cfg=CONFIG[a.mode]
source=Path(a.apk)
root=Path(a.output)
web=root/'web'
assert source.exists(),source
sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert sha==cfg['sha'], "APKs do not match user-provided original SHA-256"
web.mkdir(parents=True,exist_ok=True)
found=0
with zipfile.ZipFile(source) as bundle:
    bad=bundle.testzip()
    assert bad is None,bad
    for entry in bundle.infolist():
        if not entry.filename.startswith('assets/') or entry.is_dir():continue
        part=Path(entry.filename).relative_to('assets')
        if not part.parts or '..' in part.parts or part.is_absolute():raise ValueError('Unsafe APK zip entry')
        if part.parts[0] in ('dexopt','META-INF'):continue
        dst=web/part
        dst.parent.mkdir(parents=True,exist_ok=True)
        dst.write_bytes(bundle.read(entry.filename))
        found+=1
assert found>=cfg['minimum'],(a.mode,found)
for essential in ('index.html','manifest.webmanifest','sw.js'):
    assert (web/essential).is_file(),essential
assert (root/'web'/Path(cfg['icon']).name).is_file(),cfg['icon']
page=(web/'index.html').read_text(encoding='utf8')
assert 'ZAVI ONE' in page
missing=[]
references=0
for tag in re.findall(r'<(?:script|link)\b[^>]*>',page,re.I):
    if tag.lower().startswith('<link') and not any(v in tag.lower() for v in ('stylesheet','manifest','icon')):continue
    match=re.search(r"""(?:src|href)\s*=\s*(['"])(.*?)\1""",tag,re.I)
    if not match:continue
    target=match.group(2).split('?',1)[0].split('#',1)[0]
    if not target or target.startswith(('https:','http:','data:','//')):continue
    references+=1
    destination=web/target.lstrip('./').lstrip('/')
    if not destination.exists():missing.append(target)
assert not missing,'Missing critical app files: '+str(missing)
if a.mode=='one':
    import json
    profiles=json.loads((web/'zavi-unified20-manifest.json').read_text(encoding='utf8')).get('profiles',[])
    assert len(profiles)==20,"20 trade editions must all be included"
    assert 'annual-license.js' in (web/'index.html').read_text()
    assert "['annual','semiannual','trial'].includes(entitlement.plan)" in (web/'annual-license.js').read_text()
    assert (web/'zavi-store-v6582-trial7-simple.js').exists()
else:
    assert (web/'zavi-admin-v1428-offline-seven-days.js').exists()
    assert (web/'zavi-admin-v1423-lifetime.js').exists()
# Use bundled static server and strict Electron sandbox. Localhost is a secure context
# allowing Service Workers and camera scanning permission on Windows 10/11.
shutil.copy2('windows-build/main.cjs',root/'main.cjs')
shutil.copy2('windows-build/desktop-server.cjs',root/'desktop-server.cjs')
main=(root/'main.cjs').read_text(encoding='utf8')
old='IS_ADMIN?"ZAVI_ONE_ADMIN_Desktop":"ZAVI_ONE_Desktop"'
new='IS_ADMIN?"ZAVI_ONE_ADMIN_V1429_Windows_Desktop":"ZAVI_ONE_V6583_Windows_Desktop"'
assert main.count(old)==1
main=main.replace(old,new)
(root/'main.cjs').write_text(main,encoding='utf8')
server=(root/'desktop-server.cjs').read_text(encoding='utf8')
needle='".png":"image/png",'
assert server.count(needle)==1
server=server.replace(needle,needle+'".webp":"image/webp",".gif":"image/gif",".avif":"image/avif",".pdf":"application/pdf",".wasm":"application/wasm",')
(root/'desktop-server.cjs').write_text(server,encoding='utf8')
pkg={
  "name":cfg["name"],"productName":cfg["title"],"version":cfg["version"],
  "private":True,"description":cfg["title"]+" standalone Windows 10/11 x64 from exact signed Android frontend",
  "main":"main.cjs",
  "scripts":{"test":"node --check main.cjs && node --check desktop-server.cjs","dist:win":"electron-builder --win nsis --x64"},
  "devDependencies":{"electron":"38.6.0","electron-builder":"26.0.12"},
  "build":{
    "appId":cfg["app_id"],"productName":cfg["title"],"asar":True,
    "directories":{"output":"dist"},
    "files":["main.cjs","desktop-server.cjs","web/**/*","package.json","!**/*.map"],
    "win":{"icon":cfg["icon"],"target":[{"target":"nsis","arch":["x64"]}],"requestedExecutionLevel":"asInvoker"},
    "nsis":{"oneClick":False,"perMachine":False,"allowToChangeInstallationDirectory":True,
      "createDesktopShortcut":True,"createStartMenuShortcut":True,
      "shortcutName":cfg["title"],"deleteAppDataOnUninstall":False,
      "artifactName":cfg["exe"]}
  }
}
(root/'package.json').write_text(json.dumps(pkg,ensure_ascii=False,indent=2),encoding="utf8")
report={
  "app":cfg["title"],
  "android_sha256":sha,"asset_count":found,
  "verified_local_file_references":references,
  "source":"The user-uploaded APK and matching GitHub branch binary",
  "target":"Windows 10/11 x64; Electron+NSIS real Setup EXE",
  "offline":"Bundled web files and localhost service worker; valid server-signed offline permission required for offline transactions",
  "account":"Same ZAVI cloud backend, per-Windows-application local data directory, not automatically copied from phone",
  "limits":"Unsigned QA Windows installer; hardware camera, thermal printer, offline lease on a real Windows device still need acceptance tests",
}
(root/'BUILD_SOURCE_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
(root/'README_DARI.txt').write_text(
  cfg['title']+' – Windows 10/11 x64 (نسخه آزمایشی بدون امضای Authenticode)\\n'
  'از همان فایل APK فرستاده‌شده استخراج شده است؛ امکانات و اسکریپت‌های وب حذف نشده‌اند.\\n'
  'ابتدا وارد حساب ابری شوید و دستگاه را به صورت مجاز فعال کنید تا مجوز آفلاین امضاشده صادر شود.\\n'
  'اطلاعات محلی ویندوز جدا از گوشی است؛ از همگام‌سازی ابری تأییدشده استفاده کنید.\\n'
  'مجوزهای آفلاین صرفاً به مدت اشتراک/مجوز سرور معتبرند.\\n'
  'برای انتشار عمومی، امضای کد و تست عملی ویندوز لازم است.\\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
