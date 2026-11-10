# Panel de Kukul Wings

El panel vive en `/admin`. Permite crear, editar, ocultar y eliminar productos; organizar categorías; subir fotos; modificar precios, teléfono, WhatsApp, dirección, mapa, horarios y redes sociales. Los cambios se publican al pulsar **Guardar cambios**. El menú público y el carrito usan el mismo catálogo. La sección Menú PDF permite subir y reemplazar el archivo (máximo 3.35 MB) y conserva el original hasta guardar. El botón público abre la última versión guardada. Los precios del PDF deben actualizarse manualmente cuando cambien los productos.

## Activación en el proyecto Vercel existente

1. Conectar un almacén **Vercel Blob privado** exclusivo para menú y límites de acceso; conservar su variable `BLOB_READ_WRITE_TOKEN`. Conectar otro almacén **público** para fotos usando `PHOTOS_BLOB_READ_WRITE_TOKEN`. Conectarlos únicamente a Production del proyecto `kukulwing`; mantener Preview en almacenes separados si se requiere probar con datos persistentes.
2. Ejecutar `node scripts/admin-credentials.mjs` en un entorno privado. Guardar la contraseña en un gestor de contraseñas. Configurar `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` como variables sensibles de Production. El hash usa scrypt con sal aleatoria. Nunca subir la contraseña ni las variables al repositorio.
3. Conservar la variable `BLOB_READ_WRITE_TOKEN` proporcionada por Blob, o la conexión OIDC (`BLOB_STORE_ID`). No establecer `KUKUL_LOCAL_STORAGE` en Vercel.
4. Desplegar la rama que contiene estos cambios. Framework: Other; build: `node scripts/build.mjs`; output: `public`. `vercel.json` declara estas opciones.
5. Entrar a `https://<dominio-del-sitio>/admin`, iniciar sesión, guardar un cambio y comprobarlo en otra ventana. El primer guardado migra los 20 productos actuales a Blob. Los archivos originales del repositorio permanecen disponibles.

El catálogo y los límites de acceso se leen del almacén privado sin caché para reflejar los cambios de inmediato. Las fotos usan nombres únicos en el almacén público.

La contraseña nunca se almacena en el navegador: se usa una cookie HttpOnly, Secure, SameSite=Strict con firma y duración de ocho horas. Las escrituras comprueban origen y sesión; las subidas solo admiten JPEG, PNG y WebP hasta 2 MB (el panel reduce las imágenes grandes). Los guardados usan ETags para detectar ediciones simultáneas. Se limita el inicio de sesión a diez intentos por dirección en quince minutos usando registros persistentes; estos registros no contienen direcciones IP en claro. Las fotos anteriores se conservan para no romper enlaces y no se eliminan automáticamente.

Cambiar `SESSION_SECRET` invalida todas las sesiones. Para cambiar la contraseña, generar nuevas credenciales y redesplegar. No hay registro público ni recuperación por correo.

## Desarrollo y comprobación

Node.js 22 o superior. `pnpm install`, `pnpm test`, `pnpm dev`. Desarrollo escucha únicamente en 127.0.0.1 y genera una contraseña temporal al arrancar. Los cambios locales se guardan en `.local-data/` (ignorado en Git), nunca en Blob. `pnpm build` prepara los archivos públicos. Las pruebas de API usan almacenamiento local; la conexión real a Blob y el despliegue requieren las variables anteriores.

El campo de horarios es informativo; no cierra automáticamente los pedidos. El precio se toma del catálogo al cargar el sitio. El pedido se confirma manualmente mediante WhatsApp y no procesa pagos.

## Cobertura de entregas y reseñas

En **Datos del negocio → Pedidos y entregas**, el campo **Radio máximo de entregas (km)** comienza en 5 y puede ajustarse entre 0.5 y 100 km. La comprobación usa la geolocalización autorizada por el navegador, distancia geográfica en línea recta (no kilómetros de ruta) y el margen de precisión que reporta el dispositivo. La ubicación del negocio en **Ubicación en Google Maps** debe ser un par de coordenadas «latitud,longitud» para habilitar esta comprobación. Sin ubicación verificable, el cliente aún puede elegir recoger en local, pero no generar un pedido a domicilio. El pedido por WhatsApp incluye un enlace a la ubicación verificada; la comprobación en navegador no sustituye una confirmación manual del negocio y no es a prueba de falsificación.

Las reseñas públicas permiten nombre o apodo, calificación de 1 a 5 y comentario de 10 a 600 caracteres. Se almacenan **pendientes**, no aparecen públicamente hasta que un administrador las apruebe en la pestaña **Reseñas**. El panel permite aprobar, ocultar y eliminar. La API pública devuelve solo reseñas aprobadas y escapa su visualización mediante textContent. Un campo trampa para bots y un límite de 3 envíos diarios por IP (con identificador HMAC, sin guardar IP en claro) reducen el spam, aunque no lo eliminan por completo. Las reseñas se guardan en Vercel Blob privado usando la misma conexión que el menú. El sistema necesita SESSION_SECRET configurado para la limitación de envíos.

**Antes de publicar:** probar permisos de ubicación en un teléfono, un punto dentro y otro fuera del radio, y el flujo de moderación. Revisar la configuración de Vercel Blob y las variables existentes. Esta rama no se despliega automáticamente a producción salvo que se integre en la rama de producción.

## Dirección de entrega con sugerencias gratuitas

El formulario de envío solicita calle, número exterior, interior opcional, colonia, código postal de cinco dígitos, municipio, estado y referencias. Los campos obligatorios deben estar completos antes de generar el enlace de WhatsApp. El cliente puede elegir sugerencias obtenidas de la API pública Photon de Komoot, basada en OpenStreetMap, o escribir su dirección manualmente si el servicio no responde. Se consultan sugerencias tras escribir al menos cuatro caracteres, con pausa de 550 ms entre escritura y búsqueda. El navegador comunica el texto de búsqueda al servicio de terceros, por lo que no deben incluirse datos sensibles. Las sugerencias pueden omitir número o colonia: el cliente debe revisar y completar los campos.

**Importante:** Photon público es un servicio comunitario sin garantía de disponibilidad ni capacidad para tráfico comercial elevado. Si el volumen de consultas crece, conviene alojar un geocodificador propio o contratar un proveedor con condiciones de uso apropiadas. El radio de entrega sigue comprobándose mediante la ubicación del dispositivo y no por la dirección escrita; debe confirmarse que corresponden al mismo domicilio.
