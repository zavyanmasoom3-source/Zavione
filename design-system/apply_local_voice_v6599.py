#!/usr/bin/env python3
"""Stage compact ZAVI voice sheet + actual on-device whisper.cpp, without Google voice.
Must run AFTER build_android_v6598.py has staged ONE or ADMIN assets and Java.
No database, ledger, sync, customer account or role code is changed.
"""
import argparse,re,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--app',choices=['one','admin'],required=True)
a=p.parse_args()
root=Path('android-build/app/src/main')
assets=root/'assets';page=assets/'index.html'
models=assets/'models';models.mkdir(exist_ok=True)
shutil.copy2('design-model/ggml-tiny-q5_1.bin',models/'ggml-tiny-q5_1.bin')
assert (models/'ggml-tiny-q5_1.bin').stat().st_size==32152673
html=page.read_text(encoding='utf8')
for name in ('zavi-voice-local-v6599.css','zavi-voice-local-v6599.js'):
    assert name not in html
    shutil.copy2(Path('design-system')/name,assets/name)
    if name.endswith('.css'):
        html=html.replace('</head>',f'<link rel="stylesheet" href="./{name}?v=65.99"></head>',1)
    else:
        i=html.rfind('</body>');assert i>0
        html=html[:i]+f'<script defer src="./{name}?v=65.99"></script>'+html[i:]
# Keep the old reference for existing regression assertions, but disable its
# startup BEFORE any deferred scripts run. Old saved preferences cannot activate it.
assert 'zavi-voice-easy-handsfree-v6598.js' in html
html=html.replace('</head>','<script>window.__zaviLocalOnly=true;</script></head>',1)
oldjs=assets/'zavi-voice-easy-handsfree-v6598.js'
oldscript=oldjs.read_text(encoding='utf8')
anchor='if(window.ZaviHandsfreeEasy6598)return;'
assert oldscript.count(anchor)==1
oldjs.write_text(oldscript.replace(anchor,'if(window.__zaviLocalOnly||window.ZaviHandsfreeEasy6598)return;',1),encoding='utf8')
page.write_text(html,encoding='utf8')
sw=assets/'sw.js';s=sw.read_text(encoding='utf8')
assert 'const CORE=[' in s
s=s.replace('const CORE=[','const CORE=["zavi-voice-local-v6599.js","zavi-voice-local-v6599.css",',1)
sw.write_text(s,encoding='utf8')
java=root/'java/com/zavione/mobile/MainActivity.java'
c=java.read_text(encoding='utf8')
# Hard-disable BOTH previous Android recognition API entry points. An old restored
# preference or a legacy button must never be allowed to invoke the Google/system UI.
for method in ('startZaviVoiceRecognition(String message)','handleHandsfreeMessage(String input)'):
    needle='private void '+method+' {'
    assert c.count(needle)==1,needle
    c=c.replace(needle,needle+'\n        if (getPackageName()!=null) return; // Local-only mode',1)
needle='    private String biometricPinSignature;'
assert c.count(needle)==1
c=c.replace(needle,needle+'''
    private static final int ZAVI_LOCAL_AUDIO_PERMISSION=4715;
    private ZaviLocalWhisper zaviLocalWhisper;
    private String pendingLocalLanguage;
    private void sendZaviLocalEvent(String kind,String payload){
        if(webView==null)return;
        String script="if(window.ZaviVoiceLocalNativeEvent)window.ZaviVoiceLocalNativeEvent({type:"
            +JSONObject.quote(kind)+",text:"+JSONObject.quote(payload==null?"":payload)+"});";
        runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript(script,null);});
    }
    private void startLocalVoice(String lang){
        pendingLocalLanguage=lang;
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},ZAVI_LOCAL_AUDIO_PERMISSION);
            return;
        }
        if(zaviLocalWhisper==null)zaviLocalWhisper=new ZaviLocalWhisper(this,(type,text)->sendZaviLocalEvent(type,text));
        zaviLocalWhisper.start(lang);
    }
''',1)
needle='            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidVoice",'
assert c.count(needle)==1
c=c.replace(needle,'''            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidLocalVoice",
                Collections.singleton("https://appassets.androidplatform.net"),
                (view, message, origin, mainFrame, reply) -> {
                    if(!mainFrame||!"https://appassets.androidplatform.net".equals(origin.toString()))return;
                    String data=message.getData();
                    if(data==null||data.length()>256)return;
                    try{
                        JSONObject command=new JSONObject(data);
                        String op=command.optString("op","");
                        if("stop".equals(op)){runOnUiThread(()->{if(zaviLocalWhisper!=null)zaviLocalWhisper.stop();});return;}
                        if(!"start".equals(op))return;
                        String lang=command.optString("language","fa-AF");
                        if(!("fa-AF".equals(lang)||"ps-AF".equals(lang)||"en-GB".equals(lang)))return;
                        runOnUiThread(()->startLocalVoice(lang));
                    }catch(Exception ignored){}
                });
'''+needle,1)
needle='        if(request==CAMERA_PERMISSION && pendingCamera!=null){'
assert c.count(needle)==1
c=c.replace(needle,'''        if(request==ZAVI_LOCAL_AUDIO_PERMISSION){
            if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED&&pendingLocalLanguage!=null){
                String chosen=pendingLocalLanguage;pendingLocalLanguage=null;startLocalVoice(chosen);
            } else {pendingLocalLanguage=null;sendZaviLocalEvent("permission","");}
        }
'''+needle,1)
needle='    @Override protected void onPause(){super.onPause();'
assert c.count(needle)==1
c=c.replace(needle,'    @Override protected void onPause(){if(zaviLocalWhisper!=null)zaviLocalWhisper.stop();super.onPause();',1)
needle='    @Override protected void onDestroy(){'
assert c.count(needle)==1
c=c.replace(needle,needle+'\n        if(zaviLocalWhisper!=null){zaviLocalWhisper.destroy();zaviLocalWhisper=null;}',1)
java.write_text(c,encoding='utf8')
shutil.copy2('design-system/ZaviLocalWhisper.java',root/'java/com/zavione/mobile/ZaviLocalWhisper.java')
cpp=root/'cpp';cpp.mkdir(exist_ok=True)
shutil.copy2('design-system/zavi_whisper.cpp',cpp/'zavi_whisper.cpp')
shutil.copy2('design-system/CMakeLists-zavi-voice.txt',cpp/'CMakeLists.txt')
gradle=Path('android-build/app/build.gradle');g=gradle.read_text()
assert "signingConfig signingConfigs.debug" in g
needle="    buildTypes {\n"
assert g.count(needle)==1
g=g.replace(needle,'''    ndkVersion '27.2.12479018'
    defaultConfig {
        ndk { abiFilters 'arm64-v8a' }
    }
    externalNativeBuild { cmake { path 'src/main/cpp/CMakeLists.txt' } }
'''+needle,1)
# Preserve original admin vs store package distinct, and isolate QA edition from production.
if a.app=='one':
    previous='com.zavione.one.unified20.v6598easyqa'
    nextid='com.zavione.one.unified20.localvoiceqa'
    oldcode='versionCode admin ? 4127 : 659800'
    newcode='versionCode admin ? 4127 : 659900'
else:
    previous='com.zavione.one.admin.easy1444qa'
    nextid='com.zavione.one.admin.localvoiceqa'
    oldcode='versionCode admin ? 144400 : 6554'
    newcode='versionCode admin ? 144500 : 6554'
assert previous in g and oldcode in g,(previous,oldcode)
g=g.replace(previous,nextid,1).replace(oldcode,newcode,1)
gradle.write_text(g)
assert 'SpeechRecognizer.createSpeechRecognizer' in c # legacy source remains but entry points disabled
assert html.count('zavi-voice-local-v6599.js')==1
assert (assets/'zavi-voice-pro-v6596.js').is_file() if a.app=='one' else (assets/'zavi-voice-admin-v1442.js').is_file()
print('PASS',a.app,'standalone ZAVI native-only voice, old OS/Google entry points blocked, no ledger/auth DB changes')
