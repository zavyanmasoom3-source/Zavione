/* ZAVI ONE V67.40 — dependency-free invoice PDF writer.
 * Converts the already-rendered invoice canvas to a standards-compliant,
 * single-page JPEG-backed PDF for A4/A5 download or OS share.
 */
(()=>{'use strict';
const enc=new TextEncoder();
const ascii=s=>enc.encode(String(s));
const join=parts=>{
 let n=0;for(const p of parts)n+=p.length;
 const out=new Uint8Array(n);let o=0;
 for(const p of parts){out.set(p,o);o+=p.length}
 return out;
};
function jpegBytes(canvas,quality=.94){
 return new Promise((resolve,reject)=>{
  if(!canvas?.toBlob)return reject(Error('INVOICE_CANVAS_UNAVAILABLE'));
  canvas.toBlob(async blob=>{
   if(!blob)return reject(Error('INVOICE_JPEG_FAILED'));
   try{resolve(new Uint8Array(await blob.arrayBuffer()))}catch(e){reject(e)}
  },'image/jpeg',quality);
 });
}
function pagePoints(size){
 return String(size||'A4').toUpperCase()==='A5'?[419.53,595.28]:[595.28,841.89];
}
function fixed(n){return Number(n).toFixed(2).replace(/\.00$/,'')}
async function createBlob(canvas,{pageSize='A4',margin=24,quality=.94}={}){
 if(!canvas||!(canvas.width>0)||!(canvas.height>0))throw Error('INVOICE_CANVAS_INVALID');
 const jpg=await jpegBytes(canvas,quality);
 const [pw,ph]=pagePoints(pageSize),m=Math.max(0,Math.min(72,Number(margin)||0));
 const availW=pw-m*2,availH=ph-m*2,scale=Math.min(availW/canvas.width,availH/canvas.height);
 const dw=canvas.width*scale,dh=canvas.height*scale,x=(pw-dw)/2,y=(ph-dh)/2;
 const content=`q\n${fixed(dw)} 0 0 ${fixed(dh)} ${fixed(x)} ${fixed(y)} cm\n/Im0 Do\nQ\n`;
 const objects=[
  null,
  ascii('<< /Type /Catalog /Pages 2 0 R >>'),
  ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
  ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fixed(pw)} ${fixed(ph)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
  join([ascii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,ascii('\nendstream')]),
  ascii(`<< /Length ${ascii(content).length} >>\nstream\n${content}endstream`)
 ];
 const parts=[ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];
 let length=parts[0].length;
 for(let i=1;i<objects.length;i++){
  offsets[i]=length;
  const obj=join([ascii(`${i} 0 obj\n`),objects[i],ascii('\nendobj\n')]);
  parts.push(obj);length+=obj.length;
 }
 const xref=length;
 let table=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)table+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 table+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 parts.push(ascii(table));
 return new Blob([join(parts)],{type:'application/pdf'});
}
async function createFile(canvas,{pageSize='A4',name='ZAVI-ONE-Invoice.pdf'}={}){
 const blob=await createBlob(canvas,{pageSize});
 return new File([blob],name,{type:'application/pdf',lastModified:Date.now()});
}
window.ZaviInvoicePdf6740=Object.freeze({createBlob,createFile});
})();