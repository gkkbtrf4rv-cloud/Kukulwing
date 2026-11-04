import { requireAdmin, sameOrigin } from '../lib/auth.js';
import { uploadPublicFile } from '../lib/storage.js';
import { parseImage } from '../lib/validation.js';
import { body, json, error } from '../lib/http.js';
export default async function handler(req,res){try{
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Método no permitido.'});}
 sameOrigin(req);requireAdmin(req);json(res,200,{url:await uploadPublicFile(parseImage(await body(req)))});
}catch(e){error(res,e);}}
