"""Visual-only checks for original V66.62 Dari, Pashto and English.
No production server requests, seeded transactions or permission bypass.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv("ZAVI_OLD_URL", "http://127.0.0.1:8188/")
OUT = Path(os.getenv("ZAVI_OLD_EVIDENCE", "qa-output/browser")) / "locale"
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = ("dashboard", "sales", "purchases", "products", "contacts",
          "debtors", "money", "reports", "settings", "subscription")
RECORDS = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for language in ("fa-AF", "ps-AF", "en"):
        for theme in ("light", "dark", "glass"):
            ctx = browser.new_context(viewport={"width":390,"height":844},
                                      device_scale_factor=1, locale="en-GB")
            ctx.add_init_script("""(() => {
              try {
                localStorage.setItem('zavi_public_language_v11', '%s');
                localStorage.setItem('zavi.visual.theme.v1', '%s');
                localStorage.setItem('zavi_theme_preference_v29', '%s');
              } catch (_) {}
            })()""" % (language, theme, theme if theme != "glass" else "dark"))
            page = ctx.new_page()
            page_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.route("**/*", lambda route: route.continue_()
                       if route.request.url.startswith(BASE) else route.abort())
            page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(1200)
            if page.locator("html.zawi-locked").count():
                pin = page.locator("#zawiPinOne")
                if pin.count() and pin.is_visible():
                    pin.fill("246810")
                    repeat = page.locator("#zawiPinRepeat")
                    if repeat.count() and repeat.is_visible():
                        repeat.fill("246810")
                    submit = page.locator("#zawiPinSubmit")
                    if submit.count():
                        submit.click()
                    page.wait_for_timeout(1200)
            for width, height in ((360,780),(390,844),(768,1024)):
                page.set_viewport_size({"width":width,"height":height})
                for route in ROUTES:
                    record = {"language":language,"theme":theme,"width":width,
                              "route":route,"ok":False}
                    try:
                        if page.locator("html.zawi-locked").count():
                            record["error"] = "private lock not cleared"
                        else:
                            nav = page.locator(
                                f'#sidebarLinks [data-go="{route}"],'
                                f'#sidebarLinks2 [data-go="{route}"],'
                                f'#mobileBottom [data-go="{route}"]')
                            if not nav.count():
                                record["error"] = "missing route"
                            else:
                                nav.first.evaluate("(element) => element.click()")
                                page.wait_for_timeout(115)
                                metrics = page.evaluate("""() => ({
                                  overflow: document.documentElement.scrollWidth > innerWidth + 4,
                                  chars: document.querySelector('#content')?.innerText.trim().length || 0,
                                  appliedTheme: document.documentElement.getAttribute("data-zavi-theme"),
                                  stylesheet: [...document.styleSheets].some(s =>
                                    s.href && s.href.includes('legacy-ui-fixes.css'))
                                })""")
                                record.update(metrics)
                                record["ok"] = (not metrics["overflow"] and
                                                metrics["chars"] > 30 and metrics["stylesheet"] and
                                                metrics["appliedTheme"] == theme)
                                if not record["ok"]:
                                    record["error"] = "render, viewport, theme or CSS failure"
                                if width == 390 and route in ("dashboard","sales","settings"):
                                    page.screenshot(path=str(OUT /
                                        f"{language}_{theme}_{route}.png"),full_page=False)
                    except Exception as error:
                        record["error"] = str(error)[:300]
                    RECORDS.append(record)
            if page_errors:
                RECORDS.append({"language":language,"theme":theme,
                                "ok":False,"error":"JavaScript: " +
                                "; ".join(page_errors[:5])})
            ctx.close()
    browser.close()

(OUT / "manifest.json").write_text(
    json.dumps(RECORDS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
failures = [record for record in RECORDS if not record.get("ok")]
print(json.dumps({"checks":len(RECORDS),"failed":len(failures),
                  "sample":failures[:10]},ensure_ascii=False,indent=2))
if failures:
    raise SystemExit("Historical V66.62 visual locale/viewport regression")
