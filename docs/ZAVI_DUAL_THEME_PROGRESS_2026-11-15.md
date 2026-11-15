# ZAVI ONE / ADMIN — dual-mode redesign progress
Date: 2026-11-15 · branch: `dev` · design reference: V66.62 screenshot set

## Scope completed in source (NOT a release certification)
- Both WebView web-apps now share a token-driven Light and Dark design layer (`zavi-dual-design-v1.css`).
- `zavi-theme-v29.js` is shared by both apps; its preferences are `light`, `dark`, `auto`. Auto resolves system preference to one of the TWO actual palettes, with live OS change listening. Legacy `glass` maps to dark and is no longer offered.
- Early bootstrap in both `index.html` files follows the same preference. ADMIN settings receives a live three-preference picker.
- Dashboard light/dark layout override is scoped to existing dynamic DOM in `app-source/one/zavi-dual-dashboard-v1.css`. No financial data or route handlers were edited.
- Standalone invoice editing/preview now loads both the shared theme and `zavi-dual-invoice-v1.css`. Printable paper is kept readable; existing print-size controls are not overwritten.
- Both service workers were versioned to precache the new offline CSS assets. Neither customer data nor API responses were added to SW caches.
- Tests: `tests/dual-theme-compatibility.cjs` validates bootstraps, theme behavior, CSS references, and offline assets for ONE/ADMIN. `.github/workflows/build-zavi-apks.yml` runs it before the Android matrix build.

## Page-by-page implementation and QA status
| Page | Source UI layer | Verified visual match (light/dark) | Business function QA |
| --- | --- | --- | --- |
| 1 Dashboard | Dedicated token-based responsive CSS added | NOT YET | NOT YET |
| 2 New sale | Shared tokens only | NOT YET | NOT YET |
| 3 Products / warehouses | Shared tokens only | NOT YET | NOT YET |
| 4 Sales documents / invoice | Shared tokens; standalone invoice editor stylesheet added | NOT YET | NOT YET |
| 5 Purchase management | Shared tokens only | NOT YET | NOT YET |
| 6 Customers and debtors | Shared tokens only | NOT YET | NOT YET |
| 7 Cashbox and accounts | Shared tokens only | NOT YET | NOT YET |
| 8 Reports | Shared tokens only | NOT YET | NOT YET |
| 9 Settings and subscriptions | Shared tokens; auto palette selector | NOT YET | NOT YET |
| 10 More | Shared tokens only | NOT YET | NOT YET |
| ZAVI ONE ADMIN | Shared tokens; automatic theme preference | NOT YET | NOT YET |

## Verified and unverified
- Source code/smoke checks: theme controller JS compiled; manual and system-auto theme transitions passed in an isolated VM simulation. Stylesheets load from both index files and are registered for offline caching.
- No device screenshots were produced. Mockups are NOT build screenshots.
- No Android compile/sign/install, source-to-reference binary parity, Supabase/RLS, journal consistency, multi-currency settlement, queue replay, or device migration test has yet passed in this work.
- `android-build/app/build.gradle` currently has versionName `66.79-pdf-final` for ONE. V66.62 is the supplied visual reference, not proof that the current source is binary-identical to the old distributed V66.62 APK.
- Do not label this branch's APK a final stable release before verified CI, device tests, release signing, and full page-by-page visual comparison.

## Guardrails
Never replace backend data with mockup amounts, change ledger/stock posting for visual purposes, delete older styles or features without a dependency audit, or issue a release APK from untested sources.
