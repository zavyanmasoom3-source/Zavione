#!/usr/bin/env node
/* Regression: assistant badge is hidden without disabling launchers. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('design-system/zavi-single-assistant-fix-v6608.js','utf8');
const styles = [];
const head = { appendChild(node) { styles.push(node); } };
const document = {
  head,
  documentElement: head,
  getElementById(id) { return styles.find(x => x.id === id) || null; },
  createElement(tag) { assert.equal(tag,'style'); return {id:'',textContent:''}; }
};
vm.runInNewContext(src,{document},{timeout:1000});
assert.equal(styles.length,1);
assert.match(styles[0].textContent,/#z605-panel \.z605-badge/);
assert.doesNotMatch(styles[0].textContent,/#z605-launch|#zavi-assistant-one-button|#z196-launch/);
assert.doesNotMatch(src,/createElement\(['"]button|setInterval|remove\(/);
vm.runInNewContext(src,{document},{timeout:1000});
assert.equal(styles.length,1,'idempotent');
console.log('PASS: badge hidden, launchers preserved, no duplicate styles');
