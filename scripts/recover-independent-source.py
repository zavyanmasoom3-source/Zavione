#!/usr/bin/env python3
"""Recover independent web source from versioned source archives, never from APKs.
This is a one-time migration tool. It does not certify feature completeness.
"""
from pathlib import Path
from html.parser import HTMLParser
import zipfile, shutil, sys

ROOT=Path(__file__).resolve().parents[1]
ARCHIVES=[
 ROOT/"industry-delivery/ZAVI_ONE_V65_83_IPAD_WEB_PWA_QA.zip",
 ROOT/"ZAVI_ANDROID_GITHUB_SOURCES_V31.zip",
]
class Visible(HTMLParser):
 def __init__(self):
  super().__init__();self.hidden=0;self.bad=[]
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style"):self.hidden+=1
 def handle_endtag(self,tag):
  if tag in ("script","style"):self.hidden=max(0,self.hidden-1)
 def handle_data(self,data):
  if not self.hidden and len(data)>250 and any(x in data for x in ("function ","document.","const ")):
   self.bad.append(data[:100])

def candidates():
 for archive in ARCHIVES:
  if not archive.is_file():continue
  with zipfile.ZipFile(archive) as z:
   if z.testzip() is not None:raise RuntimeError("Damaged source archive "+str(archive))
   for member in z.infolist():
    if member.is_dir() or not member.filename.endswith("index.html"):continue
    if member.file_size<80000 or member.file_size>15_000_000:continue
    try:html=z.read(member).decode("utf-8")
    except UnicodeError:continue
    if "</body>" not in html.lower() or "</html>" not in html.lower():continue
    parser=Visible();parser.feed(html)
    if parser.bad:continue
    yield (member.file_size,archive,member.filename)

def main():
 found=sorted(candidates(),reverse=True)
 if not found:raise SystemExit("No complete, clean HTML source found in the available archives.")
 _,archive,entry=found[0]
 output=ROOT/"app-source/one"
 if output.exists():raise SystemExit("Refusing to overwrite existing source: "+str(output))
 prefix=entry[:-len("index.html")]
 with zipfile.ZipFile(archive) as z:
  for member in z.infolist():
   if member.is_dir() or not member.filename.startswith(prefix):continue
   relative=Path(member.filename[len(prefix):])
   if not relative.parts or ".." in relative.parts:continue
   if relative.parts[0] in (".git","node_modules"):continue
   target=output/relative
   target.parent.mkdir(parents=True,exist_ok=True)
   target.write_bytes(z.read(member))
 print("Recovered",entry,"from",archive.name,"to",output)
 print("WARNING: recovered baseline is historical; features and data integration must be upgraded and tested.")

if __name__=="__main__":main()
