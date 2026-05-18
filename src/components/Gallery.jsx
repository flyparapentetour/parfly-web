import { orderBy } from 'firebase/firestore'
import { useCollection } from '../hooks/useCollection'
import './Gallery.css'

const ASPECTS = ['tall', 'wide', 'square', 'wide', 'tall', 'square']

function Gallery() {
  const { data: photos, loading } = useCollection('gallery', [orderBy('order', 'asc')])
  const visible = photos.slice(0, 6)

  return (
    <section id="galeria" className="gallery">
      <div className="container">
        <header className="gallery__head">
          <p className="section-eyebrow">Galería</p>
          <h2 className="section-title gallery__title">Momentos en el aire</h2>
          <p className="gallery__lead">
            Imágenes reales de nuestros vuelos en cuatro regiones del país.
          </p>
        </header>

        {loading ? (
          <p className="gallery__hint">Cargando galería…</p>
        ) : visible.length === 0 ? (
          <p className="gallery__hint">Galería próximamente. Pronto compartiremos fotos de nuestros vuelos.</p>
        ) : (
          <div className="gallery__grid">
            {visible.map((p, i) => (
              <figure
                key={p.id}
                className={`gallery__item gallery__item--${ASPECTS[i % ASPECTS.length]}`}
              >
                <img
                  src={p.url}
                  alt={p.alt || 'Vuelo en parapente'}
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Gallery
