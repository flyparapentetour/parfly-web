import { Link } from 'react-router-dom'
import { useDoc } from '../hooks/useDoc'
import { mergeHomeIntros, mergeSede } from '../constants/siteContent'
import { SEDES } from '../constants/sedes'
import './Locations.css'

function Locations() {
  const { data: sedesDoc } = useDoc('settings/sedes')
  const { data: intros } = useDoc('settings/homeIntros')
  const i = mergeHomeIntros(intros)

  return (
    <section id="sedes" className="locations">
      <div className="container">
        <header className="locations__head">
          <p className="section-eyebrow">{i.locationsEyebrow}</p>
          <h2 className="section-title">{i.locationsTitle}</h2>
          <p className="locations__lead">{i.locationsLead}</p>
        </header>

        <div className="locations__grid">
          {SEDES.map((s) => {
            const sede = mergeSede(sedesDoc, s.id)
            return (
              <Link key={s.id} to={`/sede/${s.id}`} className="location-card">
                <div
                  className="location-card__image"
                  style={{ backgroundImage: `url(${sede.image})` }}
                />
                <div className="location-card__overlay" aria-hidden="true" />
                <div className="location-card__body">
                  <p className="location-card__region">{sede.region || s.region}</p>
                  <h3 className="location-card__name">{sede.name || s.name}</h3>
                  {sede.shortIntro && (
                    <p className="location-card__intro">{sede.shortIntro}</p>
                  )}
                  <span className="location-card__cta">
                    Ver sede
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Locations
