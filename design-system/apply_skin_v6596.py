#!/usr/bin/env python3
"""Add opt-in voice navigation to whole ZAVI ONE / owner ADMIN without replacing financial code."""
import argparse,sys,runpy,shutil,json
from pathlib import Path
a=argparse.ArgumentParser()
a.add_argument('--web',required=True)
a.add_argument('--app',choices=('one','admin'),required=True)
p=a.parse_args()
sys.argv=['apply_skin_v6595.py','--web',p.web,'--app',p.app]
runpy.run_path('design-system/apply_skin_v6595.py',run_name='__main__')
root=Path(p.web)
css='zavi-voice-pro-v6596.css'
js='zavi-voice-admin-v1442.js' if p.app=='admin' else 'zavi-voice-pro-v6596.js'
htmlPath=root/'index.html'
html=htmlPath.read_text(encoding='utf8')
assert '</head>' in html and '</body>' in html
for name in (css,js):
 source=Path('design-system')/name
 assert source.stat().st_size>4000,name
 assert name not in html,name
 shutil.copy2(source,root/name)
 if name.endswith('.css'):
  html=html.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=65.96"></head>',1)
 else:
  pos=html.rfind('</body>')
  html=html[:pos]+f'<script src="./{name}?v=65.96" defer></script>'+html[pos:]
 assert html.count(name)==1
if p.app=='one':
 m=root/'zavi-unified20-manifest.json'
 d=json.loads(m.read_text(encoding='utf8'))
 assert len(d['profiles'])==20
 d['design_version']='65.96-voice-pro-opt-in-draft-only'
 m.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
 for required in ['annual-license.js','zavi-zxing-bundle-v6591.js','zavi-store-ops-v6595.js']:
  assert (root/required).is_file(),required
else:
 for required in ['zavi-admin-congratulations-v1440.js','zavi-admin-command-v1441.js','zavi-admin-v1428-offline-seven-days.js']:
  assert (root/required).is_file(),required
sw=root/'sw.js'
if sw.exists():
 contents=sw.read_text(encoding='utf8')
 assert 'const CORE=[' in contents
 contents=contents.replace('const CORE=[','const CORE=['+json.dumps(css)+','+json.dumps(js)+',',1)
 old='zavi-admin-v1441-command' if p.app=='admin' else 'zavi-store-v6595-operations'
 new='zavi-admin-v1442-voice' if p.app=='admin' else 'zavi-store-v6596-voice'
 assert old in contents,old
 contents=contents.replace(old,new)
 sw.write_text(contents,encoding='utf8')
htmlPath.write_text(html,encoding='utf8')
print('PASS',p.app,'voice is opt-in, read-only navigation, draft-only finance, secure app preserved')
