#!/usr/bin/env python3
"""Narrow safety repair for the immutable historical 62MB ONE HTML.

Original bug: a synchronous exception from offline backup / cloud sync after
localStorage.setItem made save(next) throw despite successfully committing.
Consequences: the UI can treat a saved transaction as a failure and the later
cloud callback is skipped. This patch does not change ledger calculations,
sales/purchase forms, UI layout, or the 264 independent original assets.
"""
import argparse
import hashlib
import json
from pathlib import Path

OLD = """ window.ZaviBarcodeV641?.invalidate?.(db.products);
 db=next;storageOk=true;refreshBusinessAssets();archiveInIndexedDB(next);
 if(window.zaviOfflineBackupSave)window.zaviOfflineBackupSave(next);
 if(window.zaviCloudAfterSave)window.zaviCloudAfterSave(next);
 return true;
}
function commit(fn){"""

NEW = """ // The localStorage transaction above is already DURABLE. Never report a
 // failed sale because a non-durable follow-up throws or rejects a promise.
 // In particular, cloud sync must still run if offline backup fails.
 function zaviPostSaveWarningV6662(kind,error){
  try{console.warn('ZAVI saved locally; '+kind+' follow-up failed',error)}catch(_){}
  const hint=kind==='cloud'?'همگام‌سازی':kind==='backup'?'پشتیبان‌گیری':'به‌روزرسانی کمکی';
  try{toast('معلومات روی دستگاه ثبت شد؛ '+hint+' کامل نشد. وضعیت آن را بررسی کنید.')}catch(_){}
 }
 function zaviAfterDurableSaveV6662(kind,operation){
  try{
   const result=operation();
   if(result&&typeof result.then==='function')
    Promise.resolve(result).catch(error=>zaviPostSaveWarningV6662(kind,error));
  }catch(error){zaviPostSaveWarningV6662(kind,error)}
 }
 zaviAfterDurableSaveV6662('barcode',()=>window.ZaviBarcodeV641?.invalidate?.(db.products));
 db=next;storageOk=true;
 zaviAfterDurableSaveV6662('assets',()=>refreshBusinessAssets());
 zaviAfterDurableSaveV6662('archive',()=>archiveInIndexedDB(next));
 zaviAfterDurableSaveV6662('backup',()=>window.zaviOfflineBackupSave?.(next));
 zaviAfterDurableSaveV6662('cloud',()=>window.zaviCloudAfterSave?.(next));
 return true;
}
function commit(fn){"""

def transform(html: str) -> str:
    if html.count(OLD) != 1:
        raise ValueError("Historical post-save function changed; refuse unverified repair")
    if html.count("function save(next){") != 1:
        raise ValueError("Expected exactly one legacy save function")
    return html.replace(OLD, NEW, 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    path = Path(args.html)
    before = path.read_bytes()
    output = transform(before.decode("utf-8")).encode("utf-8")
    assert before != output
    path.write_bytes(output)
    report = {
        "status": "PATCHED",
        "scope": "historical ONE durable save post-commit side effects only",
        "original_html_sha256": hashlib.sha256(before).hexdigest(),
        "patched_html_sha256": hashlib.sha256(output).hexdigest(),
        "unmodified_assets": "verified by separate whole-APK integrity gate",
        "sync_guaranteed": False,
        "accounting_end_to_end_verified": False
    }
    target = Path(args.report)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
