import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,randomBytes} from 'node:crypto';
import {rm,readFile} from 'node:fs/promises';
import {createServer} from '../scripts/dev.mjs';
import {validateContent,parseImage,parsePdf,pdfUrl} from '../lib/validation.js';
let server,origin,cookie;const password='test-only-long-admin-password';
before(async()=>{process.env.KUKUL_LOCAL_STORAGE='1';const salt=randomBytes(16).toString('hex');process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;process.env.SESSION_SECRET=randomBytes(48).toString('hex');server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
const request=(path,method='GET',data,auth=true,otherOrigin=origin)=>fetch(origin+path,{method,headers:{'Content-Type':'application/json',Origin:otherOrigin,...(auth&&cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});
test('admin workflow: auth, durable updates, upload, validation, conflicts, logout',async()=>{
 const original=await request('/api/content').then(r=>r.json());
 try{
 assert.equal((await request('/api/content','PUT',original,false)).status,401);
 assert.equal((await request('/api/upload','POST',{data:'invalid'},false)).status,401);
 assert.equal((await request('/api/menu-upload','POST',{data:'invalid'},false)).status,401);
 assert.equal((await request('/api/session','POST',{password:'wrong'})).status,401);
 const login=await request('/api/session','POST',{password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await request('/api/session').then(r=>r.json())).authenticated,true);
 assert.equal((await request('/api/content','PUT',original,true,'https://evil.example')).status,403);
 const modified=structuredClone(original);modified.content.products[0].price=115.5;modified.content.business.hours='Martes a domingo, 14:00–22:00';modified.content.business.whatsapp='525555555555';modified.content.categories.push({id:'bebidas',name:'Bebidas',eyebrow:'Bien frías',note:''});modified.content.products.push({id:'agua',category:'bebidas',name:'Agua',description:'500 ml',price:20,image:'',tag:'',available:true,options:'none'});
 const saved=await request('/api/content','PUT',modified);assert.equal(saved.status,200);const result=await saved.json();assert.notEqual(result.revision,original.revision);
 const fresh=await request('/api/content').then(r=>r.json());assert.equal(fresh.content.products[0].price,115.5);assert.equal(fresh.content.business.hours,modified.content.business.hours);assert.equal(fresh.content.products.at(-1).category,'bebidas');
 const disk=JSON.parse(await readFile(new URL('../.local-data/content.json',import.meta.url)));assert.equal(disk.revision,fresh.revision);
 assert.equal((await request('/api/content','PUT',modified)).status,409);
 const bad=structuredClone(fresh);bad.content.products[0].price=-1;assert.equal((await request('/api/content','PUT',bad)).status,400);
 const badUrl=structuredClone(fresh);badUrl.content.business.facebook='javascript:alert(1)';assert.equal((await request('/api/content','PUT',badUrl)).status,400);
 assert.equal((await request('/api/upload','POST',{data:'data:image/png;base64,YmFk'})).status,400);
 const photo=await request('/api/upload','POST',{data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII='});assert.equal(photo.status,200);const {url}=await photo.json();assert.equal((await fetch(origin+url)).status,200);
 const withPhoto=structuredClone(fresh);withPhoto.content.products[0].image=url;const imageSave=await request('/api/content','PUT',withPhoto);assert.equal(imageSave.status,200);
 const pdf=await readFile(new URL('../menu.pdf',import.meta.url));
 assert.equal((await request('/api/menu-upload','POST',{data:'data:application/pdf;base64,'+Buffer.from('not a pdf').toString('base64')})).status,400);
 const pdfResponse=await request('/api/menu-upload','POST',{data:'data:application/pdf;base64,'+pdf.toString('base64')});assert.equal(pdfResponse.status,200);const {url:pdfLink}=await pdfResponse.json();
 const pdfDownload=await fetch(origin+pdfLink);assert.equal(pdfDownload.status,200);assert.equal(pdfDownload.headers.get('content-type'),'application/pdf');assert.deepEqual(Buffer.from(await pdfDownload.arrayBuffer()),pdf);
 const beforePdfSave=await request('/api/content').then(r=>r.json());beforePdfSave.content.menuPdf=pdfLink;assert.equal((await request('/api/content','PUT',beforePdfSave)).status,200);assert.equal((await request('/api/content').then(r=>r.json())).content.menuPdf,pdfLink);
 const current=await request('/api/content').then(r=>r.json());await request('/api/content','PUT',{content:original.content,revision:current.revision});
 assert.equal((await request('/api/session','DELETE')).status,200);
 const tampered=await fetch(origin+'/api/content',{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie+'x'},body:JSON.stringify(original)});assert.equal(tampered.status,401);
 }finally{const current=await request('/api/content').then(r=>r.json());if(cookie)await request('/api/content','PUT',{content:original.content,revision:current.revision});}
});
test('reject dangerous content and non-image payloads',async()=>{const c=JSON.parse(await readFile(new URL('../data/default-content.json',import.meta.url)));assert.equal(validateContent(c).products.length,20);const d=structuredClone(c);d.categories.push(d.categories[0]);assert.throws(()=>validateContent(d));assert.throws(()=>parseImage({data:'data:image/svg+xml;base64,PHN2Zz4='}));});

test('PDF validation preserves legacy menus and rejects unsafe files',async()=>{const c=JSON.parse(await readFile(new URL('../data/default-content.json',import.meta.url)));delete c.menuPdf;assert.equal(validateContent(c).menuPdf,'menu.pdf');assert.throws(()=>pdfUrl('javascript:alert(1)'));assert.throws(()=>pdfUrl('https://example.com/file.pdf'));assert.throws(()=>parsePdf({data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.7 invalid').toString('base64')}));const tooLarge=Buffer.alloc(3350001);assert.throws(()=>parsePdf({data:'data:application/pdf;base64,'+tooLarge.toString('base64')}),e=>e.status===413);});
