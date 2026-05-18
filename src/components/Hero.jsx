import { Link } from 'react-router-dom'
import './Hero.css'

const HERO_IMG =
  'https://images.unsplash.com/photo-1601024445121-e5b82f020549?w=1920&q=80'

function Hero() {
  return (
    <section id="inicio" className="hero">
      <div
        className="hero__bg"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
        aria-hidden="true"
      />
      <div className="hero__overlay" aria-hidden="true" />
      <div className="hero__grain" aria-hidden="true" />

      <div className="hero__content container">
        <p className="hero__eyebrow">Parapente · Colombia</p>

        <h1 className="hero__title">
          <span className="hero__title-row"><span>Vuela sobre</span></span>
          <span className="hero__title-row"><span>Colombia</span></span>
        </h1>

        <p className="hero__subtitle">
          Experiencias de parapente únicas en Bucaramanga, Antioquia,
          Cundinamarca y Valle del Cauca. Instructores certificados,
          equipo premium, vistas inolvidables.
        </p>

        <div className="hero__actions">
          <Link to="/reservar" className="btn btn--primary hero__cta">
            Reservar mi vuelo
          </Link>
          <a href="#servicios" className="btn btn--outline hero__cta">
            Ver experiencias
          </a>
        </div>
      </div>

      <a href="#servicios" className="hero__scroll" aria-label="Bajar">
        <span className="hero__scroll-label">Descubre más</span>
        <span className="hero__scroll-mouse">
          <span className="hero__scroll-dot" />
        </span>
      </a>
    </section>
  )
}

export default Hero
