"""Isolated UI verification on restored actual APK assets. Never submits customer data."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.getenv("ZAVI_OLD_URL","http://127.0.0.1:8188/")
OUT=Path("qa-output/browser/inventory-approved");OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for theme in ("light","dark","glass"):
  ctx=browser.new_context(viewport={"width":390,"height":844},locale="fa-AF")
  ctx.add_init_script("localStorage.setItem('zavi.visual.theme.v1',"+repr(theme)+");localStorage.setItem('zavi_theme_preference_v29',"+repr(theme)+");localStorage.setItem('zavi_public_language_v11','fa-AF')")
  page=ctx.new_page();errors=[]
  page.on("pageerror",lambda err:errors.append(str(err)))
  page.route("**/*",lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
  page.goto(BASE,wait_until="domcontentloaded",timeout=30000);page.wait_for_timeout(1000)
  if page.locator("html.zawi-locked").count():
   pin=page.locator("#zawiPinOne")
   if pin.count() and pin.is_visible():
    pin.fill("246810")
    repeat=page.locator("#zawiPinRepeat")
    if repeat.count() and repeat.is_visible():repeat.fill("246810")
    page.locator("#zawiPinSubmit").click();page.wait_for_timeout(900)
  assert not page.locator("html.zawi-locked").count()
  page.evaluate("""() => {
    zaviBusinessTypeV638=()=> 'gold';
    db.products.push({id:'qa-p',name:'QA GOLD',sku:'4006381333931',salePrice:100,purchasePrice:80,openingQty:4,openingCost:80,reorder:5,industryDetails:{type:'gold',values:{karat:'21'}}});
    go('products');
  }""")
  assert page.locator('[data-zinv-tab]').count()==4
  # Guard the approved landing layout itself, not merely the existence of tabs.
  assert page.locator('.zinv-compact-head').is_visible()
  assert page.locator('.zinv-summary .card').count()==3
  assert page.locator('.zinv-summary').is_visible()
  assert page.locator('.zinv-product-card').count()==1
  assert 'QA GOLD' in page.locator('.zinv-product-card').inner_text()
  assert page.locator('.zinv .report-grid').count()==0
  assert page.locator('#zinvScanPanel').get_attribute('open') is None
  assert not page.locator('#zaviWarehouseScan').is_visible()
  page.locator('[data-zinv-scan]').click()
  assert page.locator('#zaviWarehouseScan').is_visible()
  page.locator('#zinvScanPanel summary').click()
  assert page.locator('#zinvScanPanel').get_attribute('open') is None
  assert page.locator('#productCsvImport').count()==1
  assert page.locator('.zinv [data-action=stock_adjust]').count()==1
  assert page.locator('.zinv [data-action=product_template]').count()==1
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4")
  assert page.evaluate("Object.keys(zinvCategories).length")==23
  assert page.evaluate("ZaviIndustryForms6529.types.every(x=>zinvCategories[x]?.length)")
  page.locator("#zinvFilter").select_option("low")
  assert page.locator("#zinvFilter").input_value()=="low"
  page.screenshot(path=str(OUT/f"{theme}-products.png"))
  page.evaluate("openEntity('product')")
  panel=page.locator(".zinv-dialog .z629-industry")
  assert panel.count()==1 and panel.get_attribute("open") is None
  assert panel.locator('[data-zsales-load]').count()==0
  assert page.locator('#zawiCategoryOptions option[value="لاکت"]').count()==1
  panel.locator("summary").click()
  k=panel.locator('[data-z629-key=karat]')
  assert k.input_value()==""
  panel.locator('[data-zsales-choice=karat]').select_option("22")
  assert k.input_value()=="22"
  k.fill("17K")
  assert page.evaluate("ZaviIndustryForms6529.collectSale(document.querySelector('.zinv-dialog .z629-industry'),'gold').values.karat")=="17K"
  page.locator("#zinvAutoCode").click()
  assert page.locator("#fld_sku").input_value().startswith("PR-")
  page.screenshot(path=str(OUT/f"{theme}-form.png"))
  page.evaluate("closeModal();openEntity('edit_product','qa-p')")
  assert page.locator('.zinv-dialog [data-z629-key=karat]').input_value()=="21"
  page.evaluate("closeModal()")
  page.locator('[data-zinv-tab=warehouses]').click()
  assert page.locator('[data-zinv-new]').is_visible()
  page.locator('[data-zinv-new]').click()
  assert page.locator('.zinv-dialog input[name=code]').is_visible()
  page.evaluate("closeModal()")
  page.locator('[data-zinv-tab=moves]').click()
  assert page.locator('.zinv').is_visible()
  page.locator('[data-zinv-tab=labels]').click()
  page.locator('[name=zinvProduct]').select_option("qa-p")
  page.locator('[name=zinvType]').select_option("EAN-13")
  page.locator('[data-zinv-preview]').click()
  assert page.locator('#zinvPreview svg').count()==1
  assert page.evaluate("() => {try{zinvBarcode('4006381333932','EAN-13');return false}catch(e){return true}}")
  page.locator('[name=zinvType]').select_option("Code128")
  page.locator('[data-zinv-preview]').click()
  assert page.locator('#zinvPreview svg rect').count()>30
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4")
  page.screenshot(path=str(OUT/f"{theme}-label.png"))
  assert not errors,errors
  ctx.close()
 browser.close()
print("PASS inventory: 23 category sets, optional choices and manual, existing metadata, auto code, warehouse location editor, movements and both barcode types in three themes")
