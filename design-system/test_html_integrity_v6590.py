#!/usr/bin/env python3
"""Regression gate for blank ZAVI screen: NEVER inject <script> in printed invoice HTML templates."""
import argparse,re,subprocess,tempfile
from html.parser import HTMLParser
from pathlib import Path

class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.current_script=None
        self.inline_scripts=[]
        self.script_sources=[]
        self.in_style=False
        self.body_depth=0
        self.body_text=[]
    def handle_starttag(self,tag,attrs):
        attr=dict(attrs)
        if tag=="body": self.body_depth+=1
        if tag=="script":
            self.current_script=[]
            if attr.get("src"): self.script_sources.append(attr["src"])
        if tag=="style": self.in_style=True
    def handle_endtag(self,tag):
        if tag=="script":
            if self.current_script is not None: self.inline_scripts.append("".join(self.current_script))
            self.current_script=None
        if tag=="style": self.in_style=False
        if tag=="body": self.body_depth=max(0,self.body_depth-1)
    def handle_data(self,data):
        if self.current_script is not None:self.current_script.append(data)
        elif self.body_depth and not self.in_style:self.body_text.append(data)

p=argparse.ArgumentParser()
p.add_argument("--web",required=True)
p.add_argument("--app",choices=["one","admin"],required=True)
args=p.parse_args()
root=Path(args.web)
html=(root/"index.html").read_text(encoding="utf8")
parser=Scan();parser.feed(html)
needed=[
 "zavi-three-sizes-v6588.js?v=65.88",
 "zavi-landscape-v6589.js?v=65.89",
 "zavi-mobile-rescue-v6590.js?v=65.90",
]
for filename in needed:
    assert sum(filename in name for name in parser.script_sources)==1,(filename,parser.script_sources[-10:])
    assert (root/filename.split("?")[0]).is_file(),filename
    position=html.rfind('src="./'+filename+'"')
    assert position>html.rfind('</body>')-5000,(filename,position,html.rfind('</body>'))
visible="".join(parser.body_text)
assert len(visible)<12000,("Unexpected source code visible in BODY",len(visible),visible[:400])
assert html.count("</body>")>=1
if args.app=="one":
    # This 286KB business-logic inline script got truncated by the previous
    # false-first-body insertion: browser then rendered thousands of JS lines.
    big=max(parser.inline_scripts,key=len)
    assert len(big)>240000,("Inline store logic broken",len(big))
    with tempfile.NamedTemporaryFile("w",suffix=".js",encoding="utf8") as t:
        t.write(big);t.flush()
        subprocess.run(["node","--check",t.name],check=True)
    assert html.count("</body>")>=4,"Invoice templates must remain intact"
    assert "zavi-ai-v637.js" in html,"Assistant functionality removed"
else:
    assert (root/"zavi-admin-v1428-offline-seven-days.js").exists()
print("PASS",args.app,"HTML integrity, original inline scripts and final-body inserts")
