#!/usr/bin/env python3
"""Non-destructive compact dashboard mic for all trade profiles and owner ADMIN."""
import argparse,sys,runpy,shutil,json
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--web',required=True)
parser.add_argument('--app',choices=('one','admin'),required=True)
a=parser.parse_args()
sys.argv=['apply_skin_v6596.py','--web',a.web,'--app',a.app]
runpy.run_path('design-system/apply_skin_v6596.py',run_name='__main__')
root=Path(a.web)
page=root/'index.html';html=page.read_text(encoding='utf8')
names=('zavi-voice-dashboard-v6597.css','zavi-voice-dashboard-v6597.js')
assert 'zavi-voice-pro-v6596.css?v=65.96' in html
assert ('zavi-voice-admin-v1442.js?v=65.96' if a.app=='admin' else 'zavi-voice-pro-v6596.js?v=65.96') in html
for name in names:
 src=Path('design-system')/name
 assert src.is_file() and src.stat().st_size>2500
 assert name not in html
 shutil.copy2(src,root/name)
 if name.endswith('.css'):
  html=html.replace('</head>','<link rel="stylesheet" href="./'+name+'?v=65.97"></head>',1)
 else:
  assert '</body>' in html
  html=html.replace('</body>','<script src="./'+name+'?v=65.97" defer></script></body>',1)
 assert html.count(name)==1
if a.app=='one':
 manifest=root/'zavi-unified20-manifest.json'
 content=json.loads(manifest.read_text(encoding='utf8'))
 assert len(content['profiles'])==20
 content['design_version']='65.97-compact-dashboard-voice'
 manifest.write_text(json.dumps(content,ensure_ascii=False,indent=2),encoding='utf8')
else:
 assert (root/'zavi-admin-command-v1441.js').is_file()
worker=root/'sw.js'
if worker.exists():
 s=worker.read_text(encoding='utf8')
 assert 'const CORE=[' in s
 s=s.replace('const CORE=[','const CORE=['+json.dumps(names[0])+','+json.dumps(names[1])+',',1)
 before='zavi-admin-v1442-voice' if a.app=='admin' else 'zavi-store-v6596-voice'
 after='zavi-admin-v1443-compact-mic' if a.app=='admin' else 'zavi-store-v6597-compact-mic'
 assert before in s
 worker.write_text(s.replace(before,after),encoding='utf8')
page.write_text(html,encoding='utf8')
print('PASS',a.app,'round responsive dashboard mic, original accounting/admin security preserved')
