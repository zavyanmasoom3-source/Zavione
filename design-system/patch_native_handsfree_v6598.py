#!/usr/bin/env python3
"""Add explicit-consent foreground Android SpeechRecognizer to ZAVI's restricted WebMessage bridge.
No background microphone, no foreground service, no secret uploads; user can disable at any time.
Run only AFTER patch_native_voice_v6596.py so original scan, offline and print remain intact.
"""
from pathlib import Path
p=Path('android-build/app/src/main/java/com/zavione/mobile/MainActivity.java')
m=Path('android-build/app/src/main/AndroidManifest.xml')
js=p.read_text(encoding='utf8')
assert 'ZaviAndroidVoice' in js and 'RecognizerIntent.ACTION_RECOGNIZE_SPEECH' in js
if 'ZaviAndroidHandsfree' in js:
 assert 'SpeechRecognizer.createSpeechRecognizer' in js
 print('PASS same native hands-free code already installed for second app package')
 raise SystemExit(0)
def one(old,new):
 global js
 assert js.count(old)==1,('expected once',old[:120])
 js=js.replace(old,new,1)
one('import android.speech.RecognizerIntent;',"""import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.RecognitionListener;
import android.os.Handler;
import android.os.Looper;""")
one('private static final int VOICE_RECOGNITION = 4706;','private static final int VOICE_RECOGNITION = 4706;\n    private static final int HANDSFREE_AUDIO_PERMISSION = 4708;')
one('    private String biometricPinSignature;',"""    private String biometricPinSignature;
    private boolean handsfreeEnabled=false;
    private boolean handsfreeForeground=true;
    private boolean handsfreeRecognizing=false;
    private String handsfreeLocale="fa-AF";
    private SpeechRecognizer handsfreeRecognizer=null;
    private final Handler handsfreeHandler=new Handler(Looper.getMainLooper());
    private int handsfreeFailures=0;
    private final Runnable handsfreeRetry=() -> beginHandsfreeRecognition();""")
anchor='''            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidVoice",'''
one(anchor,'''            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidHandsfree",
                Collections.singleton("https://appassets.androidplatform.net"),
                (view, message, origin, isMainFrame, reply) -> {
                    if (!isMainFrame || !"https://appassets.androidplatform.net".equals(origin.toString()))return;
                    final String msg=message.getData();
                    if(msg==null||msg.length()>250)return;
                    runOnUiThread(()->handleHandsfreeMessage(msg));
                });
'''+anchor)
anchor='''    private void startZaviVoiceRecognition(String message) {'''
code='''    private void nativeHandsfreeEvent(String type, String text) {
        if(webView==null)return;
        String code="if(window.ZaviHandsfreeNativeEvent){window.ZaviHandsfreeNativeEvent({type:"
          +JSONObject.quote(type)+",text:"+JSONObject.quote(text==null?"":text)+"});}";
        webView.evaluateJavascript(code,null);
    }

    private void handleHandsfreeMessage(String input) {
        try {
            JSONObject msg=new JSONObject(input);
            String op=msg.optString("op");
            if("stop".equals(op)) {endHandsfreeRecognition(true);return;}
            if(!"start".equals(op))return;
            String lang=msg.optString("language","fa-AF");
            if (!("fa-AF".equals(lang)||"fa-IR".equals(lang)||"ps-AF".equals(lang)
                ||"en-US".equals(lang)||"en-GB".equals(lang)))return;
            // Only the foreground app can start recognition. Every start comes from its
            // first-party main-frame WebMessage bridge and its explicit UI opt-in.
            handsfreeEnabled=true;
            handsfreeLocale=lang;
            handsfreeFailures=0;
            haltHandsfreeRecognizer();
            if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},HANDSFREE_AUDIO_PERMISSION);
            } else beginHandsfreeRecognition();
        } catch(Exception e) {nativeHandsfreeEvent("error","");}
    }

    private void haltHandsfreeRecognizer() {
        handsfreeHandler.removeCallbacks(handsfreeRetry);
        handsfreeRecognizing=false;
        if(handsfreeRecognizer!=null){
            try{handsfreeRecognizer.cancel();handsfreeRecognizer.destroy();}catch(Exception ignored){}
            handsfreeRecognizer=null;
        }
    }

    private void endHandsfreeRecognition(boolean resetPreference) {
        if(resetPreference)handsfreeEnabled=false;
        haltHandsfreeRecognizer();
        nativeHandsfreeEvent("paused","");
    }

    private void scheduleHandsfreeRetry(int delayMs) {
        if(!handsfreeEnabled||!handsfreeForeground)return;
        handsfreeHandler.removeCallbacks(handsfreeRetry);
        handsfreeHandler.postDelayed(handsfreeRetry,Math.max(650,delayMs));
    }

    private void beginHandsfreeRecognition() {
        if(!handsfreeEnabled||!handsfreeForeground||isFinishing()||webView==null)return;
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            nativeHandsfreeEvent("permission","");return;
        }
        if(!SpeechRecognizer.isRecognitionAvailable(this)){
            nativeHandsfreeEvent("error","unavailable");handsfreeEnabled=false;return;
        }
        if(handsfreeRecognizing)return;
        try{
            if(handsfreeRecognizer==null){
                handsfreeRecognizer=SpeechRecognizer.createSpeechRecognizer(this);
                handsfreeRecognizer.setRecognitionListener(new RecognitionListener(){
                    @Override public void onReadyForSpeech(Bundle params) {
                        nativeHandsfreeEvent("listening","");
                    }
                    @Override public void onBeginningOfSpeech(){}
                    @Override public void onRmsChanged(float rmsdB){}
                    @Override public void onBufferReceived(byte[] buffer){}
                    @Override public void onEndOfSpeech(){}
                    @Override public void onError(int err) {
                        handsfreeRecognizing=false;
                        if(!handsfreeEnabled||!handsfreeForeground)return;
                        if(err==SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS){
                            endHandsfreeRecognition(true);
                            nativeHandsfreeEvent("permission","");return;
                        }
                        handsfreeFailures=Math.min(10,handsfreeFailures+1);
                        // Throttle error/no-speech retries. The OS speech provider may stop
                        // or refuse persistent sessions; never spin in a busy loop.
                        int delay=(err==SpeechRecognizer.ERROR_NO_MATCH
                            ||err==SpeechRecognizer.ERROR_SPEECH_TIMEOUT)?1100:
                            Math.min(12500,1000+handsfreeFailures*1600);
                        if(handsfreeFailures>3)nativeHandsfreeEvent("paused","");
                        scheduleHandsfreeRetry(delay);
                    }
                    @Override public void onResults(Bundle results) {
                        handsfreeRecognizing=false;
                        handsfreeFailures=0;
                        java.util.ArrayList<String> strings=
                          results==null?null:results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if(strings!=null&&!strings.isEmpty()&&strings.get(0)!=null){
                            nativeHandsfreeEvent("result",strings.get(0));
                        }
                        scheduleHandsfreeRetry(700);
                    }
                    @Override public void onPartialResults(Bundle partialResults){}
                    @Override public void onEvent(int eventType,Bundle params){}
                });
            }
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,handsfreeLocale);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,false);
            handsfreeRecognizer.startListening(intent);
            handsfreeRecognizing=true;
        }catch(Exception err){
            handsfreeRecognizing=false;
            handsfreeFailures=Math.min(10,handsfreeFailures+1);
            nativeHandsfreeEvent("error","");
            scheduleHandsfreeRetry(Math.min(12000,2000+handsfreeFailures*1500));
        }
    }

'''
one(anchor,code+anchor)
anchor='''        if(request==CAMERA_PERMISSION && pendingCamera!=null){'''
one(anchor,'''        if(request==HANDSFREE_AUDIO_PERMISSION){
            if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED
                &&handsfreeEnabled&&handsfreeForeground)beginHandsfreeRecognition();
            else{
                endHandsfreeRecognition(true);
                nativeHandsfreeEvent("permission","");
            }
            return;
        }
'''+anchor)
one('''    @Override protected void onPause(){super.onPause();if(webView!=null)webView.onPause();}''','''    @Override protected void onPause(){
        handsfreeForeground=false;haltHandsfreeRecognizer();
        super.onPause();if(webView!=null)webView.onPause();
    }''')
one('''    @Override protected void onResume(){super.onResume();if(webView!=null)webView.onResume();}''','''    @Override protected void onResume(){
        super.onResume();handsfreeForeground=true;
        if(webView!=null)webView.onResume();
        if(handsfreeEnabled)handsfreeHandler.postDelayed(handsfreeRetry,800);
    }''')
one('''    @Override protected void onDestroy(){
        if(fileCallback!=null)''','''    @Override protected void onDestroy(){
        endHandsfreeRecognition(true);
        if(fileCallback!=null)''')
p.write_text(js,encoding='utf8')
manifest=m.read_text(encoding='utf8')
if 'android.permission.RECORD_AUDIO' not in manifest:
 assert '<uses-permission android:name="android.permission.CAMERA"/>' in manifest
 manifest=manifest.replace('<uses-permission android:name="android.permission.CAMERA"/>',
  '<uses-permission android:name="android.permission.CAMERA"/>\n    <uses-permission android:name="android.permission.RECORD_AUDIO"/>',1)
if '<queries>' not in manifest:
 assert '    <application' in manifest
 manifest=manifest.replace('    <application','    <queries>\n        <intent><action android:name="android.speech.RecognitionService"/></intent>\n    </queries>\n    <application',1)
m.write_text(manifest,encoding='utf8')
assert 'SpeechRecognizer.createSpeechRecognizer' in js and 'onPause(){' in js
assert 'android.permission.RECORD_AUDIO' in manifest
print('PASS Android foreground-only microphone with explicit permission, no background listener, safe pause/resume, throttled recovery')
