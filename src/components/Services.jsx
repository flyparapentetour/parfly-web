import { Link } from 'react-router-dom'
import { where } from 'firebase/firestore'
import { useCollection } from '../hooks/useCollection'
import { useDoc } from '../hooks/useDoc'
import { mergeHomeIntros } from '../constants/siteContent'
import { formatCOP } from '../constants/sedes'
import './Services.css'

const FALLBACK_ICON = (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M4 18 C 12 8, 36 8, 44 18 L 40 24 L 32 19 L 24 24 L 16 19 L 8 24 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M8 24 L 24 40 L 40 24" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" opacity="0.6" />
    <circle cx="24" cy="40" r="2.4" fill="currentColor" />
  </svg>
)

function Services() {
  const { data: services, loading } = useCollection('services', [where('active', '==', true)])
  const { data: intros } = useDoc('settings/homeIntros')
  const i = mergeHomeIntros(intros)

  return (
    <section id="servicios" className="services">
      <div className="container">
        <header className="services__head">
          <p className="section-eyebrow">{i.servicesEyebrow}</p>
          <h2 className="section-title services__title">{i.servicesTitle}</h2>
          <p className="services__lead">{i.servicesLead}</p>
        </header>

        {loading ? (
          <p className="services__hint">Cargando servicios…</p>
        ) : services.length === 0 ? (
          <p className="services__hint">Próximamente publicamos nuestras experiencias.</p>
        ) : (
          <div className="services__grid">
            {services.map((s) => (
              <article key={s.id} className="service-card">
                {s.imageUrl ? (
                  <div
                    className="service-card__image"
                    style={{ backgroundImage: `url(${s.imageUrl})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <div className="service-card__icon">{FALLBACK_ICON}</div>
                )}
                <h3 className="service-card__title">{s.name}</h3>
                <p className="service-card__desc">{s.description}</p>
                <p className="service-card__price">{formatCOP(s.price)}</p>
                <Link to="/reservar" className="service-card__link">
                  Reservar
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Services
