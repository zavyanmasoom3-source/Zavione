# ZAVI ONE — original 62 MB design QA, 15 November 2026

## Owner instruction
Keep the old blue V66.62 visual design. Do NOT implement the newer light/dark mockup redesign.
Preserve the old accounting/warehouse/credit/backup/three-language/offline functionality. Only fix
functional bugs in the verified baseline and provide a clearly labeled experimental APK.

## Immutable source binary
- Historical GitHub release: `zavi-v6662-one-debug-qa`.
- Original: `ZAVI_one_V6662_DEBUG_QA.apk`, 62,226,180 bytes.
- SHA-256: `2eb852d7cdb026ccd828a660328bd26bb474f9880430e0ea3007f51489ee50dc`.
- Contents: 265 historical WebView assets; offline model 59,707,625 bytes.
- Historical **Android manifest versionName is 66.23**, even though release tag says V66.62. Do not claim
  proof of native 66.62 provenance or original signature equivalence.

## Reproducible minimal patch
- `tools/v6662/restore_legacy_assets.py` downloads/extracts all 265 actual APK resources and hashes
  each before leaving the original baseline untouched.
- Only changes `assets/index.html` to load `assets/legacy-ui-fixes.css` and adds this new CSS asset.
- CSS repairs light-card text contrast, normalizes minimum navigation target size, avoids assistant
  cover over bottom navigation, preserves original themes and old visual language.
- No current `app-source/one` redesign assets are staged in this build. No accounting code or DB
  was modified.
- New QA is built using the current Android native WebView wrapper, NOT a byte-identical rebuild of
  the historical native binary. This distinction is material for plugins/camera/biometric tests.

## QA APK result
- Workflow: https://github.com/zavyanmasoom3-source/Zavione/actions/runs/43699499786
- Build: **success**.
- QA APK size: 62,229,797 bytes.
- QA APK SHA-256: `8b3f366be81ee5a3bed3652d090249b01d713ac5018a0a53a1057554d5685ed8`.
- Java 17 / Gradle Debug compile and Android `apksigner verify` passed; embedded source and
  offline model digests match staging; APK ZIP integrity checked.
- Debug package is `com.zavione.one.legacyqa`, because signing certificate cannot be assumed to
  match the old installed app. Install SIDE-BY-SIDE. Never uninstall the original app or
  reset its data in order to install this QA.
- versionCode 6681, versionName `66.62-original-design-qa1-debug`.
- This QA APK is not a signed production release and is not validated for in-place updates.

## Browser UI QA
- Workflow: https://github.com/zavyanmasoom3-source/Zavione/actions/runs/43699719407
- **Success** using actual historical WebView source plus the cosmetic patch, fresh offline
  empty account, 390px mobile Chromium viewport, no customer server calls.
- 10 actual legacy routes were rendered in BOTH Light and Dark modes:
  dashboard, sales, purchases, products, contacts, debtors, money, reports, settings, subscription.
- Across the 20 route captures: no JavaScript page exceptions and no viewport horizontal overflow.
- Screenshots and machine-readable manifest are available as workflow artifacts.
- These are smoke tests of page visibility/navigation, not transaction-level tests.

## Not yet proven
- Install and navigation on a real Android phone, camera/USB/Bluetooth barcode, printing,
  QR/WhatsApp sharing, staff permissions, on-device biometric bridge, live Supabase RLS,
  signed subscription access, offline/online queue replay, cash and multi-currency ledger
  idempotency, actual stock postings and device migration.
- Settings may still feel busy; major layout redesign was expressly disallowed.
- Historical source versions may not contain all later improvements. The original assets were
  preserved instead of silently replacing them with new source.
- Do not call this APK a stable final release until the owner verifies it and the above tests pass.
