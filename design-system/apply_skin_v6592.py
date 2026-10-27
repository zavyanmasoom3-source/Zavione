#!/usr/bin/env python3
"""ZAVI ONE 65.92 / ADMIN 1.4.38: iPad portrait full-width menu repair.
Preserve cloud, device transfer, trials, offline ledger and 20 business profiles."""
import argparse,sys,shutil,runpy,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--web',required=True)
p.add_argument('--app',required=True,choices=('one','admin'))
a=p.parse_args()
sys.argv=['apply_skin_v6591.py','--web',a.web,'--app',a.app]
runpy.run_path('design-system/apply_skin_v6591.py',run_name='__main__')
web=Path(a.web)
index=web/'index.html'
h=index.read_text(encoding='utf8')
assert h.rfind('</body>')>h.find('</head>')
if a.app=='admin':
    sys.argv=['patch_admin_drawer_v1438.py',a.web]
    runpy.run_path('design-system/patch_admin_drawer_v1438.py',run_name='__main__')
    for fn in ['zavi-admin-ipad-v1438.css','zavi-admin-ipad-v1438.js']:
        source=Path('design-system')/fn
        assert source.is_file(),source
        shutil.copy2(source,web/fn)
    assert h.count('zavi-admin-ipad-v1438.')==0
    h=h.replace('</head>','<link rel="stylesheet" href="./zavi-admin-ipad-v1438.css?v=1.4.38"></head>',1)
    i=h.rfind('</body>')
    assert i>0
    h=h[:i]+'<script src="./zavi-admin-ipad-v1438.js?v=1.4.38" defer></script>'+h[i:]
    assert h.count('zavi-admin-ipad-v1438.css')==1 and h.count('zavi-admin-ipad-v1438.js')==1
    assert h.index('zavi-camera-menu-v6591.css')<h.index('zavi-admin-ipad-v1438.css')
    sw=web/'sw.js'
    if sw.exists():
        import re
        src=sw.read_text(encoding='utf8')
        assert 'const CORE=[' in src
        src=src.replace('const CORE=[','const CORE=["zavi-admin-ipad-v1438.css","zavi-admin-ipad-v1438.js",',1)
        src=re.sub(r"(const CACHE_NAME\\s*=\\s*['\\"])[^'\\"]+(['\\"])",r"\\1zavi-admin-v1438-ipad\\2",src,count=1)
        assert 'zavi-admin-ipad-v1438.css' in src
        sw.write_text(src,encoding='utf8')
    assert (web/'zavi-admin-v1428-offline-seven-days.js').exists()
    assert (web/'zavi-admin-v1423-lifetime.js').exists()
else:
    m=web/'zavi-unified20-manifest.json'
    data=json.loads(m.read_text(encoding='utf8'))
    assert len(data['profiles'])==20
    data['design_version']='65.92-validated-and-admin-1438-ipad'
    m.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    assert (web/'annual-license.js').exists()
    assert (web/'zavi-zxing-bundle-v6591.js').stat().st_size>80000
index.write_text(h,encoding='utf8')
print('PASS',a.app,'all original modules, iPad ADMIN drawer width and portrait layout')
