#!/usr/bin/env python3
"""Fix accidental visual-script injection inside receipt and invoice HTML strings.
Never remove legitimate inline code. Abort QA release if visible JavaScript remains."""
from pathlib import Path
from html.parser import HTMLParser
import subprocess,re,sys
p=Path(sys.argv[1]);h=p.read_text(encoding='utf8')
for name in ('zavi-luxe-v1.css','zavi-luxe-v1.js'):
    if name.endswith('.css'):
        pat=r'<link[^>]*zavi-luxe-v1[.]css[^>]*>'
    else:
        pat=r'<script[^>]*zavi-luxe-v1[.]js[^>]*>[ \t\r\n]*</script>'
    # Regex is intentionally scoped to the injected asset, not other script tags.
    m=list(re.finditer(pat,h,flags=re.I))
    if not m:raise RuntimeError('Missing visual script/link: '+name)
    keep=m[0].start() if name.endswith('.css') else m[-1].start()
    for match in reversed(m):
        if match.start()!=keep:h=h[:match.start()]+h[match.end():]
    print('Sanitized',name,len(m),'->1')
class Audit(HTMLParser):
    def __init__(self):
        super().__init__();self.in_script=0;self.in_style=0;self.stack=[];self.scripts=[];self.leaks=[]
    def handle_starttag(self,tag,attrs):
        if tag=='script':self.in_script+=1;self.stack.append((dict(attrs),[]))
        if tag=='style':self.in_style+=1
    def handle_endtag(self,tag):
        if tag=='script':
            if self.stack:self.scripts.append(self.stack.pop())
            self.in_script=max(0,self.in_script-1)
        if tag=='style':self.in_style=max(0,self.in_style-1)
    def handle_data(self,data):
        if self.in_script:
            if self.stack:self.stack[-1][1].append(data)
        elif not self.in_style and any(x in data for x in
            ('db.tx.filter(','function renderUSDOverview','w.document.write(content)','t.date===nowISO()','const ICON={')):
            self.leaks.append((self.getpos(),data[:120]))
a=Audit();a.feed(h)
if a.leaks:raise RuntimeError('JavaScript visible as page text: '+str(a.leaks[:5]))
for attrs,parts in a.scripts:
    if attrs.get('src') or not ''.join(parts).strip():continue
    result=subprocess.run(['node','--check','--input-type=commonjs'],input=''.join(parts),capture_output=True,text=True)
    if result.returncode:raise RuntimeError('Inline JavaScript broken: '+result.stderr[:700])
if h.count('zavi-luxe-v1.css')!=1 or h.count('zavi-luxe-v1.js')!=1:
    raise RuntimeError('Theme must exist only in real document head/footer')
p.write_text(h,encoding='utf8')
print('PASS: receipt HTML templates intact, no executable source exposed, inline JS parse valid')
