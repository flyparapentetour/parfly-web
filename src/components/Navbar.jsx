import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#servicios', label: 'Servicios' },
  { href: '#sedes', label: 'Sedes' },
  { href: '#galeria', label: 'Galería' },
  { href: '#contacto', label: 'Contacto' },
]

function ParapenteIcon() {
  return (
    <svg
      className="navbar__logo-icon"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 10 C 8 4, 24 4, 30 10 L 27 14 L 22 11 L 16 14 L 10 11 L 5 14 Z"
        fill="currentColor"
      />
      <path
        d="M5 14 L 16 26 L 27 14"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity="0.5"
      />
      <circle cx="16" cy="26" r="1.6" fill="currentColor" />
    </svg>
  )
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        <a href="#inicio" className="navbar__logo" onClick={closeMenu}>
          <ParapenteIcon />
          <span className="navbar__logo-text">Fly Parapente Tour</span>
        </a>

        <nav className="navbar__nav" aria-label="Navegación principal">
          <ul className="navbar__links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="navbar__link">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Link to="/reservar" className="btn btn--primary navbar__cta">
          Reservar
        </Link>

        <button
          type="button"
          className={`navbar__burger ${open ? 'navbar__burger--open' : ''}`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`navbar__mobile ${open ? 'navbar__mobile--open' : ''}`}
        aria-hidden={!open}
      >
        <ul className="navbar__mobile-links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="navbar__mobile-link" onClick={closeMenu}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to="/reservar"
              className="btn btn--primary navbar__mobile-cta"
              onClick={closeMenu}
            >
              Reservar mi vuelo
            </Link>
          </li>
        </ul>
      </div>
    </header>
  )
}

export default Navbar
