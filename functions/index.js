/**
 * Cloud Functions · Fly Parapente Tour (parfly-prod)
 *
 * Integración Bold:
 *  - generateBoldHash  (callable) — firma server-side del hash de integridad.
 *                                   La llave secreta NUNCA viaja al cliente.
 *  - boldWebhook       (onRequest) — recibe notificaciones de Bold y
 *                                   actualiza el estado real de pago.
 *
 * Aislamiento: este código es escrito limpio para parfly-web. Solo se
 * referencia (no se copia) la integración Bold de Orbix para el formato
 * exacto del hash y el esquema del webhook.
 */

const crypto = require('node:crypto')
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const logger = require('firebase-functions/logger')

initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

const db = getFirestore()

/* ============================================================
 * Helpers
 * ============================================================ */

async function loadBoldSettings() {
  const snap = await db.doc('settings/bold').get()
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'Bold no configurado (settings/bold ausente).')
  }
  const data = snap.data() || {}
  if (!data.active) {
    throw new HttpsError('failed-precondition', 'Pasarela Bold inactiva.')
  }
  if (!data.publicKey || !data.secretKey) {
    throw new HttpsError('failed-precondition', 'Faltan llaves de Bold en settings/bold.')
  }
  return data
}

/**
 * Calcula el monto a cobrar a partir del documento de reserva. La fuente
 * de verdad es Firestore — el cliente no manda monto.
 */
function computeAmount(booking) {
  const total = Number(booking.total || 0)
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError('failed-precondition', 'Monto inválido en la reserva.')
  }
  return booking.paymentType === 'partial' ? Math.round(total / 2) : total
}

/* ============================================================
 * 1) generateBoldHash — onCall
 * ============================================================
 * Input:   { bookingId: string }
 * Output:  { orderId, amount, currency, integritySignature, apiKey }
 *
 * apiKey es la llave PÚBLICA (identidad); la SECRETA nunca sale del
 * servidor — solo se usa para computar el hash SHA-256.
 */
exports.generateBoldHash = onCall(async (request) => {
  const { bookingId } = request.data || {}
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'bookingId requerido.')
  }

  const bookingRef = db.collection('bookings').doc(bookingId)
  const bookingSnap = await bookingRef.get()
  if (!bookingSnap.exists) {
    throw new HttpsError('not-found', 'Reserva no encontrada.')
  }
  const booking = bookingSnap.data()
  if (booking.status === 'cancelled') {
    throw new HttpsError('failed-precondition', 'Reserva cancelada.')
  }

  const { publicKey, secretKey } = await loadBoldSettings()

  const amount = computeAmount(booking)
  const currency = 'COP'
  // orderId = bookingId: estable, único, y permite que la idempotencia
  // del webhook se ancle en el mismo identificador.
  const orderId = bookingId

  // Formato Bold: SHA-256(orderId + amount + currency + secret), hex
  // lowercase. Concatenación directa sin separadores.
  const integritySignature = crypto
    .createHash('sha256')
    .update(`${orderId}${amount}${currency}${secretKey}`)
    .digest('hex')

  // Marcamos el intento de pago. El status REAL lo cambia el webhook.
  await bookingRef.update({
    boldOrderId: orderId,
    boldAmount: amount,
    boldAttemptAt: FieldValue.serverTimestamp(),
  })

  logger.info('generateBoldHash ok', { bookingId, amount, currency })

  return { orderId, amount, currency, integritySignature, apiKey: publicKey }
})

/* ============================================================
 * 2) boldWebhook — onRequest
 * ============================================================
 * Endpoint público que Bold invoca al cambiar el estado del pago.
 *
 * Verificación de autenticidad: Bold firma cada notificación con
 * HMAC-SHA256(rawBody, secretKey) y lo envía en el header
 * `x-bold-signature` (hex). Cualquier request sin firma válida se
 * rechaza con 401 antes de tocar Firestore.
 *
 * Idempotencia: cada event-id se persiste en /boldEvents/{eventId}.
 * Si Bold reenvía (network retry), respondemos 200 sin duplicar.
 */
exports.boldWebhook = onRequest({ cors: false, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST').status(405).send('Method not allowed')
    return
  }

  let secretKey
  try {
    const settings = await loadBoldSettings()
    secretKey = settings.secretKey
  } catch (e) {
    logger.error('boldWebhook: settings/bold inválido', e)
    res.status(503).send('Bold no configurado')
    return
  }

  // 1) Verificar firma.
  const signature =
    req.get('x-bold-signature') ||
    req.get('X-Bold-Signature') ||
    req.get('bold-signature')
  const rawBody = req.rawBody // Cloud Functions v2 expone el body crudo
  if (!signature || !rawBody) {
    logger.warn('boldWebhook: falta firma o body')
    res.status(401).send('Missing signature')
    return
  }
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex')

  let valid = false
  try {
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expected, 'hex')
    valid = a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch (e) {
    valid = false
  }
  if (!valid) {
    logger.warn('boldWebhook: firma inválida')
    res.status(401).send('Invalid signature')
    return
  }

  // 2) Parsear payload.
  const event = req.body || {}
  const data = event.data || event
  const reference = data?.reference || data?.metadata?.reference || data?.orderId
  const status = data?.status || event.type
  if (!reference || !status) {
    logger.warn('boldWebhook: payload incompleto', { event })
    res.status(400).send('Payload incompleto')
    return
  }

  // 3) Idempotencia.
  const eventId = String(event.id || `${reference}:${status}`)
  const procRef = db.collection('boldEvents').doc(eventId)
  const procSnap = await procRef.get()
  if (procSnap.exists) {
    logger.info('boldWebhook: ya procesado', { eventId })
    res.status(200).send('Already processed')
    return
  }

  // 4) Mapear estado Bold → modelo interno.
  const STATUS_MAP = {
    APPROVED: 'paid',
    SUCCESSFUL: 'paid',
    REJECTED: 'declined',
    DECLINED: 'declined',
    FAILED: 'declined',
    VOIDED: 'voided',
    REVERSED: 'voided',
    PENDING: 'pending',
  }
  const paymentStatus = STATUS_MAP[String(status).toUpperCase()] || 'pending'

  // 5) Actualizar la reserva y registrar el evento atómicamente.
  const bookingRef = db.collection('bookings').doc(reference)
  const update = {
    paymentStatus,
    boldEventId: eventId,
    boldRawStatus: status,
    boldAmount: Number(data?.amount) || null,
    boldUpdatedAt: FieldValue.serverTimestamp(),
  }
  if (paymentStatus === 'paid') {
    update.boldPaidAt = FieldValue.serverTimestamp()
    // Cuando Bold aprueba, la reserva queda confirmada automáticamente.
    update.status = 'confirmed'
  }

  const batch = db.batch()
  batch.update(bookingRef, update)
  batch.set(procRef, {
    type: event.type || null,
    reference,
    status,
    paymentStatus,
    receivedAt: FieldValue.serverTimestamp(),
  })

  try {
    await batch.commit()
  } catch (e) {
    logger.error('boldWebhook: commit falló', { reference, status, err: e.message })
    res.status(500).send('Persistence error')
    return
  }

  logger.info('boldWebhook ok', { reference, paymentStatus, eventId })
  res.status(200).send('ok')
})
