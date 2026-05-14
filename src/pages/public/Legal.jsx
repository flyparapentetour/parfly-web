import { Link } from 'react-router-dom'
import { useDoc } from '../../hooks/useDoc'
import { LEGAL_DEFAULTS } from '../../constants/legalDefaults'
import './Legal.css'

const META = {
  terms: { title: 'Términos y condiciones', field: 'terms' },
  privacy: { title: 'Política de privacidad', field: 'privacy' },
  cancellations: { title: 'Política de cancelaciones', field: 'cancellations' },
}

function Legal({ which }) {
  const { data: legal } = useDoc('settings/legal')
  const meta = META[which]
  const body = (legal && legal[meta.field]) || LEGAL_DEFAULTS[meta.field]

  return (
    <article className="legal">
      <header className="legal__topbar">
        <Link to="/" className="legal__home">
          ← Volver al sitio
        </Link>
      </header>
      <div className="container legal__inner">
        <p className="section-eyebrow" style={{ color: '#ff6b2b' }}>Información legal</p>
        <h1 className="legal__title">{meta.title}</h1>
        <div className="legal__body">
          {body.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <nav className="legal__nav">
          <Link to="/terminos">Términos</Link>
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/cancelaciones">Cancelaciones</Link>
        </nav>
      </div>
    </article>
  )
}

export default Legal
