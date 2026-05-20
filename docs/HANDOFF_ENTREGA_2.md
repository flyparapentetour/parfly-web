# Handoff Entrega 2 — Pivot v2 del flujo de reserva

**Cliente:** Juan Cepeda — Fly Parapente Tour
**Proveedor:** Orbix Studio Lab
**Fecha de entrega:** mayo 2026
**Versión del sitio:** Entrega 2 · Pivot v2
**Commit en `main`:** sustituye este placeholder con el SHA del commit que cierra la entrega.

---

## 1. Resumen ejecutivo

La **Entrega 2** refactoriza completamente el flujo de reserva online del sitio (`/reservar`) e introduce extensiones administrativas que la operación del día a día exigía después de la Entrega 1.

Cambios principales vs Entrega 1:

- El visitante entra a un **selector de 3 caminos** (Vuelo Experience · Cursos→WhatsApp · Live Group para grupos de 8+) antes del wizard.
- Único servicio reservable online: **Vuelo Experience** ($150.000 por persona). Los cursos se coordinan por WhatsApp; Live Group usa el mismo wizard con **30% de descuento aplicado solo al subtotal de vuelos** (no a adicionales).
- **Términos y Condiciones obligatorios** con checkbox + modal de lectura, persistidos por reserva (`termsAcceptedAt`, `termsVersion`).
- **Dos opciones de pago** claramente separadas: Bold 100% online o Transferencia 50% por WhatsApp.
- Adicionales con **modelo de cobro explícito** (`per_person` o `per_booking`) editable desde el panel.
- Panel admin con **badges visuales de estado de pago** y vista expandida con desglose completo del nuevo schema.

Tareas ejecutadas:

- **PAR-01** Datos Firestore: 7 adicionales nuevos con `billingMode`, desactivación de 4 viejos, creación de `settings/servicePicker` y sobrescritura de `settings/legal.terms` (v1-2026-05).
- **PAR-02** ServicePicker en `/reservar` con 3 cards.
- **PAR-03** Wizard dual `?flow=experience|livegroup` con descuento 30% y stepper de personas.
- **PAR-04** Schedule sin contador visible de cupos (lógica de bloqueo intacta).
- **PAR-05** Adicionales del wizard con `billingMode` visible y cálculo en vivo.
- **PAR-06** CustomerForm con checkbox T&C obligatorio + modal.
- **PAR-07** Payment con 2 opciones (Bold 100% / Transferencia 50% WhatsApp) + fix BTN-001 (botón de Bold ahora carga correctamente en mobile y desktop).
- **PAR-08** Verificación de Cloud Functions (sin cambios; `generateBoldHash` y `boldWebhook` desplegados el 18 may 2026 soportan el flujo nuevo).
- **PAR-09** Panel admin: form de adicionales con `billingMode` + `order`, editor del ServicePicker, badges `paymentStatus` y desglose expandido en Reservas.
- **PAR-10** QA + Deploy + este Handoff.

---

## 2. URLs críticas

| Recurso | URL |
|---|---|
| Sitio público | https://flyparapente.tours |
| Panel admin (login) | https://flyparapente.tours/admin/login |
| Consola Firebase | https://console.firebase.google.com/project/parfly-prod |
| Consola Bold (cuenta del cliente) | https://app.bold.co |
| Repositorio GitHub | https://github.com/flyparapentetour/parfly-web |
| URL del webhook Bold | https://us-central1-parfly-prod.cloudfunctions.net/boldWebhook |

Las credenciales de acceso (correo + contraseña del panel admin, cuenta Firebase, cuenta GitHub) viven fuera de este repositorio. Solicitarlas al contacto de soporte (sección 7).

---

## 3. Configuración pendiente del cliente

Pasos que **Juan** debe ejecutar para que el sitio quede listo para cobrar pagos reales. Hasta que estos pasos no estén completos, el sitio sigue operando con las llaves de **prueba** de Bold (los cobros no se acreditan en cuenta real).

### 3.a. Cargar llaves Bold reales

1. Ingresar a https://flyparapente.tours/admin/login
2. Ir a **Ajustes → Pasarela Bold**.
3. Activar el switch **Activar pasarela**.
4. Pegar la **Llave pública** y la **Llave secreta** que Bold proporciona en el panel comercial del cliente (sección de llaves de producción).
5. Pulsar **Guardar configuración Bold**. El indicador `ACTIVA` debe quedar verde.
6. Las llaves se guardan **solo** en Firestore (`settings/bold`). Nunca se escriben en código ni en variables de entorno, y la llave secreta jamás se envía al navegador del cliente.

### 3.b. Configurar el webhook en la consola Bold

1. Copiar la URL del webhook desde **Ajustes → Pasarela Bold** (botón Copiar):
   `https://us-central1-parfly-prod.cloudfunctions.net/boldWebhook`
2. Entrar al panel comercial Bold (https://app.bold.co).
3. Menú **Integraciones → Webhooks → Configurar webhook**.
4. Pegar la URL en el campo **URL de punto de conexión**.
5. Pulsar **Crear webhook**. Configuración de una sola vez.

Sin este paso, las reservas pagadas por Bold no se marcan automáticamente como confirmadas en el panel (quedan en `pending_bold`).

### 3.c. Test de pago real con refund

Después de los pasos 3.a y 3.b:

1. Hacer una reserva real en https://flyparapente.tours/reservar con flow Experience, 1 persona, fecha cualquiera, marcar T&C, opción **Pagar con Bold**.
2. Completar el pago con tarjeta propia por un monto bajo (por ejemplo $1.000 COP — Bold permite montos chicos para pruebas reales).
3. Verificar en `/admin/reservas` que el badge cambia de `Esperando Bold` a `Pagado` en cuestión de segundos.
4. Solicitar el reembolso a Bold desde su consola comercial (https://app.bold.co → Movimientos).
5. Borrar la reserva de prueba desde el panel admin (cambiarle estado a `cancelada` o eliminarla desde Firebase Console).

---

## 4. Cómo usar el panel admin

Acceso: https://flyparapente.tours/admin/login

### 4.a. Agregar o editar un adicional

1. **Adicionales** en el menú lateral.
2. Llenar el formulario:
   - **Nombre**, **Precio (COP)**, **Descripción** (todos requeridos).
   - **Forma de cobro**: elegir entre
     - **Por persona** (`per_person`) — el precio se multiplica por la cantidad de personas de la reserva. Ejemplo: comida, tiempo adicional de vuelo.
     - **Por reserva** (`per_booking`) — precio fijo, independiente de la cantidad de personas. Ejemplo: foto+video profesional, cartel personalizado, plan romántico.
   - **Orden**: número entero. Menor aparece antes en el wizard. Permite reordenar la lista sin renombrar nada.
   - **Activo**: si está apagado, el adicional desaparece del wizard pero conserva la historia de reservas que lo incluyeron.
3. Pulsar **Crear adicional** o **Guardar**.
4. Para editar uno existente, pulsar **Editar** en la fila correspondiente.

La columna **Cobro** en la tabla muestra un chip de color para identificar el tipo a primera vista (índigo = por persona, verde = por reserva).

### 4.b. Editar los 3 cards del Selector de servicios

1. **Ajustes** en el menú lateral.
2. Tab **Contenido del sitio**.
3. Sub-tab **Selector de servicios**.
4. Editar los campos visibles de cada una de las 3 tarjetas:
   - **Vuelo Experience**: título, etiqueta de precio, descripción, URL imagen (opcional).
   - **Cursos de parapente**: título, descripción, mensaje pre-armado de WhatsApp (lo que se envía al hacer click), URL imagen.
   - **Live Group**: título, texto del badge de descuento, descripción, URL imagen.
5. Pulsar **Guardar selector de servicios**.
6. Los cambios aparecen en `/reservar` al recargar la página.

No se pueden agregar ni quitar tarjetas — la estructura del selector está fija a estas 3 opciones (decisión de producto del Pivot v2).

### 4.c. Ver y gestionar reservas

1. **Reservas** en el menú lateral.
2. Filtros disponibles arriba: sede, estado, rango de fechas.
3. Cada fila muestra:
   - Datos del cliente (nombre, contacto).
   - Servicio y sede.
   - Fecha y hora.
   - Total.
   - Estado de la reserva (`pendiente` / `confirmada` / `completada` / `no-show` / `cancelada`) — modificable desde el select.
   - **Badge de estado de pago** (debajo del estado de la reserva):
     - **Pagado** (verde): Bold confirmó el pago.
     - **Esperando Bold** (amarillo): la reserva eligió Bold pero el pago aún no se completó.
     - **Pendiente transferencia 50%** (naranja): el cliente eligió pago por transferencia. Esperando que Juan coordine los datos bancarios por WhatsApp y reciba el anticipo del 50%.
     - **Pago fallido** (rojo): Bold rechazó la transacción.
4. Pulsar **Detalle** para ver el desglose completo: cliente, reserva, vuelos × precio, descuento Live Group (si aplica), adicionales con cantidad y modo de cobro, total, método de pago, T&C aceptados (fecha y versión).
5. **Notas internas** en la vista expandida — quedan visibles solo en el panel admin (no se exportan en el CSV ni se envían al cliente).
6. Botón **Recordatorio** (visible para reservas confirmadas) abre WhatsApp con un mensaje pre-armado al cliente.
7. Botón **+ Nueva reserva manual** permite crear reservas en nombre de un cliente sin pasar por el sitio público (útil para reservas tomadas por teléfono).
8. Botón **Exportar CSV** descarga todas las reservas filtradas para contabilidad o reporting externo.

### 4.d. Cambiar Términos y Condiciones

1. **Ajustes → Textos legales**.
2. Editar el textarea **Términos y condiciones**.
3. Pulsar **Guardar textos legales**.

**Importante**: cada reserva guarda la versión de T&C aceptada (`termsVersion`). Si se hace una modificación sustantiva, conviene actualizar también la versión en Firebase Console:

- Ir a https://console.firebase.google.com/project/parfly-prod/firestore/data/~2Fsettings~2Flegal
- Editar el campo `termsVersion` (por ejemplo de `v1-2026-05` a `v2-2027-01`).

Así las reservas viejas mantienen evidencia de qué texto firmaron, separado de los nuevos.

### 4.e. Cambiar número de WhatsApp y otros datos de contacto

1. **Ajustes → Contacto**.
2. Editar **WhatsApp**, **Email de contacto**, redes sociales.
3. Pulsar **Guardar cambios**.

El número de WhatsApp se usa en: botón flotante del sitio, deep link de "Coordinar por WhatsApp" del wizard, botón de cursos del ServicePicker, y los botones de Recordatorio del panel admin.

### 4.f. Subir fotos a la galería

1. **Galería** en el menú lateral.
2. Arrastrar fotos al área de upload o pulsar para seleccionar archivos.
3. Las fotos se suben a Cloudinary (cuenta gratis del proyecto) y se referencian en Firestore.
4. Cada foto admite editar **Alt** (texto descriptivo para SEO y accesibilidad).
5. Para eliminar, pulsar el botón rojo en la foto.

**Nota técnica**: al borrar una foto del panel se elimina solo la referencia en Firestore — la imagen física queda en Cloudinary hasta una limpieza manual. No es un problema operativo, solo storage en Cloudinary (que tiene cuota generosa en el plan gratis).

### 4.g. Bloquear fechas en el calendario

1. **Calendario** en el menú lateral.
2. Vista mensual por sede (tab arriba para cambiar de sede).
3. Click en un día para alternar **bloqueado / abierto**. Los días bloqueados desaparecen del wizard público.
4. La lógica es **abierto por defecto**: cualquier día sin entrada en `blocked/{sede}/dates/` está disponible con el horario base. Solo se bloquean excepciones (mal clima, día festivo, vacaciones del piloto).

---

## 5. Arquitectura técnica

Sección de referencia para cualquier desarrollador que retome el proyecto en el futuro.

### Stack

- **Frontend:** React 19 + Vite 8 (JavaScript puro, sin TypeScript en el front).
- **Backend:** Firebase Auth + Firestore + Cloud Functions (Node 20 CommonJS).
- **Hosting:** Firebase Hosting (no Vercel) con SPA rewrite a `/index.html`.
- **Imágenes:** Cloudinary unsigned preset (`parfly_gallery`).
- **Pagos:** Bold (llaves administradas desde el panel, nunca en `.env`).
- **CSS:** mobile-first vanilla CSS por componente (no Tailwind, no CSS-in-JS).

### Estructura de carpetas

```
parfly-web/
├── functions/
│   └── index.js                 ← Cloud Functions: generateBoldHash + boldWebhook
├── scripts/
│   └── par-01-seed.cjs          ← seed del Pivot v2 (idempotente)
├── src/
│   ├── App.jsx                  ← rutas + lazy imports
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Home.jsx         (única ruta eager)
│   │   │   ├── Booking.jsx      (wizard /reservar/wizard)
│   │   │   ├── Additionals.jsx, ClassesPage.jsx, SedePage.jsx, Legal.jsx
│   │   └── admin/
│   │       ├── AdminLayout.jsx, Login.jsx
│   │       ├── Dashboard.jsx, Reservas.jsx, Calendario.jsx
│   │       ├── Servicios.jsx, Adicionales.jsx, Testimonios.jsx
│   │       ├── Galeria.jsx, Ajustes.jsx
│   ├── components/
│   │   ├── booking/
│   │   │   ├── ServicePicker.jsx + .css       ← /reservar (3 cards)
│   │   │   ├── TermsModal.jsx + .css          ← modal T&C
│   │   ├── admin/
│   │       ├── ManualBookingModal, ClientHistoryPanel,
│   │       │   ProtectedRoute, ConfirmModal, Toast
│   ├── hooks/
│   │   ├── useAuth.jsx          ← AuthProvider + useAuth
│   │   ├── useCollection.js     ← onSnapshot wrapper
│   │   ├── useDoc.js            ← onSnapshot wrapper para 1 doc
│   │   ├── useMutation.js       ← idle/saving/saved/error wrapper
│   ├── services/
│   │   ├── bold.js              ← startBoldCheckout + buildTransferWhatsAppMessage
│   │   ├── bookings.js          ← CRUD bookings + STATUS_LABELS
│   │   ├── observability.js     ← Sentry lazy (descopeado en Entrega 2)
│   │   ├── notifications.js     ← EmailJS wrappers (post-handoff)
│   ├── lib/
│   │   └── pricing.js           ← computePricing (helper puro)
│   ├── constants/
│   │   ├── sedes.js, bold.js, siteContent.js, legalDefaults.js
│   └── firebase/
│       └── config.js            ← initializeApp + getAuth/Firestore/Functions
├── firestore.rules
├── firebase.json
├── vite.config.js               ← manualChunks: firebase, papaparse, react-vendor, router
```

### Schema Firestore principal

**`bookings/{id}`** (id auto-generado, también es el `orderId` de Bold para idempotencia):

```javascript
{
  // identidad cliente
  clientName, clientEmail, clientPhone,

  // reserva
  serviceId, serviceName,        // siempre 'vuelos-experience' en pivot v2
  sede, sedeName, date, time,
  status,                        // 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'

  // pivot v2 — desglose económico
  flow,                          // 'experience' | 'livegroup'
  numPeople,
  flightUnitPrice,               // 150000
  flightSubtotal,                // numPeople * flightUnitPrice
  discountRate,                  // 0 o 0.30
  discountAmount,                // round(flightSubtotal * discountRate)
  flightSubtotalFinal,
  additionals: [{ id, name, price, billingMode, quantity, lineTotal }],
  additionalsTotal,
  total,                         // = lo que Bold cobra cuando paymentMethod='bold'

  // pago
  paymentMethod,                 // 'bold' | 'transfer_50'
  paymentStatus,                 // 'pending_bold' | 'pending_transfer' | 'paid' | 'failed' | 'declined' | 'voided'
  amountDue50, amountDueRemainder,

  // pivot v2 — evidencia legal
  termsAcceptedAt,               // Firestore serverTimestamp
  termsVersion,                  // 'v1-2026-05'

  // Bold (escrito solo por la Cloud Function)
  boldOrderId, boldAmount, boldAttemptAt,
  boldEventId, boldRawStatus, boldUpdatedAt, boldPaidAt,

  // admin
  notes, source ('public' | 'manual'),
  createdAt
}
```

**`additionals/{id}`**:

```javascript
{
  name, description, price,
  billingMode: 'per_person' | 'per_booking',
  active, order
}
```

**`settings/{docId}`** — todos editables desde el panel:

- `general` — whatsapp, email, redes, **`boldActive`** (espejo público de `bold.active` para visitantes anónimos).
- `bold` — `publicKey`, `secretKey`, `active`. **Admin-only en lectura y escritura.**
- `legal` — `terms`, `privacy`, `cancellations`, `termsVersion`.
- `servicePicker` — `experience`, `courses`, `liveGroup` (3 cards del selector).
- `schedule` — horarios base por sede.
- `homeIntros`, `stats`, `faq`, `included`, `classes`, `sedes` — contenido editable del sitio público.

**`availability/{sede}/slots/{YYYY-MM-DD}`** — overrides puntuales de horarios.

**`blocked/{sede}/dates/{date}`** — bloqueos administrativos.

**`boldEvents/{eventId}`** — bitácora de idempotencia del webhook. Cerrada (`allow read, write: if false`); solo la Cloud Function escribe ahí vía admin SDK.

### Cloud Functions activas

Despliegue actual (sin cambios desde 18 may 2026, commit `cdd8a88`):

- **`generateBoldHash`** (callable, `us-central1`) — el frontend la llama con `{ bookingId }`. La función:
  1. Lee `settings/bold` y verifica `active + publicKey + secretKey`.
  2. Lee `bookings/{id}` y toma `booking.total` como monto.
  3. Computa `SHA-256(orderId + amount + currency + secretKey)` en hex lowercase.
  4. Marca la reserva con `boldAttemptAt` y devuelve `{ orderId, amount, currency: 'COP', integritySignature, apiKey: publicKey }` al frontend, que inyecta el script oficial de Bold con esos datos.

- **`boldWebhook`** (HTTPS público) — endpoint que Bold invoca al cambiar el estado de un pago.
  1. Verifica `x-bold-signature` con HMAC-SHA256 del `rawBody` y `timingSafeEqual`.
  2. Persiste `event.id` (o `${reference}:${status}`) en `boldEvents/` para idempotencia.
  3. Mapea estado Bold (`APPROVED`/`SUCCESSFUL` → `paid`) a `paymentStatus`.
  4. Si `paid`, también escribe `status: 'confirmed'` y `boldPaidAt`. Batch atómico con el log de idempotencia.

**Importante**: las funciones no se redeployan al hacer un release de frontend. Solo se redeployan con `firebase deploy --only functions` cuando el código en `functions/index.js` cambia.

### Reglas Firestore (resumen)

- **Catálogo público** (`services`, `additionals`, `testimonials`, `gallery`): lectura pública, escritura solo admin autenticado.
- **`settings/{docId}`**: lectura pública por defecto. **Excepción**: `settings/bold` lectura y escritura admin-only (contiene `secretKey`).
- **`bookings/{id}`**: público puede `create` y `get` por ID (el doc id funciona como token de acceso para el comprador). `list`, `update` y `delete` solo admin. Las actualizaciones de `paymentStatus` y `status: 'confirmed'` las hace **solo** la Cloud Function vía admin SDK.
- **`boldEvents`**: cerrado totalmente al cliente (admin SDK only).
- **`availability` y `blocked`**: lectura pública (para que el wizard sepa qué bloquear), escritura admin-only.

Archivo fuente: `firestore.rules` en la raíz del repositorio.

---

## 6. Pendientes post-handoff

Trabajo que se discutió pero quedó **fuera del scope** de la Entrega 2. Cada uno está aquí para que el cliente y el sucesor sepan que existen como follow-ups, no como deuda olvidada.

- **EmailJS — notificaciones por correo de cada reserva.**
  Pendiente: al confirmarse una reserva, enviar email al cliente (con el resumen y el ID) y al admin (con el aviso de nueva reserva). Las variables de entorno `VITE_EMAILJS_*` ya están listas en `.env.example`; falta cablear los wrappers en `src/services/notifications.js` y elegir el momento de envío (probablemente un trigger `onBookingPaid` o llamada desde el frontend tras confirmación). Costo: cuenta EmailJS free alcanza para un volumen bajo; subir a tier pago si el volumen aumenta.

- **Sentry — error tracking en producción.**
  Descopeado de la Entrega 2 por decisión del Jefe. El sitio actual reporta errores únicamente a la consola del browser y a los logs de Cloud Functions en Google Cloud Console (visibles desde la consola Firebase). Para escalar el producto conviene reabilitar Sentry: el código en `src/services/observability.js` ya está preparado para activarse cuando `VITE_SENTRY_DSN` exista.

- **Galería — borrado físico en Cloudinary.**
  Hoy borrar una foto del panel elimina solo la referencia en Firestore. La imagen sigue en Cloudinary hasta una limpieza manual. Para automatizarlo se necesita un endpoint Cloud Function que firme el delete con la API secret de Cloudinary (que no debe vivir en el frontend). Bajo prioridad mientras el volumen de fotos sea chico.

- **i18n EN.**
  El brief original mencionaba español + inglés. La Entrega 1 y 2 quedaron en español únicamente. El stack ya admite `react-i18next` cuando se quiera activar.

- **Llaves de prueba de Bold.**
  Hasta que Juan ejecute la sección 3.a y 3.b, el sitio sigue operando con las llaves de prueba. Los cobros no llegan a cuenta real. Borrar todas las reservas de prueba previas al go-live antes de abrir tráfico.

---

## 7. Contacto soporte

**Orbix Studio**
Equipo responsable del desarrollo del sitio.

- **Solicitar un cambio futuro** (nuevo módulo, fix, ajuste visual): abrir un chat dedicado con el equipo Lab de Orbix mencionando `parfly` o `Fly Parapente Tour` en el primer mensaje. El equipo evalúa scope, presupuesto y tiempos.
- **Bugs en producción**: reportar con captura, URL afectada y pasos para reproducir. Si el sitio está caído (no responde en `flyparapente.tours`), avisar como urgente.
- **Cambios de credenciales** (perdió contraseña del panel, rotar llaves, etc.): el soporte coordina los pasos seguros — nunca compartir contraseñas por chat sin canal cifrado.

**Auto-servicio**: la mayoría de cambios operacionales (textos, precios, fotos, T&C, números de contacto, adicionales) se hacen sin Orbix desde el panel admin. Ver sección 4.

---

*Este documento es la única fuente autoritativa para operar Fly Parapente Tour después de la Entrega 2. Actualizarlo cuando el cliente o el equipo Orbix introduzcan cambios materiales (nuevo módulo, nueva versión de T&C, cambio de proveedor de pagos, etc.).*
