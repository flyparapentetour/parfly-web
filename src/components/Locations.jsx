import './Locations.css'

const LOCATIONS = [
  {
    id: 'bucaramanga',
    name: 'Bucaramanga',
    region: 'Santander',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
  },
  {
    id: 'antioquia',
    name: 'Antioquia',
    region: 'Medellín y alrededores',
    image: 'https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=800&q=80',
  },
  {
    id: 'cundinamarca',
    name: 'Cundinamarca',
    region: 'Sopó · Sasaima',
    image: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800&q=80',
  },
  {
    id: 'valle',
    name: 'Valle del Cauca',
    region: 'Roldanillo · Cali',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  },
]

function Locations() {
  return (
    <section id="sedes" className="locations">
      <div className="container">
        <header className="locations__head">
          <p className="section-eyebrow">Nuestras sedes</p>
          <h2 className="section-title">Vuela por toda Colombia</h2>
          <p className="locations__lead">
            Cuatro destinos de élite con vientos perfectos y paisajes únicos.
          </p>
        </header>

        <div className="locations__grid">
          {LOCATIONS.map((loc) => (
            <a key={loc.id} href={`#sede-${loc.id}`} className="location-card">
              <div
                className="location-card__image"
                style={{ backgroundImage: `url(${loc.image})` }}
              />
              <div className="location-card__overlay" aria-hidden="true" />
              <div className="location-card__body">
                <p className="location-card__region">{loc.region}</p>
                <h3 className="location-card__name">{loc.name}</h3>
                <span className="location-card__cta">
                  Ver disponibilidad
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Locations
