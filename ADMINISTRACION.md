# Panel de Kukul Wings

El panel vive en `/admin`. Permite crear, editar, ocultar y eliminar productos; organizar categorías; subir fotos; modificar precios, teléfono, WhatsApp, dirección, mapa, horarios y redes sociales. Los cambios se publican al pulsar **Guardar cambios**. El menú público y el carrito usan el mismo catálogo. El antiguo PDF se conserva como archivo pero deja de ser el enlace principal para evitar precios desactualizados.

## Activación en el proyecto Vercel existente

1. Conectar un almacén **Vercel Blob público** exclusivo para Kukulwing (Storage → Create Database → Blob). Conectarlo al entorno Production del proyecto `kukulwing`; mantener Preview en un almacén separado si se requiere probar con datos persistentes.
2. Ejecutar `node scripts/admin-credentials.mjs` en un entorno privado. Guardar la contraseña en un gestor de contraseñas. Configurar `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` como variables sensibles de Production. El hash usa scrypt con sal aleatoria. Nunca subir la contraseña ni las variables al repositorio.
3. Conservar la variable `BLOB_READ_WRITE_TOKEN` proporcionada por Blob, o la conexión OIDC (`BLOB_STORE_ID`). No establecer `KUKUL_LOCAL_STORAGE` en Vercel.
4. Desplegar la rama que contiene estos cambios. Framework: Other; build: `node scripts/build.mjs`; output: `public`. `vercel.json` declara estas opciones.
5. Entrar a `https://<dominio-del-sitio>/admin`, iniciar sesión, guardar un cambio y comprobarlo en otra ventana. El primer guardado migra los 20 productos actuales a Blob. Los archivos originales del repositorio permanecen disponibles.

La contraseña nunca se almacena en el navegador: se usa una cookie HttpOnly, Secure, SameSite=Strict con firma y duración de ocho horas. Las escrituras comprueban origen y sesión; las subidas solo admiten JPEG, PNG y WebP hasta 2 MB (el panel reduce las imágenes grandes). Los guardados usan ETags para detectar ediciones simultáneas. Se limita el inicio de sesión a diez intentos por dirección en quince minutos usando registros persistentes; estos registros no contienen direcciones IP en claro. Las fotos anteriores se conservan para no romper enlaces y no se eliminan automáticamente.

Cambiar `SESSION_SECRET` invalida todas las sesiones. Para cambiar la contraseña, generar nuevas credenciales y redesplegar. No hay registro público ni recuperación por correo.

## Desarrollo y comprobación

Node.js 22 o superior. `pnpm install`, `pnpm test`, `pnpm dev`. Desarrollo escucha únicamente en 127.0.0.1 y genera una contraseña temporal al arrancar. Los cambios locales se guardan en `.local-data/` (ignorado en Git), nunca en Blob. `pnpm build` prepara los archivos públicos. Las pruebas de API usan almacenamiento local; la conexión real a Blob y el despliegue requieren las variables anteriores.

El campo de horarios es informativo; no cierra automáticamente los pedidos. El precio se toma del catálogo al cargar el sitio. El pedido se confirma manualmente mediante WhatsApp y no procesa pagos.
