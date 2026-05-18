import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import WhatsAppFloat from '../../components/WhatsAppFloat'
import { useDoc } from '../../hooks/useDoc'
import { mergeClasses } from '../../constants/siteContent'
import { formatCOP } from '../../constants/sedes'
import './ClassesPage.css'

const HERO_IMG = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1800&q=80'

function buildWhatsAppURL(rawPhone, message) {
  const phone = (rawPhone || '').replace(/\D/g, '')
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function ClassesPage() {
  const { data: classes } = useDoc('settings/classes')
  const { data: general } = useDoc('settings/general')
  const c = mergeClasses(classes)

  const waURL = buildWhatsAppURL(general?.whatsapp, c.whatsappPrompt) ||
    `https://wa.me/?text=${encodeURIComponent(c.whatsappPrompt)}`

  return (
    <>
      <Navbar />
      <main className="cl-page">
        <header
          className="cl-page__hero"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        >
          <div className="cl-page__hero-overlay" aria-hidden="true" />
          <div className="container cl-page__hero-content">
            <p className="section-eyebrow">{c.eyebrow}</p>
            <h1 className="cl-page__title">{c.title}</h1>
            <p className="cl-page__lead">{c.lead}</p>
          </div>
        </header>

        <section className="cl-page__meta">
          <div className="container">
            <div className="cl-meta">
              <div className="cl-meta__cell">
                <span>{c.priceLabel}</span>
                <strong>{formatCOP(c.priceFrom)}</strong>
              </div>
              <div className="cl-meta__cell">
                <span>{c.durationLabel}</span>
                <strong>{c.durationValue}</strong>
              </div>
              <div className="cl-meta__cell">
                <span>{c.groupLabel}</span>
                <strong>{c.groupValue}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="cl-page__levels">
          <div className="container">
            <h2 className="cl-page__h2">Niveles del programa</h2>
            <ol className="cl-levels">
              {c.levels.map((l) => (
                <li key={l.n} className="cl-level">
                  <span className="cl-level__num">{l.n}</span>
                  <div>
                    <h3 className="cl-level__title">Nivel {l.n.replace(/^0/, '')} · {l.title}</h3>
                    <p className="cl-level__desc">{l.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="cl-page__cta-block">
          <div className="container">
            <h2>¿Te interesa el programa?</h2>
            <p>
              Las clases son personalizadas y agendamos por WhatsApp para
              adaptarnos a tu disponibilidad y nivel.
            </p>
            <a
              href={waURL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary cl-page__cta"
            >
              <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M16 3C8.8 3 3 8.8 3 16c0 2.5.7 4.9 2 7L3 29l6.2-2c2 1 4.4 1.6 6.8 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3zm6.6 16.3c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.8 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.6.2-.2.2-.3.4-.5.1-.2 0-.4 0-.6 0-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.4 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z"/>
              </svg>
              {c.ctaLabel}
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

export default ClassesPage
