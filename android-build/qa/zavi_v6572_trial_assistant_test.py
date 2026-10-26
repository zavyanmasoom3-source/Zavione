#!/usr/bin/env python3
"""Local UI QA for seven-day trial and entirely bundled offline accounting assistant.
All external HTTP blocked. No credentials, no write RPC, and no real shop financial data.
"""
import argparse,json,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--assets',required=True);ap.add_argument('--mode',choices=['one','admin'],required=True);ap.add_argument('--out',required=True);a=ap.parse_args()
root=Path(a.assets).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
threading.Thread(target=srv.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(srv.server_port)
report={'mode':a.mode,'tests':[]}
def check(label,ok,detail=None):report['tests'].append({'check':label,'pass':bool(ok),'detail':detail})
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  for theme in ['light','dark']:
   context=browser.new_context(viewport={'width':390,'height':844})
   context.add_init_script("localStorage.setItem('zavi_theme_preference_v29','"+theme+"')")
   context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base+'/') or route.request.url.startswith('data:') else route.abort())
   page=context.new_page();page.set_default_timeout(6000)
   page.goto(base+'/index.html',wait_until='domcontentloaded',timeout=40000)
   page.wait_for_timeout(850)
   if a.mode=='admin':
    demo=page.locator('#demoBtn')
    if demo.count() and demo.is_visible():demo.click()
    page.wait_for_timeout(800)
    launch=page.locator('#z70-launch')
    check('admin licence manager '+theme,launch.count()>0)
    if launch.count():
     launch.evaluate('(e)=>e.click()')
     page.wait_for_timeout(350)
     trial=page.locator('#z72-trial')
     check('admin 7-day trial form '+theme,trial.count()==1)
     if trial.count():
      text=trial.inner_text()
      check('trial text and zero cost '+theme,('۷' in text or '7' in text) and ('۰' in text or '0' in text),text[:160])
      grant=trial.locator('.z72-trial-btn')
      check('no demo grant possible '+theme,grant.is_disabled())
      page.screenshot(path=str(out/('trial-admin-'+theme+'.png')),animations='disabled',timeout=8000)
   else:
    # Browser test intentionally fabricates only a settings shell, never ledger data.
    done=page.evaluate("""()=>{
       const root=document.querySelector('#content');if(!root)return false;
       root.innerHTML='<div class="zavi-clean-settings-hub"><h2>Settings</h2></div>';
       return true
    }""")
    check('settings shell '+theme,done)
    page.wait_for_timeout(400)
    entry=page.locator('#z72-ai-entry');trial=page.locator('#z72-trial-card')
    check('store offline assistant entry '+theme,entry.count()==1)
    check('store trial status entry '+theme,trial.count()==1)
    if entry.count():
     entry.locator('button').click()
     page.wait_for_timeout(250)
     field=page.locator('#z72-ai-query');outbox=page.locator('#z72-ai-answer')
     check('offline assistant opens '+theme,field.is_visible() and outbox.is_visible())
     field.fill('سود 1200 1500')
     page.locator('.z72-ai-form button').click()
     check('sample-profit math 300 '+theme,'300' in outbox.inner_text(),outbox.inner_text()[:160])
     field.fill('قرضداران')
     page.locator('.z72-ai-form button').click()
     check('offline debtors workflow '+theme,len(outbox.inner_text())>60,outbox.inner_text()[:140])
     page.screenshot(path=str(out/('offline-assistant-'+theme+'.png')),animations='disabled',timeout=8000)
   context.close()
  browser.close()
finally:
 srv.shutdown()
report['passed']=sum(x['pass'] for x in report['tests']);report['failed']=len(report['tests'])-report['passed']
(out/'trial_assistant_qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'mode':a.mode,'passed':report['passed'],'failed':[x for x in report['tests'] if not x['pass']]},ensure_ascii=False,indent=2))
if report['failed']:raise SystemExit(1)
