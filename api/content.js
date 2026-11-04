import { readContent, writeContent } from '../lib/storage.js';
import { requireAdmin, sameOrigin } from '../lib/auth.js';
import { body, json, error } from '../lib/http.js';
import { validateContent, HttpError } from '../lib/validation.js';
export default async function handler(req,res){try{
 if(req.method==='GET')return json(res,200,await readContent());
 if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');throw new HttpError(405,'Método no permitido.');}
 sameOrigin(req);requireAdmin(req);const data=await body(req,1000000);if(typeof data.revision!=='string')throw new HttpError(400,'Falta la versión del menú.');
 json(res,200,await writeContent(validateContent(data.content),data.revision));
}catch(e){error(res,e);}}
