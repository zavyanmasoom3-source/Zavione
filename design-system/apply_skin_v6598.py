#!/usr/bin/env python3
"""Attach simplest user-opted foreground voice controller, leaving prior 20 business ledgers intact."""
import argparse,sys,runpy,shutil,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--web',required=True)
p.add_argument('--app',choices=('one','admin'),required=True)
a=p.parse_args()
sys.argv=['apply_skin_v6597.py','--web',a.web,'--app',a.app]
runpy.run_path('design-system/apply_skin_v6597.py',run_name='__main__')
root=Path(a.web);page=root/'index.html';html=page.read_text(encoding='utf8')
names=('zavi-voice-easy-handsfree-v6598.css','zavi-voice-easy-handsfree-v6598.js')
for name in names:
 src=Path('design-system')/name
 assert src.is_file() and src.stat().st_size>4000
 assert name not in html
 shutil.copy2(src,root/name)
 if name.endswith('.css'):
  assert '</head>' in html
  html=html.replace('</head>','<link rel="stylesheet" href="./'+name+'?v=65.98"></head>',1)
 else:
  # Never put a script before the FIRST </body>. Inline invoice HTML strings contain
  # complete body templates; the ledger logic must not be cut in half.
  i=html.rfind('</body>')
  assert i>html.rfind('</head>') and i>0
  html=html[:i]+'<script src="./'+name+'?v=65.98" defer></script>'+html[i:]
 assert html.count(name)==1
if a.app=='one':
 m=root/'zavi-unified20-manifest.json'
 d=json.loads(m.read_text(encoding='utf8'))
 assert len(d['profiles'])==20
 d['design_version']='65.98-handsfree-easy-foreground-qa'
 m.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
else:
 assert (root/'zavi-admin-command-v1441.js').is_file()
sw=root/'sw.js'
if sw.exists():
 s=sw.read_text(encoding='utf8')
 assert 'const CORE=[' in s
 s=s.replace('const CORE=[','const CORE=['+json.dumps(names[0])+','+json.dumps(names[1])+',',1)
 before='zavi-admin-v1443-compact-mic' if a.app=='admin' else 'zavi-store-v6597-compact-mic'
 after='zavi-admin-v1444-easy-handsfree' if a.app=='admin' else 'zavi-store-v6598-easy-handsfree'
 assert before in s
 sw.write_text(s.replace(before,after),encoding='utf8')
page.write_text(html,encoding='utf8')
print('PASS',a.app,'high contrast one-toggle hands-free layer, original finance and login unchanged')
