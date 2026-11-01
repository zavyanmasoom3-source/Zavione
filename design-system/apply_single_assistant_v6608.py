#!/usr/bin/env python3
"""Inject single-assistant launcher into both staged Android/PWA builds."""
from pathlib import Path
import shutil
root=Path('android-build/app/src/main/assets')
html=root/'index.html'
s=html.read_text(encoding='utf-8')
name='zavi-single-assistant-fix-v6608.js'
assert '<body' in s.lower(), 'Expected app HTML body missing'
assert name not in s
assert '</body>' in s
shutil.copy2(Path('design-system')/name,root/name)
pos=s.lower().rfind('</body>')
assert pos > s.lower().rfind('</head>'), 'Final document body not found'
s=s[:pos]+f'<script defer src="./{name}?v=66.08"></script>'+s[pos:]
css='zavi-mobile-readability-v6609.css'
shutil.copy2(Path('design-system')/css,root/css)
head=s.lower().find('</head>')
assert head>=0
s=s[:head]+f'<link rel="stylesheet" href="./{css}?v=66.09">'+s[head:]
html.write_text(s,encoding='utf-8')
sw=root/'sw.js'
t=sw.read_text(encoding='utf-8')
assert 'const CORE=[' in t
t=t.replace('const CORE=[',f'const CORE=["{name}","{css}",',1)
sw.write_text(t,encoding='utf-8')
print('PASS single assistant injected')
