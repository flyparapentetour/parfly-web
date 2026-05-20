/**
 * Bold checkout — entry point del frontend.
 *
 * SEGURIDAD: la llave secreta de Bold NUNCA viaja al navegador. La firma
 * de integridad (SHA-256 sobre orderId+amount+currency+secret) se calcula
 * en la Cloud Function `generateBoldHash` y vuelve ya hasheada. Aquí solo
 * inyectamos el script oficial de Bold con los data-attributes firmados.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase/config'
import { BOLD_BUTTON_SCRIPT_URL, BOLD_FUNCTIONS_REGION } from '../constants/bold'

const functions = getFunctions(app, BOLD_FUNCTIONS_REGION)

/**
 * Pide el hash server-side y monta el botón oficial de Bold en el DOM.
 *
 * @param {object} args
 * @param {{ id: string }} args.booking - reserva con id ya persistido
 * @param {HTMLElement} [args.mountEl] - contenedor donde inyectar el script
 *                                       de Bold. Por defecto, document.body.
 */
export async function startBoldCheckout({ booking, mountEl }) {
  if (!booking?.id) {
    const err = new Error('No se puede iniciar el pago: la reserva aún no tiene ID.')
    err.code = 'BOLD_MISSING_BOOKING_ID'
    throw err
  }

  // Llamamos la Cloud Function. Ahí se valida la reserva contra Firestore,
  // se calcula el monto real (no se confía del cliente) y se firma.
  const call = httpsCallable(functions, 'generateBoldHash')
  let payload
  try {
    const { data } = await call({ bookingId: booking.id })
    payload = data
  } catch (e) {
    // httpsCallable empaqueta los errores del backend con `code`/`message`.
    const msg = e?.message || 'No se pudo iniciar el pago online.'
    const err = new Error(msg)
    err.code = e?.code || 'BOLD_CALLABLE_FAILED'
    throw err
  }

  const { orderId, amount, currency, integritySignature, apiKey } = payload
  if (!orderId || !amount || !currency || !integritySignature || !apiKey) {
    const err = new Error('Respuesta inválida del servidor de pagos.')
    err.code = 'BOLD_BAD_RESPONSE'
    throw err
  }

  // El SDK de Bold (boldPaymentButton.js) ejecuta UN solo escaneo al
  // cargarse: `document.querySelectorAll("script[data-bold-button]")` y
  // crea el botón como hermano siguiente de cada match. Por eso debemos:
  //   1. Eliminar cualquier rastro previo del SDK (script + botón) en
  //      todo el documento para no dejar duplicados huérfanos.
  //   2. Appendear nuestro <script data-bold-button …> en el contenedor
  //      controlado por React (host).
  //   3. Esperar `onload` del script: cuando el browser ejecuta el IIFE,
  //      el SDK encuentra el script y crea el botón al lado. Sin esperar
  //      onload, la UI marcaría "mounted" antes de que el botón exista.
  const host = mountEl || document.body

  // Limpieza global: el SDK escanea TODO el documento, no solo `host`.
  // Si quedó un script Bold de un intento anterior en otro lado del DOM
  // (p. ej. tras un cancel + reintento), debemos quitarlo para forzar la
  // re-ejecución del IIFE al appendear el nuevo.
  document
    .querySelectorAll('script[data-bold-button], script[src*="boldPaymentButton.js"]')
    .forEach((n) => n.remove())
  // Limpiar también el botón visual previo que el SDK haya insertado.
  host.querySelectorAll('bold-payment-button, button#boldPaymentButton').forEach((n) => n.remove())

  const script = document.createElement('script')
  script.src = BOLD_BUTTON_SCRIPT_URL
  script.async = true
  script.setAttribute('data-bold-button', '')
  script.setAttribute('data-order-id', orderId)
  script.setAttribute('data-currency', currency)
  script.setAttribute('data-amount', String(amount))
  script.setAttribute('data-api-key', apiKey)
  script.setAttribute('data-integrity-signature', integritySignature)
  script.setAttribute(
    'data-redirection-url',
    `${window.location.origin}/reservar/wizard?ref=${encodeURIComponent(orderId)}`,
  )

  // Esperar al onload (o timeout/error) antes de retornar, para que el
  // caller solo marque "mounted" cuando el botón realmente exista.
  await new Promise((resolve, reject) => {
    let settled = false
    const fail = (msg) => {
      if (settled) return
      settled = true
      reject(new Error(msg))
    }
    script.onload = () => {
      if (settled) return
      settled = true
      resolve()
    }
    script.onerror = () => fail('No se pudo cargar el script de Bold.')
    const timer = setTimeout(() => fail('Timeout cargando el botón de Bold.'), 15000)
    // Limpiar el timeout cuando resuelva o falle por error/load.
    const finalizer = () => clearTimeout(timer)
    script.addEventListener('load', finalizer, { once: true })
    script.addEventListener('error', finalizer, { once: true })
    host.appendChild(script)
  })

  return { orderId, amount, currency }
}

/**
 * Construye el deep link de WhatsApp para la Opción B del wizard (PAR-07):
 * el cliente paga el 50% por transferencia y coordina los datos bancarios
 * con el operador. Formato del mensaje fijado por el Briefing.
 *
 * Inputs (todos requeridos salvo `whatsappNumber` que el caller valida):
 *   booking.id        — ID de la reserva ya persistida
 *   booking.flow      — 'experience' | 'livegroup' (mapea a label visible)
 *   booking.numPeople — N (post-clamp)
 *   booking.sedeName  — nombre amable de la sede
 *   booking.date      — 'YYYY-MM-DD'
 *   booking.time      — 'HH:MM'
 *   booking.total     — total final ya con descuento Live Group aplicado
 *
 * Devuelve '' si el número de WhatsApp no está configurado.
 */
export function buildTransferWhatsAppMessage(booking, whatsappNumber) {
  const phone = String(whatsappNumber || '').replace(/\D/g, '')
  if (!phone) return ''
  const flowLabel =
    booking.flow === 'livegroup' ? 'Experiencia Live Group' : 'Vuelo Experience'
  const total = Number(booking.total) || 0
  const half = Math.round(total / 2)
  const fmt = (n) => `$${(n || 0).toLocaleString('es-CO')}`
  const lines = [
    'Hola, hice una reserva en Fly Parapente Tour:',
    `• ID: ${booking.id}`,
    `• Servicio: ${flowLabel}`,
    `• Personas: ${booking.numPeople ?? 1}`,
    `• Sede: ${booking.sedeName || ''}`,
    `• Fecha: ${booking.date} · ${booking.time}`,
    `• Total: ${fmt(total)}`,
    `• Quiero pagar el 50% (${fmt(half)}) por transferencia.`,
    '¿Me confirman datos bancarios?',
  ]
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}
