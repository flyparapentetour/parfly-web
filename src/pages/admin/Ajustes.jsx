import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useDoc } from '../../hooks/useDoc'
import { seedDemoData } from '../../services/seed'
import { ALL_SLOT_TIMES, DEFAULT_CUPOS, SEDES, normalizeSlots } from '../../constants/sedes'
import { LEGAL_DEFAULTS } from '../../constants/legalDefaults'
import { DEFAULT_FAQ, DEFAULT_STATS } from '../../constants/siteContent'
import {
  DEFAULT_BASE_SLOTS,
  buildDefaultSchedule,
  sedeBase,
  todayISO,
} from '../../services/schedule'

const TABS = [
  { id: 'contacto', label: 'Contacto' },
  { id: 'bold', label: 'Pasarela Bold' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'contenido', label: 'Contenido del sitio' },
  { id: 'legal', label: 'Textos legales' },
]

function ContactoTab() {
  const { data: settings } = useDoc('settings/general')
  const [draft, setDraft] = useState({ whatsapp: '', instagram: '', tiktok: '', facebook: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setDraft({
        whatsapp: settings.whatsapp || '',
        instagram: settings.instagram || '',
        tiktok: settings.tiktok || '',
        facebook: settings.facebook || '',
      })
    }
  }, [settings])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'general'), draft, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-field">
        <label>WhatsApp (visible en la web y botón flotante)</label>
        <input className="admin-input" value={draft.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} placeholder="+57 300 000 0000" />
      </div>
      <div className="admin-grid admin-grid--3">
        <div className="admin-field">
          <label>Instagram (URL)</label>
          <input className="admin-input" value={draft.instagram} onChange={(e) => setDraft({ ...draft, instagram: e.target.value })} placeholder="https://instagram.com/…" />
        </div>
        <div className="admin-field">
          <label>TikTok (URL)</label>
          <input className="admin-input" value={draft.tiktok} onChange={(e) => setDraft({ ...draft, tiktok: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Facebook (URL)</label>
          <input className="admin-input" value={draft.facebook} onChange={(e) => setDraft({ ...draft, facebook: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
    </form>
  )
}

function BoldTab() {
  const { data: bold } = useDoc('settings/bold')
  const [draft, setDraft] = useState({ publicKey: '', secretKey: '', active: false })
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (bold) {
      setDraft({
        publicKey: bold.publicKey || '',
        secretKey: bold.secretKey || '',
        active: !!bold.active,
      })
    }
  }, [bold])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'bold'), draft, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const isActive = draft.active && draft.publicKey

  return (
    <form onSubmit={save}>
      <div className="bold-status" style={{ borderColor: isActive ? '#10b981' : '#ef4444' }}>
        <span className="bold-status__dot" style={{ background: isActive ? '#10b981' : '#ef4444' }} />
        <strong>{isActive ? 'ACTIVA' : 'INACTIVA'}</strong>
        <small>{isActive ? 'Los clientes verán "Pagar online".' : 'Solo verán "Pagar por WhatsApp".'}</small>
      </div>

      <label className="admin-switch" style={{ margin: '16px 0' }}>
        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
        <span className="admin-switch__track" />
        <span>Activar pasarela</span>
      </label>

      <div className="admin-field">
        <label>Llave pública</label>
        <input className="admin-input" value={draft.publicKey} onChange={(e) => setDraft({ ...draft, publicKey: e.target.value })} placeholder="pk_test_…" />
      </div>

      <div className="admin-field">
        <label>Llave secreta</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="admin-input"
            type={showSecret ? 'text' : 'password'}
            value={draft.secretKey}
            onChange={(e) => setDraft({ ...draft, secretKey: e.target.value })}
            placeholder="sk_test_…"
          />
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowSecret((v) => !v)}>
            {showSecret ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div className="bold-warn">
        🔒 La llave secreta nunca se expone al navegador de tus clientes. Se usa solo
        desde el backend (Cloud Function) para firmar la transacción.
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>Preview de pago</h3>
      <div className="bold-preview">
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Así verán los botones tus clientes:</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isActive && (
            <span className="btn btn--primary" style={{ pointerEvents: 'none' }}>Pagar online (Bold)</span>
          )}
          <span className="btn btn--outline" style={{ borderColor: '#25d366', color: '#25d366', pointerEvents: 'none' }}>
            Pagar por WhatsApp
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar configuración Bold'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>

      <style>{`
        .bold-status { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 2px solid; border-radius: 10px; background: #fff; }
        .bold-status strong { letter-spacing: 0.5px; }
        .bold-status small { color: #6b7280; }
        .bold-status__dot { width: 10px; height: 10px; border-radius: 50%; }
        .bold-warn { padding: 12px 14px; background: #eff6ff; color: #1e3a8a; border-radius: 8px; font-size: 13px; line-height: 1.5; }
        .bold-preview { padding: 16px; background: #f8f9fa; border-radius: 10px; border: 1px dashed #d1d5db; }
      `}</style>
    </form>
  )
}

function BaseScheduleEditor({ sedeId, schedule, onSaved }) {
  // Local edit state, derived from the schedule doc but NOT tied to its
  // realtime updates after the first load — otherwise toggles get clobbered
  // every time onSnapshot fires while the user is editing.
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
      const payload = { [sedeId]: { enabled, slots } }
      await setDoc(doc(db, 'settings', 'schedule'), payload, { merge: true })
      setSaved(true)
      setDirty(false)
      onSaved?.()
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="admin-switch" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); setDirty(true) }}
        />
        <span className="admin-switch__track" />
        <span>{enabled ? 'Sede activa' : 'Sede inactiva (no se mostrará en reservas)'}</span>
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
                type="number"
                min="0"
                max="10"
                className="slot-cupos"
                value={cupos}
                onChange={(e) => setCupos(t, e.target.value)}
                disabled={!on || !enabled}
                aria-label={`Cupos para ${t}`}
              />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button type="button" className="admin-btn" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Guardando…' : 'Guardar horario base'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
        {dirty && !saved && <span style={{ color: '#92400e', fontSize: 12 }}>Cambios sin guardar</span>}
      </div>
    </div>
  )
}

function BlockedCalendar({ sedeId }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [blocked, setBlocked] = useState(new Set())
  const [busy, setBusy] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const view = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, `blocked/${sedeId}/dates`))
        if (!alive) return
        const next = new Set()
        snap.forEach((d) => { if (d.data().blocked) next.add(d.id) })
        setBlocked(next)
      } catch (e) {
        console.error('blocked fetch', e)
      }
    })()
    return () => { alive = false }
  }, [sedeId, reloadKey])

  const firstDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const monthName = view.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const fmt = (d) => {
    const m = String(view.getMonth() + 1).padStart(2, '0')
    const day = String(d).padStart(2, '0')
    return `${view.getFullYear()}-${m}-${day}`
  }

  const toggle = async (iso) => {
    setBusy(iso)
    try {
      const ref = doc(db, 'blocked', sedeId, 'dates', iso)
      if (blocked.has(iso)) {
        await deleteDoc(ref)
        setBlocked((s) => { const n = new Set(s); n.delete(iso); return n })
      } else {
        await setDoc(ref, { blocked: true, reason: '' })
        setBlocked((s) => new Set(s).add(iso))
      }
    } finally {
      setBusy(null)
      setReloadKey((k) => k + 1)
    }
  }

  return (
    <div>
      <div className="block-cal__head">
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={() => setMonthOffset((m) => m - 1)}
        >
          ‹
        </button>
        <strong style={{ textTransform: 'capitalize' }}>{monthName}</strong>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={() => setMonthOffset((m) => m + 1)}
        >
          ›
        </button>
      </div>
      <div className="block-cal__dow">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
      </div>
      <div className="block-cal__grid">
        {Array.from({ length: firstDow }).map((_, i) => <span key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const d = idx + 1
          const iso = fmt(d)
          const dateObj = new Date(view.getFullYear(), view.getMonth(), d)
          const isPast = dateObj < today
          const isBlocked = blocked.has(iso)
          return (
            <button
              key={iso}
              type="button"
              className={`block-cal__day ${isBlocked ? 'block-cal__day--blocked' : ''} ${isPast ? 'block-cal__day--past' : ''}`}
              onClick={() => !isPast && toggle(iso)}
              disabled={isPast || busy === iso}
              title={isBlocked ? 'Bloqueada — click para desbloquear' : 'Disponible — click para bloquear'}
            >
              <span>{d}</span>
              {isBlocked && <span className="block-cal__lock" aria-hidden="true">🔒</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CustomDayEditor({ sedeId, baseSlotsForSede }) {
  const [date, setDate] = useState('')
  const [slotMap, setSlotMap] = useState({})
  const [hasOverride, setHasOverride] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!date) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'availability', sedeId, 'slots', date))
        if (!alive) return
        const source = snap.exists() ? normalizeSlots(snap.data().slots) : baseSlotsForSede
        const next = {}
        ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
        source.forEach((s) => { next[s.time] = s.cupos })
        setSlotMap(next)
        setHasOverride(snap.exists())
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [sedeId, date, baseSlotsForSede])

  const setCupos = (time, v) => {
    const n = Math.max(0, Math.min(10, Number(v) || 0))
    setSlotMap((m) => ({ ...m, [time]: n }))
  }
  const toggleSlot = (time) => {
    setSlotMap((m) => ({ ...m, [time]: m[time] > 0 ? 0 : DEFAULT_CUPOS }))
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const slots = ALL_SLOT_TIMES.filter((t) => slotMap[t] > 0).map((t) => ({ time: t, cupos: slotMap[t] }))
      await setDoc(doc(db, 'availability', sedeId, 'slots', date), { slots })
      setHasOverride(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const clearOverride = async () => {
    if (!confirm('¿Quitar la personalización y volver al horario base para este día?')) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'availability', sedeId, 'slots', date))
      setHasOverride(false)
      const next = {}
      ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
      baseSlotsForSede.forEach((s) => { next[s.time] = s.cupos })
      setSlotMap(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin-field" style={{ maxWidth: 240 }}>
        <label>Fecha a personalizar</label>
        <input
          className="admin-input"
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {date && !loading && (
        <>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
            {hasOverride
              ? 'Este día tiene una configuración personalizada.'
              : 'Mostrando el horario base. Edita y guarda para crear una personalización.'}
          </p>
          <div className="slot-grid">
            {ALL_SLOT_TIMES.map((t) => {
              const cupos = slotMap[t] || 0
              const on = cupos > 0
              return (
                <div key={t} className={`slot-row ${on ? 'slot-row--on' : ''}`}>
                  <button type="button" className="slot-pill" onClick={() => toggleSlot(t)}>{t}</button>
                  <input
                    type="number" min="0" max="10"
                    className="slot-cupos" value={cupos}
                    onChange={(e) => setCupos(t, e.target.value)}
                    disabled={!on}
                  />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar personalización'}
            </button>
            {hasOverride && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={clearOverride} disabled={saving}>
                Quitar personalización
              </button>
            )}
            {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
          </div>
        </>
      )}
    </div>
  )
}

function DisponibilidadTab() {
  const [sedeId, setSedeId] = useState(SEDES[0].id)
  const { data: schedule, loading } = useDoc('settings/schedule')
  const [showCustom, setShowCustom] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  // Auto-create the base schedule doc with defaults the first time it loads
  // and the document doesn't exist yet.
  useEffect(() => {
    if (loading || schedule || bootstrapping) return
    setBootstrapping(true)
    ;(async () => {
      try {
        await setDoc(doc(db, 'settings', 'schedule'), buildDefaultSchedule())
      } catch (e) {
        console.error('bootstrap schedule', e)
      } finally {
        setBootstrapping(false)
      }
    })()
  }, [loading, schedule, bootstrapping])

  const baseSlotsForSede = useMemo(
    () => sedeBase(schedule, sedeId).slots,
    [schedule, sedeId],
  )

  return (
    <div>
      <div className="admin-field" style={{ maxWidth: 320, marginBottom: 18 }}>
        <label>Sede</label>
        <select className="admin-select" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
          {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <section className="dispo-section">
        <h3 className="dispo-section__title">Horario base</h3>
        <p className="dispo-section__lead">
          Este horario aplica a todos los días futuros. Las fechas que no
          quieras operar, bloquéalas en la sección de abajo.
        </p>
        {schedule
          ? <BaseScheduleEditor sedeId={sedeId} schedule={schedule} />
          : <p style={{ color: '#6b7280', fontSize: 13 }}>Inicializando horario…</p>}
      </section>

      <section className="dispo-section">
        <h3 className="dispo-section__title">Bloquear fechas</h3>
        <p className="dispo-section__lead">
          Click sobre un día para bloquear o desbloquear. Los días bloqueados
          no aparecerán en el calendario público.
        </p>
        <BlockedCalendar sedeId={sedeId} />
      </section>

      <section className="dispo-section">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => setShowCustom((v) => !v)}
        >
          {showCustom ? '− Ocultar' : '+ Personalizar día específico'}
        </button>
        {showCustom && (
          <div style={{ marginTop: 14 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
              Solo úsalo si una fecha puntual tiene un horario distinto al base
              (ej.: solo abre por la mañana).
            </p>
            <CustomDayEditor sedeId={sedeId} baseSlotsForSede={baseSlotsForSede} />
          </div>
        )}
      </section>

      <style>{`
        .dispo-section { margin-bottom: 28px; padding-bottom: 22px; border-bottom: 1px solid #f3f4f6; }
        .dispo-section:last-child { border-bottom: none; }
        .dispo-section__title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .dispo-section__lead { color: #6b7280; font-size: 13px; margin-bottom: 14px; }
        .slot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 640px) { .slot-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px) { .slot-grid { grid-template-columns: repeat(5, 1fr); } }
        .slot-row { display: flex; gap: 6px; align-items: center; padding: 6px; border-radius: 10px; background: #f8f9fa; border: 1px solid #e5e7eb; }
        .slot-row--on { background: #fff; border-color: #ff6b2b; }
        .slot-pill { flex: 1; padding: 10px; border-radius: 8px; border: 2px solid transparent; background: #fff; font-weight: 600; cursor: pointer; }
        .slot-pill:disabled { opacity: 0.5; cursor: not-allowed; }
        .slot-row--on .slot-pill { background: #ff6b2b; color: #fff; }
        .slot-cupos { width: 56px; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center; font: inherit; }
        .slot-cupos:disabled { background: #f3f4f6; color: #9ca3af; }

        .block-cal__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .block-cal__dow { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 1px; margin-bottom: 4px; }
        .block-cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .block-cal__day { position: relative; aspect-ratio: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
        .block-cal__day:hover:not(:disabled) { border-color: #ff6b2b; }
        .block-cal__day--past { background: #f9fafb; color: #d1d5db; cursor: not-allowed; }
        .block-cal__day--blocked { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
        .block-cal__lock { position: absolute; bottom: 2px; right: 4px; font-size: 10px; }
      `}</style>
    </div>
  )
}

function ContenidoTab() {
  const { data: stats } = useDoc('settings/stats')
  const { data: faq } = useDoc('settings/faq')
  const [statsDraft, setStatsDraft] = useState(DEFAULT_STATS)
  const [faqDraft, setFaqDraft] = useState(DEFAULT_FAQ)
  const [savingStats, setSavingStats] = useState(false)
  const [savedStats, setSavedStats] = useState(false)
  const [savingFaq, setSavingFaq] = useState(false)
  const [savedFaq, setSavedFaq] = useState(false)

  useEffect(() => {
    if (stats) setStatsDraft({ ...DEFAULT_STATS, ...stats })
  }, [stats])
  useEffect(() => {
    if (faq && Array.isArray(faq.items)) setFaqDraft(faq.items)
  }, [faq])

  const saveStats = async (e) => {
    e.preventDefault()
    setSavingStats(true)
    setSavedStats(false)
    try {
      await setDoc(doc(db, 'settings', 'stats'), statsDraft, { merge: true })
      setSavedStats(true)
      setTimeout(() => setSavedStats(false), 2500)
    } finally {
      setSavingStats(false)
    }
  }

  const saveFaq = async () => {
    setSavingFaq(true)
    setSavedFaq(false)
    try {
      const items = faqDraft
        .map((it) => ({ q: (it.q || '').trim(), a: (it.a || '').trim() }))
        .filter((it) => it.q && it.a)
      await setDoc(doc(db, 'settings', 'faq'), { items }, { merge: false })
      setFaqDraft(items)
      setSavedFaq(true)
      setTimeout(() => setSavedFaq(false), 2500)
    } finally {
      setSavingFaq(false)
    }
  }

  const updateFaq = (idx, key, value) => {
    setFaqDraft((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)))
  }
  const addFaq = () => setFaqDraft((prev) => [...prev, { q: '', a: '' }])
  const removeFaq = (idx) => setFaqDraft((prev) => prev.filter((_, i) => i !== idx))
  const moveFaq = (idx, dir) => {
    setFaqDraft((prev) => {
      const next = [...prev]
      const j = idx + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  return (
    <div>
      <section style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Stats del hero</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
          Aparecen en la franja bajo el hero del sitio público.
        </p>
        <form onSubmit={saveStats}>
          <div className="admin-grid admin-grid--2">
            <div className="admin-field">
              <label>Vuelos realizados (valor)</label>
              <input className="admin-input" value={statsDraft.flights} onChange={(e) => setStatsDraft({ ...statsDraft, flights: e.target.value })} placeholder="+500" />
            </div>
            <div className="admin-field">
              <label>Vuelos realizados (etiqueta)</label>
              <input className="admin-input" value={statsDraft.flightsLabel} onChange={(e) => setStatsDraft({ ...statsDraft, flightsLabel: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Calificación Google (valor)</label>
              <input className="admin-input" value={statsDraft.rating} onChange={(e) => setStatsDraft({ ...statsDraft, rating: e.target.value })} placeholder="4.9" />
            </div>
            <div className="admin-field">
              <label>Calificación Google (etiqueta)</label>
              <input className="admin-input" value={statsDraft.ratingLabel} onChange={(e) => setStatsDraft({ ...statsDraft, ratingLabel: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Años de experiencia (valor)</label>
              <input className="admin-input" value={statsDraft.years} onChange={(e) => setStatsDraft({ ...statsDraft, years: e.target.value })} placeholder="8" />
            </div>
            <div className="admin-field">
              <label>Años de experiencia (etiqueta)</label>
              <input className="admin-input" value={statsDraft.yearsLabel} onChange={(e) => setStatsDraft({ ...statsDraft, yearsLabel: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>Sedes (valor)</label>
              <input className="admin-input" value={statsDraft.sedes} onChange={(e) => setStatsDraft({ ...statsDraft, sedes: e.target.value })} placeholder="4" />
            </div>
            <div className="admin-field">
              <label>Sedes (etiqueta)</label>
              <input className="admin-input" value={statsDraft.sedesLabel} onChange={(e) => setStatsDraft({ ...statsDraft, sedesLabel: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" className="admin-btn" disabled={savingStats}>
              {savingStats ? 'Guardando…' : 'Guardar stats'}
            </button>
            {savedStats && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
          </div>
        </form>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Preguntas frecuentes</h3>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              Aparecen en la sección FAQ del sitio público.
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={addFaq}>
            + Agregar pregunta
          </button>
        </div>

        {faqDraft.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: 13 }}>
            Sin preguntas. Pulsa "Agregar pregunta" para empezar.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqDraft.map((it, idx) => (
            <div key={idx} className="faq-edit">
              <div className="faq-edit__head">
                <span className="faq-edit__num">#{idx + 1}</span>
                <div className="faq-edit__actions">
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" disabled={idx === 0} onClick={() => moveFaq(idx, -1)}>↑</button>
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" disabled={idx === faqDraft.length - 1} onClick={() => moveFaq(idx, 1)}>↓</button>
                  <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => removeFaq(idx)}>Quitar</button>
                </div>
              </div>
              <div className="admin-field" style={{ marginBottom: 8 }}>
                <label>Pregunta</label>
                <input className="admin-input" value={it.q} onChange={(e) => updateFaq(idx, 'q', e.target.value)} />
              </div>
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Respuesta</label>
                <textarea className="admin-textarea" rows={3} value={it.a} onChange={(e) => updateFaq(idx, 'a', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <button type="button" className="admin-btn" onClick={saveFaq} disabled={savingFaq}>
            {savingFaq ? 'Guardando…' : 'Guardar FAQ'}
          </button>
          {savedFaq && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
        </div>
      </section>

      <style>{`
        .faq-edit { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
        .faq-edit__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .faq-edit__num { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; }
        .faq-edit__actions { display: flex; gap: 6px; }
      `}</style>
    </div>
  )
}

function LegalTab() {
  const { data: legal } = useDoc('settings/legal')
  const [draft, setDraft] = useState(LEGAL_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (legal) {
      setDraft({
        terms: legal.terms || LEGAL_DEFAULTS.terms,
        privacy: legal.privacy || LEGAL_DEFAULTS.privacy,
        cancellations: legal.cancellations || LEGAL_DEFAULTS.cancellations,
      })
    }
  }, [legal])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'legal'), draft, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-field">
        <label>Términos y condiciones</label>
        <textarea className="admin-textarea" rows={6} value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} />
      </div>
      <div className="admin-field">
        <label>Política de privacidad</label>
        <textarea className="admin-textarea" rows={5} value={draft.privacy} onChange={(e) => setDraft({ ...draft, privacy: e.target.value })} />
      </div>
      <div className="admin-field">
        <label>Política de cancelaciones</label>
        <textarea className="admin-textarea" rows={6} value={draft.cancellations} onChange={(e) => setDraft({ ...draft, cancellations: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar textos legales'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 12 }}>
        Estos textos se muestran en <code>/terminos</code>, <code>/privacidad</code> y <code>/cancelaciones</code>.
      </p>
    </form>
  )
}


function Ajustes() {
  const [tab, setTab] = useState('contacto')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState('')

  const handleSeed = async () => {
    if (!confirm('¿Crear datos demo? No reemplaza datos existentes.')) return
    setSeeding(true)
    try {
      const report = await seedDemoData()
      setSeedResult(report.join(' · '))
    } catch (e) {
      console.error(e)
      setSeedResult(`Error: ${e.message}`)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div>
      <div className="admin-page__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Ajustes</h1>
          <p>Contacto, pasarela y disponibilidad.</p>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'Sembrando…' : 'Sembrar datos demo'}
        </button>
      </div>
      {seedResult && <div className="admin-card" style={{ marginBottom: 16, background: '#ecfdf5', borderColor: '#a7f3d0' }}><small>{seedResult}</small></div>}

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'admin-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        {tab === 'contacto' && <ContactoTab />}
        {tab === 'bold' && <BoldTab />}
        {tab === 'disponibilidad' && <DisponibilidadTab />}
        {tab === 'contenido' && <ContenidoTab />}
        {tab === 'legal' && <LegalTab />}
      </div>

      <style>{`
        .admin-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; }
        .admin-tab { padding: 10px 16px; background: transparent; border: none; font-size: 14px; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; }
        .admin-tab--active { color: #ff6b2b; border-bottom-color: #ff6b2b; }
      `}</style>
    </div>
  )
}

export default Ajustes
