export class HttpError extends Error { constructor(status,message){ super(message); this.status=status; } }
const fail = message => { throw new HttpError(400,message); };
function text(v,label,max=300,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(`Revisa ${label}.`);return v.trim();}
function number(v,label,max=100000){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||Math.round(v*100)!==v*100 && Math.abs(Math.round(v*100)-v*100)>1e-7)fail(`Revisa ${label}.`);return v;}
export function imageUrl(v){v=text(v,'la imagen',2000);if(!v)return '';if(process.env.KUKUL_LOCAL_STORAGE==='1'&&!process.env.VERCEL&&/^\/local-photos\/[a-z0-9-]+\.(jpeg|png|webp)$/.test(v))return v;if(/^assets\/[a-zA-Z0-9/_.-]+$/.test(v)&&!v.includes('..'))return v;try{const u=new URL(v);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}fail('La imagen debe ser un archivo del sitio o una dirección HTTPS.');}
function social(v,label){v=text(v,label,2000);if(!v)return '';try{const u=new URL(v);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}fail(`Usa una dirección HTTPS para ${label}.`);}
const id=v=>{if(typeof v!=='string'||! /^[a-z0-9][a-z0-9-]{0,79}$/.test(v))fail('Identificador inválido.');return v;};
export function validateContent(d){
 if(!d||d.version!==1||!d.business||!d.images||!Array.isArray(d.categories)||!Array.isArray(d.products))fail('Contenido inválido.');
 if(d.categories.length>40||d.products.length>500)fail('El menú es demasiado grande.');
 const b=d.business;const business={};
 for(const field of ['whatsapp','phone']){const v=text(b[field],field,20,true);if(!/^\d{10,15}$/.test(v))fail(`Incluye la lada del país en ${field}, usando solo números.`);business[field]=v;}
 business.address=text(b.address,'la dirección',500,true);business.mapQuery=text(b.mapQuery,'la ubicación del mapa',500,true);business.hours=text(b.hours,'los horarios',1000);
 business.waitMinutes=number(b.waitMinutes,'el tiempo de espera',240);business.deliveryFee=number(b.deliveryFee,'el envío',10000);business.freeDeliveryFrom=number(b.freeDeliveryFrom,'el mínimo de envío gratis');
 for(const field of ['facebook','instagram','tiktok'])business[field]=social(b[field],field);
 const categories=d.categories.map(c=>({id:id(c.id),name:text(c.name,'el nombre de categoría',100,true),eyebrow:text(c.eyebrow,'el subtítulo',150),note:text(c.note,'la nota de categoría',500)}));
 const ids=new Set(categories.map(c=>c.id));if(ids.size!==categories.length||ids.has('contacto'))fail('Hay categorías repetidas o reservadas.');
 const products=d.products.map(p=>{if(!ids.has(p.category))fail('Un producto tiene una categoría que ya no existe.');if(typeof p.available!=='boolean')fail('Disponibilidad inválida.');if(!['none','dressing','banderilla','combo-wings','mini-banderilla'].includes(p.options))fail('Opciones de producto inválidas.');return {id:id(p.id),category:p.category,name:text(p.name,'el nombre del producto',150,true),description:text(p.description,'la descripción',1000),price:number(p.price,'el precio'),image:imageUrl(p.image),tag:text(p.tag,'la etiqueta',60),available:p.available,options:p.options};});
 if(new Set(products.map(p=>p.id)).size!==products.length)fail('Hay productos repetidos.');
 const images={};for(const k of ['logo','wordmark','hero'])images[k]=imageUrl(d.images[k]);
 const menuPdf=pdfUrl(d.menuPdf ?? 'menu.pdf');
 return {version:1,business,images,categories,products,menuPdf};
}
export function parseImage(body){
 if(typeof body?.data!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.data))fail('Selecciona una foto JPG, PNG o WebP.');
 const [,type,base64]=body.data.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
 const buffer=Buffer.from(base64,'base64');if(buffer.length>2*1024*1024)throw new HttpError(413,'La foto debe pesar menos de 2 MB.');
 const valid=type==='image/jpeg'?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:type==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
 if(!valid)fail('El archivo no es una foto válida.');return {buffer,type,extension:type.split('/')[1]};
}

export function pdfUrl(value){
 const v=text(value,'el PDF del menú',2000,true);
 if(v==='menu.pdf')return v;
 if(process.env.KUKUL_LOCAL_STORAGE==='1'&&!process.env.VERCEL&&/^\/local-photos\/[a-z0-9-]+\.pdf$/.test(v))return v;
 try{const u=new URL(v);if(u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.endsWith('.public.blob.vercel-storage.com')&&u.pathname.endsWith('.pdf')&&!u.search&&!u.hash)return u.href;}catch{}
 fail('Elige un PDF subido desde el panel.');
}
export function parsePdf(body){
 if(typeof body?.data!=='string'||!/^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/.test(body.data))fail('Selecciona un archivo PDF.');
 const buffer=Buffer.from(body.data.split(',')[1],'base64');
 if(buffer.length>3350000)throw new HttpError(413,'El PDF debe pesar como máximo 3.35 MB.');
 if(!buffer.subarray(0,8).toString('ascii').match(/^%PDF-\d\.\d/)||!buffer.subarray(-1024).toString('latin1').includes('%%EOF'))fail('El archivo no es un PDF válido.');
 return {buffer,type:'application/pdf',extension:'pdf'};
}
