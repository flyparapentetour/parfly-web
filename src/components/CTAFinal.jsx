import { Link } from 'react-router-dom'
import './CTAFinal.css'

function CTAFinal() {
  return (
    <section id="reservar" className="cta-final">
      <div className="container cta-final__inner">
        <p className="cta-final__eyebrow">Tu próxima aventura</p>
        <h2 className="cta-final__title">¿Listo para volar?</h2>
        <p className="cta-final__subtitle">
          Reserva tu experiencia ahora y vive Colombia desde el cielo.
        </p>
        <Link to="/reservar" className="btn btn--light cta-final__cta">
          Reservar ahora
        </Link>
      </div>
    </section>
  )
}

export default CTAFinal
