import { Link, Navigate, useParams } from 'react-router-dom'
import { where } from 'firebase/firestore'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import WhatsAppFloat from '../../components/WhatsAppFloat'
import { useCollection } from '../../hooks/useCollection'
import { useDoc } from '../../hooks/useDoc'
import { SEDE_BY_ID } from '../../constants/sedes'
import { mergeSede } from '../../constants/siteContent'
import { formatCOP } from '../../constants/sedes'
import './SedePage.css'

function SedePage() {
  const { ciudad } = useParams()
  const sedeMeta = SEDE_BY_ID[ciudad]
  const { data: sedesDoc } = useDoc('settings/sedes')
  const { data: additionals } = useCollection('additionals', [where('active', '==', true)])

  if (!sedeMeta) return <Navigate to="/" replace />

  const sede = mergeSede(sedesDoc, ciudad)

  return (
    <>
      <Navbar />
      <main className="sede-page">
        <header
          className="sede-page__hero"
          style={{ backgroundImage: `url(${sede.image})` }}
        >
          <div className="sede-page__hero-overlay" aria-hidden="true" />
          <div className="container sede-page__hero-content">
            <p className="section-eyebrow">{sede.region || sedeMeta.region}</p>
            <h1 className="sede-page__title">{sede.name || sedeMeta.name}</h1>
            {sede.shortIntro && <p className="sede-page__lead">{sede.shortIntro}</p>}
            <Link
              to={`/reservar?sede=${ciudad}`}
              className="btn btn--primary sede-page__cta"
            >
              Reservar en {sede.name || sedeMeta.name}
            </Link>
          </div>
        </header>

        <section className="sede-page__body">
          <div className="container sede-page__grid">
            <div>
              <h2 className="sede-page__h2">La experiencia aquí</h2>
              <p className="sede-page__desc">{sede.description}</p>
            </div>
            {sede.highlights?.length > 0 && (
              <ul className="sede-highlights">
                {sede.highlights.map((h, i) => (
                  <li key={i}>
                    <span aria-hidden="true">✓</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {additionals.length > 0 && (
          <section className="sede-page__addons">
            <div className="container">
              <h2 className="sede-page__h2 sede-page__h2--center">Adicionales disponibles</h2>
              <p className="sede-page__addons-lead">
                Estos servicios opcionales puedes sumarlos a tu reserva.
              </p>
              <div className="sede-addons">
                {additionals.map((a) => (
                  <article key={a.id} className="sede-addon">
                    <div>
                      <h3>{a.name}</h3>
                      {a.description && <p>{a.description}</p>}
                    </div>
                    <span className="sede-addon__price">{formatCOP(a.price)}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="sede-page__final-cta">
          <div className="container">
            <h2>Listo para volar en {sede.name || sedeMeta.name}</h2>
            <p>
              Elige tu fecha y horario en pocos pasos. Las fechas que no
              operamos quedan bloqueadas automáticamente.
            </p>
            <Link to={`/reservar?sede=${ciudad}`} className="btn btn--primary">
              Reservar mi vuelo
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

export default SedePage
