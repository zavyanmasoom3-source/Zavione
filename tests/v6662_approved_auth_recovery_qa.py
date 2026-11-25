"""Browser integration test for the APPROVED SIMPLE 62 MB login/recovery UI.

Original native PIN handler and pin-recovery.js remain in use. A *test-only*
fake Supabase endpoint answers owner authentication/workspace/reset RPC.
Never use production credentials, workspaces, or live Supabase in this QA.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

BASE=os.getenv("ZAVI_OLD_URL","http://127.0.0.1:8188/")
OUT=Path(os.getenv("ZAVI_OLD_EVIDENCE","qa-output/browser"))/"approved-auth"
OUT.mkdir(parents=True,exist_ok=True)
DEMO="https://zavi-ui-qa-local.supabase.co"
REPORT=[]
PINS=("zawiPrivateGate","zawiPinForm","zawiPinOne","zawiPinRepeat",
      "zawiPinSubmit","zawiForgotPinBtn")
BUTTONS=("z24Login","z24Load","z24Workspace","z24Ask","z24Check",
         "z24Finish","z24Cancel","z24RecoveryStatus")
def record_case(browser,language,theme,width,height):
    ctx=browser.new_context(viewport={"width":width,"height":height},
                            device_scale_factor=1,locale="en-GB")
    ctx.add_init_script("""(() => {
     try {
      localStorage.setItem('zavi_public_language_v11', '%s');
      localStorage.setItem('zavi_theme_preference_v29', '%s');
      localStorage.setItem('zavi.visual.theme.v1','%s');
      localStorage.setItem('z20_cloud_settings', JSON.stringify({
          url:'https://zavi-ui-qa-local.supabase.co',key:'ui-qa-publishable-only'
      }));
     } catch (_) {}
    })()""" % (language,theme if theme!="glass" else "dark",theme))
    state={"approved":False,"auth":0,"shops":0,"request":0,"checks":0,"consume":0,
           "sent_sensitive":False,"unexpected_rpc":[]}
    def answer(route):
        req=route.request
        url=req.url
        if url.startswith(BASE):
            route.continue_();return
        if not url.startswith(DEMO+"/"):
            route.abort();return
        try: payload=req.post_data_json or {}
        except Exception: payload={}
        if isinstance(payload,dict) and any("pin" in k.lower() for k in payload):
            state["sent_sensitive"]=True
        path=urlsplit(url).path
        code=200
        if path=="/auth/v1/token":
            state["auth"]+=1
            response={"access_token":"TEST_ACCESS_NOT_REAL","refresh_token":"TEST_REFRESH_NOT_REAL",
                      "user":{"id":"qa-owner","email":"qa-owner@example.test"},
                      "expires_at":4102444800}
        elif path=="/rest/v1/zavi_workspaces":
            state["shops"]+=1
            response=[{"id":"qa-shop-1","name":"دکان نمونه","owner_uid":"qa-owner"}]
        elif path=="/rest/v1/rpc/zavi_pin_reset_request":
            state["request"]+=1
            assert payload.get("p_workspace_id")=="qa-shop-1"
            response="qa-recovery-request"
        elif path=="/rest/v1/rpc/zavi_pin_reset_status":
            state["checks"]+=1
            assert payload.get("p_request_id")=="qa-recovery-request"
            response=[{"workspace_id":"qa-shop-1",
                      "request_status":"approved" if state["approved"] else "pending"}]
        elif path=="/rest/v1/rpc/zavi_pin_reset_consume":
            state["consume"]+=1
            assert state["approved"] and state["checks"]>=2
            response=True
        else:
            state["unexpected_rpc"].append(path)
            code=404
            response={"message":"Unrecognized QA endpoint"}
        route.fulfill(status=code,content_type="application/json",
                      body=json.dumps(response,ensure_ascii=False))
    ctx.route("**/*",answer)
    page=ctx.new_page()
    dialogs=[]
    page.on("dialog",lambda dialog:(dialogs.append(dialog.message),dialog.accept()))
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(BASE,wait_until="domcontentloaded",timeout=35000)
    page.wait_for_function("""() => document.querySelector('#zawiPrivateGate.zv66-auth-clean')""",
                           timeout=15000)
    for selector in PINS:
        assert page.locator("#"+selector).count()==1, ("Missing PIN control",selector)
    assert page.locator("#zawiPrivateGate #zawiPinForm").is_visible()
    assert page.locator("#zawiPrivateGate #zawiForgotPinBtn").is_visible()
    gate_support=page.locator("#zawiPrivateGate .zv66-wa-support")
    assert gate_support.count()==1
    assert gate_support.get_attribute("href")=="https://wa.me/93764713434"
    assert "0764713434" not in page.locator("#zawiPrivateGate").inner_text()
    assert page.locator("#zawiPinSubmit").get_attribute("type")=="submit"
    assert page.locator("#zawiPinOne").get_attribute("type")=="password"
    assert page.locator("#zawiPinRepeat").get_attribute("type")=="password"
    before=page.evaluate("""() => ({
        overflow:document.documentElement.scrollWidth>innerWidth+4,
        style:[...document.styleSheets].some(s=>s.href&&s.href.includes(
                'legacy-auth-simple-v6662.css')),
        formInOriginal:!!document.querySelector('#zawiPrivateGate #zawiPinForm'),
        brand:!!document.querySelector('#zawiPrivateGate .zawi-lock-emblem img')
    })""")
    assert before["style"] and before["formInOriginal"] and before["brand"],before
    assert not before["overflow"],before
    # Original security controller decides whether the gate is open.
    # Presentation CSS must NEVER force it back over a legitimately unlocked app.
    page.evaluate("document.documentElement.classList.remove('zawi-locked')")
    assert not page.locator("#zawiPrivateGate").is_visible(), "Gate overlays an unlocked app"
    page.evaluate("document.documentElement.classList.add('zawi-locked')")
    assert page.locator("#zawiPrivateGate").is_visible(), "Gate disappeared while locked"
    if language=="fa-AF" and width==390:
        page.screenshot(path=str(OUT/f"login-{theme}.png"),full_page=False)
    page.locator("#zawiForgotPinBtn").click()
    root=page.locator("#z24Recovery")
    root.wait_for(timeout=6000)
    page.wait_for_function("""() => !!window.__zv66AuthAudit?.installed""",
                           timeout=6000)
    for selector in BUTTONS:
        assert page.locator("#"+selector).count()==1, ("Lost recovery control",selector)
    recovery_support=root.locator(".zv66-wa-support")
    assert recovery_support.count()==1
    assert recovery_support.get_attribute("href")=="https://wa.me/93764713434"
    assert "0764713434" not in root.inner_text()
    assert page.evaluate("""() => window.__zv66AuthAudit.originalControls()""")
    assert root.get_attribute("data-zv66-step")=="account"
    def verify_visual(step):
        overflow=page.evaluate("document.documentElement.scrollWidth > innerWidth + 4")
        assert not overflow, ("Responsive overflow in recovery",language,theme,width,step)
        if language=="fa-AF" and width==390:
            page.screenshot(path=str(OUT/f"recovery-{step}-{theme}.png"),full_page=False)
    verify_visual("account")
    assert page.locator("#z24Email").is_visible()
    assert page.locator("#z24Password").is_visible()
    assert not page.locator("#z24Finish").is_visible()
    assert not page.locator("#z24Ask").is_visible()
    assert state["request"]==0 and state["consume"]==0
    page.locator("#z24Email").fill("qa-owner@example.test")
    page.locator("#z24Password").fill("qa-secret-only-not-real")
    page.locator("#z24Login").click()
    page.wait_for_function("""() => document.querySelector('#z24Recovery')?.dataset.zv66Step === 'shop'""",
                           timeout=10000)
    assert page.locator("#z24Workspace").is_visible()
    assert page.locator("#z24Workspace").input_value()=="qa-shop-1"
    assert page.locator("#z24Ask").is_visible()
    assert not page.locator("#z24Finish").is_visible()
    assert state["auth"]==1 and state["shops"]>=1 and state["consume"]==0
    verify_visual("shop")
    page.locator("#z24Ask").click()
    page.wait_for_function("""() => document.querySelector('#z24Recovery')?.dataset.zv66Step === 'pending'""",
                           timeout=10000)
    assert page.locator("#z24Check").is_visible()
    assert not page.locator("#z24Finish").is_visible()
    assert "0764713434" not in root.inner_text()
    assert state["request"]==1 and state["consume"]==0
    verify_visual("pending")
    page.locator("#z24Check").click()
    page.wait_for_timeout(700)
    pending_status=page.locator("#z24RecoveryStatus").inner_text()
    assert state["checks"]>=1 and state["consume"]==0, ("Pending status did not call server",state,pending_status)
    assert any(word in pending_status.lower() for word in ("منتظر","تمه","pending","waiting")), ("Unexpected pending text",pending_status,state)
    assert root.get_attribute("data-zv66-step")=="pending", ("Stage switched before owner approved",root.get_attribute("data-zv66-step"),pending_status)
    assert not page.locator("#z24Finish").is_visible()
    state["approved"]=True
    page.locator("#z24Check").click()
    page.wait_for_timeout(650)
    approved_text=page.locator("#z24RecoveryStatus").inner_text()
    assert root.get_attribute("data-zv66-step")=="approved", ("Approved server response not reflected in UI",approved_text,state,language,theme)
    assert page.locator("#z24Finish").is_visible()
    verify_visual("approved")
    # Original finish() must itself recheck owner RPC and consume token.
    page.locator("#z24Finish").click()
    page.wait_for_function("""() => !document.querySelector('#z24Recovery')""",timeout=8000)
    assert state["checks"]>=3 and state["consume"]==1,state
    assert not state["sent_sensitive"],state
    assert page.locator("#zawiPrivateGate #zawiPinForm").count()==1
    assert not errors,errors[:5]
    REPORT.append({"language":language,"theme":theme,"width":width,
                   "stages":["account","shop","pending","approved"],"before":before,
                   "auth_calls":state["auth"],"workspace_reads":state["shops"],
                   "owner_requests":state["request"],"status_checks":state["checks"],
                   "consume_after_owner_approved":state["consume"],
                   "original_controls_preserved":True,"pin_never_sent_to_server":True})
    ctx.close()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for language in ("fa-AF","ps-AF","en"):
        for theme in ("light","dark","glass"):
            for width,height in ((390,844),(768,1024)):
                record_case(browser,language,theme,width,height)
    browser.close()
(OUT/"manifest.json").write_text(
    json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","responsive_cases":len(REPORT),
                  "recovery_auth":"original RPC + original owner approval only",
                  "no_real_credentials":True,
                  "original_pin_form":"preserved"},ensure_ascii=False))
