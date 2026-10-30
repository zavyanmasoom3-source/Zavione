#!/usr/bin/env python3
"""Generate private, offline, male-pitched status phrases, packaged WITH the APK.
No streaming, Google SDK, Android TTS or external speech API at runtime.

This is a reliable local placeholder voice pack. eSpeak-NG sounds synthetic;
Dari/Pashto speech quality MUST be checked by native speakers and the Pashto
bank should be replaced with licensed studio male recordings for public release.
Replace <locale>/<phrase>.mp3 with matching professionally recorded audio.
"""
from __future__ import annotations
import argparse,hashlib,json,shutil,subprocess,tempfile
from pathlib import Path

RESPONSES = {
  "fa": {
    "enabled": "زاوی ویس فعال شد.",
    "executing": "دستور شما در حال اجرا است.",
    "opened": "بخش مورد نظر باز شد.",
    "cannot": "این دستور را نتوانستم اجرا کنم.",
    "confirm": "پیش نویس آماده شد. لطفا پیش از ثبت نهایی، جزئیات را تایید کنید.",
    "cancelled": "دستور لغو شد.",
    "no_audio": "صدای شما را دریافت نکردم.",
    "unclear": "دستور واضح نبود. لطفا دوباره بگویید.",
    "error": "در اجرای دستور مشکلی پیش آمد.",
    "review": "فاکتور برای بررسی باز شد. ثبت نهایی انجام نشده است."
  },
  "ps": {
    "enabled": "زاوی غږ فعال شو.",
    "executing": "ستاسې امر اجرا کېږي.",
    "opened": "غوښتل شوې برخه پرانیستل شوه.",
    "cannot": "ستاسې امر نشم ترسره کولی.",
    "confirm": "مسوده چمتو شوه. د وروستي ثبت لپاره معلومات تایید کړئ.",
    "cancelled": "امر لغوه شو.",
    "no_audio": "ستاسې غږ مې وانه ورېد.",
    "unclear": "خبرې روښانه نه وې. مهرباني وکړئ بیا یې ووایئ.",
    "error": "د امر په اجرا کې ستونزه راغله.",
    "review": "بل د کتنې لپاره خلاص شو. وروستی ثبت نه دی شوی."
  },
  "en": {
    "enabled": "Zavi Voice is now active.",
    "executing": "Your command is being executed.",
    "opened": "The requested section is open.",
    "cannot": "I could not execute that command.",
    "confirm": "The draft is ready. Please review and confirm before posting.",
    "cancelled": "The command has been cancelled.",
    "no_audio": "I could not hear your voice.",
    "unclear": "I could not understand. Please say that again.",
    "error": "There was a problem executing your command.",
    "review": "The invoice is open for review. Nothing has been posted."
  }
}
# espeak's Pashto support is limited; Persian phonetics are a TEMPORARY FALLBACK,
# not a claim of accurate Pashto pronunciation. Licensed male clips may replace.
VOICES={"fa":"fa+m3","ps":"fa+m3","en":"en-gb+m3"}
def run(argv):
    subprocess.run(argv,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",required=True)
    args=p.parse_args()
    out=Path(args.out)
    if not shutil.which("espeak-ng") or not shutil.which("ffmpeg"):
        raise SystemExit("espeak-ng and ffmpeg required")
    with tempfile.TemporaryDirectory() as temp:
        wav=Path(temp)/"phrase.wav"
        for lang,mapping in RESPONSES.items():
            path=out/lang
            path.mkdir(parents=True,exist_ok=True)
            for phrase,text in mapping.items():
                wav.unlink(missing_ok=True)
                # Slow/clearer male-pitched voice for short operational messages.
                run(["espeak-ng","-v",VOICES[lang],"-s","125","-p","39","-a","170",
                     "-w",str(wav),text])
                if not wav.is_file() or wav.stat().st_size<1500:
                    raise RuntimeError(f"voice generation failed: {lang}/{phrase}")
                dest=path/(phrase+".mp3")
                run(["ffmpeg","-hide_banner","-loglevel","error","-y",
                     "-i",str(wav),"-ac","1","-ar","22050",
                     "-codec:a","libmp3lame","-q:a","4",str(dest)])
                if dest.stat().st_size<500:
                    raise RuntimeError(f"invalid audio: {dest}")
    manifest={"engine":"espeak-ng offline male-pitched prerecorded phrases; QA, not neural",
      "no_runtime_network":True,"license_note":"Replace with independently licensed male studio recordings for commercial release",
      "phrases":sorted(next(iter(RESPONSES.values())).keys()),
      "languages":list(RESPONSES),
      "files":{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest()
               for p in sorted(out.rglob("*.mp3"))}}
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print("PASS offline male status voice pack:",len(manifest["files"]),"files")
if __name__=="__main__":
    main()
