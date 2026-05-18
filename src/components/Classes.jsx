import { Link } from 'react-router-dom'
import { useDoc } from '../hooks/useDoc'
import { mergeHomeIntros } from '../constants/siteContent'
import './Classes.css'

const IMG = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80'

function Classes() {
  const { data: intros } = useDoc('settings/homeIntros')
  const i = mergeHomeIntros(intros)

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
          <p className="section-eyebrow">{i.classesEyebrow}</p>
          <h2 className="section-title classes__title">{i.classesTitle}</h2>
          <p className="classes__lead">{i.classesLead}</p>
          <Link to="/clases" className="btn btn--primary classes__cta">
            {i.classesCta}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Classes
