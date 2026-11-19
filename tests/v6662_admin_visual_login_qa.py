"""Responsive, multilingual visual safety checks for original-blue ADMIN.

No real sign-in, no demo role, no customer server calls. This checks the
owner-login shell, NOT authenticated admin operations or subscription policies.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv("ZAVI_ADMIN_OLD_URL", "http://127.0.0.1:8190/")
OUT = Path(os.getenv("ZAVI_ADMIN_OLD_EVIDENCE", "qa-output/admin-browser"))
OUT.mkdir(parents=True, exist_ok=True)
OBSERVATIONS = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for language in ("fa-AF","ps-AF","en"):
        for theme in ("light","dark","glass"):
            for width,height in ((360,780),(390,844),(768,1024),(1180,800)):
                ctx = browser.new_context(viewport={"width":width,"height":height},
                                          device_scale_factor=1,locale="en-GB")
                ctx.add_init_script("""(() => {
                    try {
                        localStorage.setItem('zavi_admin_language_v18', '%s');
                        localStorage.setItem('zavi_public_language_v11', '%s');
                        localStorage.setItem('zavi.visual.theme.v1', '%s');
                        localStorage.setItem('zavi_theme_preference_v29', '%s');
                    } catch (_) {}
                })()""" % (language,language,theme,
                            theme if theme != "glass" else "dark"))
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.route("**/*", lambda route: route.continue_()
                           if route.request.url.startswith(BASE) else route.abort())
                page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(950)
                details = page.evaluate("""() => ({
                    cssLoaded:[...document.styleSheets].some(s => s.href &&
                       s.href.includes('admin-legacy-ui-polish.css')),
                    authPresent:!!document.querySelector('#authScreen'),
                    adminShellPresent:!!document.querySelector('#appScreen'),
                    navCount:document.querySelectorAll('#appScreen [data-page]').length,
                    authInputs:['cfgUrl','cfgKey','authEmail','authPassword'].every(id =>
                       !!document.getElementById(id)),
                    loginButton:!!document.getElementById('loginBtn'),
                    overflow:document.documentElement.scrollWidth > innerWidth + 4,
                    themeAttr:document.documentElement.getAttribute('data-zavi-theme')
                })""")
                details.update(language=language,theme=theme,width=width,
                               height=height,pageErrors=errors[:10])
                details["passed"] = (
                    details["cssLoaded"] and details["authPresent"] and
                    details["adminShellPresent"] and details["navCount"] >= 5 and
                    details["authInputs"] and details["loginButton"] and
                    not details["overflow"] and not details["pageErrors"]
                )
                OBSERVATIONS.append(details)
                if width==390 or (width==768 and language=="fa-AF"):
                    page.screenshot(
                        path=str(OUT/f"admin-login-{language}-{theme}-{width}.png"),
                        full_page=False)
                ctx.close()
    browser.close()

(OUT/"manifest.json").write_text(
    json.dumps(OBSERVATIONS,ensure_ascii=False,indent=2)+"\n",
    encoding="utf-8")
failed = [result for result in OBSERVATIONS if not result["passed"]]
print(json.dumps({"total":len(OBSERVATIONS),"failed":len(failed),
                  "samples":failed[:10],"themes":sorted(set(
                  item["themeAttr"] for item in OBSERVATIONS))},
                 ensure_ascii=False,indent=2))
if failed:
    raise SystemExit("Original ADMIN multilingual login or responsive design regression")
