#!/usr/bin/env python3
"""Add premium login/visual module to the existing store or owner-only ADMIN.
Mandatory first cloud connection for new store users is a UI gateway; actual
authorization stays in existing cloud.js and server RLS. Existing signed sessions
and private PIN/offline permits are not changed.
"""
import argparse,shutil,re
from pathlib import Path
a=argparse.ArgumentParser()
a.add_argument('--app',required=True,choices=('one','admin'))
mode=a.parse_args().app
root=Path('android-build/app/src/main/assets')
page=root/'index.html'
html=page.read_text(encoding='utf8')
for name in ('zavi-premium-cloud-v6604.css','zavi-premium-cloud-v6604.js'):
    assert name not in html,name
    shutil.copy2(Path('design-system')/name,root/name)
    if name.endswith('.css'):
        assert '</head>' in html
        html=html.replace('</head>','<link rel="stylesheet" href="./'+name+'?v=66.04"></head>',1)
    else:
        last=html.rfind('</body>')
        assert last>html.rfind('</head>')>0
        html=html[:last]+'<script defer src="./'+name+'?v=66.04"></script>'+html[last:]
assert html.count('zavi-premium-cloud-v6604.js')==1
assert html.count('zavi-premium-cloud-v6604.css')==1
if mode=='one':
    assert 'zawiPrivateGate' in html
    assert (root/'cloud.js').is_file()
    cloud=(root/'cloud.js').read_text(encoding='utf8')
    assert 'window.zaviCloudPanel=uiPanel' in cloud
    assert 'window.zaviCloudGetAuthSession' in cloud
    assert 'data-z20-cloud="login"' in cloud and 'data-z20-cloud="signup"' in cloud
    assert 'zaviCloudCanEdit' in cloud
else:
    assert 'id="authScreen"' in html and 'id="loginBtn"' in html
    admin=(root/'app.js').read_text(encoding='utf8')
    assert 'ZAVI_ADMIN_ALLOWED_EMAILS' in admin
    assert '/auth/v1/token?grant_type=password' in admin
    assert 'logoutBtn' in admin
page.write_text(html,encoding='utf8')
sw=root/'sw.js'
text=sw.read_text(encoding='utf8')
assert 'const CORE=' in text
text=text.replace('const CORE=','const CORE=["zavi-premium-cloud-v6604.js","zavi-premium-cloud-v6604.css"].concat(',1)
# Use .concat() with a balanced closing parenthesis only if a simple array was
# found. Older admin uses .concat([...]); we must not disturb its precedence.
# Instead revert that replacement and prepend entries to the first array.
text=sw.read_text(encoding='utf8')
if 'const CORE=[' in text:
    text=text.replace('const CORE=[','const CORE=["zavi-premium-cloud-v6604.js","zavi-premium-cloud-v6604.css",',1)
else:
    raise AssertionError('Unsupported service worker CORE declaration')
# Do not cache auth tokens or cloud data; CORE only contains static CSS/JS assets.
sw.write_text(text,encoding='utf8')
gradle=Path('android-build/app/build.gradle')
g=gradle.read_text(encoding='utf8')
if mode=='one':
    assert 'com.zavione.one.unified20.v6603qa' in g
    assert 'versionCode admin ? 4127 : 660300' in g
    g=g.replace('com.zavione.one.unified20.v6603qa','com.zavione.one.unified20.v6604qa')
    g=g.replace('versionCode admin ? 4127 : 660300','versionCode admin ? 4127 : 660400')
else:
    assert 'com.zavione.one.admin.v1449qa' in g
    assert 'versionCode admin ? 144900 : 6554' in g
    g=g.replace('com.zavione.one.admin.v1449qa','com.zavione.one.admin.v1450qa')
    g=g.replace('versionCode admin ? 144900 : 6554','versionCode admin ? 145000 : 6554')
gradle.write_text(g,encoding='utf8')
print('PASS',mode,'premium cloud-first UI, preserved original server authentication and billing logic')
