#!/usr/bin/env python3
"""Focused QA of ADMIN light contrast & shop Settings native device-card compact layout.
No production network or account; browser and screenshot based.
"""
import argparse,json,re,threading,math
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser();p.add_argument('--assets',required=True);p.add_argument('--mode',choices=('one','admin'),required=True);p.add_argument('--out',required=True);a=p.parse_args()
root=Path(a.assets).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
report={'mode':a.mode,'checks':[],'images':[]}
def check(name,okay,detail=None):
 report['checks'].append({'name':name,'pass':bool(okay),'detail':detail})
def rgb(hexcode):
 nums=re.findall(r'[\d.]+',hexcode)
 return [float(n) for n in nums[:3]] if len(nums)>=3 else [0,0,0]
def luminance(c):
 q=[v/255 for v in c]
 vals=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in q]
 return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]
def contrast(x,y):
 a,b=sorted([luminance(rgb(x)),luminance(rgb(y))]);return round((b+.05)/(a+.05),2)
try:
 with sync_playwright() as play:
  br=play.chromium.launch(headless=True,args=['--no-sandbox'])
  for mode in ('light','dark'):
   ctx=br.new_context(viewport={'width':390,'height':844},device_scale_factor=1)
   ctx.add_init_script(f"localStorage.setItem('zavi_theme_preference_v29','{mode}')")
   ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin+'/') or route.request.url.startswith('data:') else route.abort())
   page=ctx.new_page();page.set_default_timeout(6500)
   page.goto(origin+'/index.html',wait_until='domcontentloaded',timeout=40000)
   page.wait_for_timeout(850)
   theme=page.evaluate("document.documentElement.getAttribute('data-zavi-theme')")
   check('native theme '+mode,theme==mode,{'expected':mode,'actual':theme})
   if a.mode=='admin':
    try:
     demo=page.locator('#demoBtn')
     if demo.is_visible():demo.click()
     page.wait_for_timeout(650)
     btn=page.locator('#z70-launch')
     check('owner offline tool button '+mode,btn.count()>0)
     if btn.count():
      btn.first.evaluate('(e)=>e.click()')
      page.wait_for_timeout(240)
      card=page.locator('#z70-overlay .z70-panel')
      check('owner offline modal exists '+mode,card.is_visible())
      if card.is_visible():
       samples=page.evaluate("""()=>{
        let sel=['#z70-overlay .z70-label','#z70-overlay select','#z70-overlay .z70-toggle>span',
        '#z70-overlay .z70-status','#z70-overlay .z70-warning','#z70-overlay .z70-secondary'];
        return sel.map(s=>{
         let e=document.querySelector(s);if(!e)return {selector:s,missing:true};
         let c=getComputedStyle(e),p=getComputedStyle(e.parentElement);
         return {selector:s,fg:c.webkitTextFillColor||c.color,color:c.color,bg:c.backgroundColor,parent:p.backgroundColor,font:c.fontSize}
        });
       }""")
       check('modal status and inputs present '+mode,all(not x.get('missing') for x in samples),samples)
       if mode=='light':
        checks=[]
        for item in samples:
         if item.get('missing'):continue
         bg=item['bg'] if item['bg'] not in ('transparent','rgba(0, 0, 0, 0)') else (item['parent'] if item['parent'] not in ('transparent','rgba(0, 0, 0, 0)') else 'rgb(255, 255, 255)')
         c=contrast(item['fg'],bg);checks.append({'selector':item['selector'],'ratio':c})
        check('ADMIN light contrast WCAG AA ≥4.5',all(x['ratio']>=4.5 for x in checks),checks)
       shot=f'admin-license-{mode}.png'
       page.screenshot(path=str(out/shot),animations='disabled',timeout=9000)
       report['images'].append(shot)
    except Exception as e:check('owner modal UI '+mode,False,str(e)[:500])
   else:
    result=page.evaluate("""()=>{
      let root=document.querySelector('#content');if(!root)return {missing:true};
      let el=document.createElement('section');el.id='z71-test-device';
      el.className='z652-card';
      el.innerHTML='<div class="z652-title"><h3>دستگاه‌های حساب من</h3><p>My account devices</p></div><div class="z652-actions"><button>انتقال دستگاه</button><button>تازه‌سازی دستگاه‌ها</button></div><div class="z652-devices"><div class="z652-item"><div class="z652-device-head"><strong>گوشی اصلی</strong></div><div class="z652-meta">تاریخ و اجازه دستگاه</div><button>لغو دسترسی</button></div><div class="z652-item"><div class="z652-device-head"><strong>دستگاه دوم</strong></div><div class="z652-meta">تاریخ و اجازه دستگاه</div></div></div>';
      root.append(el);
      const c=getComputedStyle(el),actions=el.querySelector('.z652-actions'),btn=actions.querySelector('button'),dev=el.querySelector('.z652-devices');
      const r={padding:c.paddingTop,rows:getComputedStyle(dev).gridTemplateColumns,actionHeight:btn.getBoundingClientRect().height,
        paddingNum:parseFloat(c.paddingTop),nCards:dev.children.length,
        minHeight:getComputedStyle(btn).minHeight};
      el.remove();return r;
    }""")
    check('device cards compact '+mode,result.get('paddingNum',999)<=10 and result.get('nCards')==2,result)
    check('device actions retain 36px touch height '+mode,float(re.search(r'[\d.]+',result.get('minHeight','0')).group())>=36,result)
   ctx.close()
  br.close()
finally:server.shutdown()
report['pass_count']=sum(int(x['pass']) for x in report['checks']);report['fail_count']=len(report['checks'])-report['pass_count']
(out/'contrast_qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'mode':a.mode,'passed':report['pass_count'],'failed':[x for x in report['checks'] if not x['pass']]},ensure_ascii=False,indent=2))
if report['fail_count']:raise SystemExit(1)
