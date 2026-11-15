"""Capture REAL app-rendered pages in an isolated, empty offline browser.
No fake financial records, authenticated sessions, Supabase writes or screenshot substitutions.
Screenshots are evidence for human comparison, NOT automatic V66.62 approval.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(os.environ.get("ZAVI_VISUAL_OUTPUT", "visual-evidence"))
ROOT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("ZAVI_ONE_URL", "http://127.0.0.1:8100/")
ADMIN = os.environ.get("ZAVI_ADMIN_URL", "http://127.0.0.1:8101/")
SCREENS = [
    ("01_dashboard", "dashboard"),
    ("02_new_sale", "NEW_SALE"),
    ("03_products_warehouses", "products"),
    ("04_sales_documents", "sales"),
    ("05_purchase_management", "purchases"),
    ("06_customers_debtors", "debtors"),
    ("07_cashbox_accounts", "money"),
    ("08_reports", "reports"),
    ("09_settings_subscription", "settings"),
    ("10_more", "MORE"),
]
results = []
failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for theme in ("light", "dark"):
        context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, locale="fa-IR")
        context.add_init_script(f"""(() => {{
          try {{
            localStorage.setItem('zavi_theme_preference_v29', '{theme}');
            localStorage.setItem('zavi_public_language_v11','fa-AF');
          }} catch (_) {{}}
        }})()""")
        page = context.new_page()
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page.goto(BASE, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(450)
        # Exercise the real first-use local PIN form on this disposable context.
        # This is not an auth bypass and never unlocks cloud/accounting privileges.
        if page.locator("html.zawi-locked").count():
            page.locator("#zawiPinOne").fill("246810")
            if page.locator("#zawiPinRepeatRow").is_visible():
                page.locator("#zawiPinRepeat").fill("246810")
            page.locator("#zawiPinSubmit").click()
            try:
                page.wait_for_function("!document.documentElement.classList.contains('zawi-locked')", timeout=13000)
            except Exception:
                print("PRIVATE PIN ENTRY FAILED:",page.locator("#zawiPinError").inner_text(),flush=True)
        # Let the application's real introduction animation finish before capture.
        page.wait_for_timeout(5000)

        assistant_status = page.evaluate("""() => ['z637AiButton','z605-launch'].map(id => {
          const el=document.getElementById(id);
          if (!el) return {id,present:false};
          const cs=getComputedStyle(el),r=el.getBoundingClientRect();
          return {id,present:true,hidden:el.hidden||cs.display==='none',
            position:cs.position,insideSidebar:!!el.closest('#side .sidebar-footer'),
            x:Math.round(r.x),y:Math.round(r.y)};
        })""")
        (ROOT/f"assistants_01_dashboard_{theme}.json").write_text(
            json.dumps(assistant_status,ensure_ascii=False,indent=2),encoding="utf-8")
        if any(x.get('present') and not x.get('insideSidebar') for x in assistant_status):
            print("WARNING: assistant launcher still outside menu",assistant_status,flush=True)

        quick=page.evaluate("""() => [...document.querySelectorAll('#content .z63-quick-panel [data-z63-quick]')]
          .map(el=>({key:el.dataset.z63Quick,text:el.textContent.trim(),
            visible:getComputedStyle(el).display!=='none'}))""")
        (ROOT/f"shortcuts_01_dashboard_{theme}.json").write_text(
            json.dumps(quick,ensure_ascii=False,indent=2),encoding="utf-8")


        for screen, route in SCREENS:
            state = "not_captured"
            reason = ""
            try:
                if page.locator("html.zawi-locked").count():
                    state,reason="blocked_locked","Screen is hidden by the real private PIN gate; do not mislabel login as module screenshot"
                elif route == "MORE":
                    more=page.locator('#mobileBottom [data-go="more"]')
                    if not more.count():
                        state,reason="not_available","No actual More navigation button in mobile bottom bar"
                    else:
                        page.evaluate("""() => {
                          window.__moreClickTrace=[];
                          for(const method of ['stopPropagation','stopImmediatePropagation']){
                            const original=Event.prototype[method];
                            Event.prototype[method]=function(...args){
                              if(this.type==='click'&&this.target?.closest?.('[data-go="more"]')){
                                window.__moreClickTrace.push({method,stack:(new Error()).stack?.slice(0,1400)});
                              }
                              return original.apply(this,args);
                            };
                          }
                          window.addEventListener('click',e=>{
                            if(e.target?.closest?.('[data-go="more"]'))
                              window.__moreClickTrace.push({phase:'window-capture',target:e.target.tagName});
                          },true);
                        }""")
                        more.first.click()
                        page.wait_for_timeout(400)
                        drawer=page.locator('#side.mobile-drawer')
                        if not drawer.count() or not drawer.is_visible():
                            diagnostic=page.evaluate("""() => {
                              const el=document.getElementById('side');
                              const r=el?.getBoundingClientRect();
                              return {drawerClass:el?.className,display:el&&getComputedStyle(el).display,
                                y:r?.y,x:r?.x,width:r?.width,height:r?.height,
                                overlay:document.getElementById('overlay')?.innerHTML.slice(0,300)};
                            }""")
                            # Read-only diagnosis: call the existing navigation
                            # function once to separate event-interception from CSS.
                            direct=page.evaluate("""() => {
                              let error='',called=false;
                              try {if(typeof go==='function'){go('more');called=true}}
                              catch(ex){error=String(ex)}
                              const e=document.getElementById('side');
                              return {called,error,sidebarClass:e?.className,
                                sideDisplay:e&&getComputedStyle(e).display,
                                overlay:document.getElementById('overlay')?.innerHTML.slice(0,260)};
                            }""")
                            diagnostic['trace']=page.evaluate("window.__moreClickTrace || []")
                            diagnostic['directNavigation']=direct
                            (ROOT/f"more_failure_{theme}.json").write_text(
                              json.dumps(diagnostic,ensure_ascii=False,indent=2),encoding="utf-8")
                            state,reason="route_failed","More drawer did not open on actual click; direct route diagnosed separately"
                        else:
                            dock_status=page.evaluate("""() => {
                              const dock=document.getElementById('zaviAssistantsDock');
                              const r=dock?.getBoundingClientRect();
                              return {visible:!!dock&&getComputedStyle(dock).display!=='none',
                                y:r?.y,height:r?.height,
                                assistants:['z637AiButton','z605-launch'].map(id=>{
                                  const e=document.getElementById(id);
                                  return {id,present:!!e,insideDrawer:!!e?.closest('#side.mobile-drawer'),
                                    visible:!!e&&getComputedStyle(e).display!=='none'}
                                })};
                            }""")
                            (ROOT/f"more_assistants_{theme}.json").write_text(
                                json.dumps(dock_status,ensure_ascii=False,indent=2),encoding="utf-8")
                            page.screenshot(path=str(ROOT/f"{screen}_{theme}.png"),full_page=False)
                            state="captured_drawer_unverified"
                            if not all(a.get('insideDrawer') for a in dock_status['assistants']):
                                reason="Assistant launcher missing from accessible More drawer"
                            shade=page.locator('#drawerShade')
                            if shade.count():
                                # Do not click its obscured center; dispatch through
                                # the original delegated close handler after capture.
                                shade.first.evaluate("(node) => node.click()")

                elif route == "NEW_SALE":
                    open_button = page.locator("#topSaleBtn")
                    if open_button.count():
                        open_button.first.evaluate("(button) => button.click()")
                        page.wait_for_timeout(250)
                        dialog = page.locator("#overlay")
                        if dialog.count() and dialog.locator("form, [role=dialog], .modal").count():
                            filename = ROOT / f"{screen}_{theme}.png"
                            page.screenshot(path=str(filename), full_page=True)
                            state = "captured_dialog"
                        else:
                            state,reason = "not_available","New sale dialog did not open on the isolated offline account"
                    else:
                        state,reason = "not_available","New sale action is missing"
                else:
                    selector = page.locator(f'#sidebarLinks [data-go="{route}"], #sidebarLinks2 [data-go="{route}"]')
                    if selector.count() == 0:
                        state,reason="not_available",f"Missing existing route {route}"
                    else:
                        selector.first.evaluate("(button) => button.click()")
                        page.wait_for_timeout(320)
                        node=page.locator("#content")
                        values=node.evaluate("(n) => ({route:n.dataset.zaviRoute||'',error:!!n.querySelector('.zavi-route-error'),text:n.innerText.trim().length,overflow:document.documentElement.scrollWidth>innerWidth+3})")
                        if values["route"]!=route or values["error"] or values["text"]<15:
                            state,reason="route_failed",str(values)
                        else:
                            filename=ROOT/f"{screen}_{theme}.png"
                            page.screenshot(path=str(filename),full_page=True)
                            state="captured_unverified"
                            if route=="dashboard":
                                # Record component bounds and actual computed colors for the first-page audit.
                                layout=page.evaluate("""() => [...document.querySelectorAll(
                                   '#content, #content > *, .zrf-home > *, .z62-hero, .z63-quick-panel, .z63-quick-grid, .zrf-tiles, .zrf-primary-row, .z63-finance-grid, .zrf-income-chart'
                                 )].slice(0,70).map(el => {
                                    const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
                                    return {tag:el.tagName,cls:String(el.className||'').slice(0,140),
                                      x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
                                      bg:cs.backgroundColor,color:cs.color,display:cs.display};
                                 })""")
                                (ROOT/f"layout_01_dashboard_{theme}.json").write_text(
                                    json.dumps(layout,ensure_ascii=False,indent=2),encoding="utf-8")
                                fixed=page.evaluate("""() => [...document.querySelectorAll('body *')]
                                  .filter(el => { const c=getComputedStyle(el),r=el.getBoundingClientRect();
                                    return c.position==='fixed'&&c.visibility!=='hidden'&&c.display!=='none'&&r.width>20&&r.height>20;
                                  }).slice(0,50).map(el => {
                                    const r=el.getBoundingClientRect();
                                    return {id:el.id,cls:String(el.className||'').slice(0,110),
                                      x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};
                                  })""")
                                (ROOT/f"fixed_01_dashboard_{theme}.json").write_text(
                                    json.dumps(fixed,ensure_ascii=False,indent=2),encoding="utf-8")
                            if values["overflow"]:reason="HORIZONTAL_OVERFLOW"
                if route=="NEW_SALE":
                    page.goto(BASE,wait_until="domcontentloaded")
                    page.wait_for_timeout(300)
                    if page.locator("html.zawi-locked").count():
                        page.locator("#zawiPinOne").fill("246810")
                        page.locator("#zawiPinSubmit").click()
                        page.wait_for_function("!document.documentElement.classList.contains('zawi-locked')",timeout=13000)
                    page.wait_for_timeout(300)
            except Exception as ex:
                state,reason="capture_error",str(ex)[:350]
                try:
                    page.goto(BASE,wait_until="domcontentloaded",timeout=15000)
                    page.wait_for_timeout(250)
                    if page.locator("html.zawi-locked").count():
                        page.locator("#zawiPinOne").fill("246810")
                        page.locator("#zawiPinSubmit").click()
                        page.wait_for_function("!document.documentElement.classList.contains('zawi-locked')",timeout=13000)
                    page.wait_for_timeout(250)
                except Exception:
                    pass
            results.append({"screen":screen,"theme":theme,"result":state,"reason":reason})
            print(screen,theme,state,reason,flush=True)
        context.close()
    for theme in ("light","dark"):
        c=browser.new_context(viewport={"width":390,"height":844})
        c.add_init_script(f"(() => {{ try {{ localStorage.setItem('zavi_theme_preference_v29','{theme}') }} catch(_) {{}} }})()")
        t=c.new_page()
        t.route("**/*",lambda route:route.continue_() if route.request.url.startswith(ADMIN) else route.abort())
        try:
            t.goto(ADMIN,wait_until="domcontentloaded",timeout=45000)
            t.wait_for_timeout(650)
            t.screenshot(path=str(ROOT/f"ADMIN_login_{theme}.png"),full_page=True)
            results.append({"screen":"ADMIN_login","theme":theme,"result":"captured_unauthenticated","reason":"ADMIN private pages require owner login; no bypass was attempted"})
        except Exception as ex:
            results.append({"screen":"ADMIN_login","theme":theme,"result":"capture_error","reason":str(ex)[:350]})
        c.close()
    browser.close()

report={"source":"actual offline WebView browser DOM, no seeded user data","acceptance":"NOT_VERIFIED: visual reference alignment and real financial workflow tests pending","results":results}
(ROOT/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
captured=sum(x["result"].startswith("captured") for x in results)
print("Captures:",captured,"/",len(results),flush=True)
if captured<3:
    raise SystemExit("Unable to capture even three functional pages; inspect visual-evidence artifact")
