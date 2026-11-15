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
        for screen, route in SCREENS:
            state = "not_captured"
            reason = ""
            try:
                if page.locator("html.zawi-locked").count():
                    state,reason="blocked_locked","Screen is hidden by the real private PIN gate; do not mislabel login as module screenshot"
                elif route == "MORE":
                    state,reason = "not_available", "Standalone More route was not established in current source navigation"
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
