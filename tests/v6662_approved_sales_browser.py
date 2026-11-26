"""Exercise the real approved sales modal, isolated synthetic data, no server writes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.getenv("ZAVI_OLD_URL","http://127.0.0.1:8188/")
OUT=Path("qa-output/browser/sales-approved")
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for theme in ("light","dark","glass"):
        context=browser.new_context(viewport={"width":390,"height":844},locale="fa-AF")
        context.add_init_script("localStorage.setItem('zavi.visual.theme.v1',"+repr(theme)+");localStorage.setItem('zavi_theme_preference_v29',"+repr(theme)+");localStorage.setItem('zavi_public_language_v11','fa-AF')")
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda exc:errors.append(str(exc)))
        page.route("**/*",lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
        page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
        page.wait_for_timeout(900)
        if page.locator("html.zawi-locked").count():
            pin=page.locator("#zawiPinOne")
            if pin.count() and pin.is_visible():
                pin.fill("246810")
                repeat=page.locator("#zawiPinRepeat")
                if repeat.count() and repeat.is_visible():repeat.fill("246810")
                page.locator("#zawiPinSubmit").click()
                page.wait_for_timeout(900)
        assert not page.locator("html.zawi-locked").count(),"isolated UI locked"
        # Select a synthetic profile solely within this isolated browser fixture.
        page.evaluate("""() => {
          zaviBusinessTypeV638=()=> 'gold';
          db.products.push({id:'qa-gold-sale',name:'QA GOLD ONLY',sku:'QA-GOLD-01',salePrice:120,openingQty:5,openingCost:50,industryDetails:{type:'gold',values:{karat:'21',grossGrams:'3'}}});
          go('sales');
        }""")
        page.wait_for_timeout(200)
        assert page.locator(".zsales-approved").count()==1
        assert page.locator("[data-zsales-filter]").count()==4
        page.locator("[data-zsales-filter=credit]").click()
        assert page.locator("[data-zsales-filter=credit]").get_attribute("aria-pressed")=="true"
        page.locator("[data-zsales-filter=all]").click()
        page.screenshot(path=str(OUT/f"{theme}-list.png"))
        page.evaluate("openOrder('sale')")
        row=page.locator(".zsales-dialog .order-line").first
        row.locator('[data-field=productName]').fill("QA GOLD ONLY")
        row.locator('[data-field=productName]').press("Tab")
        panel=row.locator(".zsales-optional")
        assert panel.get_attribute("open") is None
        panel.locator("summary").click()
        karat=panel.locator('[data-z629-key=karat]')
        assert karat.input_value()=="" # matching product must not auto-fill optional metadata
        panel.locator("[data-zsales-load]").click()
        assert karat.input_value()=="21"
        panel.locator("[data-zsales-clear]").click()
        assert karat.input_value()==""
        panel.locator('[data-zsales-choice=karat]').select_option("22")
        assert karat.input_value()=="22"
        karat.fill("17K")
        assert page.evaluate("""() => ZaviIndustryForms6529.collectSale(document.querySelector('.zsales-optional'),'gold').values.karat""")=="17K"
        assert page.evaluate("() => document.documentElement.scrollWidth<=innerWidth+4")
        page.screenshot(path=str(OUT/f"{theme}-form.png"))
        # No submit, no real transactions or cloud changes.
        assert not errors,errors
        context.close()
    browser.close()
print("PASS: isolated sales list, filter, collapsed optional fields, deliberate import, clear, ready choices and manual input")
