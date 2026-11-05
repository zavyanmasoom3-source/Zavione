# ZAVI ONE / ADMIN — Source consolidation gate

Status: SOURCE WORK ONLY. Do not trigger APK builds or publish a release until the gates below pass.

## Source of truth
- ZAVI ONE: `app-source/one/`
- ZAVI ONE ADMIN: `app-source/admin/`
- Android wrapper: `android-build/`
- Historical patches under `android-build/patches/` are references, not a second active source of truth.
- Keep the owner-only central admin boundary and server-side authorization.

## Non-destructive consolidation
1. Inventory every HTML script and stylesheet reference and map it to an existing source file.
2. Map features to entry points, handlers, persistence and server RPCs. Do not remove a script solely because its filename contains an older version.
3. Extract shared modules only after load order and behavior have regression coverage; do not concatenate stateful scripts.
4. Keep database formats, account IDs, Android package IDs and original release signing compatibility.
5. Preserve customer and financial data. No destructive migrations or mock writes.

## Required features
- ADMIN: subscriptions, 7-day free trial via server-authorized `zavi_admin_grant_trial_7days`, paid 180/365-day renewal, receipts, owner-only WhatsApp contacts, prepared renewal and congratulations messages, offline/device policy.
- ONE: sales, purchases, invoices, debtors, warehouse/transfers, barcode camera, Dari/Pashto/English, themes, offline/device transfer, voice/text commands, colleague permissions and business templates.
- Preserve current and legacy features. Distinguish UI visibility from actual server behavior.

## Pre-build gates
- `node tests/source-feature-parity.cjs`
- `node --test tests/*.test.cjs`
- `python3 -m unittest discover -s tests -v`
- Browser checks in `.github/workflows/zavi-source-only-android.yml`
- Real authorized 7-day trial grant, expiry and offline checks; button visibility is insufficient.
- WhatsApp templates and owner-only contact permissions.
- Original signing identity and installed-app upgrade compatibility.
- RTL/LTR, three themes, scrolling and offline regression.

**Release rule:** APK builds are manual only. Do not claim readiness while any gate is unverified.
