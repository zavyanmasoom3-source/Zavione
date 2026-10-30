#!/usr/bin/env python3
"""Patch old ADMIN 800px control to match real iPad/tablet breakpoint. Do not replace main navigation handlers."""
from pathlib import Path
import sys
root=Path(sys.argv[1])
f=root/'zavi-admin-v1426-drawer.js'
assert f.is_file(),"ADMIN legacy drawer missing"
data=f.read_text(encoding='utf8')
old="window.matchMedia('(max-width:800px)').matches"
assert data.count(old)==1,(f,'unexpected drawer version')
data=data.replace(old,"window.matchMedia('(max-width:1199px)').matches")
f.write_text(data,encoding='utf8')
print("PASS ADMIN drawer JS uses same <=1199px media query as layout; no auth changes")
