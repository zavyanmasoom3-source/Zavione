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
# Emulator may finish the activity launch before WebView's bundled offline HTML is ready.
# A debug-only Android onPageFinished event is the minimum proof of offline shell load.
loaded=0
for attempt in $(seq 1 45); do
  if adb logcat -d -s ZAVI_QA_WEBVIEW:I '*:S' | grep -q 'Embedded app shell loaded'; then
    loaded=1
    break
  fi
  sleep 2
done
if [ "$loaded" -ne 1 ]; then
  adb logcat -d -s chromium:E WebView:E AndroidRuntime:E > qa-device/webview-errors.txt || true
  echo "::error::Embedded offline HTML did not finish loading on Android" >&2
  exit 1
fi
sleep 4
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

# Do not invoke uiautomator here: on unaccelerated CI emulators it can crash
# its own separate Android process and falsely report a ZAVI ONE crash.
adb logcat -d -s AndroidRuntime:E > qa-device/runtime-errors.txt || true
APP_PACKAGE="$package" APP_PID="$pid" python3 - <<'PY'
from pathlib import Path
import os,re
text=Path("qa-device/runtime-errors.txt").read_text(errors="replace")
package=os.environ["APP_PACKAGE"]
pid=os.environ["APP_PID"]
crashes=re.split(r"FATAL EXCEPTION:",text)[1:]
own=[c for c in crashes if re.search(r"Process:\s*"+re.escape(package)+r"\b",c)
     or re.search(r"\bPID:\s*"+re.escape(pid)+r"\b",c)]
if own:
    raise SystemExit("Android crash detected in app process "+package)
print("AndroidRuntime: no recorded fatal crash in "+package)
PY
echo 'PASS: APK installed; embedded offline app loaded; process alive; screenshot captured.'
