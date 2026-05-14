import { useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useCollection } from '../../hooks/useCollection'
import { isCloudinaryConfigured, uploadImage } from '../../services/cloudinary'

function Galeria() {
  const { data: photos, loading } = useCollection('gallery', [orderBy('order', 'asc')])
  const configured = isCloudinaryConfigured()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    if (!configured) {
      setError('Configura VITE_CLOUDINARY_CLOUD_NAME en .env.local primero.')
      return
    }
    setError('')
    setUploading(true)
    try {
      let order = photos.length
      for (const file of files) {
        const { url, cloudinaryId } = await uploadImage(file)
        await addDoc(collection(db, 'gallery'), {
          url,
          cloudinaryId,
          order: order++,
          createdAt: serverTimestamp(),
        })
      }
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const remove = async (p) => {
    if (!confirm('¿Eliminar esta foto de la galería?')) return
    await deleteDoc(doc(db, 'gallery', p.id))
    // Cloudinary: el borrado server-side requiere firma con API secret —
    // se debe hacer desde una Cloud Function. Aquí solo desreferenciamos
    // la imagen de Firestore; la URL queda huérfana en Cloudinary.
  }

  return (
    <div>
      <div className="admin-page__head">
        <h1>Galería</h1>
        <p>Sube fotos del público. Hosting en Cloudinary, referencias en Firestore.</p>
      </div>

      {!configured && (
        <div className="admin-card" style={{ marginBottom: 16, borderColor: '#fbbf24', background: '#fffbeb' }}>
          <strong>Cloudinary no configurado.</strong>
          <p style={{ marginTop: 6, fontSize: 14, color: '#92400e' }}>
            Añade <code>VITE_CLOUDINARY_CLOUD_NAME</code> y <code>VITE_CLOUDINARY_UPLOAD_PRESET</code>{' '}
            a <code>.env.local</code> y crea un upload preset <strong>unsigned</strong> llamado
            {' '}<code>parfly_gallery</code> en el dashboard de Cloudinary.
          </p>
        </div>
      )}

      <div
        className="admin-card upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <p style={{ marginBottom: 12, fontWeight: 600 }}>
          {uploading ? 'Subiendo…' : 'Arrastra fotos aquí o pulsa para elegir'}
        </p>
        <input
          id="gallery-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <label htmlFor="gallery-input" className="admin-btn" style={{ cursor: 'pointer' }}>
          Elegir imágenes
        </label>
        {error && <p style={{ color: '#ef4444', marginTop: 10, fontSize: 13 }}>{error}</p>}
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>{photos.length} fotos</h2>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Cargando…</p>
        ) : photos.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aún no hay fotos.</p>
        ) : (
          <div className="gallery-grid">
            {photos.map((p) => (
              <figure key={p.id} className="gallery-tile">
                <img src={p.url} alt="" loading="lazy" />
                <button
                  type="button"
                  className="gallery-tile__del"
                  aria-label="Eliminar"
                  onClick={() => remove(p)}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .upload-zone { text-align: center; border: 2px dashed #d1d5db; padding: 32px 20px; }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }
        .gallery-tile {
          position: relative;
          margin: 0;
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          background: #f1f5f9;
        }
        .gallery-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-tile__del {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
      `}</style>
    </div>
  )
}

export default Galeria
