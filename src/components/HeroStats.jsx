import { useDoc } from '../hooks/useDoc'
import { DEFAULT_STATS } from '../constants/siteContent'
import './HeroStats.css'

function HeroStats() {
  const { data } = useDoc('settings/stats')
  const s = { ...DEFAULT_STATS, ...(data || {}) }

  const items = [
    { value: s.flights, label: s.flightsLabel },
    { value: s.rating, label: s.ratingLabel },
    { value: s.years, label: s.yearsLabel },
    { value: s.sedes, label: s.sedesLabel },
  ]

  return (
    <section className="hero-stats" aria-label="Estadísticas">
      <div className="container hero-stats__inner">
        {items.map((it, i) => (
          <div key={i} className="hero-stats__item">
            <strong className="hero-stats__value">{it.value}</strong>
            <span className="hero-stats__label">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HeroStats
