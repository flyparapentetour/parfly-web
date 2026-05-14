import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const isEmailJSConfigured = () =>
  Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

/**
 * Send admin notification when a booking is created.
 * Silent no-op if EmailJS is not configured — never breaks the booking flow.
 *
 * TODO (admin): create EmailJS account, set up service + template, paste keys
 * into .env.local. Template should consume the variables defined below.
 */
export async function notifyAdminOfBooking(booking) {
  if (!isEmailJSConfigured()) {
    console.info('[notifications] EmailJS no configurado — saltando email')
    return { skipped: true }
  }

  const params = {
    bookingId: booking.id,
    serviceName: booking.serviceName,
    sede: booking.sedeName || booking.sede,
    date: booking.date,
    time: booking.time,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    total: booking.total,
    amountPaid: booking.amountPaid ?? booking.total,
    paymentType: booking.paymentType || 'full',
    paymentMethod: booking.paymentMethod || '—',
    additionals: (booking.additionals || []).map((a) => a.name).join(', ') || 'Ninguno',
  }

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY })
    return { sent: true }
  } catch (e) {
    console.error('[notifications] EmailJS error', e)
    return { sent: false, error: e?.message }
  }
}
