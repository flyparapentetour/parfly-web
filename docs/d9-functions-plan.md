# D9 — Cloud Functions Bold · plan de implementación

Estado: preparado mientras el Jefe corre `firebase init functions`.

## Confirmaciones del paso 0

- Billing parfly-prod vinculado a `01B465-E9F925-1B9DEDF` (Blaze activo).
- Firestore `parfly-prod` en **`nam5`** (multi-región EE.UU.: Iowa + Carolina
  del Sur). Compatible con Cloud Functions en `us-central1`.
- Región elegida: **`us-central1`**.
- URL final del webhook (tras deploy):
  `https://us-central1-parfly-prod.cloudfunctions.net/boldWebhook`

## Decisiones de implementación

### Aislamiento estricto del repo
- **NO** se copia código desde Orbix ni Caída Libre. Solo se referencia
  el formato del hash y el esquema del webhook como spec, todo se reescribe
  limpio aquí en `parfly-web/functions/`.
- **NO** se genera `serviceAccountKey.json` en disco. `admin.initializeApp()`
  va sin argumentos: en Cloud Functions usa las credenciales por defecto
  del runtime.

### Estructura propuesta de `functions/`

```
functions/
  package.json            ← creado por firebase init
  index.js                ← entry, exporta las 2 functions
  src/
    bold/
      hash.js             ← computeBoldIntegrity(orderId, amount, currency, secret)
      webhook.js          ← verifyBoldWebhookSignature(payload, header, secret)
    booking.js            ← getBooking(bookingId), updateBookingPayment(...)
```

Si el Jefe prefiere todo en un solo `index.js` plano, también es viable
para esta superficie tan acotada (2 functions). Decido al ver el resultado
de init.

## Function 1 — `generateBoldHash` (onCall)

Pseudocódigo final:

```js
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const crypto = require('crypto')

admin.initializeApp()
const db = admin.firestore()
const REGION = 'us-central1'

exports.generateBoldHash = onCall({ region: REGION }, async (request) => {
  // 1. Validar input.
  const { bookingId } = request.data || {}
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'bookingId requerido')
  }

  // 2. Leer la reserva server-side. El monto del CLIENTE se ignora
  //    deliberadamente: la fuente de verdad es Firestore.
  const bookingRef = db.collection('bookings').doc(bookingId)
  const bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    throw new HttpsError('not-found', 'Reserva no encontrada')
  }
  const booking = bookingSnap.data()

  // 3. Validar estado. Solo bookings vivas pueden generar hash.
  if (booking.status === 'cancelled') {
    throw new HttpsError('failed-precondition', 'Reserva cancelada')
  }

  // 4. Calcular amount real desde el documento.
  //    `paymentType: 'partial'` → mitad del total, redondeada como
  //    en el frontend (`Math.round(total / 2)`).
  const total = Number(booking.total || 0)
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError('failed-precondition', 'Monto inválido')
  }
  const amount = booking.paymentType === 'partial' ? Math.round(total / 2) : total
  const currency = 'COP'

  // 5. orderId estable y único por intento de pago. Reutilizar el
  //    `bookingId` directamente garantiza idempotencia con el webhook
  //    (si el cliente reintenta, mismo orderId → Bold deduplica).
  const orderId = bookingId

  // 6. Leer la SECRETA desde settings/bold (server-side ONLY).
  const boldSettings = await db.doc('settings/bold').get()
  if (!boldSettings.exists) {
    throw new HttpsError('failed-precondition', 'Bold no configurado')
  }
  const { publicKey, secretKey, active } = boldSettings.data() || {}
  if (!active || !publicKey || !secretKey) {
    throw new HttpsError('failed-precondition', 'Bold inactivo o sin llaves')
  }

  // 7. Calcular SHA-256(orderId + amount + currency + secret).
  //    Formato Bold: concatenación directa sin separadores.
  const integritySignature = crypto
    .createHash('sha256')
    .update(`${orderId}${amount}${currency}${secretKey}`)
    .digest('hex')

  // 8. Marcar el intento de pago en la reserva (sin tocar status:
  //    eso lo hace el webhook tras confirmación de Bold).
  await bookingRef.update({
    boldOrderId: orderId,
    boldAmount: amount,
    boldAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // 9. Devolver SOLO datos públicos. apiKey (pública) puede ir al cliente.
  return { orderId, amount, currency, integritySignature, apiKey: publicKey }
})
```

**Lo que NUNCA viaja al cliente**: `secretKey`. La SHA-256 sí, porque ya
está hasheada — es la firma que Bold espera ver en el `bold-button`.

## Function 2 — `boldWebhook` (onRequest)

```js
const { onRequest } = require('firebase-functions/v2/https')

exports.boldWebhook = onRequest({ region: REGION, cors: false }, async (req, res) => {
  // 1. Aceptar solo POST.
  if (req.method !== 'POST') {
    res.set('Allow', 'POST').status(405).send('Method not allowed')
    return
  }

  // 2. Leer settings/bold para la secreta de verificación.
  const boldSnap = await db.doc('settings/bold').get()
  const { secretKey } = boldSnap.data() || {}
  if (!secretKey) {
    console.error('boldWebhook: settings/bold.secretKey ausente')
    res.status(503).send('Bold no configurado')
    return
  }

  // 3. Verificar firma de Bold.
  //    Bold envía `x-bold-signature` como HMAC-SHA256(body, secretKey)
  //    en hex. (Confirmar exactitud con la doc Bold cuando lleguen
  //    las llaves reales — el header puede ser distinto en versiones.)
  const signature = req.get('x-bold-signature') || req.get('X-Bold-Signature')
  const rawBody = req.rawBody // Cloud Functions v2 expone rawBody
  if (!signature || !rawBody) {
    res.status(401).send('Missing signature')
    return
  }
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex')
  const ok = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  )
  if (!ok) {
    console.warn('boldWebhook: firma inválida')
    res.status(401).send('Invalid signature')
    return
  }

  // 4. Parsear payload.
  const event = req.body || {}
  const { type, data } = event
  const reference = data?.reference || data?.metadata?.reference || data?.orderId
  const status = data?.status // approved | declined | voided | pending …
  if (!reference || !status) {
    res.status(400).send('Payload incompleto')
    return
  }

  // 5. Idempotencia: si ya procesamos este event-id, salir 200.
  const eventId = event.id || `${reference}:${status}`
  const procRef = db.collection('boldEvents').doc(eventId)
  const procSnap = await procRef.get()
  if (procSnap.exists) {
    res.status(200).send('Already processed')
    return
  }

  // 6. Mapear estado de Bold a nuestro modelo.
  //    booking.status (pending/confirmed/completed/no_show/cancelled)
  //    booking.paymentStatus (nuevo: pending/paid/declined/voided)
  const STATUS_MAP = {
    APPROVED: 'paid',
    REJECTED: 'declined',
    DECLINED: 'declined',
    VOIDED: 'voided',
    REVERSED: 'voided',
    PENDING: 'pending',
  }
  const paymentStatus = STATUS_MAP[String(status).toUpperCase()] || 'pending'

  // 7. Actualizar reserva atómicamente con el event-marker.
  const batch = db.batch()
  batch.update(db.doc(`bookings/${reference}`), {
    paymentStatus,
    boldEventId: eventId,
    boldRawStatus: status,
    boldAmount: Number(data?.amount) || null,
    boldPaidAt: paymentStatus === 'paid'
      ? admin.firestore.FieldValue.serverTimestamp()
      : null,
    // Si Bold aprobó, además confirmamos la reserva.
    ...(paymentStatus === 'paid' ? { status: 'confirmed' } : {}),
  })
  batch.set(procRef, {
    type,
    reference,
    status,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await batch.commit()

  // 8. 200 inmediato.
  res.status(200).send('ok')
})
```

**Nota sobre el formato exacto de firma de Bold**: cuando lleguen las
llaves de prueba reales, hay que confirmar:
- Nombre del header (`x-bold-signature` vs `x-signature` vs …).
- Si es HMAC-SHA256 sobre `rawBody` directo o sobre algún canonical string.
- Codificación: hex vs base64.

El bloque de verificación (paso 3) está parametrizable, pero el resto
del webhook es independiente.

## Plan de cambios en `firestore.rules`

Estado actual relevante:

```
match /settings/bold           { allow read, write: if isSignedIn(); }
```

Eso **ya** restringe lectura a usuarios autenticados (admin). La regla es
correcta para producción: ningún visitante público puede leer la secreta.

**Cambio mínimo a aplicar**: agregar `match /boldEvents/{id}` con
`allow read, write: if false;` — esa colección solo la escribe la Cloud
Function (admin SDK la bypassa). Nadie del cliente debe leerla ni escribirla.

```
match /boldEvents/{id} { allow read, write: if false; }
```

## Plan de cambios en `src/services/bold.js` (frontend)

Cambiar el `throw` actual por un `httpsCallable` al callable nuevo:

```js
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase/config'

const functions = getFunctions(app, 'us-central1')

export async function startBoldCheckout({ booking }) {
  if (!booking?.id) throw new Error('bookingId requerido')

  const call = httpsCallable(functions, 'generateBoldHash')
  const { data } = await call({ bookingId: booking.id })
  const { orderId, amount, currency, integritySignature, apiKey } = data

  // Inyectar el bold-button con la firma server-side.
  // Bold espera estos atributos exactos en el <script src="bold-button…">.
  const script = document.createElement('script')
  script.src = 'https://checkout.bold.co/library/boldPaymentButton.js'
  script.setAttribute('data-bold-button', '')
  script.setAttribute('data-order-id', orderId)
  script.setAttribute('data-currency', currency)
  script.setAttribute('data-amount', String(amount))
  script.setAttribute('data-api-key', apiKey)
  script.setAttribute('data-integrity-signature', integritySignature)
  // redirection-url al volver de Bold; el webhook ya habrá actualizado el doc
  script.setAttribute('data-redirection-url',
    `${window.location.origin}/reservar?ref=${orderId}`)
  document.body.appendChild(script)

  return { orderId, amount, currency }
}
```

Eliminamos el bloque que computa `parfly-${Date.now()}-${booking.id}`
(reference dejó de generarse en cliente) y el `console.warn` de "pendiente".

## Plan de `firebase/config.js`

Asegurarse de exportar `app` (no solo `db` y `auth`) para poder pasar a
`getFunctions(app, region)`. Si ya lo exporta, no se toca; si no, añadir
`export const app = initializeApp(config)`.

## Plan del bloque en `Ajustes.jsx > BoldTab`

Tras los inputs de las llaves y antes del botón "Guardar configuración Bold",
agregar un bloque `<div className="bold-webhook">`:

```jsx
<h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
  Webhook
</h3>
<div className="bold-webhook">
  <p>
    Bold notificará el estado de cada pago a esta URL. Cópiala y pégala
    en tu panel de comercio Bold → Configuración → Webhooks/Notificaciones.
  </p>
  <div className="bold-webhook__url">
    <code>https://us-central1-parfly-prod.cloudfunctions.net/boldWebhook</code>
    <button
      type="button"
      className="admin-btn admin-btn--ghost admin-btn--sm"
      onClick={() => {
        navigator.clipboard.writeText(BOLD_WEBHOOK_URL)
        toast.success('URL copiada')
      }}
    >
      Copiar
    </button>
  </div>
</div>
```

Constante `BOLD_WEBHOOK_URL` definida en un módulo `src/constants/bold.js`
para no duplicar el string. Si el deploy cambia de región o de project,
solo se toca ahí.

## Aceptación (checklist final)

- [ ] `firebase deploy --only functions` deploys without errors.
- [ ] Test booking → callable returns valid `{integritySignature, apiKey}`.
- [ ] Bold sandbox payment → webhook updates `bookings/{id}.paymentStatus = paid`,
      `status = confirmed`.
- [ ] Re-fire mismo webhook → `boldEvents/{eventId}` ya existe → 200, no duplica.
- [ ] `grep -r "secretKey" dist/` después de `npm run build` → 0 matches
      (no leak de la secreta al bundle del frontend).
- [ ] Panel admin (Ajustes → Pasarela Bold) muestra la URL del webhook,
      botón copiar funciona.
- [ ] `firestore.rules` deployed con `boldEvents` cerrado, `settings/bold`
      sigue restringido a `isSignedIn()`.

Cierra PAR-07.
