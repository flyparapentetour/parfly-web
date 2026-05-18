import { useEffect, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useDoc } from '../../hooks/useDoc'
import { seedDemoData } from '../../services/seed'
import { SEDES } from '../../constants/sedes'
import { LEGAL_DEFAULTS } from '../../constants/legalDefaults'
import {
  DEFAULT_CLASSES,
  DEFAULT_FAQ,
  DEFAULT_HOME_INTROS,
  DEFAULT_INCLUDED,
  DEFAULT_SEDES,
  DEFAULT_STATS,
} from '../../constants/siteContent'
import { useMutation } from '../../hooks/useMutation'
import { useToast } from '../../components/admin/Toast'
import { useConfirm } from '../../components/admin/ConfirmModal'
import { BOLD_WEBHOOK_URL } from '../../constants/bold'

const TABS = [
  { id: 'contacto', label: 'Contacto' },
  { id: 'bold', label: 'Pasarela Bold' },
  { id: 'contenido', label: 'Contenido del sitio' },
  { id: 'legal', label: 'Textos legales' },
]

function ContactoTab() {
  const { data: settings } = useDoc('settings/general')
  const toast = useToast()
  const { run, saving, saved, error } = useMutation()
  const [draft, setDraft] = useState({ whatsapp: '', email: '', instagram: '', tiktok: '', facebook: '' })

  useEffect(() => {
    if (settings) {
      setDraft({
        whatsapp: settings.whatsapp || '',
        email: settings.email || '',
        instagram: settings.instagram || '',
        tiktok: settings.tiktok || '',
        facebook: settings.facebook || '',
      })
    }
  }, [settings])

  const save = async (e) => {
    e.preventDefault()
    const res = await run(() =>
      setDoc(doc(db, 'settings', 'general'), draft, { merge: true }),
    )
    if (res.ok) toast.success('Contacto guardado')
    else toast.error(`No se pudo guardar: ${res.error?.message || 'error desconocido'}`)
  }

  return (
    <form onSubmit={save}>
      <div className="admin-grid admin-grid--2">
        <div className="admin-field">
          <label>WhatsApp (web y botón flotante)</label>
          <input className="admin-input" value={draft.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} placeholder="+57 300 000 0000" />
        </div>
        <div className="admin-field">
          <label>Email de contacto</label>
          <input className="admin-input" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="hola@flyparapente.tour" />
        </div>
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
        {error && <span style={{ color: '#b91c1c', fontSize: 13 }}>Error: {error}</span>}
      </div>
    </form>
  )
}

function BoldTab() {
  const { data: bold } = useDoc('settings/bold')
  const toast = useToast()
  const [draft, setDraft] = useState({ publicKey: '', secretKey: '', active: false })
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (bold) {
      setDraft({
        publicKey: bold.publicKey || '',
        secretKey: bold.secretKey || '',
        active: !!bold.active,
      })
    }
  }, [bold])

  const isActive = draft.active && draft.publicKey

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'bold'), draft, { merge: true })
      // Reflejamos el estado activo en un flag PÚBLICO (settings/general
      // es de lectura abierta) para que el frontend del visitante no
      // autenticado pueda saber si la pasarela está activa sin necesidad
      // de leer settings/bold (que sigue admin-only por contener la
      // secretKey).
      await setDoc(
        doc(db, 'settings', 'general'),
        { boldActive: !!isActive },
        { merge: true },
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(BOLD_WEBHOOK_URL)
      setCopied(true)
      toast.success('URL del webhook copiada')
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      toast.error('No se pudo copiar — selecciona y copia manualmente')
    }
  }

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

      <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
        Conecta el webhook con tu cuenta Bold
      </h3>
      <div className="bold-webhook">
        <p className="bold-webhook__context">
          Esto permite que Bold confirme automáticamente las reservas
          pagadas en el sitio.
        </p>
        <div className="bold-webhook__url">
          <code>{BOLD_WEBHOOK_URL}</code>
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--sm"
            onClick={copyWebhook}
          >
            {copied ? '✓ Copiada' : 'Copiar'}
          </button>
        </div>
        <ol className="bold-webhook__steps">
          <li>Copia la URL de arriba con el botón <strong>Copiar</strong>.</li>
          <li>Entra a tu panel de comercio Bold e inicia sesión.</li>
          <li>
            Ve al menú <strong>Integraciones</strong> y luego a la sección
            {' '}<strong>Webhooks</strong>. Pulsa el botón
            {' '}<strong>Configurar webhook</strong>.
          </li>
          <li>
            Pega la URL en el campo <strong>URL de punto de conexión</strong>
            {' '}y pulsa <strong>Crear webhook</strong>.
          </li>
        </ol>
        <p className="bold-webhook__note">Configuración de una sola vez.</p>
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
        .bold-webhook { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px 18px; }
        .bold-webhook__context { font-size: 13px; line-height: 1.55; color: #0c4a6e; margin-bottom: 12px; }
        .bold-webhook__url { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bold-webhook__url code { flex: 1; min-width: 0; padding: 8px 12px; background: #fff; border: 1px solid #e0f2fe; border-radius: 8px; font-family: 'Menlo', 'Consolas', monospace; font-size: 12px; color: #0a1628; word-break: break-all; user-select: all; }
        .bold-webhook__steps { margin: 14px 0 8px; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.55; color: #0c4a6e; }
        .bold-webhook__steps li { padding-left: 4px; }
        .bold-webhook__steps strong { color: #0a1628; }
        .bold-webhook__note { font-size: 11.5px; color: #64748b; margin-top: 6px; font-style: italic; }
        .bold-banner strong { display: block; margin-bottom: 6px; font-size: 14px; }
        .bold-banner p { font-size: 13px; line-height: 1.55; }
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


function HomeIntrosEditor() {
  const { data } = useDoc('settings/homeIntros')
  const [draft, setDraft] = useState(DEFAULT_HOME_INTROS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (data) setDraft({ ...DEFAULT_HOME_INTROS, ...data }) }, [data])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'homeIntros'), draft, { merge: true })
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } finally { setSaving(false) }
  }

  const fields = [
    { key: 'servicesEyebrow', label: 'Servicios · eyebrow' },
    { key: 'servicesTitle', label: 'Servicios · título' },
    { key: 'servicesLead', label: 'Servicios · texto introductorio', textarea: true },
    { key: 'additionalsEyebrow', label: 'Adicionales (teaser) · eyebrow' },
    { key: 'additionalsTitle', label: 'Adicionales (teaser) · título' },
    { key: 'additionalsLead', label: 'Adicionales (teaser) · texto', textarea: true },
    { key: 'additionalsCta', label: 'Adicionales (teaser) · botón' },
    { key: 'classesEyebrow', label: 'Clases (teaser) · eyebrow' },
    { key: 'classesTitle', label: 'Clases (teaser) · título' },
    { key: 'classesLead', label: 'Clases (teaser) · texto', textarea: true },
    { key: 'classesCta', label: 'Clases (teaser) · botón' },
    { key: 'locationsEyebrow', label: 'Sedes · eyebrow' },
    { key: 'locationsTitle', label: 'Sedes · título' },
    { key: 'locationsLead', label: 'Sedes · texto introductorio', textarea: true },
  ]

  return (
    <form onSubmit={save}>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Edita los títulos y textos cortos que aparecen en cada sección del
        Home. La estructura del layout no cambia.
      </p>
      <div className="admin-grid admin-grid--2">
        {fields.map((f) => (
          <div key={f.key} className="admin-field" style={{ marginBottom: 0 }}>
            <label>{f.label}</label>
            {f.textarea ? (
              <textarea className="admin-textarea" rows={2} value={draft[f.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
            ) : (
              <input className="admin-input" value={draft[f.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar textos del home'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
    </form>
  )
}

function IncludedEditor() {
  const { data } = useDoc('settings/included')
  const [draft, setDraft] = useState(DEFAULT_INCLUDED)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (data) setDraft({
      ...DEFAULT_INCLUDED,
      ...data,
      items: Array.isArray(data.items) && data.items.length > 0 ? data.items : DEFAULT_INCLUDED.items,
    })
  }, [data])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const items = draft.items
        .map((it) => ({ icon: it.icon || 'check', title: (it.title || '').trim(), text: (it.text || '').trim() }))
        .filter((it) => it.title)
      await setDoc(doc(db, 'settings', 'included'), { ...draft, items }, { merge: false })
      setDraft((d) => ({ ...d, items }))
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } finally { setSaving(false) }
  }

  const updateItem = (idx, key, value) => {
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) }))
  }
  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, { icon: 'check', title: '', text: '' }] }))
  const removeItem = (idx) => setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }))

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Lista de puntos que incluye tu experiencia. El admin solo edita
        textos e íconos predefinidos.
      </p>
      <div className="admin-grid admin-grid--2">
        <div className="admin-field"><label>Eyebrow</label>
          <input className="admin-input" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} />
        </div>
        <div className="admin-field"><label>Título</label>
          <input className="admin-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
      </div>
      <div className="admin-field"><label>Texto introductorio</label>
        <textarea className="admin-textarea" rows={2} value={draft.lead} onChange={(e) => setDraft({ ...draft, lead: e.target.value })} />
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Puntos</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {draft.items.map((it, idx) => (
          <div key={idx} className="content-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#6b7280' }}>#{idx + 1}</span>
              <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => removeItem(idx)}>Quitar</button>
            </div>
            <div className="admin-grid admin-grid--3">
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Ícono</label>
                <select className="admin-select" value={it.icon || 'check'} onChange={(e) => updateItem(idx, 'icon', e.target.value)}>
                  <option value="shield">Escudo</option>
                  <option value="helmet">Casco</option>
                  <option value="check">Check</option>
                  <option value="umbrella">Paraguas</option>
                  <option value="cloud">Nube</option>
                  <option value="medal">Medalla</option>
                  <option value="camera">Cámara</option>
                  <option value="car">Auto</option>
                </select>
              </div>
              <div className="admin-field" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label>Título</label>
                <input className="admin-input" value={it.title || ''} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
              </div>
            </div>
            <div className="admin-field" style={{ marginTop: 10, marginBottom: 0 }}>
              <label>Descripción</label>
              <textarea className="admin-textarea" rows={2} value={it.text || ''} onChange={(e) => updateItem(idx, 'text', e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" style={{ marginTop: 10 }} onClick={addItem}>
        + Agregar punto
      </button>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button type="button" className="admin-btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar "Qué incluye"'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
    </div>
  )
}

function ClassesEditor() {
  const { data } = useDoc('settings/classes')
  const [draft, setDraft] = useState(DEFAULT_CLASSES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (data) setDraft({
      ...DEFAULT_CLASSES,
      ...data,
      levels: Array.isArray(data.levels) && data.levels.length > 0 ? data.levels : DEFAULT_CLASSES.levels,
    })
  }, [data])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const levels = draft.levels
        .map((l) => ({ n: (l.n || '').trim(), title: (l.title || '').trim(), desc: (l.desc || '').trim() }))
        .filter((l) => l.n && l.title)
      await setDoc(doc(db, 'settings', 'classes'), {
        ...draft,
        priceFrom: Number(draft.priceFrom) || 0,
        levels,
      }, { merge: false })
      setDraft((d) => ({ ...d, levels }))
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } finally { setSaving(false) }
  }

  const updateLevel = (idx, key, value) =>
    setDraft((d) => ({ ...d, levels: d.levels.map((l, i) => (i === idx ? { ...l, [key]: value } : l)) }))
  const addLevel = () => setDraft((d) => ({ ...d, levels: [...d.levels, { n: String(d.levels.length + 1).padStart(2, '0'), title: '', desc: '' }] }))
  const removeLevel = (idx) => setDraft((d) => ({ ...d, levels: d.levels.filter((_, i) => i !== idx) }))

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Edita los textos, precio y niveles del programa de clases. El botón
        principal de la página siempre abre WhatsApp.
      </p>
      <div className="admin-grid admin-grid--2">
        <div className="admin-field"><label>Eyebrow</label>
          <input className="admin-input" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} />
        </div>
        <div className="admin-field"><label>Título</label>
          <input className="admin-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
      </div>
      <div className="admin-field"><label>Texto introductorio</label>
        <textarea className="admin-textarea" rows={3} value={draft.lead} onChange={(e) => setDraft({ ...draft, lead: e.target.value })} />
      </div>

      <div className="admin-grid admin-grid--3">
        <div className="admin-field"><label>Precio "desde" (COP)</label>
          <input className="admin-input" type="number" min="0" value={draft.priceFrom} onChange={(e) => setDraft({ ...draft, priceFrom: e.target.value })} />
        </div>
        <div className="admin-field"><label>Duración (etiqueta)</label>
          <input className="admin-input" value={draft.durationLabel} onChange={(e) => setDraft({ ...draft, durationLabel: e.target.value })} />
        </div>
        <div className="admin-field"><label>Duración (valor)</label>
          <input className="admin-input" value={draft.durationValue} onChange={(e) => setDraft({ ...draft, durationValue: e.target.value })} />
        </div>
        <div className="admin-field"><label>Precio "desde" (etiqueta)</label>
          <input className="admin-input" value={draft.priceLabel} onChange={(e) => setDraft({ ...draft, priceLabel: e.target.value })} />
        </div>
        <div className="admin-field"><label>Formato (etiqueta)</label>
          <input className="admin-input" value={draft.groupLabel} onChange={(e) => setDraft({ ...draft, groupLabel: e.target.value })} />
        </div>
        <div className="admin-field"><label>Formato (valor)</label>
          <input className="admin-input" value={draft.groupValue} onChange={(e) => setDraft({ ...draft, groupValue: e.target.value })} />
        </div>
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Niveles</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {draft.levels.map((l, idx) => (
          <div key={idx} className="content-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#6b7280' }}>Nivel {idx + 1}</span>
              <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => removeLevel(idx)}>Quitar</button>
            </div>
            <div className="admin-grid admin-grid--3">
              <div className="admin-field" style={{ marginBottom: 0 }}>
                <label>Numeral</label>
                <input className="admin-input" value={l.n || ''} onChange={(e) => updateLevel(idx, 'n', e.target.value)} placeholder="01" />
              </div>
              <div className="admin-field" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label>Título</label>
                <input className="admin-input" value={l.title || ''} onChange={(e) => updateLevel(idx, 'title', e.target.value)} />
              </div>
            </div>
            <div className="admin-field" style={{ marginTop: 10, marginBottom: 0 }}>
              <label>Descripción</label>
              <textarea className="admin-textarea" rows={2} value={l.desc || ''} onChange={(e) => updateLevel(idx, 'desc', e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" style={{ marginTop: 10 }} onClick={addLevel}>
        + Agregar nivel
      </button>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8 }}>Botón WhatsApp</h4>
      <div className="admin-grid admin-grid--2">
        <div className="admin-field"><label>Texto del botón</label>
          <input className="admin-input" value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} />
        </div>
        <div className="admin-field"><label>Mensaje pre-armado</label>
          <input className="admin-input" value={draft.whatsappPrompt} onChange={(e) => setDraft({ ...draft, whatsappPrompt: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button type="button" className="admin-btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar clases'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
    </div>
  )
}

function SedesEditor() {
  const { data } = useDoc('settings/sedes')
  const [draft, setDraft] = useState(DEFAULT_SEDES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSede, setActiveSede] = useState(SEDES[0].id)

  useEffect(() => {
    if (data) {
      const merged = {}
      SEDES.forEach((s) => {
        merged[s.id] = { ...DEFAULT_SEDES[s.id], ...(data[s.id] || {}) }
        if (!Array.isArray(merged[s.id].highlights)) {
          merged[s.id].highlights = DEFAULT_SEDES[s.id].highlights
        }
      })
      setDraft(merged)
    }
  }, [data])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      await setDoc(doc(db, 'settings', 'sedes'), draft, { merge: false })
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } finally { setSaving(false) }
  }

  const cur = draft[activeSede] || {}
  const set = (key, value) => setDraft((d) => ({ ...d, [activeSede]: { ...d[activeSede], [key]: value } }))
  const setHighlight = (i, value) => set('highlights', cur.highlights.map((h, idx) => (idx === i ? value : h)))
  const addHighlight = () => set('highlights', [...(cur.highlights || []), ''])
  const removeHighlight = (i) => set('highlights', cur.highlights.filter((_, idx) => idx !== i))

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Edita el contenido de cada página de sede (<code>/sede/:ciudad</code>).
        El admin no puede agregar ni quitar sedes; el set está fijo.
      </p>
      <div className="admin-tabs admin-tabs--sub">
        {SEDES.map((s) => (
          <button
            type="button"
            key={s.id}
            className={`admin-tab ${activeSede === s.id ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveSede(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="admin-grid admin-grid--2">
        <div className="admin-field"><label>Nombre</label>
          <input className="admin-input" value={cur.name || ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="admin-field"><label>Región / etiqueta corta</label>
          <input className="admin-input" value={cur.region || ''} onChange={(e) => set('region', e.target.value)} />
        </div>
      </div>
      <div className="admin-field"><label>URL imagen de portada</label>
        <input className="admin-input" value={cur.image || ''} onChange={(e) => set('image', e.target.value)} placeholder="https://…" />
      </div>
      <div className="admin-field"><label>Intro corta (aparece en home y hero de la sede)</label>
        <textarea className="admin-textarea" rows={2} value={cur.shortIntro || ''} onChange={(e) => set('shortIntro', e.target.value)} />
      </div>
      <div className="admin-field"><label>Descripción larga (cómo es la experiencia aquí)</label>
        <textarea className="admin-textarea" rows={5} value={cur.description || ''} onChange={(e) => set('description', e.target.value)} />
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginTop: 8, marginBottom: 8 }}>Puntos destacados</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(cur.highlights || []).map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <input className="admin-input" value={h} onChange={(e) => setHighlight(i, e.target.value)} />
            <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => removeHighlight(i)}>Quitar</button>
          </div>
        ))}
      </div>
      <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" style={{ marginTop: 8 }} onClick={addHighlight}>
        + Agregar punto destacado
      </button>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18 }}>
        <button type="button" className="admin-btn" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar sedes'}
        </button>
        {saved && <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>✓ Guardado</span>}
      </div>
    </div>
  )
}

const CONTENT_SECTIONS = [
  { id: 'home', label: 'Home (textos)' },
  { id: 'included', label: '¿Qué incluye?' },
  { id: 'classes', label: 'Clases' },
  { id: 'sedes', label: 'Sedes' },
  { id: 'stats', label: 'Stats' },
  { id: 'faq', label: 'FAQ' },
]

function ContenidoTab() {
  const [section, setSection] = useState('home')
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

  const StatsSection = (
    <>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Stats del hero</h3>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>
        Aparecen en la franja bajo el hero del sitio público (4 indicadores).
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
    </>
  )

  const FaqSection = (
    <>
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
          <div key={idx} className="content-row">
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
    </>
  )

  return (
    <div>
      <div className="admin-tabs admin-tabs--sub" style={{ marginBottom: 18 }}>
        {CONTENT_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-tab ${section === s.id ? 'admin-tab--active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'home' && <HomeIntrosEditor />}
      {section === 'included' && <IncludedEditor />}
      {section === 'classes' && <ClassesEditor />}
      {section === 'sedes' && <SedesEditor />}
      {section === 'stats' && StatsSection}
      {section === 'faq' && FaqSection}

      <style>{`
        .content-row { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
        .faq-edit__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .faq-edit__num { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #6b7280; }
        .faq-edit__actions { display: flex; gap: 6px; }
        .admin-tabs--sub { gap: 2px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
        .admin-tabs--sub .admin-tab { padding: 8px 14px; font-size: 13px; }
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
  const confirmDlg = useConfirm()
  const toast = useToast()
  const [tab, setTab] = useState('contacto')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState('')

  const handleSeed = async () => {
    const ok = await confirmDlg({
      title: 'Sembrar datos demo',
      message: '¿Crear datos demo? No reemplaza datos existentes.',
      confirmLabel: 'Sembrar',
    })
    if (!ok) return
    setSeeding(true)
    try {
      const report = await seedDemoData()
      setSeedResult(report.join(' · '))
      toast.success('Datos demo sembrados')
    } catch (e) {
      console.error(e)
      setSeedResult(`Error: ${e.message}`)
      toast.error(`No se pudo sembrar: ${e.message}`)
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
