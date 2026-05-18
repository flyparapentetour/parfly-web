import { where } from 'firebase/firestore'
import { useCollection } from '../hooks/useCollection'
import './Testimonials.css'

function Stars({ count }) {
  return (
    <div className="testimonial__stars" aria-label={`${count} estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
          className={i < count ? 'star star--on' : 'star'}
        >
          <path
            d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.7L12 2.5z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  )
}

function Testimonials() {
  const { data: items, loading } = useCollection('testimonials', [where('active', '==', true)])

  return (
    <section className="testimonials">
      <div className="container">
        <header className="testimonials__head">
          <p className="section-eyebrow">Testimonios</p>
          <h2 className="section-title">Lo que dicen quienes vuelan</h2>
        </header>

        {loading ? (
          <p className="testimonials__hint">Cargando reseñas…</p>
        ) : items.length === 0 ? (
          <p className="testimonials__hint">Próximamente reseñas de clientes.</p>
        ) : (
        <div className="testimonials__grid">
          {items.slice(0, 3).map((t) => (
            <article key={t.id} className="testimonial">
              <Stars count={Number(t.rating) || 0} />
              <p className="testimonial__quote">“{t.text}”</p>
              <footer className="testimonial__author">
                {t.imageUrl && (
                  <div
                    className="testimonial__avatar"
                    style={{ backgroundImage: `url(${t.imageUrl})` }}
                  />
                )}
                <div>
                  <p className="testimonial__name">{t.name}</p>
                  <p className="testimonial__city">{t.city}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
        )}
      </div>
    </section>
  )
}

export default Testimonials
