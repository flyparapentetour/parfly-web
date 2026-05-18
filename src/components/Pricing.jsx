import { Link } from 'react-router-dom'
import { where } from 'firebase/firestore'
import { useCollection } from '../hooks/useCollection'
import { formatCOP } from '../constants/sedes'
import './Pricing.css'

function Pricing() {
  const { data: services, loading: lS } = useCollection('services', [where('active', '==', true)])
  const { data: additionals, loading: lA } = useCollection('additionals', [where('active', '==', true)])

  return (
    <section id="precios" className="pricing">
      <div className="container">
        <header className="pricing__head">
          <p className="section-eyebrow">Sin sorpresas</p>
          <h2 className="section-title pricing__title">Precios transparentes</h2>
          <p className="pricing__lead">
            El precio que ves es el precio que pagas. Sin costos ocultos ni
            sobrecargos de última hora.
          </p>
        </header>

        <div className="pricing__group">
          <h3 className="pricing__subtitle">Experiencias</h3>
          {lS ? (
            <p className="pricing__hint">Cargando…</p>
          ) : (
            <div className="pricing__cards">
              {services.map((s) => (
                <article key={s.id} className="price-card">
                  <h4 className="price-card__name">{s.name}</h4>
                  <p className="price-card__desc">{s.description}</p>
                  <p className="price-card__amount">{formatCOP(s.price)}</p>
                  <Link to="/reservar" className="price-card__cta">
                    Reservar
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="pricing__group">
          <h3 className="pricing__subtitle">Adicionales (opcionales)</h3>
          {lA ? (
            <p className="pricing__hint">Cargando…</p>
          ) : (
            <ul className="pricing__addons">
              {additionals.map((a) => (
                <li key={a.id} className="addon-row">
                  <div>
                    <strong>{a.name}</strong>
                    {a.description && <small>{a.description}</small>}
                  </div>
                  <span className="addon-row__price">{formatCOP(a.price)}</span>
                </li>
              ))}
              {additionals.length === 0 && (
                <li className="pricing__hint">Por ahora no tenemos adicionales activos.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default Pricing
