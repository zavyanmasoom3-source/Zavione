#!/usr/bin/env python3
"""ZAVI ONE V65.94 / ADMIN V1.4.40 additive presentation and manual WhatsApp congratulations.
Do not alter authentication, financial transactions, subscriptions or database tables.
"""
from pathlib import Path
import argparse,sys,runpy,shutil,json
args=argparse.ArgumentParser()
args.add_argument('--web',required=True)
args.add_argument('--app',choices=('one','admin'),required=True)
a=args.parse_args()
sys.argv=['apply_skin_v6593.py','--web',a.web,'--app',a.app]
runpy.run_path('design-system/apply_skin_v6593.py',run_name='__main__')
root=Path(a.web)
index=root/'index.html'
html=index.read_text(encoding='utf8')
assert '</head>' in html and '</body>' in html
if a.app=='admin':
  names=('zavi-admin-theme-congrats-v1440.css','zavi-admin-congratulations-v1440.js')
  assert (root/'zavi-admin-renewal-v1439.js').is_file()
  assert html.count('zavi-admin-renewal-v1439.js?v=1.4.39')==1
else:
  names=('zavi-store-recovery-v6594.css','zavi-store-recovery-v6594.js')
  manifest=root/'zavi-unified20-manifest.json'
  data=json.loads(manifest.read_text(encoding='utf8'))
  assert len(data['profiles'])==20
  data['design_version']='65.94-recovery-and-dark-light'
  manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
  assert (root/'annual-license.js').is_file()
for name in names:
  shutil.copy2(Path('design-system')/name,root/name)
  assert name not in html,name
  if name.endswith('.css'):
    html=html.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=65.94"></head>',1)
  else:
    pos=html.rfind('</body>')
    html=html[:pos]+f'<script src="./{name}?v=65.94" defer></script>'+html[pos:]
  assert html.count(name)==1
if a.app=='admin':
  assert html.index('zavi-admin-renewal-v1439.js')<html.index('zavi-admin-congratulations-v1440.js')
  for fn in ('zavi-admin-v1428-offline-seven-days.js','zavi-admin-v1423-lifetime.js'):
    assert (root/fn).is_file()
worker=root/'sw.js'
if worker.exists():
  src=worker.read_text(encoding='utf8')
  assert 'const CORE=[' in src
  inserted=json.dumps(list(names),ensure_ascii=False)[1:-1]+','
  src=src.replace('const CORE=[','const CORE=['+inserted,1)
  old='zavi-admin-v1439-renewal' if a.app=='admin' else 'zavi-store-v6593-premium'
  new='zavi-admin-v1440-congratulations' if a.app=='admin' else 'zavi-store-v6594-recovery'
  assert old in src
  src=src.replace(old,new)
  assert names[0] in src and names[1] in src
  worker.write_text(src,encoding='utf8')
index.write_text(html,encoding='utf8')
print('PASS '+a.app+': 7/180/365 owner-confirmed congratulations or compact secure recovery, matching dark/light and original modules')
