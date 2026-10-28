#!/usr/bin/env python3
import argparse,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--app',choices=['one','admin'],required=True);a=p.parse_args()
root=Path('android-build/app/src/main/assets');html=root/'index.html';s=html.read_text()
name='zavi-compact-login-v6607.css'
assert name not in s and '</head>' in s
shutil.copy2(Path('design-system')/name,root/name)
s=s.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=66.07"></head>',1)
html.write_text(s)
sw=root/'sw.js';t=sw.read_text();assert 'const CORE=[' in t;t=t.replace('const CORE=[',f'const CORE=["{name}",',1);sw.write_text(t)
g=Path('android-build/app/build.gradle');v=g.read_text()
if a.app=='one':
 assert 'com.zavione.one.unified20.v6605qa' in v
 v=v.replace('com.zavione.one.unified20.v6605qa','com.zavione.one.unified20.v6607qa')
 v=v.replace('660500','660700').replace('66.05-dual-command-qa','66.07-compact-login-qa')
else:
 assert 'com.zavione.one.admin.v1451qa' in v
 v=v.replace('com.zavione.one.admin.v1451qa','com.zavione.one.admin.v1453qa')
 v=v.replace('145100','145300').replace('1.4.51-dual-command-qa','1.4.53-compact-login-qa')
g.write_text(v)
print('PASS compact PIN login',a.app)
