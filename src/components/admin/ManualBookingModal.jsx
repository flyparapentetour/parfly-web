import { useMemo, useState } from 'react'
import { where } from 'firebase/firestore'
import { useCollection } from '../../hooks/useCollection'
import { useDoc } from '../../hooks/useDoc'
import { createBooking } from '../../services/bookings'
import { ALL_SLOT_TIMES, SEDES, SEDE_BY_ID, formatCOP } from '../../constants/sedes'
import { sedeBase } from '../../services/schedule'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'bold', label: 'Bold (online)' },
  { id: 'whatsapp', label: 'WhatsApp' },
]

const INITIAL_STATUSES = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'confirmed', label: 'Confirmada' },
  { id: 'completed', label: 'Completada' },
]

function ManualBookingModal({ onClose, onCreated }) {
  const { data: services } = useCollection('services', [where('active', '==', true)])
  const { data: additionals } = useCollection('additionals', [where('active', '==', true)])
  const { data: schedule } = useDoc('settings/schedule')

  const [serviceId, setServiceId] = useState('')
  const [sedeId, setSedeId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [picked, setPicked] = useState({})
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [status, setStatus] = useState('confirmed')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId],
  )

  const total = useMemo(() => {
    const base = selectedService?.price || 0
    const extras = additionals.reduce((acc, a) => acc + (picked[a.id] ? a.price : 0), 0)
    return base + extras
  }, [selectedService, additionals, picked])

  const slotOptions = useMemo(() => {
    if (!sedeId || !schedule) return ALL_SLOT_TIMES
    const base = sedeBase(schedule, sedeId)
    return base.slots.length > 0 ? base.slots.map((s) => s.time) : ALL_SLOT_TIMES
  }, [sedeId, schedule])

  const canSubmit =
    selectedService &&
    sedeId &&
    date &&
    time &&
    clientName.trim().length > 1 &&
    clientPhone.replace(/\D/g, '').length >= 7

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!canSubmit) {
      setError('Completa los campos obligatorios.')
      return
    }
    setSubmitting(true)
    try {
      const adicionales = additionals
        .filter((a) => picked[a.id])
        .map((a) => ({ id: a.id, name: a.name, price: a.price }))
      const id = await createBooking({
        source: 'manual',
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        sede: sedeId,
        sedeName: SEDE_BY_ID[sedeId]?.name || sedeId,
        date,
        time,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        additionals: adicionales,
        total,
        paymentType: 'full',
        amountPaid: total,
        paymentMethod,
        status,
        notes: notes.trim() || '',
      })
      onCreated?.(id)
      onClose?.()
    } catch (e) {
      console.error(e)
      setError('No se pudo crear la reserva. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-backdrop" onClick={onClose} />
      <div className="mb-modal" role="dialog" aria-modal="true" aria-label="Nueva reserva manual">
        <form onSubmit={submit}>
          <header className="mb-modal__head">
            <h2>Nueva reserva manual</h2>
            <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={onClose}>
              ✕
            </button>
          </header>

          <div className="mb-modal__body">
            <div className="admin-grid admin-grid--2">
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Servicio *</label>
                <select className="admin-select" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {formatCOP(s.price)}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Sede *</label>
                <select className="admin-select" value={sedeId} onChange={(e) => { setSedeId(e.target.value); setTime('') }}>
                  <option value="">Selecciona…</option>
                  {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-grid admin-grid--2" style={{ marginTop: 14 }}>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Fecha *</label>
                <input type="date" className="admin-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Hora *</label>
                <select className="admin-select" value={time} onChange={(e) => setTime(e.target.value)} disabled={!sedeId}>
                  <option value="">Selecciona…</option>
                  {slotOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <h3 className="mb-modal__h3">Datos del cliente</h3>
            <div className="admin-grid admin-grid--2">
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Nombre *</label>
                <input className="admin-input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Teléfono / WhatsApp *</label>
                <input className="admin-input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+57 300 000 0000" />
              </div>
            </div>
            <div className="admin-field" style={{ marginTop: 14, marginBottom: 0 }}>
              <label>Email</label>
              <input className="admin-input" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="juan@correo.com" />
            </div>

            {additionals.length > 0 && (
              <>
                <h3 className="mb-modal__h3">Adicionales</h3>
                <div className="mb-addons">
                  {additionals.map((a) => {
                    const on = !!picked[a.id]
                    return (
                      <label key={a.id} className={`mb-addon ${on ? 'mb-addon--on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setPicked((p) => ({ ...p, [a.id]: !p[a.id] }))}
                        />
                        <span className="mb-addon__name">{a.name}</span>
                        <span className="mb-addon__price">{formatCOP(a.price)}</span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            <h3 className="mb-modal__h3">Estado y pago</h3>
            <div className="admin-grid admin-grid--2">
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Estado inicial</label>
                <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {INITIAL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Método de pago</label>
                <select className="admin-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-field" style={{ marginTop: 14, marginBottom: 0 }}>
              <label>Notas internas (opcional)</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: cliente pesa 95kg / pagó saldo en efectivo"
              />
            </div>

            <div className="mb-total">
              <span>Total</span>
              <strong>{formatCOP(total)}</strong>
            </div>

            {error && <p className="mb-error">{error}</p>}
          </div>

          <footer className="mb-modal__foot">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn" disabled={!canSubmit || submitting}>
              {submitting ? 'Creando…' : 'Crear reserva'}
            </button>
          </footer>
        </form>
      </div>
      <style>{`
        .mb-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 80; }
        .mb-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 640px; max-height: 90vh; background: #fff; border-radius: 14px; z-index: 81; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.3); }
        .mb-modal__head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #e5e7eb; }
        .mb-modal__head h2 { font-size: 18px; font-weight: 700; }
        .mb-modal__body { padding: 18px 22px; overflow-y: auto; flex: 1; }
        .mb-modal__h3 { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; margin: 22px 0 10px; }
        .mb-modal__foot { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 22px; border-top: 1px solid #e5e7eb; background: #fafafa; }
        .mb-addons { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .mb-addon { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; }
        .mb-addon--on { border-color: #ff6b2b; background: #fff7f2; }
        .mb-addon input { accent-color: #ff6b2b; }
        .mb-addon__name { flex: 1; font-size: 14px; }
        .mb-addon__price { font-weight: 700; color: #ff6b2b; }
        .mb-total { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; padding: 14px 18px; background: #f8f9fa; border-radius: 10px; }
        .mb-total span { font-size: 13px; font-weight: 600; color: #6b7280; letter-spacing: 0.5px; text-transform: uppercase; }
        .mb-total strong { font-size: 22px; color: #ff6b2b; }
        .mb-error { margin-top: 12px; color: #991b1b; background: #fee2e2; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
        @media (min-width: 600px) { .mb-addons { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </>
  )
}

export default ManualBookingModal
