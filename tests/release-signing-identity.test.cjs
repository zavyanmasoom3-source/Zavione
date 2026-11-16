const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const gradle=fs.readFileSync(path.join(root,'android-build/app/build.gradle'),'utf8');

test('release signing fails closed for a certificate unrelated to installed V66.62 app',()=>{
  assert.match(gradle,/expectedInstalledFingerprint/);
  assert.match(gradle,/49df408626e342d6a6e6c6f5cd2c27b6cfabdc1be5eab113cdafd19b30683f38/);
  assert.match(gradle,/1e1ce68d63626e29435c3530106e6853dc7a25343a97354281d2084b2c5457f7/);
  assert.match(gradle,/publicCertificate\.getEncoded\(\)/);
  assert.match(gradle,/actualFingerprint != expectedInstalledFingerprint/);
  assert.match(gradle,/production update blocked/);
});
test('normal and isolated legacy QA package versions remain separate',()=>{
  assert.match(gradle,/applicationIdSuffix legacyBaselineQa \? '\.legacyqa' : '\.dev'/);
  assert.match(gradle,/legacyBaselineQa \? 6681 : 6679/);
  assert.match(gradle,/legacyBaselineQa \? 4171 : 4170/);
  assert.match(gradle,/if \(legacyBaselineQa && productionMode\)/);
});
test('without declared validated production secrets, release signing is never configured as debug',()=>{
  assert.match(gradle,/Production signing missing/);
  assert.match(gradle,/signingConfig signingConfigs\.production/);
  assert.doesNotMatch(gradle,/signingConfig signingConfigs\.debug/);
  assert.match(gradle,/releaseRequested && !productionMode/);
});
