import { useState } from 'react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { useMutation } from '../../hooks/useMutation'
import { useToast } from '../../components/admin/Toast'
import { formatCOP } from '../../constants/sedes'

const EMPTY = { name: '', description: '', price: '', active: true }

function Adicionales() {
  const { data: items, loading } = useCollection('additionals')
  const toast = useToast()
  const { run: runSave, saving } = useMutation()
  const [draft, setDraft] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const startEdit = (a) => {
    setEditing(a.id)
    setDraft({ name: a.name, description: a.description || '', price: String(a.price ?? ''), active: !!a.active })
  }
  const cancel = () => { setEditing(null); setDraft(EMPTY) }

  const save = async (e) => {
    e.preventDefault()
    if (!draft.name || draft.price === '') return
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Number(draft.price),
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
            <label>Descripción</label>
            <textarea className="admin-textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <label className="admin-switch" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span className="admin-switch__track" />
            <span>Activo</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="admin-btn" disabled={saving}>
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
                  <th>Activo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <br />
                      <small style={{ color: '#6b7280' }}>{a.description}</small>
                    </td>
                    <td>{formatCOP(a.price)}</td>
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
    </div>
  )
}

export default Adicionales
