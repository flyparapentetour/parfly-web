import { Fragment, useMemo, useState } from 'react'
import { orderBy, where } from 'firebase/firestore'
import Papa from 'papaparse'
import { useCollection } from '../../hooks/useCollection'
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  updateBookingNotes,
  updateBookingStatus,
} from '../../services/bookings'
import { formatCOP, SEDES, SEDE_BY_ID } from '../../constants/sedes'
import ManualBookingModal from '../../components/admin/ManualBookingModal'
import ClientHistoryPanel from '../../components/admin/ClientHistoryPanel'
import { useToast } from '../../components/admin/Toast'

const PAGE_SIZE = 20

// PAR-09d: badges visuales por paymentStatus en el listado.
// Mapa estado→label/color. Cualquier valor desconocido cae en 'unknown'.
const PAYMENT_STATUS_BADGES = {
  paid: { label: 'Pagado', tone: 'paid' },
  pending_bold: { label: 'Esperando Bold', tone: 'pending-bold' },
  pending_transfer: { label: 'Pendiente transferencia 50%', tone: 'pending-transfer' },
  failed: { label: 'Pago fallido', tone: 'failed' },
  declined: { label: 'Pago fallido', tone: 'failed' },
  voided: { label: 'Pago anulado', tone: 'failed' },
}
function PaymentBadge({ status }) {
  if (!status) return null
  const meta = PAYMENT_STATUS_BADGES[status] || { label: status, tone: 'unknown' }
  return <span className={`pay-badge pay-badge--${meta.tone}`}>{meta.label}</span>
}

const FLOW_LABELS = {
  experience: 'Vuelo Experience',
  livegroup: 'Live Group',
}

function fmtTimestamp(ts) {
  if (!ts) return ''
  try {
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows, { quotes: true })
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildWhatsAppContactURL(b) {
  const phone = (b.clientPhone || '').replace(/\D/g, '')
  if (!phone) return null
  const text = `Hola ${b.clientName}, te contactamos de Fly Parapente Tour sobre tu reserva #${b.id.slice(0, 8).toUpperCase()} del ${b.date}. `
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

function buildReminderURL(b) {
  const phone = (b.clientPhone || '').replace(/\D/g, '')
  if (!phone) return null
  const sede = SEDE_BY_ID[b.sede]?.name || b.sede
  const text = `Hola ${b.clientName}, te recordamos tu vuelo de parapente mañana ${b.date} a las ${b.time} en ${sede}. ¡Te esperamos!`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

function NotesField({ booking }) {
  const toast = useToast()
  const [value, setValue] = useState(booking.notes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = value !== (booking.notes || '')

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateBookingNotes(booking.id, value.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      toast.error(`No se pudo guardar la nota: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="notes-field">
      <label>Notas internas (solo visibles aquí)</label>
      <textarea
        className="admin-textarea"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ej: cliente pesa 95kg / pagó saldo en efectivo"
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
        <button type="button" className="admin-btn admin-btn--sm" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Guardando…' : 'Guardar nota'}
        </button>
        {saved && <small style={{ color: '#047857', fontWeight: 600 }}>✓ Guardada</small>}
      </div>
    </div>
  )
}

/**
 * Vista expandida del booking — desglose completo del Pivot v2.
 * Tolera bookings legacy: cae a placeholders cuando falta `flow`,
 * `discountRate`, `additionalsBreakdown` (lista nueva con quantity/
 * billingMode), `paymentMethod` o `termsAcceptedAt`.
 */
function BookingDetail({ booking: b }) {
  const isLegacy = !b.flow
  const numPeople = Number(b.numPeople) || 1
  const flightUnit = Number(b.flightUnitPrice) || 0
  const flightSubtotal = Number(b.flightSubtotal) || flightUnit * numPeople
  const discountRate = Number(b.discountRate) || 0
  const discountAmount = Number(b.discountAmount) || 0
  const flightSubtotalFinal = Number(b.flightSubtotalFinal) || (flightSubtotal - discountAmount)
  const additionals = Array.isArray(b.additionals) ? b.additionals : []
  const additionalsTotal = Number(b.additionalsTotal) || additionals.reduce(
    (acc, a) => acc + (Number(a.lineTotal) || Number(a.price) * (Number(a.quantity) || 1) || 0),
    0,
  )

  return (
    <div className="booking-detail">
      <div className="booking-detail__head">
        <div>
          <small className="booking-detail__label">Cliente</small>
          <p><strong>{b.clientName}</strong></p>
          <p>{b.clientEmail}</p>
          <p>{b.clientPhone}</p>
        </div>
        <div>
          <small className="booking-detail__label">Reserva</small>
          <p><strong>{FLOW_LABELS[b.flow] || b.serviceName || 'Vuelo'}</strong></p>
          <p>{SEDE_BY_ID[b.sede]?.name || b.sede} · {b.date} {b.time}</p>
          <p style={{ color: '#6b7280', fontSize: 12 }}>ID: <code>{b.id}</code></p>
        </div>
      </div>

      <div className="booking-detail__breakdown">
        <small className="booking-detail__label">Desglose</small>
        <div className="bd-line">
          <span>Vuelos · {numPeople} {numPeople === 1 ? 'persona' : 'personas'} × {formatCOP(flightUnit)}</span>
          <strong>{formatCOP(flightSubtotal)}</strong>
        </div>
        {discountRate > 0 && (
          <div className="bd-line bd-line--discount">
            <span>Descuento Live Group ({Math.round(discountRate * 100)}%)</span>
            <strong>−{formatCOP(discountAmount)}</strong>
          </div>
        )}
        {discountRate > 0 && (
          <div className="bd-line bd-line--subtotal">
            <span>Subtotal vuelos</span>
            <strong>{formatCOP(flightSubtotalFinal)}</strong>
          </div>
        )}
        {additionals.length > 0 && (
          <>
            <div className="bd-section">Adicionales</div>
            {additionals.map((a, i) => {
              const qty = Number(a.quantity) || 1
              const unit = Number(a.price) || 0
              const lineTotal = Number(a.lineTotal) || unit * qty
              const mode = a.billingMode
              return (
                <div key={a.id || i} className="bd-line bd-line--addon">
                  <span>
                    {a.name}
                    {mode && (
                      <span className={`pay-badge pay-badge--addon-${mode === 'per_person' ? 'pp' : 'pb'}`} style={{ marginLeft: 6 }}>
                        {mode === 'per_person' ? `× ${qty}` : 'por reserva'}
                      </span>
                    )}
                  </span>
                  <strong>{formatCOP(lineTotal)}</strong>
                </div>
              )
            })}
            <div className="bd-line bd-line--subtotal">
              <span>Subtotal adicionales</span>
              <strong>{formatCOP(additionalsTotal)}</strong>
            </div>
          </>
        )}
        <div className="bd-line bd-line--total">
          <span>Total</span>
          <strong>{formatCOP(b.total)}</strong>
        </div>
      </div>

      <div className="booking-detail__payment">
        <div>
          <small className="booking-detail__label">Pago</small>
          <p>
            <strong>Método:</strong>{' '}
            {b.paymentMethod === 'bold'
              ? 'Bold (100% online)'
              : b.paymentMethod === 'transfer_50'
                ? 'Transferencia 50% por WhatsApp'
                : b.paymentMethod || '—'}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Estado:</strong> <PaymentBadge status={b.paymentStatus} />
          </p>
          {b.paymentMethod === 'transfer_50' && (
            <p>
              50% ahora: <strong>{formatCOP(b.amountDue50 ?? Math.round((b.total || 0) / 2))}</strong>
              {' · '}
              50% día del vuelo: <strong>{formatCOP(b.amountDueRemainder ?? ((b.total || 0) - (b.amountDue50 ?? Math.round((b.total || 0) / 2))))}</strong>
            </p>
          )}
          {b.boldPaidAt && (
            <p style={{ color: '#047857' }}>
              Pagado el {fmtTimestamp(b.boldPaidAt)}
              {b.boldEventId && <> · ref Bold <code>{b.boldEventId}</code></>}
            </p>
          )}
        </div>
        {b.source === 'manual' && (
          <p style={{ fontStyle: 'italic', color: '#6b7280' }}>
            Reserva creada manualmente por el admin.
          </p>
        )}
      </div>

      <NotesField booking={b} />

      {(b.termsAcceptedAt || b.termsVersion) && (
        <footer className="booking-detail__legal">
          T&C aceptados {b.termsAcceptedAt ? `el ${fmtTimestamp(b.termsAcceptedAt)}` : ''}
          {b.termsVersion ? ` · versión ${b.termsVersion}` : ''}
        </footer>
      )}
      {isLegacy && !b.termsAcceptedAt && (
        <footer className="booking-detail__legal booking-detail__legal--legacy">
          Reserva previa al Pivot v2 (sin T&C registrados).
        </footer>
      )}
    </div>
  )
}

function Reservas() {
  const toast = useToast()
  const { data: bookings, loading } = useCollection('bookings', [orderBy('createdAt', 'desc')])
  const { data: services } = useCollection('services', [where('active', '==', true)])
  const { data: additionals } = useCollection('additionals', [where('active', '==', true)])
  const [sedeFilter, setSedeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)
  const [showManual, setShowManual] = useState(false)
  const [historyKey, setHistoryKey] = useState(null)

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (sedeFilter && b.sede !== sedeFilter) return false
      if (statusFilter && b.status !== statusFilter) return false
      if (from && b.date < from) return false
      if (to && b.date > to) return false
      return true
    })
  }, [bookings, sedeFilter, statusFilter, from, to])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExport = () => {
    const rows = filtered.map((b) => ({
      id: b.id,
      cliente: b.clientName,
      email: b.clientEmail,
      telefono: b.clientPhone,
      servicio: b.serviceName,
      sede: SEDE_BY_ID[b.sede]?.name || b.sede,
      fecha: b.date,
      hora: b.time,
      adicionales: (b.additionals || []).map((a) => a.name).join(' | '),
      total: b.total,
      pagado: b.amountPaid ?? b.total,
      tipoPago: b.paymentType || 'full',
      metodoPago: b.paymentMethod || '',
      estado: b.status,
      notas: b.notes || '',
    }))
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCSV(`reservas-flyparapente-${stamp}.csv`, rows)
  }

  return (
    <div>
      <div className="admin-page__head" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Reservas</h1>
          <p>Filtra, revisa detalles y gestiona el ciclo de cada reserva.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn" onClick={() => setShowManual(true)}>
            + Nueva reserva manual
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={handleExport} disabled={filtered.length === 0}>
            ⬇ Exportar CSV ({filtered.length})
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-grid admin-grid--4" style={{ alignItems: 'end' }}>
          <div className="admin-field" style={{ marginBottom: 0 }}>
            <label>Sede</label>
            <select className="admin-select" value={sedeFilter} onChange={(e) => { setPage(1); setSedeFilter(e.target.value) }}>
              <option value="">Todas</option>
              {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="admin-field" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select className="admin-select" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}>
              <option value="">Todos</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="admin-field" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" className="admin-input" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} />
          </div>
          <div className="admin-field" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" className="admin-input" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay reservas con esos filtros.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Sede</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((b) => {
                    const reminderURL = buildReminderURL(b)
                    return (
                      <Fragment key={b.id}>
                        <tr>
                          <td>
                            <strong>{b.clientName}</strong><br />
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setHistoryKey(b.clientEmail || b.clientPhone)}
                              title="Ver historial del cliente"
                            >
                              {b.clientEmail || b.clientPhone}
                            </button>
                          </td>
                          <td>{b.serviceName}</td>
                          <td>{SEDE_BY_ID[b.sede]?.name || b.sede}</td>
                          <td>{b.date}<br /><small style={{ color: '#6b7280' }}>{b.time}</small></td>
                          <td>{formatCOP(b.total)}</td>
                          <td>
                            <div className="status-cell">
                              <div className="status-cell__row">
                                <select
                                  className="status-select"
                                  value={b.status}
                                  onChange={(e) => {
                                    const next = e.target.value
                                    updateBookingStatus(b.id, next).catch((err) => toast.error(`No se pudo cambiar estado: ${err.message}`))
                                  }}
                                  aria-label="Cambiar estado"
                                >
                                  {BOOKING_STATUSES.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                  ))}
                                </select>
                                <span className={`admin-badge admin-badge--${b.status}`}>
                                  {STATUS_LABELS[b.status] || b.status}
                                </span>
                              </div>
                              {b.paymentStatus && <PaymentBadge status={b.paymentStatus} />}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {buildWhatsAppContactURL(b) && (
                                <a
                                  href={buildWhatsAppContactURL(b)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="wa-btn"
                                  title={`WhatsApp ${b.clientPhone}`}
                                  aria-label="Contactar por WhatsApp"
                                >
                                  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
                                    <path d="M16 3C8.8 3 3 8.8 3 16c0 2.5.7 4.9 2 7L3 29l6.2-2c2 1 4.4 1.6 6.8 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3zm6.6 16.3c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.8 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.2-.2.2-.3.4-.5.1-.2 0-.4 0-.6 0-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"/>
                                  </svg>
                                </a>
                              )}
                              {b.status === 'confirmed' && reminderURL && (
                                <a
                                  href={reminderURL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  title="Enviar recordatorio por WhatsApp"
                                >
                                  Recordatorio
                                </a>
                              )}
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => setExpanded((e) => (e === b.id ? null : b.id))}
                              >
                                {expanded === b.id ? 'Cerrar' : 'Detalle'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded === b.id && (
                          <tr>
                            <td colSpan={7} style={{ background: '#f8f9fa' }}>
                              <BookingDetail booking={b} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <small style={{ color: '#6b7280' }}>
                Mostrando {pageItems.length} de {filtered.length}
              </small>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost admin-btn--sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Anterior
                </button>
                <span style={{ alignSelf: 'center', fontSize: 13, padding: '0 8px' }}>{page} / {totalPages}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost admin-btn--sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showManual && (
        <ManualBookingModal
          services={services}
          additionals={additionals}
          onClose={() => setShowManual(false)}
        />
      )}

      {historyKey && (
        <ClientHistoryPanel
          identifier={historyKey}
          allBookings={bookings}
          onClose={() => setHistoryKey(null)}
        />
      )}

      <style>{`
        .wa-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #25d366; color: #fff; transition: transform 0.15s ease; }
        .wa-btn:hover { transform: scale(1.08); }
        .link-btn { background: transparent; border: none; padding: 0; color: #6b7280; font-size: 12px; cursor: pointer; text-align: left; }
        .link-btn:hover { color: #ff6b2b; text-decoration: underline; }
        .status-select { padding: 4px 6px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 12px; background: #fff; }
        .status-cell { display: flex; flex-direction: column; gap: 6px; }
        .status-cell__row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .notes-field { margin-top: 14px; }
        .notes-field label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }

        /* PAR-09d — payment badges */
        .pay-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.2px; white-space: nowrap; }
        .pay-badge--paid { background: #dcfce7; color: #166534; }
        .pay-badge--pending-bold { background: #fef9c3; color: #854d0e; }
        .pay-badge--pending-transfer { background: #ffedd5; color: #9a3412; }
        .pay-badge--failed { background: #fee2e2; color: #991b1b; }
        .pay-badge--unknown { background: #f3f4f6; color: #4b5563; }
        .pay-badge--addon-pp { background: #eef2ff; color: #4338ca; font-weight: 600; }
        .pay-badge--addon-pb { background: #f0fdf4; color: #15803d; font-weight: 600; }

        /* PAR-09d — expanded breakdown */
        .booking-detail { padding: 14px 6px; font-size: 13px; display: grid; gap: 14px; }
        .booking-detail__label { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
        .booking-detail__head { display: grid; grid-template-columns: 1fr; gap: 14px; padding: 12px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
        .booking-detail__head p { margin: 2px 0; }
        @media (min-width: 720px) { .booking-detail__head { grid-template-columns: 1fr 1fr; } }
        .booking-detail__breakdown { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
        .bd-section { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; margin: 10px 0 4px; }
        .bd-line { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 4px 0; }
        .bd-line--discount { color: #15803d; }
        .bd-line--subtotal { border-top: 1px dashed #e5e7eb; padding-top: 6px; margin-top: 4px; font-size: 12px; color: #4b5563; }
        .bd-line--addon { font-size: 12.5px; }
        .bd-line--total { border-top: 2px solid #0a1628; padding-top: 8px; margin-top: 8px; font-size: 15px; }
        .booking-detail__payment { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
        .booking-detail__payment p { margin: 4px 0; }
        .booking-detail__legal { padding: 8px 12px; border-radius: 8px; background: #f1f5f9; color: #475569; font-size: 11.5px; font-style: italic; }
        .booking-detail__legal--legacy { background: #fef3c7; color: #92400e; }
      `}</style>
    </div>
  )
}

export default Reservas
