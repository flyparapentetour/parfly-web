import { useDoc } from '../hooks/useDoc'
import { mergeIncluded } from '../constants/siteContent'
import './IncludedExperience.css'

const ICONS = {
  shield: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 12.5l2.5 2.5L16 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  helmet: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16h16M5 16a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 9a4 4 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3" y="16" width="18" height="4" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h10M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.5 12 1 1 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  umbrella: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 12c1.5-1 3 1 3 0 0-1 1.5-1 3 0M9 12c0-1 1.5-1 3 0s1.5 1 3 0M15 12c0-1 1.5-1 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12v6a2.5 2.5 0 0 1-5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1.6A4 4 0 0 1 18 17H7a4 4 0 0 1-4-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  medal: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 3l3 6 3-6M9 3h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 12.5 12 14l2-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 7l1.5-2h3L15 7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 16h14m-13 0v-4l1.5-4h11L20 12v4M5 16h-1m1 0v2m14-2h1m-1 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
}

function IncludedExperience() {
  const { data } = useDoc('settings/included')
  const c = mergeIncluded(data)

  return (
    <section id="incluye" className="included">
      <div className="container">
        <header className="included__head">
          <p className="section-eyebrow">{c.eyebrow}</p>
          <h2 className="section-title included__title">{c.title}</h2>
          <p className="included__lead">{c.lead}</p>
        </header>

        <div className="included__grid">
          {c.items.map((it, idx) => (
            <article key={idx} className="included-card">
              <span className="included-card__icon">{ICONS[it.icon] || ICONS.check}</span>
              <h3 className="included-card__title">{it.title}</h3>
              <p className="included-card__text">{it.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default IncludedExperience
