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
  File dst=new File(activity.getFilesDir(),"zavi-ggml-base-q5_1.bin");
  if(dst.isFile()&&dst.length()>55000000L&&dst.length()<65000000L)return dst;
  File tmp=new File(activity.getFilesDir(),"zavi-model.tmp");
  try(InputStream in=activity.getAssets().open("models/ggml-base-q5_1.bin");OutputStream out=new FileOutputStream(tmp)){
   byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)out.write(b,0,n);
  }
  if(tmp.length()<=55000000L||tmp.length()>=65000000L||!tmp.renameTo(dst))throw new IOException("Model incomplete");
  return dst;
 }
 private void capture(){
  AudioRecord audio=null;
  try{
   // "ready" is emitted only after the microphone has started, never just after
   // loading the model. The next events prove whether PCM samples actually arrived.
   emit("loading","");
   if(context==0L)context=nativeOpen(model().getAbsolutePath());
   if(context==0L)throw new IOException("Model could not be loaded");
   int min=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
   if(min<=0)throw new IOException("Microphone is unavailable");
   // MIC works on devices where VOICE_RECOGNITION input is muted by the vendor.
   audio=new AudioRecord(MediaRecorder.AudioSource.MIC,RATE,AudioFormat.CHANNEL_IN_MONO,
       AudioFormat.ENCODING_PCM_16BIT,Math.max(min,FRAME*4));
   mic=audio;
   if(audio.getState()!=AudioRecord.STATE_INITIALIZED)throw new IOException("Microphone initialization failed");
   audio.startRecording();
   if(audio.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING)throw new IOException("Microphone did not start");
   emit("ready","");
   short[] buffer=new short[FRAME];
   int emptyCount=0,unheardCount=0;
   while(running.get()&&!closed){
    float[] pcm=new float[WINDOW];
    int total=0,quietFrames=0,consecutiveSpeech=0;
    int aboveNoise=0;
    long maxFrameRms=0;
    double noiseFloor=65;
    boolean detected=false,reported=false;
    long started=System.nanoTime();
    while(total<WINDOW&&running.get()&&!closed){
     int n=audio.read(buffer,0,Math.min(buffer.length,WINDOW-total));
     if(n==AudioRecord.ERROR_DEAD_OBJECT||n==AudioRecord.ERROR_INVALID_OPERATION||
        n==AudioRecord.ERROR_BAD_VALUE)throw new IOException("Audio input disconnected: "+n);
     if(n<=0)continue;
     double power=0;
     for(int i=0;i<n;i++){
      int sample=buffer[i];
      pcm[total+i]=sample/32768.0f;
      power+=(double)sample*sample;
     }
     total+=n;
     double rms=Math.sqrt(power/Math.max(n,1));
     maxFrameRms=Math.max(maxFrameRms,(long)rms);
     // Calibrate only during the first short interval before speech begins.
     if(!detected&&total<=RATE/2)noiseFloor=0.82*noiseFloor+0.18*Math.min(210,rms);
     boolean speech=rms>Math.max(85,noiseFloor*1.75);
     if(speech)consecutiveSpeech++;else consecutiveSpeech=0;
     if(consecutiveSpeech>=1){
       detected=true;aboveNoise++;
       quietFrames=0;
       if(!reported){reported=true;emit("heard","");}
     } else if(detected)quietFrames++;
     // End after a pause; require at least ~1.2s of speech context.
     if(detected&&total>=RATE*12/10&&quietFrames>=3)break;
     // First utterance gets an absolute timeout even on silent/defective devices.
     if(System.nanoTime()-started>8000000000L)break;
    }
    if(!running.get()||closed)break;
    if(total<8000)continue;
    // A failed voice gate must be visible to the user, not a green silent circle.
    if(!detected){
       unheardCount++;
       if(unheardCount>=1)emit("no_audio","");
       continue;
    }
    unheardCount=0;
    // The voiced chunk is preserved with exact sample count; no added zero-filled
    // seconds that can cause whisper tiny hallucinations.
    if(aboveNoise<=0)continue;
    emit("working","");
    String language="en-GB".equals(locale)?"en":"ps-AF".equals(locale)?"ps":"fa";
    String answer=nativeTranscribe(context,java.util.Arrays.copyOf(pcm,total),language);
    if(!running.get()||closed)break;
    if(answer==null||answer.trim().isEmpty()){
       emptyCount++;emit("unrecognized","");
    }else{
       String recognized=answer.trim();
       if(recognized.length()>300)recognized=recognized.substring(0,300);
       emptyCount=0;emit("result",recognized);
    }
    emit("ready","");
   }
  }catch(Exception e){
   if(running.get())emit("error",e.getMessage()==null?"Voice input error":e.getMessage());
  }finally{
   if(audio!=null){try{audio.stop();}catch(Exception ignored){}try{audio.release();}catch(Exception ignored){}}
   mic=null;running.set(false);emit("stopped","");
  }
 }
 public synchronized void stop(){running.set(false);AudioRecord a=mic;if(a!=null)try{a.stop();}catch(Exception ignored){}}
 public synchronized void destroy(){closed=true;stop();executor.shutdown();}
}
