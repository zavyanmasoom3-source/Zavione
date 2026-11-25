'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=(app,file)=>fs.readFileSync(path.join(root,'app-source',app,file),'utf8');

test('compact authentication design is wired without removing auth controls',()=>{
  for(const app of ['one','admin']){
    const html=read(app,'index.html');
    const css=read(app,'zavi-auth-compact-v1.css');
    const sw=read(app,'sw.js');
    assert(html.includes('zavi-auth-compact-v1.css'),`${app}: compact CSS is not loaded`);
    assert(css.includes('zavi-auth-support'),`${app}: WhatsApp support styling is missing`);
    assert(html.includes('https://wa.me/93764713434'),`${app}: direct WhatsApp support link is missing`);
    assert(!html.includes('0764713434'),`${app}: local support number must not be visible in auth markup`);
    assert(sw.includes('zavi-auth-compact-v1.css'),`${app}: compact CSS is not in offline cache`);
    new vm.Script(sw,{filename:`${app}-sw.js`});
    if(app==='one'){
      for(const id of ['zawiPrivateGate','zawiPinForm','zawiPinOne','zawiPinRepeat','zawiPinSubmit','zawiForgotPinBtn'])
        assert(html.includes(`id="${id}"`),`one: preserved control ${id} is missing`);
      assert(html.includes('zavi-auth-compact-v1.js'),'one: recovery enhancement is not loaded');
      assert(read(app,'zavi-auth-compact-v1.js').includes('z24-support-note'),'one: recovery WhatsApp enhancement is missing');
      assert(read(app,'pin-recovery.js').includes('z24RecoveryStatus'),'one: original recovery controller is missing');
    }else{
      for(const id of ['authScreen','cfgUrl','cfgKey','authEmail','authPassword','loginBtn','resumeBtn'])
        assert(html.includes(`id="${id}"`),`admin: preserved control ${id} is missing`);
    }
  }
});
