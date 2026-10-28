#include <jni.h>
#include <string>
#include "whisper.h"
extern "C" JNIEXPORT jlong JNICALL Java_com_zavione_mobile_ZaviLocalWhisper_nativeOpen(JNIEnv* e,jobject,jstring file){
 if(!file)return 0;const char* p=e->GetStringUTFChars(file,nullptr);if(!p)return 0;
 auto options=whisper_context_default_params();auto* context=whisper_init_from_file_with_params(p,options);
 e->ReleaseStringUTFChars(file,p);return reinterpret_cast<jlong>(context);
}
extern "C" JNIEXPORT jstring JNICALL Java_com_zavione_mobile_ZaviLocalWhisper_nativeTranscribe(JNIEnv* e,jobject,jlong handle,jfloatArray samples,jstring lang){
 auto* ctx=reinterpret_cast<whisper_context*>(handle);if(!ctx||!samples||!lang)return e->NewStringUTF("");
 const int length=e->GetArrayLength(samples);if(length<16000||length>240000)return e->NewStringUTF("");
 jfloat* pcm=e->GetFloatArrayElements(samples,nullptr);if(!pcm)return e->NewStringUTF("");
 const char* requested=e->GetStringUTFChars(lang,nullptr);
 if(!requested){e->ReleaseFloatArrayElements(samples,pcm,JNI_ABORT);return e->NewStringUTF("");}
 std::string language=whisper_lang_id(requested)>=0?requested:"auto";
 auto p=whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
 p.print_progress=false;p.print_realtime=false;p.print_timestamps=false;p.print_special=false;
 p.translate=false;p.language=language.c_str();p.no_context=true;p.single_segment=true;p.max_tokens=96;p.n_threads=3;
 int rc=whisper_full(ctx,p,pcm,length);
 e->ReleaseStringUTFChars(lang,requested);e->ReleaseFloatArrayElements(samples,pcm,JNI_ABORT);
 if(rc!=0)return e->NewStringUTF("");
 std::string result;int count=whisper_full_n_segments(ctx);
 for(int i=0;i<count;i++){const char* t=whisper_full_get_segment_text(ctx,i);if(t)result+=t;}
 if(result.size()>1600)result.resize(1600);return e->NewStringUTF(result.c_str());
}
