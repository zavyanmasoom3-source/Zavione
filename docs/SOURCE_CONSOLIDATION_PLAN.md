# ZAVI ONE + ZAVI ONE ADMIN — source consolidation gate

## Policy
Do not build or publish APKs until the full legacy/current feature inventory is verified. No deletion of features, customer data, SQL tables, local storage, or server RPCs. Keep original Android application IDs and signing compatibility. APK workflow is manual-only.

## Current source inventory
- ZAVI ONE: app-source/one/ (112 JavaScript, 98 CSS files at audit time)
- ZAVI ONE ADMIN: app-source/admin/ (43 JavaScript, 48 CSS files at audit time)
- Android wrapper: android-build/
- Core admin billing: app-source/admin/app.js
- Admin WhatsApp contacts: zavi-admin-service-whatsapp-v139.js
- Admin renewal reminders: zavi-admin-renewal-v1439.js
- Admin congratulation messages: zavi-admin-congratulations-v1440.js
- Seven-day trial: zavi-admin-trial7-restored.js (RPC zavi_admin_grant_trial_7days)
- Store warehouse: app-source/one/zavi-warehouses-v1.js
- Store warehouse transfers: app-source/one/zavi-warehouse-transfers-v1.js
- Store barcode: app-source/one/zavi-zxing-offline-v1.js
- Independent commands: zavi-dual-command-v6605.js

## Required sequence before any new APK
1. Record every legacy/current menu and behavior; identify source file, UI entry point, backend RPC and permissions.
2. Preserve existing data structures and storage keys; identify migration needs before changing any data.
3. Consolidate repeated UI styles/scripts by component in small verified steps, rather than concatenating everything into one file.
4. Verify ADMIN owner-only access, WhatsApp contacts, renewal reminders, congratulation messages, trial 7 days, paid 180/365 days, offline grants, device transfer.
5. Verify ZAVI ONE purchases/sales, invoices, customer balances, barcode, warehouses, stock transfers, translations, themes, commands, offline mode.
6. Run source tests and browser tests, fix failures, check real devices and upgrade compatibility with original signing key.
7. Only then manually trigger the APK workflow. No debug APK may be called a public release.

## Current blockers
- Source parity and full feature behavior are not yet proven.
- Seven-day trial frontend was restored but backend live permission/RPC needs verification.
- Native voice bridge, warehouse financial posting/offline replay, and original release-signing compatibility need separate verification.
- Browser tests must be judged by test results, not failures uploading artifacts due to quota.

## Preservation rule
Keep all legacy implementations available in version control until their replacement passes explicit tests. Do not silently remove existing menus or privileges.
