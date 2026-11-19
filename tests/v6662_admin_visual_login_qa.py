"""Browser smoke for original-blue ADMIN login with visual-only CSS.

No real sign-in, no demo impersonation, no customer or Supabase calls.
Captures evidence; does not certify owner-only pages or production behavior.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get("ZAVI_ADMIN_OLD_URL", "http://127.0.0.1:8190/")
out = Path(os.environ.get("ZAVI_ADMIN_OLD_EVIDENCE", "qa-output/admin-browser"))
out.mkdir(parents=True, exist_ok=True)
observations = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for theme in ("light", "dark"):
        for width, height in ((390, 844), (768, 1024)):
            ctx = browser.new_context(viewport={"width": width, "height": height},
                                      device_scale_factor=1, locale="fa-AF")
            ctx.add_init_script("""(() => {
                try {
                    localStorage.setItem('zavi.visual.theme.v1', '%s');
                    localStorage.setItem('zavi_theme_preference_v29', '%s');
                    localStorage.setItem('zavi_public_language_v11', 'fa-AF');
                } catch (_) {}
            })()""" % (theme, theme))
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("**/*", lambda route: route.continue_()
                       if route.request.url.startswith(base) else route.abort())
            page.goto(base, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(1800)
            details = page.evaluate("""() => ({
                cssLoaded: [...document.styleSheets].some(s => s.href &&
                   s.href.includes('admin-legacy-ui-polish.css')),
                authPresent: !!document.querySelector('#authScreen'),
                adminShellPresent: !!document.querySelector('#appScreen'),
                navCount: document.querySelectorAll('#appScreen [data-page]').length,
                overflow: document.documentElement.scrollWidth > innerWidth + 4
            })""")
            details.update(theme=theme, width=width, height=height,
                           pageErrors=errors[:10])
            observations.append(details)
            page.screenshot(path=str(out / f"admin-login-{theme}-{width}.png"),
                            full_page=False)
            ctx.close()
    browser.close()

(out / "manifest.json").write_text(
    json.dumps(observations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(observations, ensure_ascii=False))
if not all(o["cssLoaded"] and o["authPresent"] and o["adminShellPresent"]
           and o["navCount"] >= 5 for o in observations):
    raise SystemExit("Original ADMIN screen/menus or new CSS not available")
if any(o["overflow"] for o in observations):
    raise SystemExit("Original ADMIN has horizontal viewport overflow")
