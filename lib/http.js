import { HttpError } from './validation.js';
export function json(res,status,data){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.statusCode=status;res.end(JSON.stringify(data));}
export async function body(req,limit=3000000){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Usa contenido JSON.');
 if(req.body!==undefined){const value=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(value)>limit)throw new HttpError(413,'El archivo es demasiado grande.');try{return JSON.parse(value);}catch{throw new HttpError(400,'Solicitud inválida.');}}
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>limit)throw new HttpError(413,'El archivo es demasiado grande.');}try{return JSON.parse(raw);}catch{throw new HttpError(400,'Solicitud inválida.');}
}
export function error(res,e){if(!e.status)console.error('Kukul API:',e.name);json(res,e.status||503,{error:e.status?e.message:'No se pudo guardar o cargar. Intenta de nuevo.'});}
