import { Fragment, useMemo, useState } from 'react'
import { orderBy } from 'firebase/firestore'
import Papa from 'papaparse'
import { useCollection } from '../../hooks/useCollection'
import { updateBookingStatus } from '../../services/bookings'
import { formatCOP, SEDES, SEDE_BY_ID } from '../../constants/sedes'

const PAGE_SIZE = 20

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

function Reservas() {
  const { data: bookings, loading } = useCollection('bookings', [orderBy('createdAt', 'desc')])
  const [sedeFilter, setSedeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)

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
    }))
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCSV(`reservas-flyparapente-${stamp}.csv`, rows)
  }

  return (
    <div>
      <div className="admin-page__head" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Reservas</h1>
          <p>Filtra, revisa detalles y confirma o cancela reservas.</p>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={handleExport} disabled={filtered.length === 0}>
          ⬇ Exportar CSV ({filtered.length})
        </button>
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
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
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
                  {pageItems.map((b) => (
                    <Fragment key={b.id}>
                      <tr>
                        <td>
                          <strong>{b.clientName}</strong><br />
                          <small style={{ color: '#6b7280' }}>{b.clientEmail}</small>
                        </td>
                        <td>{b.serviceName}</td>
                        <td>{SEDE_BY_ID[b.sede]?.name || b.sede}</td>
                        <td>{b.date}<br /><small style={{ color: '#6b7280' }}>{b.time}</small></td>
                        <td>{formatCOP(b.total)}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${b.status}`}>{b.status}</span>
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
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              onClick={() => setExpanded((e) => (e === b.id ? null : b.id))}
                            >
                              {expanded === b.id ? 'Cerrar' : 'Detalle'}
                            </button>
                            {b.status === 'pending' && (
                              <>
                                <button type="button" className="admin-btn admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'confirmed')}>Confirmar</button>
                                <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'cancelled')}>Cancelar</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded === b.id && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f8f9fa' }}>
                            <div style={{ padding: '8px 4px', fontSize: 13 }}>
                              <p><strong>Teléfono:</strong> {b.clientPhone}</p>
                              <p><strong>Email:</strong> {b.clientEmail}</p>
                              <p><strong>Método de pago:</strong> {b.paymentMethod || '—'} · <strong>Tipo:</strong> {b.paymentType || 'full'} · <strong>Pagado:</strong> {formatCOP(b.amountPaid ?? b.total)}</p>
                              <p><strong>Ref:</strong> {b.id}</p>
                              {b.additionals?.length > 0 && (
                                <p>
                                  <strong>Adicionales:</strong>{' '}
                                  {b.additionals.map((a) => `${a.name} (${formatCOP(a.price)})`).join(' · ')}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
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

      <style>{`
        .wa-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #25d366; color: #fff; transition: transform 0.15s ease; }
        .wa-btn:hover { transform: scale(1.08); }
      `}</style>
    </div>
  )
}

export default Reservas
