import { useMemo } from 'react'
import { formatCOP, SEDE_BY_ID } from '../../constants/sedes'
import { STATUS_LABELS, isRevenueStatus } from '../../services/bookings'

function ClientHistoryPanel({ identifier, allBookings, onClose }) {
  const matches = useMemo(() => {
    if (!identifier) return []
    const key = identifier.toLowerCase().trim()
    return allBookings.filter((b) => {
      const e = (b.clientEmail || '').toLowerCase()
      const p = (b.clientPhone || '').replace(/\D/g, '')
      const target = key.replace(/\D/g, '')
      return (e && e === key) || (p && target && p === target)
    })
  }, [identifier, allBookings])

  const summary = useMemo(() => {
    const revenue = matches.reduce(
      (acc, b) => acc + (isRevenueStatus(b.status) ? (b.total || 0) : 0),
      0,
    )
    return {
      total: matches.length,
      revenue,
      lastDate: matches[0]?.date,
    }
  }, [matches])

  const client = matches[0]

  return (
    <>
      <div className="ch-backdrop" onClick={onClose} />
      <aside className="ch-panel" role="dialog" aria-modal="true">
        <header className="ch-panel__head">
          <div>
            <strong>{client?.clientName || 'Cliente'}</strong>
            <small>{identifier}</small>
          </div>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="ch-summary">
          <div>
            <span>Reservas</span>
            <strong>{summary.total}</strong>
          </div>
          <div>
            <span>Ingreso real</span>
            <strong>{formatCOP(summary.revenue)}</strong>
          </div>
          <div>
            <span>Última fecha</span>
            <strong>{summary.lastDate || '—'}</strong>
          </div>
        </div>

        <div className="ch-panel__body">
          {matches.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 13 }}>Sin reservas para este contacto.</p>
          ) : (
            matches.map((b) => (
              <div key={b.id} className="ch-row">
                <div className="ch-row__head">
                  <strong>{b.date} · {b.time}</strong>
                  <span className={`admin-badge admin-badge--${b.status}`}>{STATUS_LABELS[b.status] || b.status}</span>
                </div>
                <p className="ch-row__line">{b.serviceName} · {SEDE_BY_ID[b.sede]?.name || b.sede}</p>
                <p className="ch-row__line">{formatCOP(b.total)} · {b.paymentMethod || '—'}</p>
              </div>
            ))
          )}
        </div>
      </aside>
      <style>{`
        .ch-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 60; }
        .ch-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 100vw; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.15); z-index: 70; display: flex; flex-direction: column; }
        .ch-panel__head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #e5e7eb; }
        .ch-panel__head strong { display: block; font-size: 15px; }
        .ch-panel__head small { display: block; color: #6b7280; font-size: 12px; }
        .ch-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 14px 18px; border-bottom: 1px solid #e5e7eb; background: #f8f9fa; }
        .ch-summary > div { display: flex; flex-direction: column; gap: 2px; }
        .ch-summary span { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; }
        .ch-summary strong { font-size: 14px; color: #0a1628; }
        .ch-panel__body { padding: 14px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .ch-row { padding: 12px 14px; background: #f8f9fa; border-radius: 8px; }
        .ch-row__head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; }
        .ch-row__line { font-size: 13px; color: #6b7280; }
      `}</style>
    </>
  )
}

export default ClientHistoryPanel
