# Reflexión – CI/CD con Firebase Hosting y hardening de headers HTTP

**Alumno:** Marco Weiss  
**Repositorio:** https://github.com/MarcoWeiss22/practica-firebase-cicd  
**Proyecto Firebase:** practica-cicd-marco-d5ef8

## 1. Preguntas de reflexión

### 1. ¿Por qué el preview tiene vencimiento? ¿Qué riesgos tendría un preview que no vence nunca?

El preview tiene vencimiento porque es un entorno temporal para revisar los cambios de un Pull Request antes de integrarlos a producción.

Si no venciera nunca, se acumularían versiones antiguas, podrían quedar accesibles aplicaciones con errores o vulnerabilidades y se consumirían recursos innecesariamente.

En esta práctica configuramos un vencimiento de **3 días**.

### 2. ¿Qué diferencia hay entre desplegar y liberar? ¿Dónde aparece cada concepto en este flujo?

Desplegar consiste en subir los archivos y preparar una versión en Firebase Hosting.

Liberar consiste en hacer que una versión esté disponible para los usuarios en producción.

En esta práctica, el workflow de Pull Request despliega una versión en un canal Preview, mientras que el workflow de producción libera la versión en el canal `live` después de integrar los cambios en `main`.

### 3. ¿Por qué la clave de la service account va en un secreto y no en el repo? ¿Qué podría hacer alguien que la obtenga? ¿Cómo limitarías el daño?

La clave debe guardarse como secreto de GitHub porque permite autenticar al workflow ante Firebase. No debe estar en el repositorio porque cualquier persona que acceda a ella podría utilizar esa identidad para realizar acciones sobre el proyecto.

Alguien que obtuviera la clave podría desplegar versiones maliciosas o modificar recursos según los permisos de esa cuenta.

Para limitar el daño utilizaría una cuenta con permisos mínimos, rotaría las credenciales periódicamente y revocaría inmediatamente cualquier clave comprometida.

En nuestro proyecto la credencial se configuró mediante el secreto `FIREBASE_SERVICE_ACCOUNT_PRACTICA_CICD_MARCO_D5EF8`.

### 4. La CSP rompió la app: ¿por qué? ¿Qué opciones evaluaste y qué costo de seguridad tiene cada una?

La CSP restringe los orígenes desde los cuales el navegador puede cargar recursos. Nuestra política permite recursos del propio sitio mediante `'self'`.

Durante las pruebas observamos una imagen externa de `picsum.photos`. Como ese origen no está incluido en `img-src`, la política estricta no permite cargarla.

Las alternativas son:

- Permitir el origen externo exacto en `img-src`: permite cargar esa imagen, aunque amplía los orígenes autorizados.
- Descargar y alojar la imagen dentro del propio proyecto: mantiene una política más restrictiva, pero requiere administrar ese recurso.
- Permitir todos los orígenes (`*`): es más flexible, pero reduce considerablemente la protección.

Se mantuvo una política restrictiva y se evitó agregar permisos generales innecesarios.

**Nota:** se debe verificar que la imagen de portada y el filtro de cursos funcionen correctamente con la CSP definitiva.

### 5. Para cada header de B2, ¿qué ataque mitiga?

- **Strict-Transport-Security (HSTS):** ayuda a prevenir ataques de downgrade y determinados ataques de intermediario al obligar al navegador a utilizar HTTPS.
- **X-Content-Type-Options: nosniff:** evita que el navegador interprete archivos como un tipo MIME diferente del declarado.
- **X-Frame-Options: DENY:** evita que el sitio sea cargado dentro de un iframe y ayuda a prevenir ataques de clickjacking.
- **Referrer-Policy: strict-origin-when-cross-origin:** limita la información de la URL que se envía como referencia a otros sitios.
- **Permissions-Policy:** restringe el acceso a funcionalidades del navegador, como cámara, micrófono y geolocalización.

También se configuró Content-Security-Policy para restringir los recursos que puede cargar la aplicación.

### 6. ¿Por qué los assets de /_next/static/ pueden cachearse un año y el HTML no?

Los archivos de `/_next/static/` tienen nombres asociados a su contenido. Cuando cambia su contenido, cambia también su nombre, por lo que pueden almacenarse durante un año como inmutables.

El HTML, en cambio, puede cambiar con cada despliegue. Si queda almacenado durante mucho tiempo, el usuario podría seguir viendo una versión anterior después de publicar cambios o realizar un rollback.

Por eso configuramos:

- Archivos estáticos: `public, max-age=31536000, immutable`.
- HTML: `no-store`.

### 7. Si la app necesitara SSR, ¿qué cambiaría en la arquitectura, en la CSP y en el costo?

Con SSR ya no alcanzaría con publicar archivos estáticos mediante Firebase Hosting. Se necesitaría un servidor que genere las páginas dinámicamente.

Según la arquitectura propuesta en el enunciado, se podría utilizar Firebase App Hosting sobre Cloud Run, lo que requiere el plan Blaze y una cuenta de facturación.

La CSP también podría necesitar cambios. Por ejemplo, se podrían utilizar nonces por solicitud para autorizar scripts específicos, en lugar de permitir scripts indiscriminadamente.

El costo aumentaría porque habría que ejecutar infraestructura de servidor y administrar su disponibilidad y escalabilidad.

---

## 2. Evidencias de headers HTTP

### B1 – Medición inicial

Antes de configurar los headers, se ejecutó:

`node scripts/check-headers.mjs https://practica-cicd-marco-d5ef8.web.app`

Resultado inicial:

- Content-Security-Policy: faltante.
- X-Content-Type-Options: faltante.
- X-Frame-Options: faltante.
- Referrer-Policy: faltante.
- Permissions-Policy: faltante.
- Strict-Transport-Security: presente.
- HTML: `Cache-Control: max-age=3600`.
- Asset estático: recibía `Cache-Control: max-age=3600`, cuando se esperaba una política de caché inmutable.

Resultado: **6 controles pendientes**.

### B5 – Medición final

Después de configurar los headers y las políticas de caché, se ejecutó:

`node scripts/check-headers.mjs https://practica-cicd-marco-d5ef8.web.app`

Resultado:

- Content-Security-Policy: aprobado.
- Strict-Transport-Security: aprobado.
- X-Content-Type-Options: aprobado.
- X-Frame-Options: aprobado.
- Referrer-Policy: aprobado.
- Permissions-Policy: aprobado.
- HTML: `Cache-Control: no-store`.
- Asset estático: `Cache-Control: public, max-age=31536000, immutable`.

**Resultado final: Todos los controles pasaron.**

---

## 3. Entregables

1. **Repositorio GitHub:** https://github.com/MarcoWeiss22/practica-firebase-cicd
2. **URL de producción:** https://practica-cicd-marco-d5ef8.web.app
3. **Pull Request integrado:** https://github.com/MarcoWeiss22/practica-firebase-cicd/pull/2
4. **Medición inicial y final:** documentadas en este archivo.
5. **Preguntas de reflexión:** respondidas en este archivo.

## 4. Resumen del trabajo realizado

Se configuraron workflows de GitHub Actions para desplegar automáticamente los Pull Requests en canales Preview y publicar los cambios de `main` en producción.

Se configuraron las credenciales de Firebase mediante secretos de GitHub y se incorporaron variables para identificar el commit y la rama desplegados.

Se modificó `firebase.json` para incorporar los headers HTTP de seguridad y las políticas de caché.

Finalmente, se integraron los cambios mediante un Pull Request. Los dos checks de GitHub Actions finalizaron correctamente y la comprobación de headers en producción terminó con todos los controles aprobados.
