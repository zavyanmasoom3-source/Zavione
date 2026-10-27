$ErrorActionPreference = 'Stop'
$tag = 'zavi-three-sizes-v6588-admin1434-qa-20261027'
New-Item -ItemType Directory -Path desktop-source,design-windows-delivery -Force | Out-Null
gh release download $tag --pattern '*.apk*' --dir desktop-source
if ($LASTEXITCODE -ne 0) { throw 'Cannot obtain release APKs for matching desktop skin' }
$editions=@(
 @{mode='one';file='ZAVI_ONE_20_BUSINESSES_V65_88_UNIFIED_DESIGN_QA.apk';folder='ZAVI_ONE';exe='Setup_ZAVI_ONE_V65_88_Text_System_Icons_Windows_x64_QA.exe'},
 @{mode='admin';file='ZAVI_ONE_ADMIN_V1_4_34_UNIFIED_DESIGN_QA.apk';folder='ZAVI_ONE_ADMIN';exe='Setup_ZAVI_ONE_ADMIN_V1_4_34_Text_System_Icons_Windows_x64_QA.exe'}
)
foreach($item in $editions){
 $apk="desktop-source/$($item.file)"
 if(!(Test-Path $apk)){throw "No release APK: $apk"}
 $manifest="$apk.sha256"
 if(!(Test-Path $manifest)){throw "Missing original SHA256: $manifest"}
 $expected=((Get-Content $manifest -TotalCount 1).Split(' ',[System.StringSplitOptions]::RemoveEmptyEntries))[0].ToLowerInvariant()
 $actual=(Get-FileHash $apk -Algorithm SHA256).Hash.ToLowerInvariant()
 if($expected -ne $actual){throw "Tampered APK: $apk"}
 Write-Host "PASS full $($item.mode) Android sources $actual"
 python windows-build/prepare-v6588-desktop.py --mode $item.mode --apk $apk --expected-sha $expected --design-v6588 --output "design-windows-stage/$($item.folder)"
 if($LASTEXITCODE -ne 0){throw "Desktop preparation failed $($item.mode)"}
 $folder="design-windows-stage/$($item.folder)"
 $html=Get-Content "$folder/web/index.html" -Raw -Encoding UTF8
 if(!$html.Contains("zavi-three-sizes-v6588.css?v=65.88")){throw "Missing unified design in desktop $($item.mode)"}
 node --check "$folder/main.cjs"
 node --check "$folder/desktop-server.cjs"
 node --check "$folder/web/zavi-unified-v6584.js"
 node --check "$folder/web/zavi-three-sizes-v6588.js"
 if(!(Test-Path "$folder/web/zavi-three-sizes-v6588.css")){throw "Missing screenshot-matched navigation design in Windows app"}
 if($LASTEXITCODE -ne 0){throw "JavaScript invalid in $($item.mode)"}
 Push-Location $folder
 try {
   npm install --no-audit --no-fund
   if($LASTEXITCODE -ne 0){throw "Electron dependency installation failed"}
   npm test
   if($LASTEXITCODE -ne 0){throw "Electron shell failed"}
   npm run dist:win
   if($LASTEXITCODE -ne 0){throw "NSIS failed"}
 } finally { Pop-Location }
 $build="$folder/dist/$($item.exe)"
 if(!(Test-Path $build)){throw "Installer missing: $build"}
 if((Get-Item $build).Length -lt 30000000){throw "Incomplete Windows installer"}
 if(!(Test-Path "$folder/dist/win-unpacked/resources/app.asar")){throw "Packed app missing"}
 Copy-Item $build -Destination "design-windows-delivery/$($item.exe)"
 Copy-Item "$folder/BUILD_SOURCE_REPORT.json" -Destination "design-windows-delivery/$($item.folder)_SOURCE_REPORT.json"
 $sh=(Get-FileHash $build -Algorithm SHA256).Hash.ToLowerInvariant()
 "$sh  $($item.exe)" | Set-Content "design-windows-delivery/$($item.exe).sha256" -Encoding Ascii
 Write-Host "PASS full Windows desktop $($item.mode) $((Get-Item $build).Length) SHA256 $sh"
}
$zip='ZAVI_ONE_AND_ADMIN_THREE_INDEPENDENT_SIZES_WINDOWS_V6588_QA.zip'
Compress-Archive -Path 'design-windows-delivery/Setup_*.exe','design-windows-delivery/Setup_*.sha256' -DestinationPath "design-windows-delivery/$zip" -CompressionLevel Fastest
if((Get-Item "design-windows-delivery/$zip").Length -lt 60000000){throw 'Incomplete dual installer archive'}
$sum=(Get-FileHash "design-windows-delivery/$zip" -Algorithm SHA256).Hash.ToLowerInvariant()
"$sum  $zip" | Set-Content "design-windows-delivery/$zip.sha256" -Encoding Ascii
foreach($name in @(
'Setup_ZAVI_ONE_V65_88_Text_System_Icons_Windows_x64_QA.exe',
'Setup_ZAVI_ONE_ADMIN_V1_4_34_Text_System_Icons_Windows_x64_QA.exe',
'ZAVI_ONE_AND_ADMIN_THREE_INDEPENDENT_SIZES_WINDOWS_V6588_QA.zip'
)){
 gh release upload $tag "design-windows-delivery/$name" "design-windows-delivery/$name.sha256" --clobber
 if($LASTEXITCODE -ne 0){throw "Failed release upload of $name"}
}
Write-Host "SUCCESS: Full desktop QA installers available at https://github.com/$env:GITHUB_REPOSITORY/releases/tag/$tag"
