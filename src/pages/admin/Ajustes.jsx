import { useEffect, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useDoc } from '../../hooks/useDoc'
import { useCollection } from '../../hooks/useCollection'
import { seedDemoData } from '../../services/seed'
import { ALL_SLOT_TIMES, DEFAULT_CUPOS, DEFAULT_SLOTS, SEDES, normalizeSlots } from '../../constants/sedes'
import { LEGAL_DEFAULTS } from '../../constants/legalDefaults'

const TABS = [
  { id: 'contacto', label: 'Contacto' },
  { id: 'bold', label: 'Pasarela Bold' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
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

function DisponibilidadTab() {
  const [sedeId, setSedeId] = useState(SEDES[0].id)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { data: docs } = useCollection(`availability/${sedeId}/slots`)
  const current = docs.find((d) => d.id === date)
  // Map time -> cupos (0 means slot off)
  const [slotMap, setSlotMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const normalized = normalizeSlots(current?.slots ?? DEFAULT_SLOTS)
    const next = {}
    ALL_SLOT_TIMES.forEach((t) => { next[t] = 0 })
    normalized.forEach((s) => { next[s.time] = s.cupos })
    setSlotMap(next)
  }, [sedeId, date, current?.slots])

  const setCupos = (time, value) => {
    const n = Math.max(0, Math.min(10, Number(value) || 0))
    setSlotMap((m) => ({ ...m, [time]: n }))
  }

  const toggle = (time) => {
    setSlotMap((m) => ({ ...m, [time]: m[time] > 0 ? 0 : DEFAULT_CUPOS }))
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const slots = ALL_SLOT_TIMES
        .filter((t) => slotMap[t] > 0)
        .map((t) => ({ time: t, cupos: slotMap[t] }))
      await setDoc(doc(db, 'availability', sedeId, 'slots', date), { slots }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin-grid admin-grid--2">
        <div className="admin-field">
          <label>Sede</label>
          <select className="admin-select" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
            {SEDES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="admin-field">
          <label>Fecha</label>
          <input className="admin-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Horarios y cupos</h3>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Toggle de cada horario y cuántos cupos hay por hora (1-10). 0 = horario apagado.
      </p>
      <div className="slot-grid">
        {ALL_SLOT_TIMES.map((t) => {
          const cupos = slotMap[t] || 0
          const on = cupos > 0
          return (
            <div key={t} className={`slot-row ${on ? 'slot-row--on' : ''}`}>
              <button type="button" className="slot-pill" onClick={() => toggle(t)}>
                {t}
              </button>
              <input
                type="number"
                min="0"
                max="10"
                className="slot-cupos"
                value={cupos}
                onChange={(e) => setCupos(t, e.target.value)}
                disabled={!on}
                aria-label={`Cupos para ${t}`}
              />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button type="button" className="admin-btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar disponibilidad'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>

      <style>{`
        .slot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 640px) { .slot-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px) { .slot-grid { grid-template-columns: repeat(5, 1fr); } }
        .slot-row { display: flex; gap: 6px; align-items: center; padding: 6px; border-radius: 10px; background: #f8f9fa; border: 1px solid #e5e7eb; }
        .slot-row--on { background: #fff; border-color: #ff6b2b; }
        .slot-pill { flex: 1; padding: 10px; border-radius: 8px; border: 2px solid transparent; background: #fff; font-weight: 600; cursor: pointer; }
        .slot-row--on .slot-pill { background: #ff6b2b; color: #fff; }
        .slot-cupos { width: 56px; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center; font: inherit; }
        .slot-cupos:disabled { background: #f3f4f6; color: #9ca3af; }
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
