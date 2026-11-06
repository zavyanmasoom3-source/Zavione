'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

let failures = 0;
for (const app of ['one', 'admin']) {
  const root = path.resolve(__dirname, '..', 'app-source', app);
  const dictionaries = {};
  for (const locale of ['fa', 'ps', 'en']) {
    const filename = path.join(root, locale + '.json');
    assert.ok(fs.existsSync(filename), app + ': missing ' + filename);
    dictionaries[locale] = JSON.parse(fs.readFileSync(filename, 'utf8'));
  }
  const baseline = Object.keys(dictionaries.fa);
  for (const locale of ['fa', 'ps', 'en']) {
    const keys = Object.keys(dictionaries[locale]);
    const missing = baseline.filter(key => !Object.hasOwn(dictionaries[locale], key));
    const extra = keys.filter(key => !Object.hasOwn(dictionaries.fa, key));
    const empty = keys.filter(key => typeof dictionaries[locale][key] !== 'string' || !dictionaries[locale][key].trim());
    if (missing.length || extra.length || empty.length) {
      failures++;
      console.error(app, locale, { missing: missing.slice(0, 20), extra: extra.slice(0, 20), empty: empty.slice(0, 20) });
    } else {
      console.log('PASS', app, locale, keys.length, 'dictionary entries');
    }
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const checks = {
    'Dari initial language': /lang=["']fa-AF["']/.test(html),
    'initial RTL layout': /dir=["']rtl["']/.test(html),
    'language bootstrap': html.includes('zavi-early-language-v30'),
    'theme bootstrap': html.includes('zavi-theme-bootstrap-v29')
  };
  for (const [name, passed] of Object.entries(checks)) {
    console.log(passed ? 'PASS' : 'FAIL', app, name);
    if (!passed) failures++;
  }
}
if (failures) {
  console.error('FAILED:', failures, 'static checks. Runtime/visual QA remains separate.');
  process.exitCode = 1;
} else {
  console.log('PASS: static locale parity and initial HTML configuration.');
  console.log('NOT VERIFIED: live language switching, contrast, glass mode, screen-level translations.');
}
