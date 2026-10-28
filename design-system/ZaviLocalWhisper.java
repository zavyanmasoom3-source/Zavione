package com.zavione.mobile;
import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
/** Foreground-only, no Google or system recognition. Transcription is local whisper.cpp JNI. */
public final class ZaviLocalWhisper {
 public interface Listener{void onEvent(String type,String text);}
 private static final int RATE=16000,FRAME=3200,WINDOW=RATE*6;
 private static boolean available;
 static{try{System.loadLibrary("zavivoice");available=true;}catch(Throwable e){available=false;}}
 private native long nativeOpen(String path);
 private native String nativeTranscribe(long context,float[] pcm,String language);
 private final Activity activity;
 private final Listener listener;
 private final ExecutorService executor=Executors.newSingleThreadExecutor();
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final AtomicBoolean running=new AtomicBoolean(false);
 private volatile AudioRecord mic;
 private volatile boolean closed;
 private volatile String locale="fa-AF";
 private long context;
 public ZaviLocalWhisper(Activity a,Listener callback){activity=a;listener=callback;}
 private void emit(String type,String message){handler.post(()->listener.onEvent(type,message));}
 public synchronized void start(String lang){
  if(closed||!("fa-AF".equals(lang)||"ps-AF".equals(lang)||"en-GB".equals(lang)))return;
  if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){emit("permission","");return;}
  if(!available){emit("error","native voice unavailable");return;}
  locale=lang;if(!running.compareAndSet(false,true))return;executor.execute(this::capture);
 }
 private File model()throws IOException{
  File dst=new File(activity.getFilesDir(),"zavi-ggml-tiny-q5_1.bin");
  if(dst.isFile()&&dst.length()==32152673L)return dst;
  File tmp=new File(activity.getFilesDir(),"zavi-model.tmp");
  try(InputStream in=activity.getAssets().open("models/ggml-tiny-q5_1.bin");OutputStream out=new FileOutputStream(tmp)){
   byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)out.write(b,0,n);
  }
  if(tmp.length()!=32152673L||!tmp.renameTo(dst))throw new IOException("Model incomplete");
  return dst;
 }
 private void capture(){
  AudioRecord audio=null;
  try{
   if(context==0L)context=nativeOpen(model().getAbsolutePath());
   if(context==0L)throw new IOException("Model load error");
   int min=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
   if(min<=0)throw new IOException("Mic unavailable");
   audio=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,RATE,AudioFormat.CHANNEL_IN_MONO,
       AudioFormat.ENCODING_PCM_16BIT,Math.max(min,FRAME*4));
   mic=audio;if(audio.getState()!=AudioRecord.STATE_INITIALIZED)throw new IOException("Mic initialization failed");
   audio.startRecording();emit("ready","");
   short[] buffer=new short[FRAME];
   while(running.get()&&!closed){
    float[] pcm=new float[WINDOW];
    int total=0,spoken=0,silentFrames=0;
    boolean detected=false;
    while(total<WINDOW&&running.get()){
     int n=audio.read(buffer,0,Math.min(buffer.length,WINDOW-total));
     if(n==AudioRecord.ERROR_DEAD_OBJECT||n==AudioRecord.ERROR_INVALID_OPERATION)throw new IOException("Audio stream disconnected");
     if(n<=0)continue;
     int speechSamples=0;
     for(int i=0;i<n;i++){
      int sample=buffer[i];
      pcm[total+i]=sample/32768.0f;
      if(Math.abs(sample)>=520)speechSamples++;
     }
     total+=n;
     boolean speech=speechSamples>Math.max(35,n/42);
     if(speech){detected=true;silentFrames=0;spoken+=speechSamples;}
     else if(detected)silentFrames++;
     // Finish after 0.8 second silence or 6 seconds maximum, preserving the whole phrase.
     if(detected&&total>=RATE&&silentFrames>=4)break;
    }
    if(!running.get())break;
    if(!detected||spoken<220||total<RATE/2)continue;
    emit("working","");
    String language="en-GB".equals(locale)?"en":"ps-AF".equals(locale)?"ps":"fa";
    String answer=nativeTranscribe(context,java.util.Arrays.copyOf(pcm,total),language);
    if(running.get()&&answer!=null&&!answer.trim().isEmpty())emit("result",answer.trim());
    if(running.get())emit("ready","");
   }
  }catch(Exception e){if(running.get())emit("error","Voice engine error");}
  finally{
   if(audio!=null){try{audio.stop();}catch(Exception ignored){}try{audio.release();}catch(Exception ignored){}}
   mic=null;running.set(false);emit("stopped","");
  }
 }
 public synchronized void stop(){running.set(false);AudioRecord a=mic;if(a!=null)try{a.stop();}catch(Exception ignored){}}
 public synchronized void destroy(){closed=true;stop();executor.shutdown();}
}
