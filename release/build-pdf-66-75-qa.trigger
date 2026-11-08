ZAVI ONE 66.79 PDF APK clean rebuild trigger
DB contract: database/staged/20261107_zavi_v675_pdf_design_payload.sql
Version bump: ONE 6675 -> 6679 / 66.75 -> 66.79; ADMIN 4166 -> 4170 / 1.4.66 -> 1.4.70.
Clean build: Gradle clean plus --no-build-cache; no previous APK reuse.
Features retained: PDF UI, barcode, mixed/multi-currency payments, in-transit purchases, cash box, receipts, labels, settings, responsive phone/iPad layouts.
Requested: 2026-11-08T02:45:00+04:30
Navigation fix: all known sections remain routable despite stale module flags; compact layout CSS added.
Root fix: cloud refresh preserves the active section; route renderer now exposes errors instead of leaving the dashboard visible.
Final route verification: preserve current section across cloud refresh and show route errors without dashboard fallback.
