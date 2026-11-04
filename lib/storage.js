import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { localMode } from './auth.js';
import { HttpError } from './validation.js';
const root=new URL('../',import.meta.url);
const file=new URL('../.local-data/content.json',import.meta.url);
const key='kukulwing/content.json';
export async function defaults(){return JSON.parse(await readFile(new URL('data/default-content.json',root),'utf8'));}
export function storageConfigured(){return localMode()||!!process.env.BLOB_READ_WRITE_TOKEN||!!process.env.BLOB_STORE_ID;}
export async function readContent(){
 if(localMode()){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {content:await defaults(),revision:'initial'};}}
 if(!storageConfigured())throw new HttpError(503,'Falta conectar el almacenamiento del sitio.');
 try{const result=await get(key,{access:'private',useCache:false,headers:{'accept-encoding':'identity'}});if(!result)return {content:await defaults(),revision:'initial'};return {content:await new Response(result.stream).json(),revision:result.blob.etag.replace(/^W\//,'')};}
 catch(e){if(e instanceof BlobNotFoundError)return {content:await defaults(),revision:'initial'};throw e;}
}
let localQueue=Promise.resolve();
export async function writeContent(content,revision){
 if(localMode()){
  const job=localQueue.then(async()=>{const current=await readContent();if(current.revision!==revision)throw new HttpError(409,'Otra sesión guardó cambios. Recarga antes de guardar.');const result={content,revision:randomUUID()};await mkdir(new URL('.local-data/',root),{recursive:true});const temp=new URL(`.local-data/${randomUUID()}.tmp`,root);await writeFile(temp,JSON.stringify(result));await rename(temp,file);return result;});localQueue=job.catch(()=>{});return job;
 }
 const current=await readContent();if(current.revision!==revision)throw new HttpError(409,'Otra sesión guardó cambios. Recarga antes de guardar.');
 try{const result=await put(key,JSON.stringify(content),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:revision!=='initial',cacheControlMaxAge:60,...(revision!=='initial'?{ifMatch:revision}:{})});return {content,revision:result.etag};}
 catch(e){if(e instanceof BlobPreconditionFailedError||e.name==='BlobAlreadyExistsError')throw new HttpError(409,'Otra sesión guardó cambios. Recarga antes de guardar.');throw e;}
}
export async function uploadImage({buffer,type,extension}){
 const name=`kukulwing/photos/${randomUUID()}.${extension}`;
 if(localMode()){await mkdir(new URL('.local-data/photos/',root),{recursive:true});const filename=name.split('/').pop();await writeFile(new URL(`.local-data/photos/${filename}`,root),buffer);return `/local-photos/${filename}`;}
 if(!storageConfigured())throw new HttpError(503,'Falta conectar el almacenamiento de fotos.');
 if(!process.env.PHOTOS_BLOB_READ_WRITE_TOKEN)throw new HttpError(503,'Falta conectar el almacenamiento público de fotos.');
 const blob=await put(name,buffer,{access:'public',contentType:type,addRandomSuffix:false,token:process.env.PHOTOS_BLOB_READ_WRITE_TOKEN});return blob.url;
}

// Persistent per-address login limits survive cold starts and multiple instances.
const localAttempts=new Map();
export async function limitLogin(bucket){
 const now=Date.now();const pathname=`kukulwing/login-limits/${bucket}.json`;
 if(localMode()){let entry=localAttempts.get(bucket);if(!entry||entry.until<=now)entry={count:0,until:now+15*60*1000};if(entry.count>=10)throw new HttpError(429,'Demasiados intentos. Espera 15 minutos.');entry.count++;localAttempts.set(bucket,entry);return;}
 if(!storageConfigured())throw new HttpError(503,'Falta conectar el almacenamiento del administrador.');
 for(let attempt=0;attempt<4;attempt++){
  let state={count:0,until:now+15*60*1000},etag;
  try{const found=await get(pathname,{access:'private',useCache:false,headers:{'accept-encoding':'identity'}});if(found){state=await new Response(found.stream).json();etag=found.blob.etag.replace(/^W\//,'');}}catch(e){if(!(e instanceof BlobNotFoundError))throw e;}
  if(state.until<=now)state={count:0,until:now+15*60*1000};if(state.count>=10)throw new HttpError(429,'Demasiados intentos. Espera 15 minutos.');state.count++;
  try{await put(pathname,JSON.stringify(state),{access:'private',contentType:'application/json',allowOverwrite:!!etag,addRandomSuffix:false,...(etag?{ifMatch:etag}:{})});return;}catch(e){if(!(e instanceof BlobPreconditionFailedError)&&e.name!=='BlobAlreadyExistsError')throw e;}
 }
 throw new HttpError(429,'Espera un momento antes de intentar de nuevo.');
}
