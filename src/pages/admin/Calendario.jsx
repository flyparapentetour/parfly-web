import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, orderBy, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { updateBookingStatus } from '../../services/bookings'
import { formatCOP, SEDES, SEDE_BY_ID } from '../../constants/sedes'

const monthKey = (year, monthIdx) => `${year}-${String(monthIdx + 1).padStart(2, '0')}`

function Calendario() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [sedeFilter, setSedeFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(null)
  const [blocking, setBlocking] = useState(false)
  const [blocked, setBlocked] = useState({}) // { 'sede|date': { reason } }
  const { data: bookings } = useCollection('bookings', [orderBy('date', 'asc')])

  // Load blocked dates for all sedes (small set per month). Re-fetch on view/sede change.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const sedesToLoad = sedeFilter === 'all' ? SEDES.map((s) => s.id) : [sedeFilter]
      const next = {}
      await Promise.all(
        sedesToLoad.map(async (sedeId) => {
          try {
            const snap = await getDocs(collection(db, `blocked/${sedeId}/dates`))
            snap.forEach((d) => {
              const data = d.data()
              if (data.blocked) {
                next[`${sedeId}|${d.id}`] = { reason: data.reason || '' }
              }
            })
          } catch (e) {
            console.error('blocked fetch', sedeId, e)
          }
        }),
      )
      if (alive) setBlocked(next)
    })()
    return () => {
      alive = false
    }
  }, [sedeFilter, view.y, view.m])

  const monthName = useMemo(
    () => new Date(view.y, view.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    [view],
  )

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7

  const fmt = (d) => `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const dailyMap = useMemo(() => {
    // { 'YYYY-MM-DD': { confirmed, pending, cancelled, items: [] } }
    const map = {}
    const monthPrefix = monthKey(view.y, view.m)
    bookings.forEach((b) => {
      if (!b.date || !b.date.startsWith(monthPrefix)) return
      if (sedeFilter !== 'all' && b.sede !== sedeFilter) return
      const slot = map[b.date] || { confirmed: 0, pending: 0, cancelled: 0, items: [] }
      slot[b.status] = (slot[b.status] || 0) + 1
      slot.items.push(b)
      map[b.date] = slot
    })
    return map
  }, [bookings, view, sedeFilter])

  const dayStatus = (iso) => {
    const d = dailyMap[iso]
    if (!d) return null
    if (d.cancelled > 0 && d.confirmed === 0 && d.pending === 0) return 'red'
    if (d.pending > 0) return 'orange'
    if (d.confirmed > 0) return 'green'
    return null
  }

  const isDateBlocked = (iso) => {
    if (sedeFilter === 'all') {
      return SEDES.some((s) => blocked[`${s.id}|${iso}`])
    }
    return !!blocked[`${sedeFilter}|${iso}`]
  }

  const toggleBlock = async (iso) => {
    if (sedeFilter === 'all') {
      alert('Selecciona una sede específica para bloquear/desbloquear.')
      return
    }
    const key = `${sedeFilter}|${iso}`
    const isOn = !!blocked[key]
    setBlocking(true)
    try {
      const ref = doc(db, 'blocked', sedeFilter, 'dates', iso)
      if (isOn) {
        await deleteDoc(ref)
        setBlocked((b) => {
          const n = { ...b }
          delete n[key]
          return n
        })
      } else {
        const reason = prompt('Motivo del bloqueo (opcional):') || ''
        await setDoc(ref, { blocked: true, reason })
        setBlocked((b) => ({ ...b, [key]: { reason } }))
      }
    } finally {
      setBlocking(false)
    }
  }

  const dayItems = selectedDate
    ? (dailyMap[selectedDate]?.items || [])
    : []

  return (
    <div>
      <div className="admin-page__head" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Calendario</h1>
          <p>Vista mensual de reservas y bloqueo de fechas.</p>
        </div>
        <select
          className="admin-select"
          style={{ maxWidth: 240 }}
          value={sedeFilter}
          onChange={(e) => setSedeFilter(e.target.value)}
        >
          <option value="all">Todas las sedes</option>
          {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="admin-card">
        <div className="cal-head">
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={() => setView(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}
          >
            ‹
          </button>
          <h2 style={{ textTransform: 'capitalize' }}>{monthName}</h2>
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={() => setView(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
          >
            ›
          </button>
        </div>

        <div className="cal-dow">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (<span key={`${d}-${i}`}>{d}</span>))}
        </div>

        <div className="cal-grid">
          {Array.from({ length: firstDow }).map((_, i) => <span key={`pad-${i}`} className="cal-pad" />)}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const d = idx + 1
            const iso = fmt(d)
            const status = dayStatus(iso)
            const count = dailyMap[iso]?.items.length || 0
            const isBlocked = isDateBlocked(iso)
            const selected = selectedDate === iso
            return (
              <button
                key={iso}
                type="button"
                className={`cal-day ${selected ? 'cal-day--selected' : ''} ${isBlocked ? 'cal-day--blocked' : ''}`}
                onClick={() => setSelectedDate(iso)}
              >
                <span className="cal-day__num">{d}</span>
                {count > 0 && (
                  <span className="cal-day__count">{count}</span>
                )}
                {status && <span className={`cal-dot cal-dot--${status}`} />}
                {isBlocked && <span className="cal-day__lock" aria-hidden="true">🔒</span>}
              </button>
            )
          })}
        </div>

        <div className="cal-legend">
          <span><i className="cal-dot cal-dot--green" /> Confirmadas</span>
          <span><i className="cal-dot cal-dot--orange" /> Pendientes</span>
          <span><i className="cal-dot cal-dot--red" /> Canceladas</span>
          <span><i className="cal-lock-i">🔒</i> Bloqueada</span>
        </div>
      </div>

      {selectedDate && (
        <>
          <div className="cal-backdrop" onClick={() => setSelectedDate(null)} />
          <aside className="cal-panel">
            <div className="cal-panel__head">
              <div>
                <strong>{selectedDate}</strong>
                <small>{dayItems.length} reserva{dayItems.length === 1 ? '' : 's'}</small>
              </div>
              <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setSelectedDate(null)}>
                Cerrar
              </button>
            </div>

            <div className="cal-panel__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => toggleBlock(selectedDate)}
                disabled={blocking || sedeFilter === 'all'}
                title={sedeFilter === 'all' ? 'Filtra por una sede para bloquear' : ''}
              >
                {isDateBlocked(selectedDate) ? '🔓 Desbloquear fecha' : '🔒 Bloquear fecha'}
              </button>
            </div>

            <div className="cal-panel__body">
              {dayItems.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 13 }}>Sin reservas ese día.</p>
              ) : (
                dayItems.map((b) => (
                  <div key={b.id} className="cal-booking">
                    <div className="cal-booking__head">
                      <strong>{b.time} · {b.clientName}</strong>
                      <span className={`admin-badge admin-badge--${b.status}`}>{b.status}</span>
                    </div>
                    <p className="cal-booking__line">{b.serviceName}</p>
                    <p className="cal-booking__line">{SEDE_BY_ID[b.sede]?.name} · {formatCOP(b.total)}</p>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button type="button" className="admin-btn admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'confirmed')}>Confirmar</button>
                        <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'cancelled')}>Cancelar</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      <style>{`
        .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .cal-head h2 { font-size: 18px; font-weight: 700; }
        .cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; text-align: center; font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 1px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .cal-pad { aspect-ratio: 1; }
        .cal-day { aspect-ratio: 1; position: relative; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; padding: 6px; display: flex; flex-direction: column; align-items: stretch; gap: 4px; transition: all 0.15s ease; }
        .cal-day:hover { border-color: #ff6b2b; }
        .cal-day--selected { border-color: #ff6b2b; box-shadow: 0 0 0 3px rgba(255,107,43,0.15); }
        .cal-day--blocked { background: #f3f4f6; color: #9ca3af; }
        .cal-day__num { font-weight: 600; font-size: 13px; }
        .cal-day__count { position: absolute; top: 4px; right: 4px; background: #0a1628; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; }
        .cal-day__lock { position: absolute; bottom: 4px; right: 4px; font-size: 11px; }
        .cal-dot { width: 8px; height: 8px; border-radius: 50%; align-self: flex-start; margin-top: auto; display: inline-block; }
        .cal-dot--green { background: #10b981; }
        .cal-dot--orange { background: #f97316; }
        .cal-dot--red { background: #ef4444; }
        .cal-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 14px; font-size: 12px; color: #6b7280; }
        .cal-legend i { vertical-align: middle; margin-right: 4px; }

        .cal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 60; }
        .cal-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 360px; max-width: 100vw; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.15); z-index: 70; display: flex; flex-direction: column; }
        .cal-panel__head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #e5e7eb; }
        .cal-panel__head small { display: block; color: #6b7280; font-size: 12px; }
        .cal-panel__actions { padding: 12px 18px; border-bottom: 1px solid #e5e7eb; }
        .cal-panel__body { padding: 14px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .cal-booking { padding: 12px 14px; background: #f8f9fa; border-radius: 8px; }
        .cal-booking__head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; }
        .cal-booking__line { font-size: 13px; color: #6b7280; }
      `}</style>
    </div>
  )
}

export default Calendario
