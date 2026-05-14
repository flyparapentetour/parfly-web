import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { isCloudinaryConfigured, uploadImage } from '../../services/cloudinary'

const EMPTY = { name: '', city: '', text: '', rating: 5, active: true, imageUrl: '', imageCloudinaryId: '' }

function Stars({ value, onChange }) {
  return (
    <div className="rating-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrellas`}
          aria-checked={value === n}
          className={n <= value ? 'rating-picker__star rating-picker__star--on' : 'rating-picker__star'}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function Testimonios() {
  const { data: items, loading } = useCollection('testimonials')
  const [draft, setDraft] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const startEdit = (t) => {
    setEditing(t.id)
    setDraft({
      name: t.name || '',
      city: t.city || '',
      text: t.text || '',
      rating: Number(t.rating) || 5,
      active: !!t.active,
      imageUrl: t.imageUrl || '',
      imageCloudinaryId: t.imageCloudinaryId || '',
    })
  }

  const cancel = () => { setEditing(null); setDraft(EMPTY); setUploadError('') }

  const onPickFile = async (file) => {
    if (!file) return
    if (!isCloudinaryConfigured()) {
      setUploadError('Configura VITE_CLOUDINARY_CLOUD_NAME en .env.local primero.')
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const { url, cloudinaryId } = await uploadImage(file)
      setDraft((d) => ({ ...d, imageUrl: url, imageCloudinaryId: cloudinaryId }))
    } catch (e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!draft.name.trim() || !draft.text.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        city: draft.city.trim(),
        text: draft.text.trim(),
        rating: Number(draft.rating) || 5,
        active: draft.active,
        imageUrl: draft.imageUrl || '',
        imageCloudinaryId: draft.imageCloudinaryId || '',
      }
      if (editing) {
        await updateDoc(doc(db, 'testimonials', editing), payload)
      } else {
        await addDoc(collection(db, 'testimonials'), { ...payload, createdAt: serverTimestamp() })
      }
      cancel()
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (t) => {
    await updateDoc(doc(db, 'testimonials', t.id), { active: !t.active })
  }

  const remove = async (t) => {
    if (!confirm(`¿Eliminar el testimonio de ${t.name}?`)) return
    await deleteDoc(doc(db, 'testimonials', t.id))
  }

  return (
    <div>
      <div className="admin-page__head">
        <h1>Testimonios</h1>
        <p>Reseñas de clientes. Solo se muestran en el sitio público los marcados como activos.</p>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>{editing ? 'Editar testimonio' : 'Crear testimonio'}</h2>
        <form onSubmit={save}>
          <div className="admin-grid admin-grid--2">
            <div className="admin-field">
              <label>Nombre</label>
              <input className="admin-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label>Ciudad</label>
              <input className="admin-input" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Bogotá" />
            </div>
          </div>
          <div className="admin-field">
            <label>Texto del testimonio</label>
            <textarea className="admin-textarea" rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} required />
          </div>
          <div className="admin-grid admin-grid--2" style={{ alignItems: 'end' }}>
            <div className="admin-field" style={{ marginBottom: 0 }}>
              <label>Rating</label>
              <Stars value={draft.rating} onChange={(n) => setDraft({ ...draft, rating: n })} />
            </div>
            <div className="admin-field" style={{ marginBottom: 0 }}>
              <label>Foto (opcional)</label>
              <div className="t-image">
                {draft.imageUrl ? (
                  <div className="t-image__preview" style={{ backgroundImage: `url(${draft.imageUrl})` }} />
                ) : (
                  <div className="t-image__placeholder">—</div>
                )}
                <label className="admin-btn admin-btn--ghost admin-btn--sm" style={{ cursor: 'pointer' }}>
                  {uploading ? 'Subiendo…' : draft.imageUrl ? 'Cambiar' : 'Subir foto'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPickFile(e.target.files?.[0])} />
                </label>
              </div>
              {uploadError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{uploadError}</p>}
            </div>
          </div>

          <label className="admin-switch" style={{ margin: '16px 0' }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span className="admin-switch__track" />
            <span>Activo (visible en el sitio)</span>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="admin-btn" disabled={saving || uploading}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear testimonio'}
            </button>
            {editing && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={cancel}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Lista de testimonios</h2>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aún no hay testimonios.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Rating</th>
                  <th>Texto</th>
                  <th>Activo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td style={{ width: 50 }}>
                      {t.imageUrl ? (
                        <div className="t-thumb" style={{ backgroundImage: `url(${t.imageUrl})` }} />
                      ) : (
                        <div className="t-thumb t-thumb--empty">{(t.name || '?').charAt(0)}</div>
                      )}
                    </td>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.city || '—'}</td>
                    <td>{'★'.repeat(Number(t.rating) || 0).padEnd(5, '☆')}</td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.text}
                      </span>
                    </td>
                    <td>
                      <label className="admin-switch">
                        <input type="checkbox" checked={!!t.active} onChange={() => toggle(t)} />
                        <span className="admin-switch__track" />
                      </label>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => startEdit(t)}>Editar</button>
                        <button type="button" className="admin-btn admin-btn--danger admin-btn--sm" onClick={() => remove(t)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .rating-picker { display: flex; gap: 4px; }
        .rating-picker__star { font-size: 26px; color: #d1d5db; cursor: pointer; padding: 0; line-height: 1; }
        .rating-picker__star--on { color: #ff6b2b; }
        .t-image { display: flex; gap: 10px; align-items: center; }
        .t-image__preview { width: 60px; height: 60px; border-radius: 50%; background-size: cover; background-position: center; }
        .t-image__placeholder { width: 60px; height: 60px; border-radius: 50%; background: #f3f4f6; display: grid; place-items: center; color: #9ca3af; }
        .t-thumb { width: 40px; height: 40px; border-radius: 50%; background-size: cover; background-position: center; }
        .t-thumb--empty { background: #ff6b2b; color: #fff; display: grid; place-items: center; font-weight: 700; text-transform: uppercase; }
      `}</style>
    </div>
  )
}

export default Testimonios
