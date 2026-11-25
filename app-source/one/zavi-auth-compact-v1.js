/* ZAVI ONE Compact Auth v1 — recovery-only enhancement.
   Keeps the recovery workflow in pin-recovery.js intact while replacing its
   support text with a direct WhatsApp action and the compact visual header. */
(()=>{
  'use strict';
  const whatsapp='https://wa.me/93764713434';
  function sanitizeStatus(node){
    if(!node||!node.textContent.includes('0764713434'))return;
    node.textContent=node.textContent.replace(/شماره پشتیبانی:\s*0764713434/g,'برای ارتباط، دکمه واتساپ را بزنید');
  }
  function enhance(root){
    if(!root||root.dataset.zaviAuthCompactReady==='1')return;
    root.dataset.zaviAuthCompactReady='1';
    const box=root.querySelector('.z24-pbox');
    if(box&&!box.querySelector('.z24-recovery-brand')){
      const brand=document.createElement('div');
      brand.className='z24-recovery-brand';
      brand.innerHTML='<img src="./zavi-one-original-logo.png" alt="لوگوی زاوی وان"><span>زاوی وان <b>•</b> SECURE ACCOUNTING</span>';
      box.insertBefore(brand,box.firstChild);
    }
    root.querySelectorAll('.z24-note').forEach(note=>{
      if(!/پشتیبانی/.test(note.textContent))return;
      note.classList.add('z24-support-note');
      note.innerHTML='پشتیبانی مستقیم: <a class="z24-support-link" href="'+whatsapp+'" target="_blank" rel="noopener noreferrer"><span class="z24-support-mark" aria-hidden="true">WA</span>واتساپ پشتیبانی</a><br>برای ورود و بازیابی، اتصال انترنت ضروری است.';
    });
    const status=root.querySelector('#z24RecoveryStatus');
    if(status){
      sanitizeStatus(status);
      new MutationObserver(()=>sanitizeStatus(status)).observe(status,{childList:true,subtree:true,characterData:true});
    }
  }
  const observer=new MutationObserver(()=>enhance(document.getElementById('z24Recovery')));
  observer.observe(document.body,{childList:true,subtree:true});
  enhance(document.getElementById('z24Recovery'));
})();
