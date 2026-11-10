import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomUUID,createHmac} from 'node:crypto';
import {get,put,BlobNotFoundError,BlobPreconditionFailedError} from '@vercel/blob';
import {localMode} from './auth.js';
import {HttpError} from './validation.js';
const key='kukulwing/reviews.json';
const file=new URL('../.local-data/reviews.json',import.meta.url);
const ratePrefix='kukulwing/review-rates/';
const localRates=new Map();
let queue=Promise.resolve();
const conflict=e=>e instanceof BlobPreconditionFailedError||e.name==='BlobAlreadyExistsError';
export async function readReviews(){
 if(localMode()){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {reviews:[],revision:'initial'};throw e;}}
 if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.BLOB_STORE_ID)throw new HttpError(503,'Falta configurar almacenamiento para las reseñas.');
 try{const found=await get(key,{access:'private',useCache:false});if(!found)return {reviews:[],revision:'initial'};return {reviews:await new Response(found.stream).json(),revision:found.blob.etag.replace(/^W\//,'')};}
 catch(e){if(e instanceof BlobNotFoundError)return {reviews:[],revision:'initial'};throw e;}
}
async function writeReviews(reviews,revision){
 if(localMode()){await mkdir(new URL('../.local-data/',import.meta.url),{recursive:true});const tmp=new URL('../.local-data/'+randomUUID()+'.tmp',import.meta.url);await writeFile(tmp,JSON.stringify({reviews,revision:randomUUID()}));await rename(tmp,file);return;}
 await put(key,JSON.stringify(reviews),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:revision!=='initial',...(revision!=='initial'?{ifMatch:revision}:{})});
}
export async function changeReviews(change){
 const operation=async()=>{for(let i=0;i<6;i++){const {reviews,revision}=await readReviews();const next=change(reviews);try{await writeReviews(next,revision);return;}catch(e){if(!conflict(e))throw e;}}throw new HttpError(409,'Otra actualización ocurrió al mismo tiempo. Intenta nuevamente.');};
 if(!localMode())return operation();
 const job=queue.then(operation);queue=job.catch(()=>{});return job;
}
export async function limitReview(req){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32)throw new HttpError(503,'Las reseñas aún no están configuradas.');
 const bucket=createHmac('sha256',secret).update('reviews:'+ip).digest('hex');
 const now=Date.now(),pathname=ratePrefix+bucket+'.json';
 if(localMode()){let entry=localRates.get(bucket);if(!entry||entry.until<now)entry={count:0,until:now+86400000};if(entry.count>=3)throw new HttpError(429,'Alcanzaste el límite de 3 reseñas por día.');entry.count++;localRates.set(bucket,entry);return;}
 for(let i=0;i<6;i++){let state={count:0,until:now+86400000},etag;
  try{const found=await get(pathname,{access:'private',useCache:false});if(found){state=await new Response(found.stream).json();etag=found.blob.etag.replace(/^W\//,'');}}catch(e){if(!(e instanceof BlobNotFoundError))throw e;}
  if(state.until<now)state={count:0,until:now+86400000};
  if(state.count>=3)throw new HttpError(429,'Alcanzaste el límite de 3 reseñas por día.');
  state.count++;
  try{await put(pathname,JSON.stringify(state),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{})});return;}catch(e){if(!conflict(e))throw e;}
 }
 throw new HttpError(429,'Intenta nuevamente en unos minutos.');
}
