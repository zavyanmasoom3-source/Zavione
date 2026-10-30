$ErrorActionPreference = 'Stop'
$one = 'industry-delivery/ZAVI_ONE_UNIFIED_20_BUSINESSES_V65_83_TRIAL7_REAL_OFFLINE_QA.apk'
$admin = 'industry-delivery/ZAVI_ONE_ADMIN_V1_4_29_STORE_OFFLINE_7D_QA.apk'
if (!(Test-Path $one)) { throw 'Original ZAVI ONE APK missing' }
git fetch --no-tags --depth=1 origin zavi-admin-v1429-seven-day-store-offline-qa
if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch exact matching ADMIN APK' }
git checkout FETCH_HEAD -- "$admin" "$admin.sha256"
if ($LASTEXITCODE -ne 0) { throw 'Unable to stage ADMIN APK' }

foreach ($item in @(
  @{ file=$one; sha='fee4ae8ec59a8d433f95c631fe26dfd46fcb8d4916aca01ed5b3090cf5a4d018' },
  @{ file=$admin; sha='4d06d6e76f6e7238ea01b4759f617087c195741267f191d89e0a865aff3f1eea' }
)) {
  $actual = (Get-FileHash $item.file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $item.sha) { throw "User APK mismatch: $($item.file)" }
  $expected = ((Get-Content "$($item.file).sha256" -TotalCount 1).Split(' ',[System.StringSplitOptions]::RemoveEmptyEntries))[0].ToLowerInvariant()
  if ($expected -ne $actual) { throw "GitHub checksum mismatch: $($item.file)" }
  Write-Host "PASS: exact APK SHA256=$actual"
}

python windows-build/prepare-exact-apk-desktop.py --mode one --apk $one --output windows-output/ZAVI_ONE
if ($LASTEXITCODE -ne 0) { throw 'ZAVI ONE source preparation failed' }
python windows-build/prepare-exact-apk-desktop.py --mode admin --apk $admin --output windows-output/ZAVI_ONE_ADMIN
if ($LASTEXITCODE -ne 0) { throw 'ADMIN source preparation failed' }

$oneReport = Get-Content windows-output/ZAVI_ONE/BUILD_SOURCE_REPORT.json -Raw | ConvertFrom-Json
$admReport = Get-Content windows-output/ZAVI_ONE_ADMIN/BUILD_SOURCE_REPORT.json -Raw | ConvertFrom-Json
if ($oneReport.asset_count -lt 175 -or $oneReport.verified_local_file_references -lt 100) { throw 'Incomplete storefront frontend' }
if ($admReport.asset_count -lt 100 -or $admReport.verified_local_file_references -lt 60) { throw 'Incomplete ADMIN frontend' }
if (!(Test-Path 'windows-output/ZAVI_ONE/web/zavi-store-v6582-trial7-simple.js')) { throw 'Missing seven-day storefront offline features' }
if (!(Test-Path 'windows-output/ZAVI_ONE_ADMIN/web/zavi-admin-v1428-offline-seven-days.js')) { throw 'Missing admin offline seven-day features' }
if (!(Test-Path 'windows-output/ZAVI_ONE_ADMIN/web/zavi-admin-v1423-lifetime.js')) { throw 'Missing admin lifetime management' }
node --check windows-output/ZAVI_ONE/web/annual-license.js
if ($LASTEXITCODE -ne 0) { throw 'Store subscription code invalid' }
node --check windows-output/ZAVI_ONE_ADMIN/web/zavi-admin-v1428-offline-seven-days.js
if ($LASTEXITCODE -ne 0) { throw 'ADMIN offline subscription code invalid' }
New-Item -ItemType Directory -Path windows-delivery -Force | Out-Null

foreach ($item in @(
  @{ dir='ZAVI_ONE';exe='Setup_ZAVI_ONE_V65_83_Windows_x64_QA.exe' },
  @{ dir='ZAVI_ONE_ADMIN';exe='Setup_ZAVI_ONE_ADMIN_V1_4_29_Windows_x64_QA.exe' }
)) {
  Push-Location "windows-output/$($item.dir)"
  try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Electron dependency installation failed: $($item.dir)" }
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Electron shell validation failed: $($item.dir)" }
    npm run dist:win
    if ($LASTEXITCODE -ne 0) { throw "Windows NSIS build failed: $($item.dir)" }
  } finally { Pop-Location }
  $file="windows-output/$($item.dir)/dist/$($item.exe)"
  if (!(Test-Path $file)) { throw "Missing Windows Setup: $file" }
  if ((Get-Item $file).Length -lt 30000000) { throw "Incomplete Windows Setup: $file" }
  $asar="windows-output/$($item.dir)/dist/win-unpacked/resources/app.asar"
  if (!(Test-Path $asar)) { throw "Packaged Electron app missing: $asar" }
  Copy-Item $file -Destination "windows-delivery/$($item.exe)"
  Copy-Item "windows-output/$($item.dir)/BUILD_SOURCE_REPORT.json" -Destination "windows-delivery/$($item.dir)_BUILD_SOURCE_REPORT.json"
  $sum = (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()
  "$sum  $($item.exe)" | Set-Content "windows-delivery/$($item.exe).sha256" -Encoding Ascii
  Write-Host "BUILD PASS: $($item.exe), $((Get-Item $file).Length) bytes, sha256=$sum"
}

$zip = 'ZAVI_ONE_BOTH_WINDOWS_SETUPS_V6583_ADMIN1429_QA.zip'
Compress-Archive -Path "windows-delivery/Setup_*.exe","windows-delivery/Setup_*.sha256" -DestinationPath "windows-delivery/$zip" -CompressionLevel Fastest
if ((Get-Item "windows-delivery/$zip").Length -lt 60000000) { throw 'Invalid Windows setups ZIP' }
$sum = (Get-FileHash "windows-delivery/$zip" -Algorithm SHA256).Hash.ToLowerInvariant()
"$sum  $zip" | Set-Content "windows-delivery/$zip.sha256" -Encoding Ascii

$tag='zavi-windows-v6583-admin1429-qa-20261026'
$notes='Both full-size Windows 10/11 x64 NSIS Setup EXEs contain complete, SHA256-verified, user-provided ZAVI ONE 65.83 and ZAVI ONE ADMIN 1.4.29 APK web assets. Same cloud backend; isolated local desktop data. QA only: Authenticode signing and real-hardware acceptance tests remain required. Back up before using.'
$notes | Set-Content 'windows-delivery/README_Windows_QA.txt' -Encoding Utf8
gh release view $tag --json tagName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh release create $tag --target $env:GITHUB_SHA --title 'ZAVI ONE V65.83 + ADMIN V1.4.29 Windows x64 Setups QA' --notes-file windows-delivery/README_Windows_QA.txt --prerelease
  if ($LASTEXITCODE -ne 0) { throw 'Failed creating release for real Windows installers' }
}
$assets = Get-ChildItem windows-delivery -File | Where-Object { $_.Name -match '^(Setup_.*\.exe(\.sha256)?|ZAVI_ONE_BOTH_WINDOWS_SETUPS_.*\.zip(\.sha256)?|ZAVI_ONE(_ADMIN)?_BUILD_SOURCE_REPORT\.json)$' }
foreach ($asset in $assets) {
  gh release upload $tag $asset.FullName --clobber
  if ($LASTEXITCODE -ne 0) { throw "Cannot publish Windows installer: $($asset.Name)" }
}
Write-Host "SUCCESS: https://github.com/$env:GITHUB_REPOSITORY/releases/tag/$tag"
