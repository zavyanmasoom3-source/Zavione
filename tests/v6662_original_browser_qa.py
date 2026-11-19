"""Screenshot ORIGINAL V66.62 WebView pages after restoring its actual APK resources.
This does not bypass authentication, seed transactions, or claim financial correctness.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv("ZAVI_OLD_URL", "http://127.0.0.1:8188/")
OUT = Path(os.getenv("ZAVI_OLD_EVIDENCE", "qa-output/browser"))
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = [
    ("01_dashboard","dashboard"),("02_sales","sales"),("03_purchases","purchases"),
    ("04_products","products"),("05_contacts","contacts"),("06_debtors","debtors"),
    ("07_money","money"),("08_reports","reports"),("09_settings","settings"),
    ("10_subscription","subscription")
]
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for mode in ("light","dark"):
        ctx=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=1,locale="fa-AF")
        ctx.add_init_script("try{localStorage.setItem('zavi.visual.theme.v1', '"+mode+"');localStorage.setItem('zavi_theme_preference_v29','"+mode+"');localStorage.setItem('zavi_public_language_v11','fa-AF')}catch(e){}")
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda ex:errors.append(str(ex)))
        # No requests to customer servers in this non-production audit.
        page.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        try:
            page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
            page.wait_for_timeout(1400)
            # Validate the exact blue-baseline visual layer is loaded, not just linked.
            css_loaded = page.evaluate("""() => [...document.styleSheets].some(
                sheet => sheet.href && sheet.href.includes('/legacy-ui-fixes.css'))""")
            if not css_loaded:
                raise RuntimeError('V66.62 visual CSS layer is missing in the rendered app')
            if page.locator("html.zawi-locked").count():
                pin=page.locator("#zawiPinOne")
                if pin.count() and pin.is_visible():
                    pin.fill("246810")
                    repeat=page.locator("#zawiPinRepeat")
                    if repeat.count() and repeat.is_visible():repeat.fill("246810")
                    submit=page.locator("#zawiPinSubmit")
                    if submit.count():submit.click()
                    page.wait_for_timeout(1400)
            for screen,route in ROUTES:
                result={"screen":screen,"theme":mode,"route":route,"state":"blocked"}
                try:
                    if page.locator("html.zawi-locked").count():
                        result["state"]="private_lock_visible"
                    else:
                        nodes=page.locator(f'#sidebarLinks [data-go="{route}"],#sidebarLinks2 [data-go="{route}"],#mobileBottom [data-go="{route}"]')
                        if nodes.count()==0:
                            result["state"]="route_button_missing"
                        else:
                            nodes.first.evaluate("(el)=>el.click()")
                            page.wait_for_timeout(230)
                            content=page.locator("#content")
                            data=content.evaluate("(el)=>({chars:el.innerText.trim().length,blank:!el.textContent.trim(),overflow:document.documentElement.scrollWidth>window.innerWidth+4,heading:el.innerText.slice(0,90)})")
                            result.update(data)
                            result["state"]="rendered_unverified" if data["chars"]>30 and not data["blank"] else "empty_or_broken"
                            if data["overflow"]:
                                result["state"]="horizontal_overflow"
                            if result["state"]=="rendered_unverified":
                                page.screenshot(path=str(OUT/f"{screen}_{mode}.png"),full_page=True)
                except Exception as ex:
                    result.update(state="capture_error",detail=str(ex)[:260])
                results.append(result)
        except Exception as ex:
            results.append({"screen":"startup","theme":mode,"state":"capture_error","detail":str(ex)[:280]})
        results.append({"screen":"javascript","theme":mode,"errors":errors[:30]})
        ctx.close()
    browser.close()
(OUT/"manifest.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(results,ensure_ascii=False,indent=2))
if not any(r.get("state")=="rendered_unverified" for r in results):
    raise SystemExit("No original V66.62 module rendered in isolated browser; investigate lock and routes")
if any(r.get("state")=="horizontal_overflow" for r in results):
    raise SystemExit("V66.62 original design has horizontal overflow; inspect route screenshots before release")
