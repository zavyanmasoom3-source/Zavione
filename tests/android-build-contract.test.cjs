const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Android build refuses to package without staged web assets', () => {
  const gradle = read('android-build/app/build.gradle');
  assert.match(gradle, /src\/main\/assets/);
  assert.match(gradle, /index\.html/);
  assert.match(gradle, /refusing to produce an incomplete APK/);
});

test('source-only workflows select one app-specific icon without duplicate resources', () => {
  const workflows = [
    '.github/workflows/build-zavi-apks.yml',
    '.github/workflows/zavi-source-only-android.yml',
    '.github/workflows/zavi-source-android-emulator-smoke.yml',
    '.github/workflows/zavi-source-signed-compatibility.yml',
  ];
  for (const file of workflows) {
    const workflow = read(file);
    assert.match(workflow, /icons\/\$\{\{ matrix\.(app|mode) \}\}\.webp/,
      `${file} must stage the selected app icon`);
    assert.doesNotMatch(workflow,
      /cp app\/src\/main\/res\/drawable\/ic_launcher\.xml app\/src\/main\/res\/drawable\/zavi_launcher_image\.xml/,
      `${file} must not create a duplicate zavi_launcher_image resource`);
  }
});

test('signed source compatibility uses the validated production signing path', () => {
  const workflow = read('.github/workflows/zavi-source-signed-compatibility.yml');
  assert.match(workflow, /ZAVI_KEYSTORE_PATH=\$store/);
  assert.match(workflow, /ZAVI_KEYSTORE_PASSWORD=\$STORE_PASS/);
  assert.match(workflow, /-PzaviProduction=true/);
  assert.doesNotMatch(workflow, /:app:assembleRelease[^\n]*-PzaviProduction=false/);
});
