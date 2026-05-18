import { Link } from 'react-router-dom'
import { useDoc } from '../hooks/useDoc'
import './Footer.css'

const SOCIALS = [
  {
    name: 'Instagram',
    href: 'https://instagram.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://tiktok.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 3v10.2a3.3 3.3 0 1 1-3.3-3.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14 3c.4 2.6 2.4 4.5 5 4.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://facebook.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 21v-7h2.5l.5-3H14V9c0-.9.3-1.5 1.6-1.5H17V5c-.4 0-1.3-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.8V11H8.5v3H11v7h3z"
          fill="currentColor"
        />
      </svg>
    ),
  },
]

function Footer() {
  const year = new Date().getFullYear()
  const { data: settings } = useDoc('settings/general')
  const whatsapp = settings?.whatsapp?.trim()
  const email = settings?.email?.trim()
  return (
    <footer id="contacto" className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <h3 className="footer__logo">Fly Parapente Tour</h3>
          <p className="footer__tagline">Vuelos en parapente · Colombia</p>
          <div className="footer__socials">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="footer__social"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="footer__cols">
          <div className="footer__col">
            <h4 className="footer__col-title">Navegación</h4>
            <ul>
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#servicios">Servicios</a></li>
              <li><a href="#sedes">Sedes</a></li>
              <li><a href="#galeria">Galería</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Sedes</h4>
            <ul>
              <li>Bucaramanga</li>
              <li>Antioquia</li>
              <li>Cundinamarca</li>
              <li>Valle del Cauca</li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Contacto</h4>
            <ul>
              {whatsapp && <li>WhatsApp: {whatsapp}</li>}
              {email && <li>{email}</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom container">
        <p>© {year} Fly Parapente Tour. Todos los derechos reservados.</p>
        <nav className="footer__legal">
          <Link to="/terminos">Términos</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidad">Privacidad</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cancelaciones">Cancelaciones</Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
