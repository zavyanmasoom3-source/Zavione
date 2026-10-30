#!/usr/bin/env python3
"""Additive owner control / daily operations — preserves full ONE 65.94 + ADMIN 1.4.40."""
import argparse,sys,runpy,shutil,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--web',required=True)
p.add_argument('--app',choices=['one','admin'],required=True)
a=p.parse_args()
sys.argv=['apply_skin_v6594.py','--web',a.web,'--app',a.app]
runpy.run_path('design-system/apply_skin_v6594.py',run_name='__main__')
root=Path(a.web)
page=root/'index.html';html=page.read_text(encoding='utf8')
common='zavi-ops-center-v6595.css'
script='zavi-admin-command-v1441.js' if a.app=='admin' else 'zavi-store-ops-v6595.js'
for name in (common,script):
  source=Path('design-system')/name
  assert source.exists() and source.stat().st_size>3000
  assert name not in html
  shutil.copy2(source,root/name)
  if name.endswith('.css'):
    html=html.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=65.95"></head>',1)
  else:
    pos=html.rfind('</body>')
    assert pos>html.rfind('</head>') and pos>0
    html=html[:pos]+f'<script src="./{name}?v=65.95" defer></script>'+html[pos:]
  assert html.count(name)==1
if a.app=='admin':
  assert (root/'zavi-admin-congratulations-v1440.js').is_file()
  assert (root/'zavi-admin-renewal-v1439.js').is_file()
  assert html.index('zavi-admin-congratulations-v1440.js')<html.index(script)
  assert (root/'zavi-admin-v1428-offline-seven-days.js').is_file()
  assert (root/'zavi-admin-v1423-lifetime.js').is_file()
else:
  m=root/'zavi-unified20-manifest.json'
  data=json.loads(m.read_text(encoding='utf8'))
  assert len(data['profiles'])==20
  data['design_version']='65.95-safe-store-ops-csv'
  m.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
  assert (root/'annual-license.js').is_file()
  assert (root/'zavi-zxing-bundle-v6591.js').is_file()
worker=root/'sw.js'
if worker.exists():
  text=worker.read_text(encoding='utf8')
  assert 'const CORE=[' in text
  text=text.replace('const CORE=[','const CORE=['+json.dumps(common)+','+json.dumps(script)+',',1)
  from_sig='zavi-admin-v1440-congratulations' if a.app=='admin' else 'zavi-store-v6594-recovery'
  to_sig='zavi-admin-v1441-command' if a.app=='admin' else 'zavi-store-v6595-operations'
  assert from_sig in text
  text=text.replace(from_sig,to_sig)
  worker.write_text(text,encoding='utf8')
page.write_text(html,encoding='utf8')
print('PASS',a.app,'all original accounting, trial, offline, login and admin modules preserved; new center layered')
