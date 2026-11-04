import { scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './validation.js';
const scrypt=promisify(scryptCallback);
export const localMode=()=>process.env.KUKUL_LOCAL_STORAGE==='1'&&!process.env.VERCEL;
export function configured(){return !!process.env.ADMIN_PASSWORD_HASH&&!!process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32;}
export function sameOrigin(req){
 const origin=req.headers.origin;const host=req.headers.host;
 if(!origin||!host)throw new HttpError(403,'Recarga el panel y vuelve a intentar.');
 let u;try{u=new URL(origin);}catch{throw new HttpError(403,'Origen inválido.');}
 if(u.host!==host||(!localMode()&&u.protocol!=='https:'))throw new HttpError(403,'Origen no permitido.');
}
const signature=v=>createHmac('sha256',process.env.SESSION_SECRET).update(v).digest('base64url');
export function sessionToken(now=Date.now()){const payload=Buffer.from(JSON.stringify({exp:now+8*60*60*1000})).toString('base64url');return `${payload}.${signature(payload)}`;}
export function authenticated(req,now=Date.now()){
 if(!configured())return false;
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('kukul_admin='))?.slice(12);
 if(!token)return false;const [payload,sig,extra]=token.split('.');if(!payload||!sig||extra)return false;
 const expected=signature(payload);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
 try{const {exp}=JSON.parse(Buffer.from(payload,'base64url'));return Number.isFinite(exp)&&exp>now&&exp<=now+8*60*60*1000;}catch{return false;}
}
export function requireAdmin(req){if(!configured())throw new HttpError(503,'El acceso de administrador todavía no está configurado.');if(!authenticated(req))throw new HttpError(401,'Tu sesión terminó. Vuelve a iniciar sesión.');}
export function cookie(token,maxAge=28800){return `kukul_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${localMode()?'':'; Secure'}`;}
export async function verifyPassword(password){
 if(typeof password!=='string'||password.length>200)return false;
 const [salt,hash]=process.env.ADMIN_PASSWORD_HASH.split(':');if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash))throw new HttpError(503,'Configuración de acceso inválida.');
 const result=await scrypt(password,salt,64);return timingSafeEqual(result,Buffer.from(hash,'hex'));
}
