#!/usr/bin/env python3
"""One-time migration of explicit WEB archives, never APKs. Not release certification."""
import base64
import hashlib
import io
import json
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
 'one': ('industry-delivery/ZAVI_ONE_V65_83_IPAD_WEB_PWA_QA.zip', False),
 'admin': ('windows-build/admin-v145-responsive-web.zip.base64', True),
}
class Page(HTMLParser):
 def __init__(self):
  super().__init__(); self.hidden=0; self.leaks=[]; self.references=[]; self.closed=set()
 def handle_starttag(self, tag, attrs):
  attrs=dict(attrs)
  if tag in ('script','style'): self.hidden+=1
  key='src' if tag=='script' else 'href' if tag=='link' else None
  if key and attrs.get(key): self.references.append(attrs[key])
 def handle_endtag(self, tag):
  self.closed.add(tag)
  if tag in ('script','style'): self.hidden=max(0,self.hidden-1)
 def handle_data(self,value):
  if not self.hidden and len(value)>250 and any(t in value for t in ('function ','document.','const ')):
   self.leaks.append(value[:80])
def validate(root):
 page=root/'index.html'
 if not page.is_file(): raise ValueError(f'Missing source entry: {page}')
 parser=Page(); parser.feed(page.read_text(encoding='utf-8'))
 if not {'body','html'} <= parser.closed or parser.leaks: raise ValueError(f'Malformed source HTML: {page}')
 for ref in parser.references:
  url=urlsplit(ref)
  if url.scheme or url.netloc or not url.path: continue
  path=(root/unquote(url.path).lstrip('/')).resolve()
  if not path.is_relative_to(root.resolve()) or not path.is_file(): raise ValueError(f'Missing or unsafe dependency: {ref}')
def extract(data,destination):
 with zipfile.ZipFile(io.BytesIO(data)) as archive:
  if archive.testzip() is not None: raise ValueError('Corrupt web archive')
  seen=set()
  for member in archive.infolist():
   name=PurePosixPath(member.filename)
   if name.is_absolute() or '..' in name.parts or '\\' in member.filename or (member.external_attr>>16)&0o170000==0o120000:
    raise ValueError('Unsafe archive path: '+member.filename)
   if member.is_dir(): continue
   if name in seen: raise ValueError('Duplicate archive path: '+member.filename)
   seen.add(name)
   if name.suffix.lower() in ('.apk','.aab','.jks','.keystore'): raise ValueError('Unexpected binary/signing input: '+member.filename)
   target=destination/name; target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(archive.read(member))
 validate(destination)
def main():
 output=ROOT/'app-source'
 if output.exists(): raise SystemExit('Refusing to overwrite maintained app-source. Recovery is one-time only.')
 with tempfile.TemporaryDirectory(dir=ROOT) as temporary:
  staged=Path(temporary)/'app-source'
  manifest={'status':'historical-baseline-not-release','applications':{}}
  for app,(relative,encoded) in SOURCES.items():
   data=(ROOT/relative).read_bytes()
   if encoded: data=base64.b64decode(b''.join(data.split()),validate=True)
   folder=staged/app; extract(data,folder)
   hashes={str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.rglob('*')) if p.is_file()}
   manifest['applications'][app]={'archive':relative,'archive_sha256':hashlib.sha256(data).hexdigest(),'files':hashes}
   print(f'{app}: recovered and validated {len(hashes)} source files')
  (staged/'RECOVERY_PROVENANCE.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
  shutil.move(str(staged),output)
 print('Historical sources recovered. Feature regression and release signing remain required.')
if __name__=='__main__': main()
