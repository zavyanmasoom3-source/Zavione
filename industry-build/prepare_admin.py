#!/usr/bin/env python3
"""Stage central owner ADMIN 1.4.20 full-accounting family oversight.
All original admin auth, user list, 7-day trial and offline policy code preserved.
"""
from pathlib import Path
import argparse,json,zipfile,shutil
p=argparse.ArgumentParser();p.add_argument('--apk',required=True);p.add_argument('--web',required=True);p.add_argument('--desktop',action='store_true');a=p.parse_args()
out=Path(a.web);out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(a.apk) as z:
 count=0
 for x in z.infolist():
  if not x.filename.startswith('assets/') or x.is_dir():continue
  name=Path(x.filename).relative_to('assets')
  if not name.parts or name.parts[0] in ('dexopt','META-INF') or '..' in name.parts:continue
  dest=out/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(x.filename));count+=1
assert count>=90,count
for name in ('index.html','account-control.js','admin-portal.js','zavi-v6572-admin-trial7.js','zavi-v6570-admin-offline.js'):
 assert (out/name).exists(),name
html=(out/'index.html').read_text(encoding='utf8')
assert '</head>' in html and '</body>' in html
for x in ('admin-industry-overview.js','admin-industry-overview.css'):
 shutil.copy2(Path('industry-build')/x,out/('zavi-'+x))
html=html.replace('</head>','<link rel="stylesheet" href="./zavi-admin-industry-overview.css?v=1.4.20"></head>',1)
at=html.rfind('</body>');html=html[:at]+'<script defer src="./zavi-admin-industry-overview.js?v=1.4.20"></script>'+html[at:]
(out/'index.html').write_text(html,encoding='utf8')
if a.desktop:
 root=out.parent;shutil.copy2('windows-build/main.cjs',root/'main.cjs');shutil.copy2('windows-build/desktop-server.cjs',root/'desktop-server.cjs')
 main=(root/'main.cjs').read_text(encoding='utf8')
 assert 'IS_ADMIN?48362:48361' in main
 main=main.replace('IS_ADMIN?48362:48361','IS_ADMIN?48550:48361')
 main=main.replace('"ZAVI_ONE_ADMIN_Desktop"','"ZAVI_ONE_ADMIN_20_EDITION_QA"')
 (root/'main.cjs').write_text(main,encoding='utf8')
 pkg={'name':'zavi-one-admin-editions-qa','productName':'ZAVI ONE ADMIN','version':'1.4.20',
 'private':True,'main':'main.cjs',
 'scripts':{'test':'node --check main.cjs && node --check desktop-server.cjs','dist:win':'electron-builder --win nsis --x64'},
 'devDependencies':{'electron':'^38.0.0','electron-builder':'^26.0.0'},
 'build':{'appId':'com.zavione.admin.industryoverviewqa','productName':'ZAVI ONE ADMIN',
 'asar':True,'directories':{'output':'dist'},'files':['main.cjs','desktop-server.cjs','web/**/*','package.json'],
 'win':{'icon':'web/icon.png','target':[{'target':'nsis','arch':['x64']}],'requestedExecutionLevel':'asInvoker'},
 'nsis':{'oneClick':False,'perMachine':False,'allowToChangeInstallationDirectory':True,'createDesktopShortcut':True,
 'createStartMenuShortcut':True,'shortcutName':'ZAVI ONE ADMIN QA','deleteAppDataOnUninstall':False,
 'artifactName':'Setup_ZAVI_ONE_ADMIN_1_4_20_Industry_QA.exe'}}}
 (root/'package.json').write_text(json.dumps(pkg,indent=2),encoding='utf8')
print(f'ADMIN staged {count} assets, original security/trial preserved')
