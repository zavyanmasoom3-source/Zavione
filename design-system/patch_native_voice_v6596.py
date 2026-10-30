#!/usr/bin/env python3
"""Add Android OS speech recognition intent in an origin-restricted WebMessage bridge.
No hidden audio, no background recording, no android permissions beyond external recognizer.
Only runs after a visible button pressed in ZAVI web assets.
"""
from pathlib import Path
p=Path("android-build/app/src/main/java/com/zavione/mobile/MainActivity.java")
s=p.read_text(encoding="utf8")
assert s.count("public final class MainActivity") == 1
if "ZaviAndroidVoice" in s:
 assert 'RecognizerIntent.ACTION_RECOGNIZE_SPEECH' in s
 assert 'VOICE_RECOGNITION' in s
 print("PASS Android voice bridge already patched for another APK in this CI job")
 raise SystemExit(0)
s=s.replace("import android.provider.MediaStore;", "import android.provider.MediaStore;\nimport android.speech.RecognizerIntent;\nimport android.content.ActivityNotFoundException;\nimport java.util.ArrayList;",1)
s=s.replace("private static final int CAMERA_PERMISSION = 4703;","private static final int CAMERA_PERMISSION = 4703;\n    private static final int VOICE_RECOGNITION = 4706;",1)
bridge='''            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidVoice",
                Collections.singleton("https://appassets.androidplatform.net"),
                (view, message, origin, isMainFrame, reply) -> {
                    if (!isMainFrame || !origin.toString().equals("https://appassets.androidplatform.net")) return;
                    final String data=message.getData();
                    if (data == null || data.length()>450) return;
                    runOnUiThread(() -> startZaviVoiceRecognition(data));
                });
'''
needle='''            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidBiometric",'''
assert s.count(needle)==1
s=s.replace(needle,bridge+needle,1)
method='''    private void startZaviVoiceRecognition(String message) {
        try {
            JSONObject args=new JSONObject(message);
            if (!"recognize".equals(args.optString("op"))) return;
            String locale=args.optString("language","fa-AF");
            if (!("fa-AF".equals(locale)||"fa-IR".equals(locale)||"ps-AF".equals(locale)
              ||"en-US".equals(locale)||"en-GB".equals(locale))) return;
            Intent recognizer=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            recognizer.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            recognizer.putExtra(RecognizerIntent.EXTRA_LANGUAGE,locale);
            recognizer.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,3);
            // A hint only. Availability of a device-local model is not guaranteed.
            recognizer.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,args.optBoolean("prefer_offline",false));
            recognizer.putExtra(RecognizerIntent.EXTRA_PROMPT,"ZAVI VOICE PRO");
            startActivityForResult(recognizer,VOICE_RECOGNITION);
        } catch (ActivityNotFoundException ex) {
            deliverVoiceResult("","unavailable");
        } catch (Exception ex) {
            deliverVoiceResult("","error");
        }
    }
    private void deliverVoiceResult(String transcript,String error) {
        if (webView==null)return;
        String script="if(window.ZaviVoiceBridgeResult){window.ZaviVoiceBridgeResult("
          + JSONObject.quote(transcript == null?"":transcript)
          + ","+JSONObject.quote(error==null?"":error)+");}";
        runOnUiThread(()->webView.evaluateJavascript(script,null));
    }

'''
anchor='''    @Override protected void onActivityResult(int request, int result, Intent data) {'''
assert s.count(anchor)==1
s=s.replace(anchor,method+anchor,1)
match='''        super.onActivityResult(request,result,data);
        if(request==PICK_UPLOAD){'''
assert s.count(match)==1
s=s.replace(match,'''        super.onActivityResult(request,result,data);
        if(request==VOICE_RECOGNITION){
            if(result==RESULT_OK && data!=null){
                ArrayList<String> alternatives=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if(alternatives!=null && !alternatives.isEmpty()){
                    deliverVoiceResult(alternatives.get(0),"");return;
                }
            }
            deliverVoiceResult("","cancelled");return;
        }
        if(request==PICK_UPLOAD){''',1)
p.write_text(s,encoding="utf8")
assert 'WebMessageListener(webView, "ZaviAndroidVoice"' in s
assert 'VOICE_RECOGNITION' in s and 'RecognizerIntent.ACTION_RECOGNIZE_SPEECH' in s
print("PASS origin-restricted Android voice chooser and safe WebView result callback")
