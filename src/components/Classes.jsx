import { Link } from 'react-router-dom'
import './Classes.css'

const LEVELS = [
  {
    n: '01',
    title: 'Iniciación',
    desc: 'Teoría básica, conocimiento del equipo y primeros vuelos en ladera con instructor.',
  },
  {
    n: '02',
    title: 'Progresión',
    desc: 'Vuelos autónomos, meteorología, planificación y técnicas de despegue y aterrizaje.',
  },
  {
    n: '03',
    title: 'Avanzado',
    desc: 'Técnicas de vuelo libre, lectura de térmicas, vuelo de distancia y seguridad activa.',
  },
]

const IMG = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80'

function Classes() {
  return (
    <section id="clases" className="classes">
      <div className="container classes__inner">
        <div className="classes__media">
          <div
            className="classes__image"
            style={{ backgroundImage: `url(${IMG})` }}
            aria-hidden="true"
          />
        </div>

        <div className="classes__body">
          <p className="section-eyebrow">Aprende a volar</p>
          <h2 className="section-title classes__title">Programa de clases</h2>
          <p className="classes__lead">
            Formación progresiva con instructores certificados. Desde el primer vuelo en
            ladera hasta vuelos libres autónomos: todo bajo estándares de seguridad
            internacionales.
          </p>

          <ol className="classes__levels">
            {LEVELS.map((l) => (
              <li key={l.n} className="level">
                <span className="level__num">{l.n}</span>
                <div>
                  <h3 className="level__title">Nivel {l.n.replace(/^0/, '')} · {l.title}</h3>
                  <p className="level__desc">{l.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link to="/reservar" className="btn btn--primary classes__cta">
            Ver disponibilidad de clases
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Classes
