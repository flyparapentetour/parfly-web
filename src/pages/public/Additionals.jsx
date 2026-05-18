import { Link } from 'react-router-dom'
import { where } from 'firebase/firestore'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import WhatsAppFloat from '../../components/WhatsAppFloat'
import { useCollection } from '../../hooks/useCollection'
import { formatCOP } from '../../constants/sedes'
import './Additionals.css'

function Additionals() {
  const { data: additionals, loading } = useCollection('additionals', [where('active', '==', true)])

  return (
    <>
      <Navbar />
      <main className="ad-page">
        <header className="ad-page__hero">
          <div className="container">
            <p className="section-eyebrow">Personaliza tu vuelo</p>
            <h1 className="ad-page__title">Adicionales para tu experiencia</h1>
            <p className="ad-page__lead">
              Elige los servicios que sumarán al recuerdo de tu vuelo. Los
              seleccionarás dentro del flujo de reserva: aquí están todos los
              disponibles para que conozcas precios y detalles.
            </p>
          </div>
        </header>

        <section className="ad-page__list">
          <div className="container">
            {loading ? (
              <p className="ad-page__hint">Cargando adicionales…</p>
            ) : additionals.length === 0 ? (
              <p className="ad-page__hint">Por ahora no tenemos adicionales activos.</p>
            ) : (
              <div className="ad-grid">
                {additionals.map((a) => (
                  <article key={a.id} className="ad-card">
                    {a.imageUrl ? (
                      <div
                        className="ad-card__image"
                        style={{ backgroundImage: `url(${a.imageUrl})` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="ad-card__image ad-card__image--placeholder" aria-hidden="true">
                        <span>+</span>
                      </div>
                    )}
                    <div className="ad-card__body">
                      <h3 className="ad-card__name">{a.name}</h3>
                      {a.description && <p className="ad-card__desc">{a.description}</p>}
                      <p className="ad-card__price">{formatCOP(a.price)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="ad-page__cta">
              <h2>¿Listo para volar?</h2>
              <p>
                Reserva tu experiencia y elige tus adicionales en el paso 3 del
                proceso de reserva.
              </p>
              <Link to="/reservar" className="btn btn--primary">
                Reservar mi experiencia
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

export default Additionals
