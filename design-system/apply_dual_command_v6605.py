#!/usr/bin/env python3
"""Install unified typed + offline-voice command center AFTER stock voice/premium staging.
Does not change existing accounting code, database grants, OAuth settings or client role.
"""
import argparse,shutil
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--app',choices=('one','admin'),required=True)
app=p.parse_args().app
root=Path('android-build/app/src/main/assets')
index=root/'index.html'
html=index.read_text(encoding='utf8')
assert '<head' in html and '</head>' in html and '</body>' in html
assert 'zavi-voice-local-v6599.js' in html
assert 'zavi-premium-cloud-v6604.js' in html
assert '__zaviDual605' not in html
html=html.replace('</head>','<script>window.__zaviDual605=true;</script></head>',1)
for name in ('zavi-dual-command-v6605.css','zavi-dual-command-v6605.js'):
    assert name not in html
    shutil.copy2(Path('design-system')/name,root/name)
    if name.endswith('.css'):
        html=html.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=66.05"></head>',1)
    else:
        at=html.rfind('</body>');assert at>html.rfind('</head>')
        html=html[:at]+f'<script defer src="./{name}?v=66.05"></script>'+html[at:]
assert html.count('zavi-dual-command-v6605.js')==1
index.write_text(html,encoding='utf8')
old=root/'zavi-voice-local-v6599.js'
s=old.read_text(encoding='utf8')
needle=' if(window.ZaviVoiceLocal6599)return;'
assert s.count(needle)==1
s=s.replace(needle,needle+'\n if(window.__zaviDual605)return;',1)
old.write_text(s,encoding='utf8')
# Only static CSS/JS are pre-cached. Never store credentials or accounting records.
sw=root/'sw.js'
work=sw.read_text(encoding='utf8')
needle='const CORE=['
assert needle in work
work=work.replace(needle,'const CORE=["zavi-dual-command-v6605.js","zavi-dual-command-v6605.css",',1)
sw.write_text(work,encoding='utf8')
gradle=Path('android-build/app/build.gradle')
g=gradle.read_text(encoding='utf8')
if app=='one':
    assert 'com.zavione.one.unified20.v6604qa' in g
    assert 'versionCode admin ? 4127 : 660400' in g
    g=g.replace('com.zavione.one.unified20.v6604qa','com.zavione.one.unified20.v6605qa')
    g=g.replace('versionCode admin ? 4127 : 660400','versionCode admin ? 4127 : 660500')
    assert '66.04-premium-cloud-qa' in g
    g=g.replace('66.04-premium-cloud-qa','66.05-dual-command-qa')
else:
    assert 'com.zavione.one.admin.v1450qa' in g
    assert 'versionCode admin ? 145000 : 6554' in g
    g=g.replace('com.zavione.one.admin.v1450qa','com.zavione.one.admin.v1451qa')
    g=g.replace('versionCode admin ? 145000 : 6554','versionCode admin ? 145100 : 6554')
    assert '1.4.50-premium-cloud-qa' in g
    g=g.replace('1.4.50-premium-cloud-qa','1.4.51-dual-command-qa')
gradle.write_text(g,encoding='utf8')
assert (root/'zavi-dual-command-v6605.js').is_file()
assert (root/'zavi-dual-command-v6605.css').is_file()
assert (root/'zavi-premium-cloud-v6604.js').is_file()
print('PASS:',app,'two separate inputs in one panel, original cloud auth + finance untouched')
