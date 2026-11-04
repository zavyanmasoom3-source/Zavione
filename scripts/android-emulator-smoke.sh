#!/usr/bin/env bash
# One process: Android emulator runner executes inline script lines in separate shells.
# QA only, on disposable emulator. Does not read customer files or signing secrets.
set -euo pipefail

if [ "$#" -ne 1 ]; then echo "::error::Android package ID required" >&2; exit 1; fi
package="$1"
case "$package" in
  com.zavione.one|com.zavione.one.admin) ;;
  *) echo "::error::Unexpected Android package: $package" >&2; exit 1 ;;
esac

apk='android-build/app/build/outputs/apk/debug/app-debug.apk'
test -s "$apk" || { echo "::error::Built APK not found" >&2; exit 1; }
mkdir -p qa-device
adb wait-for-device
booted="$(adb shell getprop sys.boot_completed | tr -d '\r')"
test "$booted" = '1' || { echo "::error::Android not booted" >&2; exit 1; }

echo 'Install standalone source-only QA APK, not upgrade over prior app'
adb install "$apk"
adb shell pm path "$package" > qa-device/installed-package.txt
grep -q '^package:' qa-device/installed-package.txt
adb logcat -c
adb shell am start -W -n "$package/com.zavione.mobile.MainActivity" | tee qa-device/activity-launch.txt
sleep 12
pid="$(adb shell pidof "$package" | tr -d '\r')"
test -n "$pid" || { echo "::error::App process not alive after launch" >&2; exit 1; }
printf '%s\n' "$pid" > qa-device/pid.txt
adb shell dumpsys package "$package" > qa-device/dumpsys-package.txt
grep -m1 'versionName=' qa-device/dumpsys-package.txt > qa-device/app-version.txt
adb exec-out screencap -p > qa-device/startup.png

python3 - <<'PY'
from pathlib import Path
import struct
p=Path("qa-device/startup.png")
b=p.read_bytes()
assert len(b)>9000,"Android screenshot unexpectedly small"
assert b[:8]==b'\x89PNG\r\n\x1a\n',"Android screenshot is not PNG"
width,height=struct.unpack(">II",b[16:24])
assert width>100 and height>100,"Invalid Android screenshot size"
print("Android screen:",width,"x",height,"bytes",len(b))
PY

adb shell uiautomator dump /sdcard/qa-window.xml >/dev/null 2>&1 &&
  adb pull /sdcard/qa-window.xml qa-device/window.xml >/dev/null ||
  echo "::warning::UIAutomator unavailable; screenshot evidence retained"

adb logcat -d -s AndroidRuntime:E > qa-device/runtime-errors.txt || true
if grep -q 'FATAL EXCEPTION' qa-device/runtime-errors.txt; then
  echo "::error::Android Runtime crash detected" >&2
  exit 1
fi
echo 'PASS: APK installed; app launched and remained alive; screenshot captured.'
