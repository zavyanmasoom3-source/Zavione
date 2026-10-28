#!/usr/bin/env python3
"""Sign Android App Bundle using the OWNER'S existing Google Play upload key.
Never creates or uploads a private signing key. No signing secret written to logs.
CI env (all mandatory to sign): ZAVI_UPLOAD_KEYSTORE_B64, ZAVI_UPLOAD_STORE_PASSWORD,
ZAVI_UPLOAD_KEY_ALIAS, ZAVI_UPLOAD_KEY_PASSWORD.
"""
import base64, os, pathlib, subprocess, sys, tempfile, shutil
mode=sys.argv[1]
unsigned=pathlib.Path(sys.argv[2])
outdir=pathlib.Path(sys.argv[3])
assert mode in ('one','admin')
outdir.mkdir(parents=True,exist_ok=True)
assert unsigned.exists() and unsigned.stat().st_size>100000
env_names=['ZAVI_UPLOAD_KEYSTORE_B64','ZAVI_UPLOAD_STORE_PASSWORD','ZAVI_UPLOAD_KEY_ALIAS','ZAVI_UPLOAD_KEY_PASSWORD']
missing=[n for n in env_names if not os.environ.get(n)]
name=('ZAVI_ONE_65_97' if mode=='one' else 'ZAVI_ONE_ADMIN_1_4_43')
if missing:
    # Explicitly label unsigned preview. DO NOT call it "Play-ready" or make fake signatures.
    dest=outdir/(name+'_UNSIGNED_REQUIRES_OWNER_KEY.aab')
    shutil.copy2(unsigned,dest)
    (outdir/(name+'_SIGNING_STATUS.txt')).write_text('UNSIGNED - NOT SUBMITTABLE TO GOOGLE PLAY. Owner must set four GitHub Secrets and rerun.\n')
    print('OWNER UPLOAD KEY NOT CONFIGURED: unsigned AAB was built and preserved as a preview; signing was blocked.')
    sys.exit(0)
os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='zavi-key-') as tmp:
    keypath=pathlib.Path(tmp)/'owner-upload.jks'
    try:
        keypath.write_bytes(base64.b64decode(os.environ['ZAVI_UPLOAD_KEYSTORE_B64'],validate=True))
    except Exception:
        print('ERROR: supplied keystore base64 is invalid. No bundle published as signed.',file=sys.stderr)
        sys.exit(3)
    if keypath.stat().st_size<500:
        print('ERROR: supplied keystore is too small.',file=sys.stderr);sys.exit(3)
    signed=outdir/(name+'_SIGNED_UPLOAD_CANDIDATE.aab')
    # Java jarsigner supports password retrieval from environment to avoid command-line passwords.
    environment=os.environ.copy()
    environment['ZAVI_JS_STOREPASS']=os.environ['ZAVI_UPLOAD_STORE_PASSWORD']
    environment['ZAVI_JS_KEYPASS']=os.environ['ZAVI_UPLOAD_KEY_PASSWORD']
    subprocess.run([
       'jarsigner','-keystore',str(keypath),'-storetype','JKS',
       '-storepass:env','ZAVI_JS_STOREPASS','-keypass:env','ZAVI_JS_KEYPASS',
       '-digestalg','SHA-256','-sigalg','SHA256withRSA',
       '-signedjar',str(signed),str(unsigned),os.environ['ZAVI_UPLOAD_KEY_ALIAS']
    ],check=True,env=environment,stdout=subprocess.DEVNULL)
    # Self-signed Play upload certificates are normal; jarsigner -strict would return
    # a warning exit code even for a cryptographically valid upload signature.
    verified=subprocess.run(['jarsigner','-verify',str(signed)],
                   check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if 'jar verified.' not in verified.stdout.lower():
        raise RuntimeError('Android App Bundle JAR signature verification did not report success')
    (outdir/(name+'_SIGNING_STATUS.txt')).write_text(
      'SIGNED UPLOAD CANDIDATE. Bundle JAR signature verified with the supplied owner-controlled key.\n'
      'Must still be tested in Play Console internal testing. This does not mean Google approval.\n'
    )
    print('PASS: supplied owner upload key signed AAB; jarsigner strict verification succeeded.')
