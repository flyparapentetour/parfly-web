import { useMemo } from 'react'
import { orderBy } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection'
import { isRevenueStatus, STATUS_LABELS, updateBookingStatus } from '../../services/bookings'
import { formatCOP, SEDES, SEDE_BY_ID } from '../../constants/sedes'
import './Dashboard.css'

/* ----------------------------- helpers ----------------------------- */
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

function userInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'PF'
}

/* ----------------------------- icons ------------------------------- */
const I = {
  cal: (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 12c4-8 14-8 18 0M6 12c2-4 10-4 12 0M9 12c.8-1.5 5.2-1.5 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 18l6-6 4 4 8-8M14 8h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

/* ----------------------------- chart ------------------------------- */
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
  const lastIdx = data.length - 1

  return (
    <div className="admin-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Ingresos · últimas 8 semanas</h2>
          <small>Suma de reservas confirmadas por semana</small>
        </div>
        <strong className="chart-total">{formatCOP(total8w)}</strong>
      </div>
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="none"
        className="chart-svg"
        role="img"
        aria-label="Ingresos por semana"
      >
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A4D" />
            <stop offset="100%" stopColor="#FF6B2B" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="40" x2="790" y1={20 + g * 160} y2={20 + g * 160} stroke="#eef1f7" strokeWidth="1" />
        ))}
        {data.map((w, i) => {
          const barW = 60
          const gap = (800 - 40 - data.length * barW) / (data.length + 1)
          const x = 40 + gap + i * (barW + gap)
          const h = (w.total / max) * 160
          const y = 180 - h
          const fill = i === lastIdx ? '#0A1628' : 'url(#bar-grad)'
          return (
            <g key={i}>
              <title>{`${shortWeek(w.start)} → ${formatCOP(w.total)}`}</title>
              <rect x={x} y={y} width={barW} height={h} fill={fill} rx="6" />
              <text
                x={x + barW / 2}
                y={205}
                fontSize="11"
                fill={i === lastIdx ? '#0A1628' : '#9ca3af'}
                fontWeight={i === lastIdx ? 700 : 400}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
              >
                {shortWeek(w.start)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* --------------------------- KPI card -------------------------------*/
function Kpi({ label, value, delta, deltaTone = 'ok', icon, iconTone = '', accent = false, spark }) {
  return (
    <div className={`admin-card kpi ${accent ? 'kpi--accent' : ''}`}>
      <div className="kpi__head">
        <span className="kpi__label">{label}</span>
        <div className={`kpi__icon ${iconTone ? `kpi__icon--${iconTone}` : ''}`}>{icon}</div>
      </div>
      <div className="kpi__value">{value}</div>
      {delta && <span className={`kpi__delta kpi__delta--${deltaTone}`}>{delta}</span>}
      {spark && (
        <svg className="kpi__spark" viewBox="0 0 200 32" preserveAspectRatio="none">
          <path d={spark} stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
  )
}

/* --------------------------- Dashboard ------------------------------*/
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
        <div>
          <h1>Dashboard</h1>
          <p>Resumen de actividad, ingresos y reservas recientes.</p>
        </div>
      </div>

      <div className="dash-kpis">
        <Kpi
          label="Reservas próximas"
          value={stats.todayCount}
          delta="↑ esta semana"
          icon={I.cal}
        />
        <Kpi
          label="Ingresos del mes"
          value={formatCOP(stats.monthIncome)}
          delta="↑ vs mes anterior"
          accent
          icon={I.money}
        />
        <Kpi
          label="Pendientes"
          value={stats.pending}
          delta={stats.pending > 0 ? `${stats.pending} por revisar` : 'al día'}
          deltaTone={stats.pending > 0 ? 'warn' : 'ok'}
          iconTone="warn"
          icon={I.clock}
        />
        <Kpi
          label="Confirmadas"
          value={stats.confirmed}
          delta="vuelos asegurados"
          iconTone="ok"
          icon={I.check}
        />
      </div>

      <RevenueChart bookings={bookings} />

      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div>
            <h2>Resumen por sede · este mes</h2>
            <small style={{ color: 'var(--ink-400)' }}>Reservas e ingresos del mes actual</small>
          </div>
        </div>
        <div className="sede-summary">
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
                  <strong className="accent">{formatCOP(s.revenue)}</strong>
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
          <p style={{ color: 'var(--ink-400)' }}>Cargando…</p>
        ) : latest.length === 0 ? (
          <p style={{ color: 'var(--ink-400)' }}>Aún no hay reservas.</p>
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
                {latest.map((b, idx) => (
                  <tr key={b.id}>
                    <td>
                      <div className="admin-table__client">
                        <div className={`admin-table__avatar ${idx % 2 ? 'admin-table__avatar--alt' : ''}`}>
                          {userInitials(b.clientName)}
                        </div>
                        <div>
                          <strong>{b.clientName}</strong>
                          <br />
                          <small style={{ color: 'var(--ink-400)' }}>{b.serviceName}</small>
                        </div>
                      </div>
                    </td>
                    <td>{SEDE_BY_ID[b.sede]?.name || b.sede}</td>
                    <td>
                      {b.date}
                      <br />
                      <small style={{ color: 'var(--ink-400)' }}>{b.time}</small>
                    </td>
                    <td><strong>{formatCOP(b.total)}</strong></td>
                    <td>
                      <span className={`admin-badge admin-badge--${b.status}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td>
                      {b.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn--sm"
                            onClick={() => updateBookingStatus(b.id, 'confirmed').catch((e) => console.error(e))}
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
    </div>
  )
}

export default Dashboard
