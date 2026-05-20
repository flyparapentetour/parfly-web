import { useState } from 'react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { useMutation } from '../../hooks/useMutation'
import { useToast } from '../../components/admin/Toast'
import { formatCOP } from '../../constants/sedes'

// PAR-09a: billingMode + order. El default es 'per_person' (caso más común
// en los 7 adicionales del Pivot v2: tiempo adicional, conducción, comida).
// `order` controla la posición en el wizard (ASC). Validación requiere
// name, description, price y billingMode antes de habilitar Guardar.
const BILLING_MODES = [
  { value: 'per_person', label: 'Por persona', hint: 'Se multiplica por la cantidad de personas (ej: comida, tiempo adicional).' },
  { value: 'per_booking', label: 'Por reserva', hint: 'Precio fijo, no depende de la cantidad de personas (ej: foto-video, cartel).' },
]

const EMPTY = {
  name: '',
  description: '',
  price: '',
  billingMode: 'per_person',
  order: 0,
  active: true,
}

function Adicionales() {
  const { data: items, loading } = useCollection('additionals')
  const toast = useToast()
  const { run: runSave, saving } = useMutation()
  const [draft, setDraft] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const startEdit = (a) => {
    setEditing(a.id)
    setDraft({
      name: a.name,
      description: a.description || '',
      price: String(a.price ?? ''),
      billingMode: a.billingMode || 'per_person',
      order: Number.isFinite(a.order) ? a.order : 0,
      active: !!a.active,
    })
  }
  const cancel = () => { setEditing(null); setDraft(EMPTY) }

  const isValid =
    draft.name.trim() &&
    draft.description.trim() &&
    draft.price !== '' &&
    Number(draft.price) >= 0 &&
    (draft.billingMode === 'per_person' || draft.billingMode === 'per_booking')

  const save = async (e) => {
    e.preventDefault()
    if (!isValid) return
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Number(draft.price),
      billingMode: draft.billingMode,
      order: Number(draft.order) || 0,
      active: draft.active,
    }
    const res = await runSave(async () => {
      if (editing) await updateDoc(doc(db, 'additionals', editing), payload)
      else await addDoc(collection(db, 'additionals'), payload)
    })
    if (res.ok) {
      toast.success(editing ? 'Adicional actualizado' : 'Adicional creado')
      cancel()
    } else {
      toast.error(`No se pudo guardar: ${res.error?.message || 'error'}`)
    }
  }

  const toggle = async (a) => {
    try {
      await updateDoc(doc(db, 'additionals', a.id), { active: !a.active })
    } catch (e) {
      toast.error(`No se pudo cambiar el estado: ${e.message}`)
    }
  }

  return (
    <div>
      <div className="admin-page__head">
        <h1>Adicionales</h1>
        <p>Servicios complementarios para sumar a una reserva (fotos, video, transporte…).</p>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>{editing ? 'Editar adicional' : 'Crear adicional'}</h2>
        <form onSubmit={save}>
          <div className="admin-grid admin-grid--2">
            <div className="admin-field">
              <label>Nombre *</label>
              <input className="admin-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label>Precio (COP) *</label>
              <input className="admin-input" type="number" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required />
            </div>
          </div>
          <div className="admin-field">
            <label>Descripción *</label>
            <textarea className="admin-textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} required />
          </div>

          <div className="admin-field">
            <label>Forma de cobro *</label>
            <div className="addon-billing-radios">
              {BILLING_MODES.map((opt) => (
                <label key={opt.value} className={`addon-billing-radio ${draft.billingMode === opt.value ? 'addon-billing-radio--on' : ''}`}>
                  <input
                    type="radio"
                    name="billingMode"
                    value={opt.value}
                    checked={draft.billingMode === opt.value}
                    onChange={(e) => setDraft({ ...draft, billingMode: e.target.value })}
                  />
                  <span className="addon-billing-radio__title">{opt.label}</span>
                  <span className="addon-billing-radio__hint">{opt.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="admin-grid admin-grid--2" style={{ alignItems: 'end' }}>
            <div className="admin-field" style={{ marginBottom: 0 }}>
              <label>Orden (menor aparece antes)</label>
              <input
                className="admin-input"
                type="number"
                value={draft.order}
                onChange={(e) => setDraft({ ...draft, order: e.target.value })}
              />
            </div>
            <label className="admin-switch" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              <span className="admin-switch__track" />
              <span>Activo</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="submit" className="admin-btn" disabled={saving || !isValid}>
              {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear adicional'}
            </button>
            {editing && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={cancel}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Lista de adicionales</h2>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aún no hay adicionales.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Cobro</th>
                  <th>Orden</th>
                  <th>Activo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...items]
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.name}</strong>
                        <br />
                        <small style={{ color: '#6b7280' }}>{a.description}</small>
                      </td>
                      <td>{formatCOP(a.price)}</td>
                      <td>
                        <span className={`addon-billing-tag addon-billing-tag--${a.billingMode || 'unknown'}`}>
                          {a.billingMode === 'per_person'
                            ? 'Por persona'
                            : a.billingMode === 'per_booking'
                              ? 'Por reserva'
                              : '—'}
                        </span>
                      </td>
                      <td>{a.order ?? 0}</td>
                      <td>
                        <label className="admin-switch">
                          <input type="checkbox" checked={!!a.active} onChange={() => toggle(a)} />
                          <span className="admin-switch__track" />
                        </label>
                      </td>
                      <td>
                        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => startEdit(a)}>Editar</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .addon-billing-radios { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 720px) { .addon-billing-radios { grid-template-columns: 1fr 1fr; } }
        .addon-billing-radio { display: grid; grid-template-columns: 20px 1fr; grid-template-rows: auto auto; gap: 4px 10px; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; background: #fff; transition: border-color 0.15s, background 0.15s; }
        .addon-billing-radio input { grid-row: 1 / 3; grid-column: 1; margin-top: 4px; accent-color: #ff6b2b; }
        .addon-billing-radio__title { font-weight: 700; font-size: 14px; color: #0a1628; }
        .addon-billing-radio__hint { font-size: 12px; color: #6b7280; line-height: 1.4; }
        .addon-billing-radio--on { border-color: #ff6b2b; background: #fff7f1; }
        .addon-billing-tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .addon-billing-tag--per_person { background: #eef2ff; color: #4338ca; }
        .addon-billing-tag--per_booking { background: #f0fdf4; color: #15803d; }
        .addon-billing-tag--unknown { background: #f3f4f6; color: #6b7280; }
      `}</style>
    </div>
  )
}

export default Adicionales
