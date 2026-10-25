#!/usr/bin/env python3
"""ZAVI APK-included local frontend browser acceptance smoke.
Runs ONLY on ephemeral localhost, demo/empty accounting. Never supplies production credentials.
Failure blocks release candidate creation. Creates screenshots and machine-readable QA evidence.
"""
import argparse, json, os, re, threading, socket, time, hashlib, sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('--assets',required=True)
p.add_argument('--mode',choices=['one','admin'],required=True)
p.add_argument('--out',required=True)
args=p.parse_args()
root=Path(args.assets).resolve();out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
assert (root/'index.html').is_file(),root
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,format,*values): pass
handler=partial(Quiet,directory=str(root))
srv=ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=srv.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{srv.server_port}/index.html'
report={'mode':args.mode,'url':'local-only','checks':[],'screenshots':[],'runtime_errors':[],'limits':['No production server access','No real customer data','No physical Android device','QA signing only']}
def record(name,passed,detail=''):
    report['checks'].append({'test':name,'pass':bool(passed),'detail':str(detail)[:450]})
def capture(page,name):
    filename=f'{args.mode}-{name}.png'
    try:
        page.screenshot(path=str(out/filename),full_page=False,animations='disabled',timeout=8000)
        report['screenshots'].append(filename)
    except Exception as e:
        report.setdefault('screenshot_warnings',[]).append(name+': '+str(e)[:130])
def inspect_geometry(page,container):
    return page.evaluate("""(s)=>{
       const r=Array.from(document.querySelectorAll(s));
       const shown=r.filter(e=>{const c=getComputedStyle(e),z=e.getBoundingClientRect();return c.display!=='none'&&z.width>0&&z.height>0});
       return {elements:shown.length,overshoots:shown.flatMap((e,i)=>{
          const p=e.getBoundingClientRect();const t=e.querySelector('.zrf-all-name,.za67-label');
          if(!t)return [];const q=t.getBoundingClientRect();
          return q.x<p.x-1||q.right>p.right+1||q.top<p.top-1||q.bottom>p.bottom+1?[i]:[];
       }),collisions:shown.reduce((acc,e,i)=>{
          if(!i)return acc;const a=e.getBoundingClientRect(),b=shown[i-1].getBoundingClientRect();
          // compare only cards in same column, intersections >3px by 3px are invalid
          const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
          const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
          if(w>5&&h>5)acc.push(i);return acc;
       },[])};
    }""",container)

try:
  with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,args=['--no-sandbox'])
    for width,height,scheme in [(390,844,'dark'),(390,844,'light'),(360,740,'dark'),(844,390,'light')]:
      context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
      context.add_init_script("""(theme)=>{}""") if False else None
      context.add_init_script(f"""localStorage.setItem('zavi_theme_preference_v29','{scheme}');""")
      # No live network connection in QA: forbid external origins.
      context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(url.rsplit('/',1)[0]+'/') or route.request.url.startswith('data:') else route.abort())
      page=context.new_page()
      page.set_default_timeout(6500)
      page.on('pageerror',lambda err: report['runtime_errors'].append(str(err)[:500]))
      page.goto(url,wait_until='domcontentloaded',timeout=40000)
      page.wait_for_timeout(1200)
      suffix=f'{width}x{height}-{scheme}'
      record('web assets reachable '+suffix,bool(page.title()),page.title())
      if args.mode=='admin':
        visible=page.locator('#authScreen').is_visible()
        hidden=not page.locator('#appScreen').is_visible()
        record('admin auth gate '+suffix,visible and hidden,'Auth visible; app hidden before login')
        if page.locator('#demoBtn').is_visible():
          page.locator('#demoBtn').click()
          page.wait_for_timeout(750)
          ready=page.locator('#appScreen').is_visible()
          record('admin local demo shell '+suffix,ready)
          if ready:
            capture(page,'home-'+suffix)
            choices=['overview','customers','payments','finance','brand','devices','support','activity','health','security','settings']
            for route in choices:
              try:
                loc=page.locator(f'#appScreen .sidebar [data-page="{route}"]').first
                loc.evaluate('(e)=>e.click()')
                page.wait_for_timeout(90)
                text=page.locator('#view').inner_text(timeout=5000)
                record('admin route '+route+' '+suffix,len(text.strip())>25,f'nonempty chars {len(text)}')
              except Exception as err:record('admin route '+route+' '+suffix,False,str(err))
            if page.locator('.za67-menu-trigger').count():
              page.locator('.za67-menu-trigger').first.evaluate('(e)=>e.click()')
              page.wait_for_timeout(150)
              data=inspect_geometry(page,'#za67-menu .za67-item')
              record('admin all sections geometry '+suffix,data['elements']>=9 and not data['overshoots'] and not data['collisions'],data)
              capture(page,'all-sections-'+suffix)
              page.keyboard.press('Escape')
            else:record('admin menu button '+suffix,False,'Missing menu trigger after demo login')
            page.locator('#appScreen .sidebar [data-page="settings"]').evaluate('(e)=>e.click()')
            page.wait_for_timeout(200)
            settings=page.locator('#view').inner_text()
            record('admin settings populated '+suffix,len(settings.strip())>80,len(settings))
            capture(page,'settings-'+suffix)
        else:
          record('admin local demo available '+suffix,False,'Local-only test mode missing; live auth never tested')
      else:
        gate=page.locator('#zawiPrivateGate').count()
        content=page.locator('#content').count()
        record('store boot has gate and main '+suffix,gate==1 and content==1)
        capture(page,'first-screen-'+suffix)
        # Safe test PIN saved ONLY in a new incognito runner profile; never real account.
        try:
          pin=page.locator('#zawiPinOne')
          if pin.is_visible():
            pin.fill('258036')
            repeat=page.locator('#zawiPinRepeat')
            if repeat.is_visible():repeat.fill('258036')
            page.locator('#zawiPinSubmit').click(timeout=2500)
            page.wait_for_timeout(850)
          opened=page.locator('#content .zrf-home').count()>0
          record('store ephemeral local setup '+suffix,opened,'Screenshot capture requires disposable local PIN setup')
          if opened:
            capture(page,'home-'+suffix)
            # The real customer entry is the "More" item in the fixed bottom navigation.
            # Clicking an obscured home shortcut with force=True can hit another overlay.
            btn=page.locator('#mobileBottom [data-go="more"]').first
            if not btn.count():btn=page.locator('[data-zrf-menu]').first
            if btn.count():
              btn.evaluate('(e)=>e.click()')
              page.wait_for_timeout(250)
              opened=page.locator('#zrf-all').count()==1
              record('store native All sections opens '+suffix,opened)
              data=inspect_geometry(page,'#zrf-all .zrf-all-item')
              note=page.locator('#zrf-all .zrf-all-empty')
              valid = (data['elements']>=1 and not data['overshoots'] and not data['collisions']) or (data['elements']==0 and note.count()==1 and len(note.inner_text().strip())>20)
              record('store all sections geometry or truthful new-account state '+suffix,valid,str(data)+'; empty='+str(note.count()))
              capture(page,'all-sections-'+suffix)
            else: record('store menu trigger '+suffix,False,'Not found after local setup')
        except Exception as err: record('store local setup '+suffix,False,str(err))
      context.close()
    browser.close()
finally:
  srv.shutdown()
report['pass_count']=sum(int(c['pass']) for c in report['checks'])
report['fail_count']=len(report['checks'])-report['pass_count']
(out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'mode':args.mode,'pass':report['pass_count'],'fail':report['fail_count'],'errors':report['runtime_errors'][:4],'failed':[x for x in report['checks'] if not x['pass']][:10]},ensure_ascii=False,indent=2))
# Fail build if UI is broken. A hard fail is safer than publishing a malfunctioning build.
if report['fail_count'] or report['runtime_errors']:sys.exit(1)
