import {mkdir,cp,rm} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});await mkdir('public');
for(const name of ['index.html','admin.html','assets','menu.pdf','favicon.jpg','logo.jpg'])await cp(name,`public/${name}`,{recursive:true});
console.log('Sitio estático preparado; las API se despliegan como funciones de Vercel.');
