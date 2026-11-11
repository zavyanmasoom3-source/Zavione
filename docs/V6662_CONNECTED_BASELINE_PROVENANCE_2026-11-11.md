# ZAVI ONE V66.62 Connected — historical baseline provenance checkpoint

Status: **BLOCKED — do not designate an APK as the final V66.62 Connected build.**
Date: 2026-11-11. Scope: read-only APK provenance, source/Gradle inspection; no Supabase, customer-data or active application-source changes.

## Found release assets

| App | Release asset | Exact bytes | Release tag | Release target | Manifest package | Actual manifest versionName |
| --- | --- | ---: | --- | --- | --- | --- |
| ZAVI ONE | ZAVI_one_V6662_DEBUG_QA.apk | 62,226,180 | zavi-v6662-one-debug-qa | d238c4c8d5ae5d53de7ff5f60b55a3dba839123b | com.zavione.one | **66.23** |
| ZAVI ONE ADMIN | ZAVI_admin_V6662_DEBUG_QA.apk | 61,815,754 | zavi-v6662-admin-debug-qa | d238c4c8d5ae5d53de7ff5f60b55a3dba839123b | com.zavione.one.admin | **1.4.54** |

The two release files **are labeled V66.62**, but their own Android manifests do not identify the store app as 66.62. Both verified with Android apksigner in the 2026-11-11 audit. These are debug QA packages, not a validated production Release.

Public SHA-256 certificate digests (release debug assets, **not** the separate signed diagnostic artifacts):
- ONE: `49df408626e342d6a6e6c6f5cd2c27b6cfabdc1be5eab113cdafd19b30683f38`
- ADMIN: `1e1ce68d63626e29435c3530106e6853dc7a25343a97354281d2084b2c5457f7`

## Provenance discrepancy

Historical successful workflow: https://github.com/zavyanmasoom3-source/Zavione/actions/runs/41628491279

The workflow at `d238c4c8` **checked out `fix/assistant-launcher-v6608-review`**, downloaded two earlier APKs from `zavi-migration-v6606`, validated their recorded hashes, extracted Android WebView assets from those APKs, then applied HTML, CSS, JS, UI and accounting patches before generating the 62 MB QA files.

Therefore the release's target commit is **not by itself the complete immutable source provenance** of the generated APK. The build process also relies on the historical checkout branch, earlier APK bytes, and runtime patches.

The current `dev` build (before this audit) is https://github.com/zavyanmasoom3-source/Zavione/actions/runs/42457024994 . It passed Android Debug compilation on commit `6ad4e7d17eaad6279a3f5dccaf1fdba04e071946`; artifacts were around 4–5 MB ZIP each, not 62 MB base APKs. It builds from `app-source/one` and `app-source/admin`, whose embedded index files are **not byte-identical** to the historical release APKs. Current `dev` Gradle declares `66.79-pdf-final` and `1.4.70-pdf-final`; debug additionally uses a `.dev` application-ID suffix.

Current `dev` Gradle Wrapper is 8.13, Android Gradle Plugin 8.11.1, JDK 17 in CI, compileSdk 36. No current Gradle compilation error was proven by that last successful debug CI run, but that does **not** prove a release build, preservation of V66.62 design, install/update compatibility, or accounting correctness.

## Reproducible independent provenance gate

- Source: `.github/workflows/zavi-v6662-baseline-provenance.yml`
- Audit run: https://github.com/zavyanmasoom3-source/Zavione/actions/runs/43085039032
- Result: **failure by design**, because the original store APK says `66.23` and the current `dev` source does not match either original embedded index.
- Verified APK byte sizes, package IDs, certificate checks, and real embedded HTML comparisons.
- Original APK counts: ONE **265** asset files; ADMIN **174** asset files.
- The JSON audit report is attached to the run as `ZAVI_V6662_BASELINE_PROVENANCE`.

## Release-blocking requirements, in order

1. Preserve these historical release APKs unchanged, with measured SHA-256 digests and signing identity. Determine whether a distinct **true** V66.62 Connected binary exists; do not infer it from a release title.
2. Restore/commit an exact, auditable baseline asset/source tree, including the historical native wrapper and patch provenance; verify embedded asset hashes before modifying any application behavior.
3. Only then align versionCode/versionName and signing with the original installation upgrade path. Verify that the user-approved interface is unchanged.
4. Rebuild from the trusted baseline and compare embedded assets and behavior; test both applications' installed navigation and upgrade on real Android devices.
5. Do not call the product stable until real financial/offline and Supabase integration tests pass. Never substitute the newer small historical-source APK for the old 62 MB baseline.

No database mutations, replacement APKs, forced Gradle version changes, or changes to business rules were performed by this audit.
