#!/usr/bin/env python3
"""V65.83: make real 7-day trial subscriptions valid in ALL legacy app guards.
Keep owner/device/ES256 signature checks, no local entitlement bypass.
"""
import runpy,sys,json
from pathlib import Path
runpy.run_path("industry-build/prepare_unified_v6582.py",run_name="__main__")
out=Path(sys.argv[sys.argv.index("--web")+1])
p=out/"annual-license.js"
s=p.read_text(encoding="utf8")
checks=[
 ("['annual','semiannual'].includes(entitlement.plan)&&new Date(entitlement.expires_at)","['annual','semiannual','trial'].includes(entitlement.plan)&&new Date(entitlement.expires_at)"),
 ("if(['annual','semiannual'].includes(plan))return","if(['annual','semiannual','trial'].includes(plan))return"),
 ("plan==='semiannual'?'اشتراک شش‌ماهه':'اشتراک سالانه'","plan==='trial'?'اشتراک آزمایشی ۷روزه':plan==='semiannual'?'اشتراک شش‌ماهه':'اشتراک سالانه'"),
 ("p==='annual'?'سالانه':'هنوز ثبت نشده'","p==='annual'?'سالانه':p==='trial'?'آزمایشی ۷روزه':'هنوز ثبت نشده'"),
 ("const duration=p==='semiannual'?180:p==='annual'?365:0;","const duration=p==='trial'?7:p==='semiannual'?180:p==='annual'?365:0;"),
 ("if(['annual','semiannual'].includes(entitlement.plan)&&timeDelta(entitlement.server_time,entitlement.expires_at)<=30)return 'warning';",
  "if((['annual','semiannual'].includes(entitlement.plan)&&timeDelta(entitlement.server_time,entitlement.expires_at)<=30)||(entitlement.plan==='trial'&&timeDelta(entitlement.server_time,entitlement.expires_at)<=2))return 'warning';"),
 ("if(e?.detail?.workspace!==info().workspace)return;secureLease=",
  "if((e?.detail?.workspace_id||e?.detail?.workspace)!==info().workspace)return;secureLease=")
]
for old,new in checks:
 count=s.count(old)
 if count!=1:raise AssertionError("Unexpected guard count "+str(count)+": "+old+"; got="+str(s.count(old)))
 s=s.replace(old,new)
# Fail-closed owner-bound ES256 lease verification remains unchanged.
assert "secureLease=await window.zaviSecureOfflineLicense.cached(info().workspace)" in s
assert "if(!baseCanEdit()||!window.zaviTenantIsBound?.()||onlineDenied)return false" in s
assert "['annual','semiannual','trial'].includes(entitlement.plan)" in s
assert "p==='trial'?'آزمایشی ۷روزه'" in s
assert "if(['annual','semiannual','trial'].includes(plan))return" in s
assert "zaviSecureOfflineLicense?.device()" in s
p.write_text(s,encoding="utf8")
manifest=out/"zavi-unified20-manifest.json"
if manifest.is_file():
 meta=json.loads(manifest.read_text(encoding="utf8"))
 meta["version"]="65.83-trial-seven-real-entitlement-qa"
 meta["trial7_fix"]="trial is accepted by online entitlement guards, expiry details and subscription UI; correct signed lease ready event binding by workspace_id; actual signed device token required for offline writes."
 manifest.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf8")
print("PASS: trial seven-day entitlements recognized; original ES256 signed local device verification unchanged.")
