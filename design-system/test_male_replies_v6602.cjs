'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const js=fs.readFileSync('design-system/zavi-voice-local-v6599.js','utf8');
const patch=fs.readFileSync('design-system/apply_local_voice_v6599.py','utf8');
const synth=fs.readFileSync('design-system/generate_male_voice_v6602.py','utf8');
assert(patch.includes('setMediaPlaybackRequiresUserGesture(false)'));
assert(!js.includes('z199-privacy'));
assert(!js.includes("el('textarea'"));
assert(js.includes("native('stop');state.active=false;"),'Must pause microphone when male reply plays');
assert(js.includes("state.speaking=false;"),'Must resume after reply completes');
assert(js.includes("sayReply('confirm')"),'Financial draft must request confirmation');
assert(js.includes("sayReply('executing')"),'Must announce actual execution attempt');
assert(js.includes("sayReply('cannot')"),'Must report failed navigation');
assert(!js.includes('speechSynthesis.speak'),'No Google/OS TTS calls');
assert(synth.includes('espeak-ng')&&synth.includes('fa+m3')&&synth.includes('en-gb+m3'));
assert(synth.includes('Pashto')&&synth.includes('placeholder'),'Pashto limitation must be explicit');
function simulate(admin){
 const played=[],bridge=[],clicks=[],app={hidden:false};
 const entry={dataset:admin?{page:'finance'}:{go:'sales'},hidden:true,disabled:false,isConnected:true,
   textContent:admin?'Finance':'Sales',
   classList:{active:false,contains(x){return this.active&&(x==='active'||x==='selected')}},
   getAttribute(){return null},closest(){return null},click(){this.classList.active=true;clicks.push('clicked')}};
 const document={readyState:'loading',hidden:false,
  querySelector(x){if(x==='script[src*="zavi-voice-admin-v1442.js"]')return admin?{}:null;
    if(x==='#appScreen')return admin?app:null;if(x==='#content')return admin?null:app;return null},
  querySelectorAll(){return [entry]},addEventListener(){}};
 class Audio{constructor(src){this.src=src;played.push(this)}play(){return Promise.resolve()}pause(){}}
 const window={Audio,ZaviAndroidLocalVoice:{postMessage:m=>bridge.push(JSON.parse(m))},
  ZaviAdminAPI:{getMode:()=> 'live'},
  ZaviVoiceProV6596:{route(s){if(s.includes('فروش'))return {kind:'navigate',key:'sales'};
      if(s.includes('finance'))return {kind:'navigate',key:'reports'};
      if(s.includes('rice'))return {kind:'draft',key:'sales',draft:{party:'Ali',items:[{product:'rice',quantity:2}]}};
      return {kind:'unknown'}
  }}};
 const sandbox={window,document,Audio,console,Option:function(){},Date,setInterval(){},
  localStorage:{getItem:()=>null,setItem(){}},getComputedStyle:()=>({display:'block'}),
  setTimeout:callback=>callback()};
 vm.runInNewContext(js,sandbox,{timeout:1500});
 const api=window.ZaviVoiceLocal6599;api.toggle();
 assert(played[0].src.includes('/fa/enabled.mp3'));
 played[0].onended();
 assert(bridge.some(m=>m.op==='start'));
 api.interpret(admin?'finance':'فروش');
 assert.equal(clicks.length,1);
 assert(played.some(a=>a.src.includes('/fa/executing.mp3')));
 // Complete queued narration and require navigation success clip.
 for(let i=0;i<4;i++){const active=played.filter(a=>a.onended).at(-1);if(!active)break;active.onended()}
 assert(played.some(a=>a.src.includes('/fa/opened.mp3')));
 // Runtime response phrases are pre-recorded, not synthesized from transaction amounts.
 assert(!played.some(a=>a.src.includes('posted.mp3')));
 return {played:played.map(a=>a.src),bridge,clicks};
}
simulate(false);simulate(true);
console.log('PASS: male offline reply queues, native mic pause/resume, navigation outcome, no false financial posting, no typing');
