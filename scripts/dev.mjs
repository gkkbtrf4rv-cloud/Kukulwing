import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
export function createServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const path=decodeURIComponent(url.pathname);
 if(['/api/content','/api/session','/api/upload','/api/menu-upload'].includes(path)){const {default:handler}=await import(new URL(`..${path}.js`,import.meta.url));return handler(req,res);}
 const mapped=path==='/admin'?'/admin.html':path==='/'?'/index.html':path;
 const rel=mapped.startsWith('/local-photos/')?'.local-data/photos/'+mapped.slice(14):mapped.slice(1);
 if(rel.split('/').some(part=>part==='..')||(!mapped.startsWith('/local-photos/')&&(/(^|\/)\./.test(rel)||/^(lib|scripts|tests|node_modules)\//.test(rel)))){res.writeHead(404);return res.end();}
 const filename=resolve(root,rel);if(!filename.startsWith(root+sep)){res.writeHead(404);return res.end();}
 const data=await readFile(filename);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf'}[extname(filename)]||'application/octet-stream';
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',type);res.end(data);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end('No disponible');}});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.env.KUKUL_LOCAL_STORAGE='1';
 if(!process.env.ADMIN_PASSWORD_HASH){const password=randomBytes(15).toString('base64url');const salt=randomBytes(16).toString('hex');process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;console.log(`Contraseña de desarrollo (solo local): ${password}`);}
 process.env.SESSION_SECRET ||= randomBytes(48).toString('hex');
 const port=Number(process.env.PORT||4173);createServer().listen(port,'127.0.0.1',()=>console.log(`Kukul Wings: http://127.0.0.1:${port}/admin`));
}
