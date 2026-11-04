/* Shared menu data is loaded before the ordering UI starts. */
window.kukulReady=(async()=>{
 const response=await fetch('/api/content',{cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('No pudimos actualizar el menú. Recarga para realizar tu pedido.');
 const {content}=await response.json();window.kukulContent=content;
 const {business:b,images,categories,products}=content;
 const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const money=n=>`$${Number(n).toLocaleString('es-MX')}`;
 document.querySelectorAll('.brand-badge,.footer-logo').forEach(n=>n.src=images.logo);
 document.querySelectorAll('.brand-wordmark img,.hero-wordmark img').forEach(n=>n.src=images.wordmark);
 document.querySelector('.hero-logo img').src=images.hero;
 const contact=document.querySelector('#contacto');
 document.querySelectorAll('main > section.section:not(#contacto)').forEach(n=>n.remove());
 const nav=document.querySelector('.navlinks');nav.replaceChildren();
 for(const c of categories){
  const active=products.filter(p=>p.category===c.id&&p.available);if(!active.length)continue;
  const section=el('section',undefined,'container section');section.id=c.id;
  const head=el('div',undefined,'section-head');head.append(el('div',c.eyebrow,'eyebrow'),el('h2',c.name));section.append(head);
  const grid=el('div',undefined,'grid');
  for(const p of active){const card=el('article',undefined,'card food-card');card.dataset.productId=p.id;
   if(p.image){const img=el('img');img.src=p.image;img.alt=p.name;img.className='food-img';img.loading='lazy';card.append(img);}
   if(p.tag)card.append(el('span',p.tag,'tag'));
   card.append(el('h3',p.name),el('p',p.description),el('div',money(p.price),'price'));grid.append(card);
  }
  section.append(grid);if(c.note)section.append(el('p',c.note,'category-note'));contact.before(section);
  const link=el('a',c.name);link.href=`#${c.id}`;nav.append(link);
 }
 document.querySelector('[data-menu-link]').href=content.menuPdf||'menu.pdf';
 const link=el('a','Contacto');link.href='#contacto';nav.append(link);
 const boxes=contact.querySelectorAll('.info .box');
 boxes[0].querySelector('.address strong').textContent='+'+b.phone;
 boxes[0].querySelector('a[href^="tel:"]').href='tel:+'+b.phone;
 boxes[0].querySelector('p:last-child strong').textContent=`${b.waitMinutes} min.`;
 const hours=el('p');hours.style.whiteSpace='pre-line';hours.textContent=b.hours?'Horarios\n'+b.hours:'Consulta nuestros horarios por WhatsApp.';boxes[0].append(hours);
 boxes[1].querySelector('.address').textContent=b.address;
 const query=encodeURIComponent(b.mapQuery);
 const map=boxes[1].querySelector('iframe');map.src=`https://www.google.com/maps?q=${query}&z=17&output=embed`;map.title='Mapa de Kukul Wings';
 boxes[1].querySelector('.location-actions a').href=`https://www.google.com/maps/dir/?api=1&destination=${query}`;
 document.querySelector('.quick .q b').textContent=`${b.waitMinutes} MIN.`;
 contact.querySelector('.delivery-callout small').textContent=`Envío gratis desde ${money(b.freeDeliveryFrom)} · En pedidos menores: ${money(b.deliveryFee)} de envío.`;
 const socials=document.querySelector('.social');socials.replaceChildren();
 for(const [field,label]of [['facebook','ⓕ Facebook'],['instagram','◎ Instagram'],['tiktok','♪ TikTok']])if(b[field]){const a=el('a',label);a.href=b[field];a.target='_blank';a.rel='noopener noreferrer';socials.append(a);}
 return content;
})();
window.kukulReady.catch(error=>{
 const n=document.createElement('p');n.setAttribute('role','alert');n.textContent=error.message||'No pudimos cargar el menú actualizado. Recarga la página.';n.style.cssText='padding:16px;background:#661218;color:white;text-align:center;margin:0;';document.querySelector('main').prepend(n);
 document.querySelectorAll('[data-open-cart]').forEach(b=>{b.disabled=true;b.title='Recarga para actualizar el menú';});
});
