import { configured, authenticated, sameOrigin, verifyPassword, sessionToken, cookie } from '../lib/auth.js';
import {createHmac} from 'node:crypto';
import { storageConfigured, limitLogin } from '../lib/storage.js';
import { body, json, error } from '../lib/http.js';
import { HttpError } from '../lib/validation.js';
export default async function handler(req,res){try{
 if(req.method==='GET')return json(res,200,{authenticated:authenticated(req),configured:configured(),storageConfigured:storageConfigured()});
 sameOrigin(req);
 if(req.method==='DELETE'){res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});}
 if(req.method!=='POST')throw new HttpError(405,'Método no permitido.');
 if(!configured())throw new HttpError(503,'Falta configurar el acceso de administrador en Vercel.');
 const {password}=await body(req,1000);
 const address=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 await limitLogin(createHmac('sha256',process.env.SESSION_SECRET).update(address).digest('hex')); 
 if(!await verifyPassword(password))throw new HttpError(401,'Contraseña incorrecta.');
 res.setHeader('Set-Cookie',cookie(sessionToken()));json(res,200,{ok:true});
}catch(e){error(res,e);}}
