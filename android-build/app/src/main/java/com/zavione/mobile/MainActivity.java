package com.zavione.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.print.PrintManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

import java.io.OutputStream;
import java.util.Collections;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String BASE = "https://appassets.androidplatform.net/";
    private static final int PICK_UPLOAD = 4701;
    private static final int SAVE_DOCUMENT = 4702;
    private static final int MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
    private static final String BRIDGE_SCRIPT = "(function(){"
        + "if(window.__zaviNativeReady)return;window.__zaviNativeReady=true;"
        + "document.addEventListener('click',async function(e){"
        + "let a=e.target&&e.target.closest?e.target.closest('a[download]'):null;"
        + "if(!a||!a.href||!a.href.startsWith('blob:')||!window.ZaviAndroidDownloads)return;"
        + "e.preventDefault();e.stopImmediatePropagation();"
        + "try{let r=await fetch(a.href),b=await r.blob(),reader=new FileReader();"
        + "reader.onload=function(){ZaviAndroidDownloads.postMessage(JSON.stringify({name:a.download||'ZAVI_ONE_document',mime:b.type||'application/octet-stream',data:reader.result}));};"
        + "reader.readAsDataURL(b);}catch(err){console.error('Save failed',err);}"
        + "},true);"
        + "window.print=function(){if(window.ZaviAndroidPrint)ZaviAndroidPrint.postMessage('print');};"
        + "})();";
    private FrameLayout container;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingSave;
    private String pendingMime;
    private long lastBackPress;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7,26,51));
        getWindow().setNavigationBarColor(Color.rgb(7,26,51));
        container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(7,26,51));
        setContentView(container);
        if (Build.VERSION.SDK_INT >= 30) {
            container.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        } else {
            container.setFitsSystemWindows(true);
        }
        assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            androidx.webkit.ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(
                new androidx.webkit.ServiceWorkerClientCompat() {
                    @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        return assetLoader.shouldInterceptRequest(request.getUrl());
                    }
                }
            );
        }
        initializeWebView();
        webView.loadUrl(BASE + "index.html");
    }

    private void initializeWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7,26,51));
        container.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ZAVI-ONE-Android");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent pick = params.createIntent();
                    startActivityForResult(pick, PICK_UPLOAD);
                    return true;
                } catch (Exception ex) {
                    fileCallback = null;
                    toast("File picker unavailable / انتخاب فایل ممکن نیست");
                    return false;
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView w, WebResourceRequest req) {
                return assetLoader.shouldInterceptRequest(req.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                Uri url = req.getUrl();
                if (isLocal(url)) return false;
                openExternal(url);
                return true;
            }
            @Override public void onPageFinished(WebView w, String url) {
                if (url.startsWith(BASE)) w.evaluateJavascript(BRIDGE_SCRIPT, null);
            }
            @Override public void onReceivedError(WebView w, WebResourceRequest req, android.webkit.WebResourceError err) {
                if (req.isForMainFrame()) runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                  .setTitle("ZAVI ONE")
                  .setMessage("صفحه برنامه باز نشد. اتصال اینترنت و نسخه برنامه را بررسی کنید.")
                  .setPositiveButton("تلاش دوباره", (d, which) -> w.reload())
                  .setNegativeButton("بستن", (d, which) -> finish())
                  .show());
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidDownloads",
                Collections.singleton("https://appassets.androidplatform.net"),
                (view, message, origin, isMainFrame, reply) -> {
                    if (!isMainFrame || !origin.toString().equals("https://appassets.androidplatform.net")) return;
                    String msg = message.getData();
                    if (msg != null) receiveDownload(msg);
                });
            WebViewCompat.addWebMessageListener(webView, "ZaviAndroidPrint",
                Collections.singleton("https://appassets.androidplatform.net"),
                (view, message, origin, isMainFrame, reply) -> {
                    if (!isMainFrame || !origin.toString().equals("https://appassets.androidplatform.net")) return;
                    runOnUiThread(this::printPage);
                });
        }
        webView.setDownloadListener((url,userAgent,disposition,mime,size) -> {
            if (url == null) return;
            if (url.startsWith("blob:") && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                String script = "(async function(){try{let r=await fetch(" + JSONObject.quote(url) + ");let b=await r.blob();let fr=new FileReader();fr.onload=function(){ZaviAndroidDownloads.postMessage(JSON.stringify({name:'ZAVI_ONE_download',mime:b.type||'application/octet-stream',data:fr.result}));};fr.readAsDataURL(b);}catch(e){console.error(e);}})()";
                webView.evaluateJavascript(script,null);
            } else if (url.startsWith("https://")) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setTitle("ZAVI ONE download");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalFilesDir(MainActivity.this,Environment.DIRECTORY_DOWNLOADS,"zavi-download-"+System.currentTimeMillis());
                    DownloadManager dm=(DownloadManager)getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) dm.enqueue(request);
                    toast("Downloading...");
                } catch(Exception ex) { toast("Download unavailable"); }
            }
        });
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) &&
            "appassets.androidplatform.net".equals(uri.getHost());
    }

    private void openExternal(Uri uri) {
        try {
            String scheme=uri.getScheme();
            if (scheme==null || !(scheme.equals("https")||scheme.equals("http")||scheme.equals("mailto")||scheme.equals("tel")||scheme.equals("whatsapp")))return;
            Intent i = new Intent(Intent.ACTION_VIEW,uri);
            startActivity(i);
        } catch(Exception ex) { toast("Cannot open link / لینک باز نشد"); }
    }

    private void receiveDownload(String input) {
        try {
            JSONObject item = new JSONObject(input);
            String data=item.getString("data");
            int comma=data.indexOf(',');
            if (!data.startsWith("data:") || comma<0 || !data.substring(0,comma).endsWith(";base64"))return;
            if (data.length()>MAX_DOWNLOAD_BYTES*2) {toast("File too large");return;}
            byte[] binary=android.util.Base64.decode(data.substring(comma+1),android.util.Base64.DEFAULT);
            if(binary.length > MAX_DOWNLOAD_BYTES)return;
            String name=item.optString("name","ZAVI_ONE_document");
            name=name.replaceAll("[^\\p{L}\\p{N}._ -]","_");
            if (name.isEmpty()) name="ZAVI_ONE_document";
            if (name.length()>100) name=name.substring(0,100);
            String mime=item.optString("mime","application/octet-stream");
            if(mime.length()>80 || !mime.matches("[A-Za-z0-9.\\-+]+/[A-Za-z0-9.\\-+]+"))mime="application/octet-stream";
            final String finalName=name, finalMime=mime;
            runOnUiThread(()->{
                if(pendingSave!=null){toast("Please save the current file first");return;}
                pendingSave=binary; pendingMime=finalMime;
                Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                save.addCategory(Intent.CATEGORY_OPENABLE);
                save.setType(finalMime);
                save.putExtra(Intent.EXTRA_TITLE,finalName);
                try{startActivityForResult(save,SAVE_DOCUMENT);}
                catch(Exception ex){pendingSave=null;toast("Unable to save file");}
            });
        } catch (Exception ignored) {toast("Unable to prepare download");}
    }

    private void printPage() {
        try {
            PrintManager manager=(PrintManager)getSystemService(Context.PRINT_SERVICE);
            if(manager!=null && webView!=null) manager.print("ZAVI ONE",webView.createPrintDocumentAdapter("ZAVI ONE"),new android.print.PrintAttributes.Builder().build());
        } catch(Exception ex){toast("Print unavailable");}
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if(request==PICK_UPLOAD){
            if(fileCallback!=null){
                Uri[] uris= WebChromeClient.FileChooserParams.parseResult(result,data);
                fileCallback.onReceiveValue(uris);
                fileCallback=null;
            }
        }
        if(request==SAVE_DOCUMENT){
            byte[] payload=pendingSave; pendingSave=null;
            if(result==RESULT_OK && data!=null && data.getData()!=null && payload!=null){
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                    if(out==null)throw new Exception("No output stream");
                    out.write(payload);
                    toast("File saved / فایل ذخیره شد");
                }catch(Exception ex){toast("Saving failed / ذخیره نشد");}
            }
        }
    }

    private void toast(String message) {runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
    @Override public void onBackPressed() {
        if(webView!=null && webView.canGoBack()){webView.goBack();return;}
        if(System.currentTimeMillis()-lastBackPress<1800){super.onBackPressed();return;}
        lastBackPress=System.currentTimeMillis();
        toast("Press back again to exit / برای خروج دوباره بزنید");
    }
    @Override protected void onPause(){super.onPause();if(webView!=null)webView.onPause();}
    @Override protected void onResume(){super.onResume();if(webView!=null)webView.onResume();}
    @Override protected void onDestroy(){
        if(webView!=null){
            container.removeView(webView);
            webView.stopLoading();webView.destroy();webView=null;
        }
        super.onDestroy();
    }
}