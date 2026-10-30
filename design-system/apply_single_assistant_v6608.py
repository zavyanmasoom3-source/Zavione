#!/usr/bin/env python3
"""Inject single-assistant launcher into both staged Android/PWA builds."""
from pathlib import Path
import shutil
root=Path('android-build/app/src/main/assets')
html=root/'index.html'
s=html.read_text(encoding='utf-8')
name='zavi-single-assistant-fix-v6608.js'
assert 'zavi-dual-command-v6605.js' in s
assert name not in s
assert '</body>' in s
shutil.copy2(Path('design-system')/name,root/name)
s=s.replace('</body>',f'<script defer src="./{name}?v=66.08"></script></body>',1)
html.write_text(s,encoding='utf-8')
sw=root/'sw.js'
t=sw.read_text(encoding='utf-8')
assert 'const CORE=[' in t
t=t.replace('const CORE=[',f'const CORE=["{name}",',1)
sw.write_text(t,encoding='utf-8')
print('PASS single assistant injected')
