import { useMemo } from 'react'
import { orderBy } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection'
import { isRevenueStatus, STATUS_LABELS, updateBookingStatus } from '../../services/bookings'
import { formatCOP, SEDES, SEDE_BY_ID } from '../../constants/sedes'

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function bookingDate(b) {
  if (b.createdAt?.toDate) return b.createdAt.toDate()
  if (b.createdAt) return new Date(b.createdAt)
  return null
}

// Monday-anchored week start
function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}

function shortWeek(d) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function RevenueChart({ bookings }) {
  const data = useMemo(() => {
    const now = startOfWeek(new Date())
    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now)
      start.setDate(now.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      weeks.push({ start, end, total: 0 })
    }
    bookings.forEach((b) => {
      if (!isRevenueStatus(b.status)) return
      const d = bookingDate(b)
      if (!d) return
      const w = weeks.find((w) => d >= w.start && d < w.end)
      if (w) w.total += b.total || 0
    })
    return weeks
  }, [bookings])

  const max = Math.max(1, ...data.map((w) => w.total))
  const total8w = data.reduce((acc, w) => acc + w.total, 0)

  return (
    <div className="admin-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Ingresos · últimas 8 semanas</h2>
          <small>Suma de reservas confirmadas por semana</small>
        </div>
        <strong className="chart-total">{formatCOP(total8w)}</strong>
      </div>
      <svg viewBox="0 0 800 220" preserveAspectRatio="none" className="chart-svg" role="img" aria-label="Ingresos por semana">
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="40" x2="790" y1={20 + g * 160} y2={20 + g * 160} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {data.map((w, i) => {
          const barW = 60
          const gap = (800 - 40 - data.length * barW) / (data.length + 1)
          const x = 40 + gap + i * (barW + gap)
          const h = (w.total / max) * 160
          const y = 180 - h
          return (
            <g key={i}>
              <title>{`${shortWeek(w.start)} → ${formatCOP(w.total)}`}</title>
              <rect x={x} y={y} width={barW} height={h} fill="#ff6b2b" rx="6" />
              <text
                x={x + barW / 2}
                y={205}
                fontSize="11"
                fill="#6b7280"
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
              >
                {shortWeek(w.start)}
              </text>
            </g>
          )
        })}
      </svg>
      <style>{`
        .chart-card { margin-top: 20px; }
        .chart-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .chart-head h2 { font-size: 16px; font-weight: 700; }
        .chart-head small { color: #6b7280; font-size: 12px; }
        .chart-total { color: #ff6b2b; font-size: 24px; font-weight: 700; }
        .chart-svg { width: 100%; height: 220px; }
      `}</style>
    </div>
  )
}

function Dashboard() {
  const { data: bookings, loading } = useCollection('bookings', [orderBy('createdAt', 'desc')])

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    let todayCount = 0
    let monthIncome = 0
    let pending = 0
    let confirmed = 0
    bookings.forEach((b) => {
      const d = bookingDate(b)
      if (d && d >= today) todayCount++
      if (d && d >= firstOfMonth && isRevenueStatus(b.status)) {
        monthIncome += b.total || 0
      }
      if (b.status === 'pending') pending++
      if (b.status === 'confirmed') confirmed++
    })
    return { todayCount, monthIncome, pending, confirmed }
  }, [bookings])

  const sedeSummary = useMemo(() => {
    const today = startOfDay(new Date())
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const map = {}
    SEDES.forEach((s) => {
      map[s.id] = { id: s.id, name: s.name, region: s.region, count: 0, revenue: 0 }
    })
    bookings.forEach((b) => {
      const d = bookingDate(b)
      if (!d || d < firstOfMonth) return
      const row = map[b.sede]
      if (!row) return
      row.count++
      if (isRevenueStatus(b.status)) row.revenue += b.total || 0
    })
    return SEDES.map((s) => map[s.id])
  }, [bookings])

  const latest = bookings.slice(0, 10)

  return (
    <div>
      <div className="admin-page__head">
        <h1>Dashboard</h1>
        <p>Resumen de actividad, ingresos y reservas recientes.</p>
      </div>

      <div className="admin-grid admin-grid--4 dash-kpis">
        <div className="admin-card kpi">
          <span className="kpi__label">Reservas hoy / próximas</span>
          <strong className="kpi__value">{stats.todayCount}</strong>
        </div>
        <div className="admin-card kpi">
          <span className="kpi__label">Ingresos del mes</span>
          <strong className="kpi__value">{formatCOP(stats.monthIncome)}</strong>
        </div>
        <div className="admin-card kpi">
          <span className="kpi__label">Pendientes</span>
          <strong className="kpi__value kpi__value--warn">{stats.pending}</strong>
        </div>
        <div className="admin-card kpi">
          <span className="kpi__label">Confirmadas</span>
          <strong className="kpi__value kpi__value--ok">{stats.confirmed}</strong>
        </div>
      </div>

      <RevenueChart bookings={bookings} />

      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h2>Resumen por sede · este mes</h2>
          <small style={{ color: '#6b7280' }}>Reservas e ingresos del mes actual</small>
        </div>
        <div className="admin-grid admin-grid--4 sede-summary">
          {sedeSummary.map((s) => (
            <div key={s.id} className="sede-card">
              <div className="sede-card__name">{s.name}</div>
              <small className="sede-card__region">{s.region}</small>
              <div className="sede-card__metrics">
                <div>
                  <span>Reservas</span>
                  <strong>{s.count}</strong>
                </div>
                <div>
                  <span>Ingresos</span>
                  <strong>{formatCOP(s.revenue)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h2>Últimas reservas</h2>
          <Link to="/admin/reservas" className="admin-btn admin-btn--ghost admin-btn--sm">
            Ver todas
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : latest.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aún no hay reservas.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Sede</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {latest.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.clientName}</strong>
                      <br />
                      <small style={{ color: '#6b7280' }}>{b.serviceName}</small>
                    </td>
                    <td>{SEDE_BY_ID[b.sede]?.name || b.sede}</td>
                    <td>
                      {b.date}
                      <br />
                      <small style={{ color: '#6b7280' }}>{b.time}</small>
                    </td>
                    <td>{formatCOP(b.total)}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${b.status}`}>{STATUS_LABELS[b.status] || b.status}</span>
                    </td>
                    <td>
                      {b.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn--sm"
                            onClick={() => updateBookingStatus(b.id, 'confirmed')}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost admin-btn--sm"
                            onClick={() => updateBookingStatus(b.id, 'cancelled')}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .dash-kpis { margin-bottom: 4px; }
        .kpi { display: flex; flex-direction: column; gap: 6px; }
        .kpi__label { font-size: 12px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; color: #6b7280; }
        .kpi__value { font-size: 30px; font-weight: 700; color: #0a1628; }
        .kpi__value--warn { color: #d97706; }
        .kpi__value--ok { color: #047857; }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
        .card-head h2 { font-size: 16px; font-weight: 700; }
        .sede-summary { gap: 12px; }
        .sede-card { background: #f8f9fa; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
        .sede-card__name { font-size: 14px; font-weight: 700; color: #0a1628; }
        .sede-card__region { font-size: 11px; color: #6b7280; letter-spacing: 0.3px; text-transform: uppercase; }
        .sede-card__metrics { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; }
        .sede-card__metrics > div { display: flex; flex-direction: column; }
        .sede-card__metrics span { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; }
        .sede-card__metrics strong { font-size: 16px; color: #0a1628; }
      `}</style>
    </div>
  )
}

export default Dashboard
