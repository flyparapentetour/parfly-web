import { Link } from 'react-router-dom'
import { useDoc } from '../hooks/useDoc'
import { mergeHomeIntros } from '../constants/siteContent'
import './AdditionalsTeaser.css'

function AdditionalsTeaser() {
  const { data: intros } = useDoc('settings/homeIntros')
  const i = mergeHomeIntros(intros)

  return (
    <section id="adicionales-teaser" className="ad-teaser">
      <div className="container ad-teaser__inner">
        <div className="ad-teaser__body">
          <p className="section-eyebrow">{i.additionalsEyebrow}</p>
          <h2 className="section-title ad-teaser__title">{i.additionalsTitle}</h2>
          <p className="ad-teaser__lead">{i.additionalsLead}</p>
          <Link to="/adicionales" className="btn btn--primary ad-teaser__cta">
            {i.additionalsCta}
          </Link>
        </div>
        <ul className="ad-teaser__icons" aria-hidden="true">
          <li>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 7l1.5-2h3L15 7" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>Foto</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 10l5-3v10l-5-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span>Video</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 16h14m-13 0v-4l1.5-4h11L20 12v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="8" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="16" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>Transporte</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 9h12l-1 11H7L6 9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>Y más</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default AdditionalsTeaser
