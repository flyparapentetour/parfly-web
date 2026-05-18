import { useState } from 'react'
import { useDoc } from '../hooks/useDoc'
import { DEFAULT_FAQ } from '../constants/siteContent'
import './FAQ.css'

function FAQ() {
  const { data } = useDoc('settings/faq')
  const items = Array.isArray(data?.items) && data.items.length > 0 ? data.items : DEFAULT_FAQ
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="faq">
      <div className="container">
        <header className="faq__head">
          <p className="section-eyebrow">Resolvemos tus dudas</p>
          <h2 className="section-title faq__title">Preguntas frecuentes</h2>
        </header>

        <div className="faq__list" role="list">
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}
                role="listitem"
              >
                <button
                  type="button"
                  className="faq-item__q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span>{it.q}</span>
                  <span className="faq-item__icon" aria-hidden="true">+</span>
                </button>
                {isOpen && <div className="faq-item__a">{it.a}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ
