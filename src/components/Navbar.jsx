import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import './Navbar.css'

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#servicios', label: 'Experiencias' },
  { href: '#sedes', label: 'Sedes' },
  { href: '#galeria', label: 'Galería' },
  { href: '#contacto', label: 'Contacto' },
]

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
    return () => { document.body.style.overflow = '' }
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        <a href="#inicio" className="navbar__logo" onClick={closeMenu}>
          <Logo size={30} />
          <span className="navbar__logo-stack">
            <span className="navbar__logo-text">Fly Parapente Tour</span>
            <span className="navbar__logo-sub">Parapente · Colombia</span>
          </span>
        </a>

        <nav className="navbar__nav" aria-label="Navegación principal">
          <ul className="navbar__links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="navbar__link">{l.label}</a>
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
          <span /><span /><span />
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
