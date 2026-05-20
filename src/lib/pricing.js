/**
 * Pricing del Pivot v2 (PAR-03).
 *
 * Dos flows de reserva:
 *  - `experience`: 1–7 personas, sin descuento.
 *  - `livegroup`: 8–30 personas, 30% OFF sobre el subtotal de vuelos
 *    (NO se descuenta a adicionales).
 *
 * El helper es puro: sin React, sin Firestore. Se usa desde el wizard
 * (cliente) para mostrar el total y desde `buildBookingPayload` para
 * persistir el desglose completo en `bookings/{id}`.
 *
 * Importante: `generateBoldHash` lee `booking.total` desde Firestore —
 * el descuento ya está aplicado al persistir, así que la Function NO
 * recalcula. Cambiar la lógica de pricing acá implica que un cliente
 * malicioso podría intentar reescribir total antes de pagar; las rules
 * sólo permiten `create` (no `update`) a anónimos, así que el flujo de
 * reescritura está bloqueado a nivel rules.
 */

export const DISCOUNT_LIVEGROUP = 0.3

export const FLOW_LIMITS = {
  experience: { min: 1, max: 7 },
  livegroup: { min: 8, max: 30 },
}

export function flowLimits(flow) {
  return FLOW_LIMITS[flow] || FLOW_LIMITS.experience
}

export function clampPeople(flow, n) {
  const limits = flowLimits(flow)
  const v = Number.isFinite(n) ? Math.round(n) : limits.min
  return Math.max(limits.min, Math.min(limits.max, v))
}

export function computePricing({ flow, unitPrice, numPeople, additionals, picked }) {
  const people = clampPeople(flow, numPeople)
  const unit = Number(unitPrice) || 0
  const flightSubtotal = unit * people
  const discountRate = flow === 'livegroup' ? DISCOUNT_LIVEGROUP : 0
  const discountAmount = Math.round(flightSubtotal * discountRate)
  const flightSubtotalFinal = flightSubtotal - discountAmount

  const additionalsBreakdown = (additionals || [])
    .filter((a) => picked && picked[a.id])
    .map((a) => {
      const qty = a.billingMode === 'per_person' ? people : 1
      const lineTotal = (Number(a.price) || 0) * qty
      return {
        id: a.id,
        name: a.name,
        price: Number(a.price) || 0,
        billingMode: a.billingMode,
        quantity: qty,
        lineTotal,
      }
    })

  const additionalsTotal = additionalsBreakdown.reduce(
    (acc, l) => acc + l.lineTotal,
    0,
  )

  const total = flightSubtotalFinal + additionalsTotal

  return {
    numPeople: people,
    flightSubtotal,
    discountRate,
    discountAmount,
    flightSubtotalFinal,
    additionalsBreakdown,
    additionalsTotal,
    total,
  }
}
