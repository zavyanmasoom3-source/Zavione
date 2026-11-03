#!/usr/bin/env python3
"""Read-only legacy reference APK asset comparison; never builds from old APK."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--apk",type=Path,required=True)
    p.add_argument("--source",type=Path,required=True)
    p.add_argument("--app",required=True,choices=["one","admin"])
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    relevant=(".js",".css",".html",".json",".wasm",".bin",".tflite",".onnx")
    with ZipFile(args.apk) as archive:
        assert archive.testzip() is None,"Legacy reference APK is corrupted"
        entries=[x for x in archive.infolist() if not x.is_dir()]
        assets={x.filename.removeprefix("assets/"):x for x in entries if x.filename.startswith("assets/")}
        web={name:info for name,info in assets.items() if name.lower().endswith(relevant)}
        html=archive.read("assets/index.html").decode("utf-8",errors="replace")
        largest=[dict(name=x.filename,uncompressed_bytes=x.file_size,compressed_bytes=x.compress_size) for x in sorted(entries,key=lambda x:x.file_size,reverse=True)[:20]]
        maintained={str(p.relative_to(args.source)).replace("\\","/"):p for p in args.source.rglob("*") if p.is_file()}
        missing=[dict(name=name,uncompressed_bytes=info.file_size,kind=Path(name).suffix.lower()) for name,info in web.items() if name not in maintained]
        missing.sort(key=lambda x:(-x["uncompressed_bytes"],x["name"]))
        changed=[]
        for name in web:
            if name not in maintained or not name.endswith((".js",".css",".html",".json")):continue
            if hashlib.sha256(archive.read("assets/"+name)).digest()!=hashlib.sha256(maintained[name].read_bytes()).digest():
                changed.append(name)
    refs=set(re.findall(r"""(?:src|href)\s*=\s*['"](?:\./)?([^'"]+\.(?:js|css))(?:\?[^'"]*)?['"]""",html))
    missing_refs=sorted(name for name in refs if name not in maintained)
    report={
      "app":args.app,"reference_apk_bytes":args.apk.stat().st_size,
      "legacy_entry_count":len(entries),"legacy_asset_count":len(assets),
      "source_asset_count":len(maintained),"legacy_web_code_files":len(web),
      "missing_legacy_web_files":missing,"missing_legacy_web_count":len(missing),
      "changed_legacy_web_files":sorted(changed),
      "reference_index_script_css_not_in_source":missing_refs,
      "large_legacy_apk_entries":largest,
      "source_recovered_from_legacy_apk":False,
      "feature_complete":False,
      "note":"File comparison does not certify runtime parity or offline security."
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"app":args.app,"reference_apk_mb":round(args.apk.stat().st_size/1e6,2),
      "missing_count":len(missing),"missing_web_files":missing[:50],
      "legacy_large_entries":largest[:8],"old_index_missing_files":missing_refs[:25],
      "code_drift_count":len(changed)},ensure_ascii=False,indent=2))

if __name__=="__main__":main()
