#!/usr/bin/env python3
"""Stage ZAVI ONE 20-in-one and make the cloud server authoritative for transfer.
Local stale device reports must not conceal a server-authorized owner transfer.
The RPC still validates cloud ownership, subscription and device sync state.
"""
import runpy, sys
from pathlib import Path
runpy.run_path("industry-build/prepare_unified_v6580.py",run_name="__main__")
web=Path(sys.argv[sys.argv.index("--web")+1])
p=web/"device-activation.js"
s=p.read_text(encoding="utf-8")
start=s.index("if(!approved){",s.index("async function replacePrimary(){"))
end=s.index("const reply=await rpc('zavi_v6580_owner_one_tap_transfer'",start)
part=s[start:end]
assert "transfer_requires_sync" in part
# A stale local report is informational only. The server checks the authoritative
# status in the same cloud operation, rejecting unsafe moves.
s=s[:start]+"""if(!approved){
       transferMessage(msg('در حال بررسی اجازه انتقال در سرور…','Checking device transfer eligibility on the server…','د سرور له لارې د وسیلې لېږد څېړل کېږي…'),'info');
     }
     """+s[end:]
assert "zavi_v6580_owner_one_tap_transfer" in s
assert "await prepare({silent:true,session:auth,cfg})" in s
p.write_text(s,encoding="utf-8")
print("Primary-transfer UI sends directly to server; signed offline preparation remains.")
