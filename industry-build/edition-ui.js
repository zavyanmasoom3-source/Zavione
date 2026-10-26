/* ZAVI ONE industry edition front-end identity.
 * No accounting writes and no automatic cloud-profile mutation.
 * All financial operations and permissions are the original ZAVI ONE system.
 */
(()=>{'use strict';
const p=window.ZAVI_INDUSTRY_EDITION;if(!p||!p.id)return;
const q=(s,r=document)=>r.querySelector(s);
const lang=()=>{const x=(document.documentElement.lang||'fa-AF').toLowerCase();return x.startsWith('en')?'en':x.startsWith('ps')?'ps':'fa'};
const tr=(fa,en,ps)=>lang()==='en'?en:lang()==='ps'?ps:fa;
const name=()=>p.name?.[lang()]||p.name?.fa||p.id;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';e.textContent=text||'';return e};
function openBusinessSettings(){
 const url='./v25-business.html?zavi_edition='+encodeURIComponent(p.id);
 // User must explicitly confirm original industry settings. Cloud/store permissions remain server checked.
 location.assign(url);
}
function makeCard(){
 const card=mk('section','zavi-edition-card');
 card.id='zavi-industry-edition-banner';
 card.dataset.industry=p.id;
 const detail=mk('div','zavi-edition-detail');
 const title=mk('strong','',tr('نسخۀ مخصوص '+name(),'Business edition: '+name(),'د '+name()+' ځانګړې بڼه'));
 const text=mk('small','',tr(
 'حسابداری مشترک ZAVI ONE، با امکانات پیشنهادی مخصوص همین تجارت. برای فعال‌کردن نوع تجارت در حساب خود، تنظیمات را تأیید کنید.',
 'Full ZAVI ONE accounting, with suggested tools for this trade. Confirm your store’s business type to apply the profile.',
 'د زاوي وان عمومي حسابداري؛ د دې سوداګرۍ ډول په خپل حساب کې تایید کړئ.'
 ));
 detail.append(title,text);
 const focus=mk('span','zavi-edition-focus',p.focus||'');
 const action=mk('button','zavi-edition-button',tr('تنظیم نوع تجارت','Set business type','د سوداګرۍ ډول تنظیم کړئ'));
 action.type='button';action.addEventListener('click',openBusinessSettings);
 card.append(detail,focus,action);
 return card;
}
function apply(){
 const content=q('#content');if(!content)return;
 let view=q('.zrf-home,#zaviCleanSettingsSearch,.zavi-clean-settings-hub',content);
 if(!view)return;
 if(q('#zavi-industry-edition-banner',content))return;
 const card=makeCard();
 // Insert near visible content, not inside restricted or hidden financial cards.
 const home=q('.zrf-home',content);
 if(home)home.prepend(card);
 else if(view.classList?.contains('zavi-clean-settings-hub'))view.before(card);
 else content.prepend(card);
}
function updateTitle(){
 document.documentElement.dataset.zaviIndustryEdition=p.id;
 // Avoid replacing native enterprise brand and core app labels.
 let tag=q('meta[name="application-name"]');if(!tag){tag=document.createElement('meta');tag.setAttribute('name','application-name');document.head.append(tag)}
 tag.content='ZAVI ONE — '+(p.name?.en||p.id);
}
function start(){
 updateTitle();const content=q('#content');if(!content)return;
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}).observe(content,{childList:true});
 apply();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();