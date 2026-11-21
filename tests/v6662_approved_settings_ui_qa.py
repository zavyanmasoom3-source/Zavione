"""Photographed-device regression for one genuinely compact V66.62 Settings view.
Uses the SAME historical WebView assets assembled into the debug APK.
No customer credentials, data mutation, owner switch, or cloud calls.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.getenv("ZAVI_OLD_URL","http://127.0.0.1:8188/")
OUT=Path(os.getenv("ZAVI_OLD_EVIDENCE","qa-output/browser"))/"approved-settings"
OUT.mkdir(parents=True,exist_ok=True)
REPORT=[]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for lang in ("fa-AF","ps-AF","en"):
        for theme in ("light","dark","glass"):
            for width,height in ((390,844),(768,1024)):
                context=browser.new_context(
                    viewport={"width":width,"height":height},device_scale_factor=1,locale="en-GB")
                context.add_init_script("""(() => {
                   try {
                    localStorage.setItem('zavi_public_language_v11','%s');
                    localStorage.setItem('zavi.visual.theme.v1','%s');
                    localStorage.setItem('zavi_theme_preference_v29','%s');
                   }catch(_){}
                })()"""%(lang,theme,theme if theme!="glass" else "dark"))
                page=context.new_page()
                errors=[]
                page.on("pageerror",lambda ex:errors.append(str(ex)))
                page.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
                page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
                page.wait_for_timeout(900)
                if page.locator("html.zawi-locked").count():
                    pin=page.locator("#zawiPinOne")
                    if pin.count() and pin.is_visible():
                        pin.fill("246810")
                        repeat=page.locator("#zawiPinRepeat")
                        if repeat.count() and repeat.is_visible():repeat.fill("246810")
                        submit=page.locator("#zawiPinSubmit")
                        if submit.count():submit.click()
                        page.wait_for_timeout(700)
                nav=page.locator('#sidebarLinks [data-go="settings"],#sidebarLinks2 [data-go="settings"]')
                assert nav.count()>0,"Settings navigation missing"
                nav.first.evaluate("(x)=>x.click()")
                page.wait_for_function("""() =>
                    window.__z66SettingsApprovedAudit?.ready &&
                    document.querySelector('#z66-business-picker-drawer #z74-workspace') &&
                    document.querySelector('#zaviDateSettings')?.closest('#z66-approved-hub')
                """,timeout=15000)
                page.wait_for_timeout(400)
                metrics=page.evaluate("""() => {
                  const content=document.querySelector('#content');
                  const hub=content.querySelector('#z66-approved-hub');
                  const modules=[...content.querySelectorAll('input[data-module-id]')];
                  const options=[...content.querySelectorAll('input[data-z20-option]')];
                  const stray=[...content.querySelectorAll('.settings-card,#z76-profile-card,#z74-workspace,#zaviDateSettings,.z6524-launch')]
                     .filter(x=>!hub.contains(x)).map(x=>x.id||x.className);
                  const pageHead=content.querySelector(':scope > .page-head');
                  const rect=hub.getBoundingClientRect();
                  return {
                   groups:hub.querySelectorAll('details[data-z66group]').length,
                   closed:hub.querySelectorAll('details.z66-settings-group:not([open])').length,
                   hubRectHeight:Math.round(rect.height),
                   moduleCount:modules.length,
                   moduleUnique:new Set(modules.map(x=>x.dataset.moduleId)).size,
                   optionCount:options.length,
                   optionUnique:new Set(options.map(x=>x.dataset.z20Option)).size,
                   controlInHub:modules.every(x=>hub.contains(x))&&options.every(x=>hub.contains(x)),
                   collapsedSubsections:hub.querySelectorAll('details.z66-settings-subsection:not([open])').length,
                   totalSubsections:hub.querySelectorAll('details.z66-settings-subsection').length,
                   uncategorizedFormCards:hub.querySelectorAll('.z66-settings-body > .settings-card,.z66-settings-body > .card,.z66-settings-body > #z76-profile-card').length,
                   nativePicker:!!hub.querySelector('#z66-business-picker-drawer #z74-workspace'),
                   nativePickerCollapsed:!hub.querySelector('#z66-business-picker-drawer').open,
                   duplicateMenu:content.querySelectorAll('#z76-settings-groups,.z673-settings-groups,.zavi-clean-settings-hub').length,
                   strayCards:stray,
                   calendarMoved:!!hub.querySelector('[data-z66group="appearance"] #zaviDateSettings'),
                   supportMoved:!!hub.querySelector('[data-z66group="advanced"] .z6524-launch'),
                   profilePresent:!!hub.querySelector('#z76-profile-card'),
                   allEnabled:!!hub.querySelector('#zaviEnableAllFeatures'),
                   shop:!!hub.querySelector('#shopForm'),
                   shopRename:!!hub.querySelector('#zaviRenameShopForm'),
                   originalPin:!!hub.querySelector('#zawiChangePin'),
                   backup:!!hub.querySelector('#importFile'),
                   integrity:!!hub.querySelector('#zaviIntegrityCheckV636'),
                   language:!!hub.querySelector('#zaviSettingsLanguage'),
                   originalCatalog:window.ZAVI_UNIFIED_PROFILES?.length,
                   unnecessaryPreview:hub.querySelectorAll('#z66-approved-trades,.z66-quick-links').length,
                   emptyTitleHidden:!pageHead||getComputedStyle(pageHead).display==='none',
                   overflow:document.documentElement.scrollWidth>innerWidth+4,
                   sourceAudit:window.__z66SettingsApprovedAudit
                  };
                }""")
                assert metrics["groups"]==8 and metrics["closed"]==8,metrics
                assert metrics["hubRectHeight"]<760,metrics
                assert metrics["moduleCount"]==14 and metrics["moduleUnique"]==14,metrics
                assert metrics["optionCount"]==15 and metrics["optionUnique"]==15,metrics
                assert metrics["controlInHub"] and metrics["nativePicker"] and metrics["nativePickerCollapsed"],metrics
                assert metrics["totalSubsections"]>=10,metrics
                assert metrics["collapsedSubsections"]==metrics["totalSubsections"],metrics
                assert metrics["uncategorizedFormCards"]==0,metrics
                assert metrics["originalCatalog"]==23 and metrics["unnecessaryPreview"]==0,metrics
                assert not metrics["duplicateMenu"] and not metrics["strayCards"],metrics
                assert metrics["calendarMoved"] and metrics["supportMoved"] and metrics["profilePresent"],metrics
                assert all(metrics[x] for x in ("allEnabled","shop","shopRename","originalPin","backup","integrity","language","emptyTitleHidden")),metrics
                assert not metrics["overflow"],metrics
                assert metrics["sourceAudit"]["originalControls"]==metrics["sourceAudit"]["preservedControls"],metrics
                if lang=="fa-AF" and width==390:
                    page.screenshot(path=str(OUT/f"settings-compact-{theme}-{width}.png"),full_page=False)
                # Only the chosen category expands; no second set of categories can appear.
                account=page.locator('details[data-z66group="account"]')
                account.locator('summary').first.click()
                assert account.evaluate("(x)=>x.open")
                drawer=page.locator('#z66-business-picker-drawer')
                assert not drawer.evaluate("(x)=>x.open")
                drawer.locator('summary').first.click()
                assert drawer.evaluate("(x)=>x.open")
                choose=page.locator('#z74-workspace button.z74-change')
                choose.click()
                page.wait_for_function("""() => document.querySelector('#z74-business-picker')?.open""",timeout=4000)
                count=page.locator('#z74-business-picker .z74-choices button').count()
                assert count==23,("Native business type picker must still list all 23",count)
                page.locator('#z74-business-picker .z74-close').click()
                assert not page.locator('#z74-business-picker').is_visible()
                # Search must never destroy native controls or change the active tenant.
                picker=page.locator('#z74-workspace').get_attribute('data-z74-industry')
                search=page.locator('.z66-setting-search')
                search.fill("فاکتور" if lang=="fa-AF" else "invoice")
                search.fill("")
                assert page.locator('#z74-workspace').get_attribute('data-z74-industry')==picker
                assert page.locator('input[data-module-id]').count()==14
                assert page.locator('input[data-z20-option]').count()==15
                if lang=="fa-AF" and width==390:
                    page.screenshot(path=str(OUT/f"settings-profile-{theme}-{width}.png"),full_page=False)
                metrics.update(language=lang,theme=theme,width=width,errors=errors[:6])
                assert not errors,errors
                REPORT.append(metrics)
                context.close()
    browser.close()
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","settings_cases":len(REPORT),
                  "single_hierarchy":True,"all_groups_closed":True,
                  "native_industries":23,"preserved_original_modules":14,
                  "preserved_original_options":15,"no_duplicate_panels":True},
                  ensure_ascii=False))
