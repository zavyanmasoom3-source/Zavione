"""Real Chromium QA of approved settings inside historical V66.62 WebView.

No cloud calls, no account mutations, no fake financial transactions.
Verify actual original toggle nodes/IDs survive, not a substitute visual mock.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv("ZAVI_OLD_URL", "http://127.0.0.1:8188/")
OUT = Path(os.getenv("ZAVI_OLD_EVIDENCE", "qa-output/browser")) / "approved-settings"
OUT.mkdir(parents=True, exist_ok=True)
REPORT = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for lang in ("fa-AF","ps-AF","en"):
        for theme in ("light","dark","glass"):
            for width,height in ((390,844),(768,1024)):
                context = browser.new_context(
                    viewport={"width":width,"height":height},
                    device_scale_factor=1,locale="en-GB")
                context.add_init_script("""(() => {
                   try {
                    localStorage.setItem('zavi_public_language_v11','%s');
                    localStorage.setItem('zavi.visual.theme.v1','%s');
                    localStorage.setItem('zavi_theme_preference_v29','%s');
                   } catch (_) {}
                })()""" % (lang,theme,theme if theme!="glass" else "dark"))
                page=context.new_page()
                errors=[]
                page.on("pageerror",lambda ex:errors.append(str(ex)))
                page.route("**/*",lambda route:route.continue_()
                           if route.request.url.startswith(BASE) else route.abort())
                page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
                page.wait_for_timeout(1200)
                if page.locator("html.zawi-locked").count():
                    pin=page.locator("#zawiPinOne")
                    if pin.count() and pin.is_visible():
                        pin.fill("246810")
                        repeat=page.locator("#zawiPinRepeat")
                        if repeat.count() and repeat.is_visible():repeat.fill("246810")
                        submit=page.locator("#zawiPinSubmit")
                        if submit.count():submit.click()
                        page.wait_for_timeout(950)
                nav=page.locator('#sidebarLinks [data-go="settings"],'
                                 '#sidebarLinks2 [data-go="settings"]')
                assert nav.count()>0, "Settings navigation missing"
                nav.first.evaluate("(x)=>x.click()")
                page.wait_for_function("""() => !!window.__z66SettingsApprovedAudit?.ready""",
                                       timeout=10000)
                metrics=page.evaluate("""() => {
                   const root=document.querySelector('#content');
                   const hub=root.querySelector('#z66-approved-hub');
                   const modules=[...root.querySelectorAll('input[data-module-id]')];
                   const options=[...root.querySelectorAll('input[data-z20-option]')];
                   return {
                     groups:hub.querySelectorAll('details[data-z66group]').length,
                     originalModules:modules.length,
                     originalOptions:options.length,
                     uniqueModuleIds:new Set(modules.map(x=>x.dataset.moduleId)).size,
                     uniqueOptionIds:new Set(options.map(x=>x.dataset.z20Option)).size,
                     enableAll:!!root.querySelector('#zaviEnableAllFeatures'),
                     renameShop:!!root.querySelector('#zaviRenameShopForm'),
                     shop:!!root.querySelector('#shopForm'),
                     pin:!!root.querySelector('#zawiChangePin'),
                     backup:!!root.querySelector('#importFile'),
                     integrity:!!root.querySelector('#zaviIntegrityCheckV636'),
                     language:!!root.querySelector('#zaviSettingsLanguage'),
                     originalCatalog:window.ZAVI_UNIFIED_PROFILES?.length,
                     availableCatalog:hub.querySelectorAll('.z66-trade-choice').length,
                     proposed:hub.querySelectorAll('.z66-trade-choice .z66-new').length,
                     hiddenGroups:hub.querySelectorAll('details:not([open])').length,
                     scrollOverflow:document.documentElement.scrollWidth>innerWidth+4,
                     origParity:window.__z66SettingsApprovedAudit
                   };
                }""")
                contrast = page.evaluate("""() => {
                  function rgb(v) { const m=v.match(/rgba?\\(([^)]+)\\)/);
                    return m ? m[1].split(',').slice(0,3).map(Number) : [0,0,0]; }
                  function luma(rgbValue) { const c=rgbValue.map(v => {
                      const f=v/255;return f<=.04045?f/12.92:((f+.055)/1.055)**2.4;
                  });return c[0]*.2126+c[1]*.7152+c[2]*.0722; }
                  function ratio(a,b){const x=luma(rgb(a)),y=luma(rgb(b));
                    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
                  return [...document.querySelectorAll('#z66-approved-hub .z66-trade-choice')]
                    .map((button) => {
                      const fg=getComputedStyle(button.querySelector('strong')).color;
                      const bg=getComputedStyle(button).backgroundColor;
                      return Math.round(ratio(fg,bg)*100)/100;
                    });
                }""")
                assert len(contrast)==23, ("Catalog buttons missing",contrast)
                assert min(contrast)>=4.5, ("Unreadable trade choice foreground/background",lang,theme,contrast)
                metrics["minTradeContrast"]=min(contrast)
                if lang=="fa-AF" and width==390:
                    page.screenshot(path=str(OUT/f"settings-initial-{theme}-{width}.png"),
                                    full_page=False)
                assert metrics["groups"]==8, ("8 settings sections expected",metrics)
                assert metrics["originalModules"]==14 and metrics["uniqueModuleIds"]==14,metrics
                assert metrics["originalOptions"]==15 and metrics["uniqueOptionIds"]==15,metrics
                assert metrics["enableAll"] and metrics["renameShop"] and metrics["shop"],metrics
                assert metrics["pin"] and metrics["backup"] and metrics["integrity"] and metrics["language"],metrics
                assert metrics["originalCatalog"]==20,metrics
                assert metrics["availableCatalog"]==23 and metrics["proposed"]==3,metrics
                assert metrics["hiddenGroups"]>=6,metrics
                assert not metrics["scrollOverflow"],metrics
                assert metrics["origParity"]["originalControls"]==metrics["origParity"]["preservedControls"],metrics
                # All original toggle labels move to appropriate groups intact.
                assert page.locator('.z66-settings-body input[data-module-id]').count()==14
                assert page.locator('.z66-settings-body input[data-z20-option]').count()==15
                assert page.locator('#z66-approved-hub .z66-trade-choice').count()==23
                # Expand 23-industry section and verify case colors are independent.
                account=page.locator('details[data-z66group="account"]')
                if not account.evaluate('(x)=>x.open'):account.locator('summary').click()
                cases=page.locator('.z66-trade-choice').filter(has_text="کاور، پوش و پوزه موبایل")
                assert cases.count()==1
                cases.click()
                assert page.locator('.z66-colors .z66-color').count()==8
                first=page.locator('.z66-colors .z66-color').first
                qty=first.locator('input[type=number]')
                assert qty.is_disabled()
                first.locator('input[type=checkbox]').check()
                assert qty.is_enabled()
                qty.fill('4')
                assert qty.input_value()=='4'
                barcode=first.locator('input[type=text]')
                assert barcode.is_enabled()
                barcode.fill('COVER-SAMPLE-001')
                assert barcode.input_value()=='COVER-SAMPLE-001'
                page.locator('.z66-add-color input').fill('نارنجی')
                page.locator('.z66-add-color button').click()
                assert page.locator('.z66-colors .z66-color').count()==9
                assert page.locator('#shopForm').count()==1
                # Search must not permanently destroy native controls.
                input=page.locator('.z66-setting-search')
                input.fill('فاکتور')
                assert page.locator('details[data-z66group="invoice"]').is_visible()
                input.fill('')
                assert page.locator('input[data-module-id]').count()==14
                assert page.locator('input[data-z20-option]').count()==15
                if lang=="fa-AF" and width==390:
                    page.screenshot(path=str(OUT/f"settings-{theme}-{width}.png"),
                                    full_page=False)
                metrics.update(language=lang,theme=theme,width=width,errors=errors[:8])
                assert not errors,errors
                REPORT.append(metrics)
                context.close()
    browser.close()

(OUT/"manifest.json").write_text(
    json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","settings_cases":len(REPORT),
                  "eight_groups":True,"original_modules":14,
                  "original_preferences":15,"catalog":23,
                  "new_previews":3,"original_handlers_preserved":True},
                 ensure_ascii=False))
