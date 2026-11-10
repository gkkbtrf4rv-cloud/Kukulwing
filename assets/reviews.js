'use strict';
(async()=>{
 const list=document.querySelector('#publicReviews'),summary=document.querySelector('#reviewSummary'),form=document.querySelector('#reviewForm'),status=document.querySelector('#reviewMessage');
 if(!list||!form)return;
 try{
  const response=await fetch('/api/reviews',{cache:'no-store'});
  if(!response.ok)throw Error('No se pudieron cargar las reseñas.');
  const {reviews=[]}=await response.json();
  if(!reviews.length){summary.textContent='Todavía no hay reseñas publicadas. ¡Sé el primero!';}
  else{
   const avg=reviews.reduce((s,r)=>s+r.rating,0)/reviews.length;
   summary.textContent=`${avg.toFixed(1)} de 5 estrellas · ${reviews.length} opiniones publicadas`;
   for(const r of reviews){
    const card=document.createElement('article');card.className='review-card';
    const name=document.createElement('strong');name.textContent=r.name;
    const stars=document.createElement('div');stars.className='review-stars';stars.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);
    const comment=document.createElement('p');comment.textContent=r.comment;
    const date=document.createElement('small');date.textContent=new Date(r.createdAt).toLocaleDateString('es-MX');
    card.append(name,stars,comment,date);list.append(card);
   }
  }
 }catch(e){summary.textContent=e.message;}
 form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Enviando tu opinión…';
  try{
   const d=Object.fromEntries(new FormData(form));d.rating=Number(d.rating);
   const response=await fetch('/api/reviews',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo enviar.');
   form.reset();status.textContent=result.message;
  }catch(err){status.textContent=err.message;}finally{button.disabled=false;}
 });
})();
