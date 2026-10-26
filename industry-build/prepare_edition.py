#!/usr/bin/env python3
"""Build one industry-specific ZAVI ONE frontend from the exact audited Android QA master.
Same business engine, all existing modules, auth, offline transactions and 7-day trial.
No silent company data mutation. Native industry selection requires owner's Save.
"""
import argparse,json,shutil,zipfile,re
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--industry',required=True)
p.add_argument('--apk',required=True)
p.add_argument('--web',required=True)
p.add_argument('--desktop',action='store_true')
args=p.parse_args()
manifest=json.loads(Path('industry-build/industry-profiles.json').read_text(encoding='utf8'))
assert len(manifest['profiles'])==20
profiles={x['id']:x for x in manifest['profiles']}
assert args.industry in profiles
profile=profiles[args.industry]
out=Path(args.web);out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.apk) as bundle:
    found=0
    for x in bundle.infolist():
        if not x.filename.startswith('assets/') or x.is_dir():continue
        path=Path(x.filename).relative_to('assets')
        if not path.parts or '..' in path.parts or path.is_absolute():raise RuntimeError('unsafe APK entry')
        target=out/path;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(bundle.read(x.filename))
        found+=1
assert found>=95,('incomplete embedded frontend',found)
assert (out/'index.html').exists() and (out/'v25-business.html').exists()
for fn in ('edition-ui.js','edition-ui.css','edition-onboarding.js'):
    shutil.copy2(Path('industry-build')/fn,out/('zavi-'+fn))
profile_data=json.dumps(profile,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
identity=f'<script>window.ZAVI_INDUSTRY_EDITION={profile_data};</script>'
stylesheet='<link rel="stylesheet" href="./zavi-edition-ui.css?v=65.73">'
script='<script defer src="./zavi-edition-ui.js?v=65.73"></script>'
index=out/'index.html';html=index.read_text(encoding='utf8')
assert '</head>' in html and '</body>' in html
assert 'zavi-v6572-offline-accounting-assistant.js' in html
assert 'zavi-v6572-store-trial7.js' in html
assert 'zavi-v6571-store-settings-devices.css' in html
assert 'zavi-v6570-store-offline.js' in html
assert 'zavi-edition-ui.js' not in html
html=html.replace('</head>',identity+stylesheet+'</head>',1)
at=html.rfind('</body>');html=html[:at]+script+html[at:]
index.write_text(html,encoding='utf8')
business=out/'v25-business.html';s=business.read_text(encoding='utf8')
assert 'id="type"' in s and 'id="saveProfile"' in s
assert f'value="{profile["id"]}"' in s
assert '</head>' in s and '</body>' in s
s=s.replace('</head>',identity+stylesheet+'</head>',1)
at=s.rfind('</body>');s=s[:at]+'<script defer src="./zavi-edition-onboarding.js?v=65.73"></script>'+s[at:]
business.write_text(s,encoding='utf8')
(out/'industry-edition.json').write_text(json.dumps({
    'version':'65.73','edition':profile,
    'source':'ZAVI ONE 65.72 APK with verified 7-day subscription and offline guide',
    'security':'Existing cloud auth/RLS; no independent admin privileges',
    'notes':'Business type is selected using native v25 page and confirmed by account owner. No silent edits; specialized features beyond existing V65.72 are not invented.'
},ensure_ascii=False,indent=2),encoding='utf8')
if args.desktop:
    root=out.parent
    shutil.copy2('windows-build/main.cjs',root/'main.cjs')
    shutil.copy2('windows-build/desktop-server.cjs',root/'desktop-server.cjs')
    main=(root/'main.cjs').read_text(encoding='utf8')
    old='const PORT=IS_ADMIN?48362:48361;'
    assert main.count(old)==1
    main=main.replace(old,f'const PORT=IS_ADMIN?48362:{profile["port"]};')
    old2='IS_ADMIN?"ZAVI_ONE_ADMIN_Desktop":"ZAVI_ONE_Desktop"'
    assert main.count(old2)==1
    main=main.replace(old2,f'IS_ADMIN?"ZAVI_ONE_ADMIN_Desktop":"ZAVI_ONE_{profile["id"].upper()}_Desktop"')
    (root/'main.cjs').write_text(main,encoding='utf8')
    pkg={
      'name':f'zavi-one-{profile["id"]}-desktop',
      'productName':f'ZAVI ONE {profile["name"]["en"]}',
      'version':'65.73.0','private':True,
      'description':f'ZAVI ONE {profile["name"]["en"]} - QA edition',
      'main':'main.cjs',
      'scripts':{'test':'node --check main.cjs && node --check desktop-server.cjs','dist:win':'electron-builder --win nsis --x64'},
      'devDependencies':{'electron':'^38.0.0','electron-builder':'^26.0.0'},
      'build':{
        'appId':profile['windowsAppId'],
        'productName':f'ZAVI ONE {profile["name"]["en"]}',
        'asar':True,
        'directories':{'output':'dist'},
        'files':['main.cjs','desktop-server.cjs','web/**/*','package.json','!**/*.map'],
        'win':{'icon':'web/icon-512.png','target':[{'target':'nsis','arch':['x64']}],'requestedExecutionLevel':'asInvoker'},
        'nsis':{'oneClick':False,'perMachine':False,'allowToChangeInstallationDirectory':True,
          'createDesktopShortcut':True,'createStartMenuShortcut':True,
          'shortcutName':f'ZAVI ONE {profile["name"]["en"]}',
          'deleteAppDataOnUninstall':False,
          'artifactName':f'Setup_ZAVI_ONE_{profile["id"].upper()}_65_73_Windows_x64_QA.exe'}
      }
    }
    (root/'package.json').write_text(json.dumps(pkg,ensure_ascii=False,indent=2),encoding='utf8')
    (root/'README_DARI.txt').write_text(
        f'نسخۀ ZAVI ONE مخصوص {profile["name"]["fa"]}؛ ویندوز ۱۰ و ۱۱، ۶۴ بیتی.\n'
        'موتور عمومی حسابداری و سرور مرکزی همان ZAVI ONE است.\n'
        'داده‌های محلی هر فایل نصب جداست؛ برای انتقال اطلاعات، از انتقال ابری تأییدشده استفاده کنید.\n'
        'این Setup امضای رسمی Windows Authenticode ندارد و صرفاً برای آزمون است.\n'
        'مجوز ۷ روزه و آفلاین واقعی وابسته به تأیید حساب و سرور است.\n',
        encoding='utf8')
print(json.dumps({'industry':profile['id'],'name':profile['name']['en'],'web_files':found,'desktop':args.desktop,'output':str(out)},ensure_ascii=False))
