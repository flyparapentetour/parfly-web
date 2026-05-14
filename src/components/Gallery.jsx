import './Gallery.css'

const PHOTOS = [
  {
    src: 'https://images.unsplash.com/photo-1601024445121-e5b82f020549?w=900&q=80',
    alt: 'Parapente sobre paisaje montañoso',
    aspect: 'tall',
  },
  {
    src: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=900&q=80',
    alt: 'Despegue de parapente',
    aspect: 'wide',
  },
  {
    src: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=900&q=80',
    alt: 'Vista aérea de montañas colombianas',
    aspect: 'square',
  },
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    alt: 'Cañón en Valle del Cauca',
    aspect: 'wide',
  },
  {
    src: 'https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=900&q=80',
    alt: 'Vuelo con vistas a Antioquia',
    aspect: 'tall',
  },
  {
    src: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=900&q=80',
    alt: 'Atardecer en vuelo',
    aspect: 'square',
  },
]

function Gallery() {
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

        <div className="gallery__grid">
          {PHOTOS.map((p, i) => (
            <figure
              key={i}
              className={`gallery__item gallery__item--${p.aspect}`}
            >
              <img src={p.src} alt={p.alt} loading="lazy" />
            </figure>
          ))}
        </div>

        <div className="gallery__actions">
          <a href="#galeria-full" className="btn btn--primary">
            Ver más fotos
          </a>
        </div>
      </div>
    </section>
  )
}

export default Gallery
