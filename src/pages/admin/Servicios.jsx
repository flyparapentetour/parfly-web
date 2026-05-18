import { useState } from 'react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { useMutation } from '../../hooks/useMutation'
import { useToast } from '../../components/admin/Toast'
import { formatCOP } from '../../constants/sedes'
import { isCloudinaryConfigured, uploadImage } from '../../services/cloudinary'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  active: true,
  icon: 'parapente',
  imageUrl: '',
  imageCloudinaryId: '',
}

function Servicios() {
  const { data: services, loading } = useCollection('services')
  const toast = useToast()
  const { run: runSave, saving } = useMutation()
  const [draft, setDraft] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const startEdit = (s) => {
    setEditing(s.id)
    setDraft({
      name: s.name,
      description: s.description,
      price: String(s.price ?? ''),
      active: !!s.active,
      icon: s.icon || 'parapente',
      imageUrl: s.imageUrl || '',
      imageCloudinaryId: s.imageCloudinaryId || '',
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
    if (!draft.name || draft.price === '') return
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Number(draft.price),
      active: draft.active,
      icon: draft.icon || 'parapente',
      imageUrl: draft.imageUrl || '',
      imageCloudinaryId: draft.imageCloudinaryId || '',
    }
    const res = await runSave(async () => {
      if (editing) await updateDoc(doc(db, 'services', editing), payload)
      else await addDoc(collection(db, 'services'), payload)
    })
    if (res.ok) {
      toast.success(editing ? 'Servicio actualizado' : 'Servicio creado')
      cancel()
    } else {
      toast.error(`No se pudo guardar: ${res.error?.message || 'error'}`)
    }
  }

  const toggle = async (s) => {
    try {
      await updateDoc(doc(db, 'services', s.id), { active: !s.active })
    } catch (e) {
      toast.error(`No se pudo cambiar el estado: ${e.message}`)
    }
  }

  return (
    <div>
      <div className="admin-page__head">
        <h1>Servicios</h1>
        <p>Activa/desactiva, edita precios, descripciones y foto. No se borra: solo se desactiva.</p>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>{editing ? 'Editar servicio' : 'Crear servicio'}</h2>
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
            <textarea className="admin-textarea" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          <div className="admin-field">
            <label>Foto del servicio</label>
            <div className="svc-image">
              {draft.imageUrl ? (
                <div className="svc-image__preview" style={{ backgroundImage: `url(${draft.imageUrl})` }}>
                  <button
                    type="button"
                    className="svc-image__remove"
                    onClick={() => setDraft((d) => ({ ...d, imageUrl: '', imageCloudinaryId: '' }))}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="svc-image__placeholder">Sin imagen</div>
              )}
              <div>
                <label className="admin-btn admin-btn--ghost" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  {uploading ? 'Subiendo…' : draft.imageUrl ? 'Reemplazar imagen' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                </label>
                {uploadError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{uploadError}</p>}
              </div>
            </div>
          </div>

          <label className="admin-switch" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span className="admin-switch__track" />
            <span>Activo</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="admin-btn" disabled={saving || uploading}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear servicio'}
            </button>
            {editing && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={cancel}>Cancelar</button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Lista de servicios</h2>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : services.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aún no hay servicios. Crea uno arriba o usa "Sembrar demo" en Ajustes.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Servicio</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td style={{ width: 64 }}>
                      {s.imageUrl ? (
                        <div className="svc-thumb" style={{ backgroundImage: `url(${s.imageUrl})` }} />
                      ) : (
                        <div className="svc-thumb svc-thumb--empty">—</div>
                      )}
                    </td>
                    <td>
                      <strong>{s.name}</strong>
                      <br />
                      <small style={{ color: '#6b7280' }}>{s.description}</small>
                    </td>
                    <td>{formatCOP(s.price)}</td>
                    <td>
                      <label className="admin-switch">
                        <input type="checkbox" checked={!!s.active} onChange={() => toggle(s)} />
                        <span className="admin-switch__track" />
                      </label>
                    </td>
                    <td>
                      <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => startEdit(s)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .svc-image { display: flex; gap: 14px; align-items: flex-start; }
        .svc-image__preview { width: 160px; height: 100px; border-radius: 8px; background-size: cover; background-position: center; position: relative; }
        .svc-image__placeholder { width: 160px; height: 100px; border-radius: 8px; background: #f3f4f6; border: 2px dashed #d1d5db; display: grid; place-items: center; color: #9ca3af; font-size: 13px; }
        .svc-image__remove { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; }
        .svc-thumb { width: 56px; height: 40px; border-radius: 6px; background-size: cover; background-position: center; }
        .svc-thumb--empty { background: #f3f4f6; display: grid; place-items: center; color: #9ca3af; font-size: 12px; }
      `}</style>
    </div>
  )
}

export default Servicios
