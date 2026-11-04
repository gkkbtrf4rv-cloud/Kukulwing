import {randomBytes,scryptSync} from 'node:crypto';
const password=randomBytes(18).toString('base64url');const salt=randomBytes(16).toString('hex');
console.log(`Contraseña de administrador: ${password}\n\nVariables privadas de Vercel:\nADMIN_PASSWORD_HASH=${salt}:${scryptSync(password,salt,64).toString('hex')}\nSESSION_SECRET=${randomBytes(48).toString('hex')}`);
