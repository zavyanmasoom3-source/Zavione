"""Read-only real-browser checks for 23 trade source registries and case variants.

No workspace changes; no owner login; no financial writes. Product color build
is exercised as a pure function on test values, not as a customer transaction.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get("ZAVI_OLD_URL","http://127.0.0.1:8188/")
OUT=Path(os.environ.get("ZAVI_OLD_EVIDENCE","qa-output/browser"))/"trades23"
OUT.mkdir(parents=True,exist_ok=True)
REPORT=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for lang in ("fa-AF","ps-AF","en"):
        context=browser.new_context(viewport={"width":390,"height":844},locale="en-GB")
        context.add_init_script("""(() => {
          try{localStorage.setItem('zavi_public_language_v11','%s')}catch(_){}
        })()""" % lang)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda err:errors.append(str(err)))
        page.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
        page.wait_for_timeout(1000)
        core=page.evaluate("""() => {
         const refs=window.ZAVI_UNIFIED_PROFILES||[];
         const kit=window.ZaviIndustryKit6525;
         const form=window.ZaviIndustryForms6529;
         const maker=window.ZaviCaseVariants66;
         const keys=['restaurant','covers','accessories'];
         const built=maker?.build({
            kind:'covers',name:'کاور نمونه',model:'Samsung A56',material:'سیلیکونی',
            salePrice:100,purchasePrice:60,reorder:2,variants:[
              {color:'سیاه',qty:6,barcode:'QA-COV-A56-BLK'},
              {color:'آبی',qty:3,barcode:'QA-COV-A56-BLU'}
            ]},[],(p)=>p+'_'+Math.random().toString(36).slice(2));
         return {
          list:refs.length,ids:refs.map(x=>x.id),
          kit:kit?.types?.length,forms:form?.types?.length,
          keysPresent:keys.every(id=>refs.some(x=>x.id===id)&&
                kit?.profile(id)&&form?.fields(id)?.length>2),
          built:built?.length,distinctIds:built?.[0].id!==built?.[1].id,
          distinctBarcodes:built?.[0].sku!==built?.[1].sku,
          amounts:built?.map(x=>x.openingQty)
         };
        }""")
        assert core["list"]==23 and len(set(core["ids"]))==23,core
        assert core["kit"]==23 and core["forms"]==23 and core["keysPresent"],core
        assert core["built"]==2 and core["distinctIds"] and core["distinctBarcodes"],core
        assert core["amounts"]==[6,3],core
        business=page.context.new_page()
        business.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        business.goto(BASE+"v25-business.html",wait_until="domcontentloaded",timeout=30000)
        business.wait_for_timeout(1200)
        config=business.evaluate("""() => ({
          profileCount:window.ZAVI_UNIFIED_PROFILES?.length,
          selectCount:document.querySelector('#type')?.options.length,
          industryCount:window.ZaviIndustryKit6525?.types?.length,
          newTypes:['restaurant','covers','accessories'].every(
            id=>[...document.querySelector('#type').options].some(o=>o.value===id))
        })""")
        assert config["profileCount"]==23 and config["selectCount"]==23,config
        assert config["industryCount"]==23 and config["newTypes"],config
        assert not errors,errors
        REPORT.append({"lang":lang,"core":core,"business":config,"errors":errors})
        business.close();context.close()
    browser.close()
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","language_cases":len(REPORT),"registered_types":23,
                  "specialized_types":3,"color_stock_mode":"independent_product_IDs"},
                 ensure_ascii=False))
