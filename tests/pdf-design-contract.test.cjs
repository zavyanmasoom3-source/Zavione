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

test('Android identities are versioned for 66.75 and ADMIN 1.4.66',()=>{
  const gradle=read('android-build/app/build.gradle');
  assert.match(gradle,/versionCode admin \? 4166 : 6675/);
  assert.match(gradle,/versionName admin \? '1\.4\.66-pdf-final' : '66\.75-pdf-final'/);
});
