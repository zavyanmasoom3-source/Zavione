# ZAVI ONE — V66.62 historical app durable-save error repair (2026-11-16)

## Confirmed source defect (original ~62MB APK)

The original embedded `index.html` has `save(next)`, which performs
`localStorage.setItem(KEY,JSON.stringify(next))` and then calls secondary
`archiveInIndexedDB`, `zaviOfflineBackupSave`, and `zaviCloudAfterSave`
without isolating synchronous exceptions from these post-commit side effects.

A synthetic reproduction with the exact historical JavaScript showed:
- durable localStorage sale already written;
- `zaviOfflineBackupSave` throws;
- `save(next)` incorrectly throws;
- `zaviCloudAfterSave` is not called.

This can confuse callers into retrying an already-saved sale, possibly causing
duplicate transactions or delayed cloud updates. This is a proven code bug,
not merely an untested module.

## Narrow repair in old design

- `tools/v6662/patch_durable_save.py` only replaces the post-commit section
  of the actual historical `save(next)` function in staged `index.html`.
- It never silently changes `localStorage` error handling or financial
  calculations. Quota/durable-write failures continue to return `false`.
- Each subsequent barcode/view/cache, IndexedDB, offline-backup, cloud-sync
  follow-up is guarded independently. Synchronous failures and asynchronous
  rejected promises are warned about without reporting the durable sale as
  failed. Cloud follow-up still runs if backup follow-up fails.
- Original 264 non-index resources are byte-identical; one legacy CSS fix remains
  the only added asset. No PDF/dual-showcase redesign assets were introduced.
- Historic native Android wrapper continues to originate from pinned commit
  `2657ab68531bb3c6877e05fc2bee67ba59ab17f8`.

## Tests and traceability

- `tests/v6662-durable-save-regression.cjs` — **8/8 passed** on exact original
  and patched old code: bug reproduction, sync backup failure, async backup
  rejection, cloud failures, side-effect failures, storage quota, happy path.
- New 62MB APK compiled and verified with Android debug signer. Original
  264 independent assets remain identical; only approved `index.html` patch
  and legacy CSS file differ.
- CI: https://github.com/zavyanmasoom3-source/Zavione/actions/runs/43808096134
- QA APK size: **62,230,013 bytes**.
- QA APK SHA256:
  `aae18558990a5780935a50b37c104015a520ac3ddee8a6d2b73eabdc7eb46086`.
- Repaired 10 historical routes × light/dark: 20/20 rendered, 0 JavaScript
  page exceptions, 0 horizontal overflows in Chromium 390×844.
- Browser evidence:
  https://github.com/zavyanmasoom3-source/Zavione/actions/runs/43808323605

## Still NOT proven or safe for public release

- Real multi-device customer sync replays and cloud idempotency.
- Installed Android file picker, restore of real tenant data, upgraded app's
  signing key compatibility, Android camera/biometric/printing.
- The archived APK uses a different signature from stored production signing
  keys. The `.legacyqa` package intentionally installs alongside rather
  than updating the original customer installation.
- Financial correctness in live Supabase and all accounting modules.

**Do not delete the original app or use this QA to overwrite customer data.
The proof above is specifically the durable-save error-handling repair,
not a certification of the complete accounting system.**
