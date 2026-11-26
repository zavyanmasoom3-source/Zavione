"""Mount the reference presentation after legacy feature registration."""
from pathlib import Path
ROOT = Path(__file__).with_name("reference")
FILES = ("layout.css","home.js") + tuple("art/" + name + ".webp" for name in
    "auth contacts purchases sales dashboard money products subscription reports settings".split())

def apply(html):
    marker = "renderNav();document.getElementById('content').innerHTML="
    assert html.count(marker) == 1
    html = html.replace(marker, "renderNav();document.getElementById('content').dataset.screen=page;document.getElementById('content').innerHTML=")
    return html.replace("</head>", '<link rel="stylesheet" href="./reference/layout.css"><script defer src="./reference/home.js"></script></head>', 1)

def stage(dest):
    for name in FILES:
        out = dest / "reference" / name
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes((ROOT / name).read_bytes())
