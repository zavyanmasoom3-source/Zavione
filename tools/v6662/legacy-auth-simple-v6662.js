/* Approved compact ZAVI ONE login and password recovery for the exact V66.62 assets.
 * Presentation-only. Original login form and pin-recovery.js retain all network,
 * authentication, owner approval, server confirmation, reset consume and PIN logic.
 * No token or PIN is read, stored, transmitted or simulated by this layer.
 */
(()=>{'use strict';
const DOC=document;
const $=id=>DOC.getElementById(id);
const ACTIVE='zv66-auth-clean';
const COPY={
 'fa':{title:'بازیابی رمز',intro:'حساب آنلاین را تأیید کنید و دکان خود را انتخاب کنید.',account:'1 / 3 · حساب آنلاین',shop:'2 / 3 · انتخاب دکان',pending:'3 / 3 · تأیید مالک',approved:'تأیید شد · ساخت رمز جدید',back:'بازگشت به ورود',forgot:'رمز را فراموش کرده‌ام',login:'ورود',reset:'درخواست بازیابی',check:'بررسی پاسخ',finish:'ساخت رمز جدید',load:'دریافت دکان‌ها',previous:'دکان از حساب قبلی',hint:'برای بازیابی، اینترنت و تأیید مالک ضروری است.'},
 'ps':{title:'د رمز بېرته ترلاسه کول',intro:'خپل انلاین حساب تایید او خپل دوکان غوره کړئ.',account:'1 / 3 · انلاین حساب',shop:'2 / 3 · دوکان وټاکئ',pending:'3 / 3 · د مالک تایید',approved:'تایید شو · نوی رمز',back:'ننوتلو ته ستنېدل',forgot:'رمز مو هېر شوی؟',login:'ننوتل',reset:'د بېرته ترلاسه کولو غوښتنه',check:'ځواب کتل',finish:'نوی رمز جوړول',load:'دوکانونه ترلاسه کړئ',previous:'پخوانی حساب',hint:'د رمز د بیا ترلاسه کولو لپاره انټرنېټ او د مالک تایید اړین دي.'},
 'en':{title:'Recover password',intro:'Verify your account and select your shop.',account:'1 / 3 · Cloud account',shop:'2 / 3 · Choose shop',pending:'3 / 3 · Owner approval',approved:'Approved · Set new PIN',back:'Back to sign in',forgot:'Forgot your password?',login:'Sign in',reset:'Request recovery',check:'Check response',finish:'Set new PIN',load:'Get shops',previous:'Previous account',hint:'Internet and owner approval are required to recover a PIN.'}
};
let overlay=null, statusObserver=null, optionsObserver=null, scheduled=false;
function lang(){
 const v=String($('zaviGateLanguage')?.value||DOC.documentElement.lang||'fa').toLowerCase();
 return v.startsWith('en')?'en':v.startsWith('ps')?'ps':'fa';
}
function copy(){return COPY[lang()]}
function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
function gate(){
 const root=$('zawiPrivateGate');
 if(!root)return;
 root.classList.add(ACTIVE);
 root.dataset.zv66AuthRole='private-pin';
 const forgot=$('zawiForgotPinBtn');
 if(forgot && !forgot.dataset.zv66AuthOriginalLabel)
  forgot.dataset.zv66AuthOriginalLabel=forgot.textContent;
 // Only decorate original button; preserve IDs, event handler, and PIN validation.
 if(forgot)text(forgot,copy().forgot);
 // Text of the current login title, PIN form state and validation errors belongs to
 // the original authentication controller. Do not override it here.
}
function visibleStep(root,step){
 root.dataset.zv66Step=step;
 const indicator=root.querySelector('#zv66RecoveryStep');
 if(indicator)text(indicator,copy()[step]);
 const approved=step==='approved';
 const finish=$('z24Finish');
 // A successful owner approval is DISPLAY-only here. Real finish() calls the
 // protected status RPC and reset-consume RPC before any PIN is changed.
 if(finish)finish.dataset.zv66ApprovedVisible=String(approved);
 root.dataset.zv66ApprovalUi=String(approved);
}
function derive(root){
 const workspace=$('z24Workspace'),check=$('z24Check'),message=$('z24RecoveryStatus')?.textContent||'';
 const options=workspace ? [...workspace.options].filter(x=>!!x.value) : [];
 // Original handler temporarily disables actions while its server RPC runs.
 // A previously-issued request ID, not the transient disabled state, owns stage.
 let stored='';
 try{if(workspace?.value)stored=localStorage.getItem('zavi_v24_pin_request_'+workspace.value)||''}catch(_){}
 const requested=!!(workspace?.value&&(stored||(check&&!check.disabled)));
 const approved=/مدیریت هویت شما را تأیید کرده|approved.*(owner|manager)|تأیید.*۳۰ دقیقه/i.test(message);
 if(requested&&approved)return 'approved';
 if(requested)return 'pending';
 if(options.length)return 'shop';
 return 'account';
}
function sync(){
 if(!overlay||!overlay.isConnected)return;
 visibleStep(overlay,derive(overlay));
}
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;sync()});
}
function updateLabels(root){
 const c=copy();
 text(root.querySelector('.z24-ph h2'),c.title);
 text(root.querySelector('.z24-ph p'),c.intro);
 text($('z24Login'),c.load);
 text($('z24Load'),c.previous);
 text($('z24Ask'),c.reset);
 text($('z24Check'),c.check);
 text($('z24Finish'),c.finish);
 text($('z24Cancel'),c.back);
 text(root.querySelector('.zv66-recovery-hint'),c.hint);
}
function install(root){
 if(overlay===root)return;
 if(statusObserver)statusObserver.disconnect();
 if(optionsObserver)optionsObserver.disconnect();
 overlay=root;root.dataset.zv66AuthRole='recovery';root.classList.add(ACTIVE);
 const card=root.querySelector('.z24-pbox');
 const head=root.querySelector('.z24-ph');
 const original=card&&[
   $('z24Login'),$('z24Load'),$('z24Workspace'),$('z24Ask'),
   $('z24Check'),$('z24Finish'),$('z24Cancel'),$('z24RecoveryStatus')
 ];
 if(!card||!head||!original||original.some(x=>!x||!card.contains(x)))return;
 // Retain all functional controls in their original DOM positions.
 const actions=root.querySelectorAll('.z24-pactions');
 if(actions.length!==2)return;
 actions[0].classList.add('zv66-account-actions');
 actions[1].classList.add('zv66-request-actions');
 $('z24Workspace').closest('.z24-pfield')?.classList.add('zv66-shop-field');
 const step=DOC.createElement('small');step.id='zv66RecoveryStep';
 step.className='zv66-recovery-step';step.setAttribute('aria-live','polite');
 head.insertAdjacentElement('afterend',step);
 const note=DOC.createElement('p');note.className='zv66-recovery-hint';
 note.setAttribute('role','note');card.insertBefore(note,$('z24Cancel'));
 const message=$('z24RecoveryStatus');
 statusObserver=new MutationObserver(schedule);
 statusObserver.observe(message,{childList:true,subtree:true,characterData:true});
 optionsObserver=new MutationObserver(schedule);
 optionsObserver.observe($('z24Workspace'),{childList:true});
 $('z24Workspace').addEventListener('change',schedule);
 updateLabels(root);sync();
 window.__zv66AuthAudit={
   installed:true,step:()=>root.dataset.zv66Step,
   originalControls:()=>original.every(x=>x.isConnected&&root.contains(x)),
   hasOriginalServerAuthority:()=>typeof window.zaviCloudGetAuthSession==='function'
 };
}
function onMutation(){
 gate();
 const root=$('z24Recovery');
 if(root&&!root.classList.contains(ACTIVE))install(root);
 if(!root){overlay=null;if(statusObserver)statusObserver.disconnect();if(optionsObserver)optionsObserver.disconnect();}
}
function init(){
 gate();
 new MutationObserver(onMutation).observe(DOC.body,{childList:true});
 DOC.addEventListener('change',e=>{
  if(e.target?.id==='zaviGateLanguage'||e.target?.id==='zaviTopLanguage'){
   gate();if(overlay){updateLabels(overlay);schedule()}
  }
 });
 onMutation();
}
if(DOC.readyState==='loading')DOC.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
