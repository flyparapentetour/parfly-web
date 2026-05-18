import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { useDoc } from '../../hooks/useDoc'
import { updateBookingStatus } from '../../services/bookings'
import {
  buildDefaultSchedule,
  sedeBase,
  todayISO,
} from '../../services/schedule'
import {
  ALL_SLOT_TIMES,
  DEFAULT_CUPOS,
  SEDES,
  SEDE_BY_ID,
  formatCOP,
  normalizeSlots,
} from '../../constants/sedes'

const monthKey = (year, monthIdx) => `${year}-${String(monthIdx + 1).padStart(2, '0')}`

function BaseScheduleEditor({ sedeId, schedule }) {
  const [enabled, setEnabled] = useState(true)
  const [slotMap, setSlotMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const base = sedeBase(schedule, sedeId)
    const next = {}
    ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
    base.slots.forEach((s) => { next[s.time] = s.cupos })
    setSlotMap(next)
    setEnabled(base.enabled)
    setDirty(false)
  }, [sedeId, schedule])

  const setCupos = (time, value) => {
    const n = Math.max(0, Math.min(10, Number(value) || 0))
    setSlotMap((m) => ({ ...m, [time]: n }))
    setDirty(true)
  }
  const toggleSlot = (time) => {
    setSlotMap((m) => ({ ...m, [time]: m[time] > 0 ? 0 : DEFAULT_CUPOS }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const slots = ALL_SLOT_TIMES
        .filter((t) => slotMap[t] > 0)
        .map((t) => ({ time: t, cupos: slotMap[t] }))
      await setDoc(doc(db, 'settings', 'schedule'), { [sedeId]: { enabled, slots } }, { merge: true })
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dispo-section">
      <h3 className="dispo-section__title">Horario base de la sede</h3>
      <p className="dispo-section__lead">
        Aplica a todos los días futuros. Activa las horas y define los cupos
        (1 a 10).
      </p>
      <label className="admin-switch" style={{ marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); setDirty(true) }}
        />
        <span className="admin-switch__track" />
        <span>{enabled ? 'Sede activa' : 'Sede pausada'}</span>
      </label>
      <div className="slot-grid">
        {ALL_SLOT_TIMES.map((t) => {
          const cupos = slotMap[t] || 0
          const on = cupos > 0
          return (
            <div key={t} className={`slot-row ${on ? 'slot-row--on' : ''}`}>
              <button type="button" className="slot-pill" onClick={() => toggleSlot(t)} disabled={!enabled}>
                {t}
              </button>
              <input
                type="number" min="0" max="10"
                className="slot-cupos" value={cupos}
                onChange={(e) => setCupos(t, e.target.value)}
                disabled={!on || !enabled}
                aria-label={`Cupos para ${t}`}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
        <button type="button" className="admin-btn admin-btn--sm" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Guardando…' : 'Guardar horario base'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 12, fontWeight: 600 }}>✓ Guardado</span>}
        {dirty && !saved && <span style={{ color: '#92400e', fontSize: 11 }}>Cambios sin guardar</span>}
      </div>
    </div>
  )
}

function DayPanel({ sedeId, date, baseSlots, items, onClose, onBlockToggle, blocked, onRefreshOverride }) {
  const [override, setOverride] = useState(null)
  const [slotMap, setSlotMap] = useState({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!sedeId || !date) return
    let alive = true
    ;(async () => {
      const snap = await getDoc(doc(db, 'availability', sedeId, 'slots', date))
      if (!alive) return
      const ov = snap.exists() ? normalizeSlots(snap.data().slots) : null
      setOverride(ov)
      const source = ov || baseSlots
      const next = {}
      ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
      source.forEach((s) => { next[s.time] = s.cupos })
      setSlotMap(next)
      setEditing(false)
    })()
    return () => { alive = false }
  }, [sedeId, date, baseSlots])

  const setCupos = (t, v) => {
    const n = Math.max(0, Math.min(10, Number(v) || 0))
    setSlotMap((m) => ({ ...m, [t]: n }))
  }
  const toggleSlot = (t) => {
    setSlotMap((m) => ({ ...m, [t]: m[t] > 0 ? 0 : DEFAULT_CUPOS }))
  }

  const saveOverride = async () => {
    setSaving(true)
    try {
      const slots = ALL_SLOT_TIMES.filter((t) => slotMap[t] > 0).map((t) => ({ time: t, cupos: slotMap[t] }))
      await setDoc(doc(db, 'availability', sedeId, 'slots', date), { slots })
      setOverride(slots)
      setEditing(false)
      onRefreshOverride?.()
    } finally {
      setSaving(false)
    }
  }

  const clearOverride = async () => {
    if (!confirm('¿Eliminar la personalización y volver al horario base?')) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'availability', sedeId, 'slots', date))
      setOverride(null)
      const next = {}
      ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
      baseSlots.forEach((s) => { next[s.time] = s.cupos })
      setSlotMap(next)
      onRefreshOverride?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="day-panel">
      <header className="day-panel__head">
        <div>
          <strong>{date}</strong>
          <small>
            {blocked ? 'Bloqueada' : override ? 'Personalizada' : 'Horario base'}
            {items.length > 0 && ` · ${items.length} reserva${items.length === 1 ? '' : 's'}`}
          </small>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={onClose}>Cerrar</button>
      </header>

      <div className="day-panel__actions">
        <button
          type="button"
          className={`admin-btn admin-btn--sm ${blocked ? '' : 'admin-btn--danger'}`}
          onClick={() => onBlockToggle(date)}
          disabled={saving}
        >
          {blocked ? '🔓 Desbloquear' : '🔒 Bloquear día'}
        </button>
        {!blocked && !editing && (
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setEditing(true)}>
            ✎ Personalizar slots
          </button>
        )}
        {!blocked && editing && (
          <>
            <button type="button" className="admin-btn admin-btn--sm" onClick={saveOverride} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </>
        )}
        {!blocked && override && !editing && (
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={clearOverride} disabled={saving}>
            Quitar personalización
          </button>
        )}
      </div>

      <div className="day-panel__body">
        {blocked ? (
          <p style={{ color: '#6b7280', fontSize: 13 }}>Este día está bloqueado. Los clientes no podrán reservarlo.</p>
        ) : (
          <>
            <h4 className="day-panel__h4">Slots {editing ? '(editando)' : 'del día'}</h4>
            <div className="day-panel__slots">
              {ALL_SLOT_TIMES.map((t) => {
                const cupos = slotMap[t] || 0
                const on = cupos > 0
                if (!editing) {
                  if (!on) return null
                  return (
                    <div key={t} className="day-slot">
                      <strong>{t}</strong>
                      <small>{cupos} cupo{cupos === 1 ? '' : 's'}</small>
                    </div>
                  )
                }
                return (
                  <div key={t} className={`slot-row ${on ? 'slot-row--on' : ''}`}>
                    <button type="button" className="slot-pill" onClick={() => toggleSlot(t)}>{t}</button>
                    <input
                      type="number" min="0" max="10" className="slot-cupos"
                      value={cupos} onChange={(e) => setCupos(t, e.target.value)} disabled={!on}
                    />
                  </div>
                )
              })}
              {!editing && !ALL_SLOT_TIMES.some((t) => slotMap[t] > 0) && (
                <p style={{ color: '#6b7280', fontSize: 13 }}>Sin horarios activos. Edita el horario base de la sede.</p>
              )}
            </div>
          </>
        )}

        {items.length > 0 && (
          <>
            <h4 className="day-panel__h4">Reservas del día</h4>
            <div className="day-panel__bookings">
              {items.map((b) => (
                <div key={b.id} className="day-booking">
                  <div className="day-booking__head">
                    <strong>{b.time} · {b.clientName}</strong>
                    <span className={`admin-badge admin-badge--${b.status}`}>{b.status}</span>
                  </div>
                  <p>{b.serviceName} · {formatCOP(b.total)}</p>
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button type="button" className="admin-btn admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'confirmed')}>Confirmar</button>
                      <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => updateBookingStatus(b.id, 'cancelled')}>Cancelar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function Calendario() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [sedeId, setSedeId] = useState(SEDES[0].id)
  const [selectedDate, setSelectedDate] = useState(null)
  const [blocked, setBlocked] = useState({}) // 'YYYY-MM-DD' -> { reason }
  const [overrides, setOverrides] = useState(new Set()) // dates with override doc
  const [reloadKey, setReloadKey] = useState(0)
  const [bootstrapping, setBootstrapping] = useState(false)
  const { data: schedule, loading: scheduleLoading } = useDoc('settings/schedule')
  const { data: bookings } = useCollection('bookings', [orderBy('date', 'asc')])

  // Bootstrap the schedule doc with sensible defaults the first time.
  useEffect(() => {
    if (scheduleLoading || schedule || bootstrapping) return
    setBootstrapping(true)
    ;(async () => {
      try {
        await setDoc(doc(db, 'settings', 'schedule'), buildDefaultSchedule())
      } finally {
        setBootstrapping(false)
      }
    })()
  }, [scheduleLoading, schedule, bootstrapping])

  // Reload blocked + overrides whenever sede changes or after edits.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [bSnap, oSnap] = await Promise.all([
        getDocs(collection(db, `blocked/${sedeId}/dates`)),
        getDocs(collection(db, `availability/${sedeId}/slots`)),
      ])
      if (!alive) return
      const b = {}
      bSnap.forEach((d) => { if (d.data().blocked) b[d.id] = { reason: d.data().reason || '' } })
      const o = new Set()
      oSnap.forEach((d) => {
        const slots = normalizeSlots(d.data().slots)
        if (slots.length >= 0) o.add(d.id)
      })
      setBlocked(b)
      setOverrides(o)
    })()
    return () => { alive = false }
  }, [sedeId, reloadKey])

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const monthName = new Date(view.y, view.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const fmt = (d) => `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const dailyMap = useMemo(() => {
    const map = {}
    const prefix = monthKey(view.y, view.m)
    bookings.forEach((b) => {
      if (!b.date || !b.date.startsWith(prefix)) return
      if (b.sede !== sedeId) return
      const slot = map[b.date] || { confirmed: 0, pending: 0, cancelled: 0, items: [] }
      slot[b.status] = (slot[b.status] || 0) + 1
      slot.items.push(b)
      map[b.date] = slot
    })
    return map
  }, [bookings, view, sedeId])

  const baseSlots = useMemo(
    () => sedeBase(schedule, sedeId).slots,
    [schedule, sedeId],
  )

  const toggleBlock = async (iso) => {
    const ref = doc(db, 'blocked', sedeId, 'dates', iso)
    if (blocked[iso]) {
      await deleteDoc(ref)
      setBlocked((b) => { const n = { ...b }; delete n[iso]; return n })
    } else {
      await setDoc(ref, { blocked: true, reason: '' })
      setBlocked((b) => ({ ...b, [iso]: { reason: '' } }))
    }
  }

  const refreshOverrides = () => setReloadKey((k) => k + 1)

  return (
    <div>
      <div className="admin-page__head" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Calendario · disponibilidad</h1>
          <p>Gestiona el horario base, bloquea fechas y revisa reservas por día.</p>
        </div>
        <select
          className="admin-select"
          style={{ maxWidth: 240 }}
          value={sedeId}
          onChange={(e) => { setSedeId(e.target.value); setSelectedDate(null) }}
        >
          {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="admin-grid dispo-grid">
        <div className="admin-card cal-card">
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
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
          </div>

          <div className="cal-grid">
            {Array.from({ length: firstDow }).map((_, i) => <span key={`pad-${i}`} className="cal-pad" />)}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d = idx + 1
              const iso = fmt(d)
              const day = dailyMap[iso]
              const isBlocked = !!blocked[iso]
              const hasOverride = overrides.has(iso)
              const dateObj = new Date(view.y, view.m, d)
              const isPast = dateObj < today
              const selected = selectedDate === iso
              const total = day?.items.length || 0
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'cal-day',
                    selected && 'cal-day--selected',
                    isBlocked && 'cal-day--blocked',
                    hasOverride && !isBlocked && 'cal-day--override',
                    isPast && 'cal-day--past',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDate(iso)}
                >
                  <span className="cal-day__num">{d}</span>
                  {total > 0 && <span className="cal-day__count">{total}</span>}
                  {day?.confirmed > 0 && <span className="cal-dot cal-dot--green" />}
                  {day?.pending > 0 && day?.confirmed === 0 && <span className="cal-dot cal-dot--orange" />}
                  {isBlocked && <span className="cal-day__icon" aria-hidden="true">🔒</span>}
                  {!isBlocked && hasOverride && <span className="cal-day__icon cal-day__icon--ov" aria-hidden="true">✎</span>}
                </button>
              )
            })}
          </div>

          <div className="cal-legend">
            <span><i className="cal-dot cal-dot--green" /> Confirmadas</span>
            <span><i className="cal-dot cal-dot--orange" /> Pendientes</span>
            <span><i className="cal-legend-box cal-legend-box--blocked" /> Bloqueada</span>
            <span><i className="cal-legend-box cal-legend-box--override" /> Personalizada</span>
          </div>
        </div>

        <div className="admin-card dispo-card">
          {schedule
            ? <BaseScheduleEditor sedeId={sedeId} schedule={schedule} />
            : <p style={{ color: '#6b7280', fontSize: 13 }}>Inicializando horario base…</p>}
        </div>
      </div>

      {selectedDate && (
        <>
          <div className="cal-backdrop" onClick={() => setSelectedDate(null)} />
          <DayPanel
            sedeId={sedeId}
            date={selectedDate}
            baseSlots={baseSlots}
            items={dailyMap[selectedDate]?.items || []}
            blocked={!!blocked[selectedDate]}
            onBlockToggle={toggleBlock}
            onClose={() => setSelectedDate(null)}
            onRefreshOverride={refreshOverrides}
          />
        </>
      )}

      <style>{`
        .dispo-grid { grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1100px) {
          .dispo-grid { grid-template-columns: minmax(0, 1fr) 320px; }
        }

        .cal-card { padding: 14px 16px 18px; }
        .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
        .cal-head h2 { font-size: 16px; font-weight: 700; }
        .cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 4px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cal-pad { aspect-ratio: 1; }
        .cal-day {
          position: relative; aspect-ratio: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
          cursor: pointer; padding: 4px; display: flex; flex-direction: column; align-items: stretch; transition: all 0.15s ease;
        }
        .cal-day:hover { border-color: #ff6b2b; }
        .cal-day--selected { border-color: #ff6b2b; box-shadow: 0 0 0 2px rgba(255,107,43,0.18); }
        .cal-day--past { background: #fafafa; color: #d1d5db; }
        .cal-day--blocked { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .cal-day--override { background: #fef3c7; border-color: #fcd34d; }
        .cal-day__num { font-weight: 700; font-size: 12px; }
        .cal-day__count { position: absolute; top: 2px; right: 3px; background: #0a1628; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 999px; }
        .cal-day__icon { position: absolute; bottom: 2px; right: 3px; font-size: 9px; }
        .cal-day__icon--ov { color: #92400e; }
        .cal-dot { width: 6px; height: 6px; border-radius: 50%; align-self: flex-start; margin-top: auto; display: inline-block; }
        .cal-dot--green { background: #10b981; }
        .cal-dot--orange { background: #f97316; }
        .cal-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; font-size: 11px; color: #6b7280; }
        .cal-legend i { vertical-align: middle; margin-right: 4px; }
        .cal-legend-box { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
        .cal-legend-box--blocked { background: #fee2e2; border: 1px solid #fca5a5; }
        .cal-legend-box--override { background: #fef3c7; border: 1px solid #fcd34d; }

        .dispo-card { padding: 16px; }
        .dispo-section__title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .dispo-section__lead { color: #6b7280; font-size: 12px; margin-bottom: 12px; }

        .slot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .slot-row { display: flex; gap: 4px; align-items: center; padding: 4px; border-radius: 8px; background: #f8f9fa; border: 1px solid #e5e7eb; }
        .slot-row--on { background: #fff; border-color: #ff6b2b; }
        .slot-pill { flex: 1; padding: 7px 6px; border-radius: 6px; border: 2px solid transparent; background: #fff; font-weight: 600; cursor: pointer; font-size: 12px; }
        .slot-pill:disabled { opacity: 0.5; cursor: not-allowed; }
        .slot-row--on .slot-pill { background: #ff6b2b; color: #fff; }
        .slot-cupos { width: 42px; padding: 6px; border-radius: 5px; border: 1px solid #e5e7eb; text-align: center; font: inherit; font-size: 12px; }
        .slot-cupos:disabled { background: #f3f4f6; color: #9ca3af; }

        .cal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 60; }
        .day-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 100vw; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.18); z-index: 70; display: flex; flex-direction: column; }
        .day-panel__head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e5e7eb; }
        .day-panel__head strong { display: block; font-size: 15px; }
        .day-panel__head small { display: block; color: #6b7280; font-size: 12px; }
        .day-panel__actions { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
        .day-panel__body { padding: 14px 16px; overflow-y: auto; flex: 1; }
        .day-panel__h4 { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; margin: 12px 0 8px; }
        .day-panel__h4:first-child { margin-top: 0; }
        .day-panel__slots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .day-slot { background: #f8f9fa; border-radius: 6px; padding: 8px 10px; }
        .day-slot strong { display: block; font-size: 14px; color: #0a1628; }
        .day-slot small { font-size: 11px; color: #6b7280; }
        .day-panel__bookings { display: flex; flex-direction: column; gap: 8px; }
        .day-booking { padding: 10px 12px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
        .day-booking__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .day-booking p { color: #6b7280; font-size: 12px; }
      `}</style>
    </div>
  )
}

export default Calendario
