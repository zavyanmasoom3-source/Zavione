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
    if not m and name.endswith('.js'):
        # The already-repaired v65.52 shell can escape an injected script tag.
        # Add exactly one document-level visual script at the LAST closing body.
        end=h.rfind('</body>')
        if end<0:raise RuntimeError('Missing document body closing tag')
        h=h[:end]+'<script defer src="./zavi-luxe-v1.js?v=65.53"></script>'+h[end:]
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
# The main application is one large INLINE script. Earlier global HTML replacements
# introduced literal </script> tokens inside printable HTML template strings.
# Browsers terminate the JavaScript block at the first such token and display
# the remainder as user-facing text. Escape ONLY the tokens inside this script,
# keeping its real terminal </script> tag unchanged.
marker='const ICON={'
suffix='<script src="offline-backup.js'
if marker not in h or suffix not in h:raise RuntimeError('App source boundaries changed; stop build')
anchor=h.index(marker);start=h.rfind('<script',0,anchor);following=h.index(suffix,anchor)
ending=h.rfind('</script>',start,following)
if start<0 or ending<0 or ending<=start:raise RuntimeError('Main script boundary not found')
middle,count=re.subn(r'</script(?=\s*>)',r'<\/script',h[start:ending],flags=re.I)
h=h[:start]+middle+h[ending:]
print('Escaped',count,'embedded script-closing tags, retained actual app script end')
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
