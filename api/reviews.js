import {randomUUID} from 'node:crypto';
import {authenticated,requireAdmin,sameOrigin} from '../lib/auth.js';
import {body,json,error} from '../lib/http.js';
import {HttpError} from '../lib/validation.js';
import {readReviews,changeReviews,limitReview} from '../lib/reviews.js';
const clean=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max?v.trim():null;
export default async function handler(req,res){try{
 if(req.method==='GET'){
  const admin=new URL(req.url,'https://localhost').searchParams.get('admin')==='1';
  if(admin)requireAdmin(req);
  const {reviews}=await readReviews();
  return json(res,200,{reviews:(admin?reviews:reviews.filter(r=>r.status==='approved')).map(r=>({id:r.id,name:r.name,rating:r.rating,comment:r.comment,createdAt:r.createdAt,...(admin?{status:r.status}:{})})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,admin?500:50)});
 }
 if(req.method==='POST'){
  sameOrigin(req);
  const d=await body(req,5000);
  if(d.website)throw new HttpError(400,'No se pudo enviar la reseña.');
  const name=clean(d.name,60),comment=clean(d.comment,600),rating=d.rating;
  if(!name||!comment||comment.length<10||!Number.isInteger(rating)||rating<1||rating>5)throw new HttpError(400,'Escribe tu nombre, un comentario de al menos 10 caracteres y una calificación de 1 a 5.');
  await limitReview(req);
  const review={id:randomUUID(),name,rating,comment,createdAt:new Date().toISOString(),status:'pending'};
  await changeReviews(list=>[...list.slice(-999),review]);
  return json(res,201,{message:'¡Gracias! Tu reseña se publicará después de revisarla.'});
 }
 if(req.method==='PATCH'){
  sameOrigin(req);requireAdmin(req);
  const d=await body(req,3000);
  if(typeof d.id!=='string'||!['approved','hidden','delete'].includes(d.action))throw new HttpError(400,'Acción inválida.');
  let found=false;
  await changeReviews(list=>{const item=list.find(r=>r.id===d.id);if(!item)throw new HttpError(404,'Reseña no encontrada.');found=true;return d.action==='delete'?list.filter(r=>r.id!==d.id):list.map(r=>r.id===d.id?{...r,status:d.action}:r);});
  return json(res,200,{ok:found});
 }
 res.setHeader('Allow','GET, POST, PATCH');throw new HttpError(405,'Método no permitido.');
}catch(e){error(res,e);}}
