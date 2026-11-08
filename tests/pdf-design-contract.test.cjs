const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('ZAVI ONE 66.75 PDF design contract is embedded and persisted',()=>{
  const index=read('app-source/one/index.html');
  assert.match(index,/ZAVI_PDF_DESIGN_DEFAULT/);
  assert.match(index,/pdfDesignVersion:'66\.75'/);
  assert.match(index,/window\.ZaviPdfDesign/);
  assert.match(index,/zavi-pdf-final-v6760\.css/);
  const barcode=read('app-source/one/zavi-barcode-label-v6700.js');
  assert.match(barcode,/persistPdfLabelPrefs/);
  const migration=read('database/staged/20261107_zavi_v675_pdf_design_payload.sql');
  assert.match(migration,/'pdfDesignVersion','66\.75'/);
  assert.match(migration,/'barcodeLabelStudio',true/);
});

test('Android identities are versioned for 66.79 and ADMIN 1.4.70',()=>{
  const gradle=read('android-build/app/build.gradle');
  assert.match(gradle,/versionCode admin \? 4170 : 6679/);
  assert.match(gradle,/versionName admin \? '1\.4\.70-pdf-final' : '66\.79-pdf-final'/);
});

test('Inline receipt template cannot terminate the parent HTML script',()=>{
  const index=read('app-source/one/index.html');
  const start=index.indexOf('function printRepairReceipt');
  const end=index.indexOf('function usdLedgerRows');
  assert.ok(start>=0&&end>start,'repair receipt template must be present');
  const receipt=index.slice(start,end);
  assert.ok(receipt.includes('<\\/script>'),'receipt script closers must be HTML-parser safe');
  assert.equal(receipt.includes('<script defer src="./zavi-settings-organizer-v6730.js?v=67.30"></script>'),false);
  assert.equal(receipt.includes('<script defer src="./zavi-invoice-pdf-v6740.js?v=67.40"></script>'),false);
});

test('All known ONE sections stay routable when stale module flags exist',()=>{
  const index=read('app-source/one/index.html');
  assert.match(index,/function zaviRouteIsKnown\(id\)/);
  assert.match(index,/window\.zaviCurrentPage=page/);
  assert.match(index,/const available=organized\.filter\(\(\[id\]\)=>zaviRouteIsKnown\(id\)\);/);
  assert.doesNotMatch(index,/if\(!zaviModuleEnabled\(p\)&&p!==['"]settings['"]&&p!==['"]subscription['"]\)/);
  assert.doesNotMatch(index,/if\(!zaviModuleEnabled\(page\)&&page!==['"]settings['"]&&page!==['"]subscription['"]\)page=['"]settings['"]/);
});

test('Cloud refresh cannot silently return a visible section to dashboard',()=>{
  const index=read('app-source/one/index.html');
  const cloud=read('app-source/one/cloud.js');
  assert.match(index,/const requestedPage=typeof window\.zaviCurrentPage/);
  assert.match(index,/content\.dataset\.zaviRoute=route/);
  assert.match(index,/ZAVI route render failed/);
  assert.match(cloud,/const activePage=typeof window\.zaviCurrentPage/);
  assert.doesNotMatch(cloud,/closeModal\(\);page='dashboard';render\(\);/);
});
