import './HowItWorks.css'

const STEPS = [
  {
    num: '01',
    title: 'Elige tu experiencia',
    description: 'Selecciona el tipo de vuelo y la sede que más te inspira.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" />
        <path d="M14 20 L 18 24 L 26 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Selecciona fecha',
    description: 'Escoge día, hora y adicionales como video, fotos o transporte.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="6" y="9" width="28" height="25" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M6 16 H34" stroke="currentColor" strokeWidth="2" />
        <path d="M13 5 V12 M27 5 V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Paga y confirma',
    description: 'Pago seguro online. Recibe tu confirmación al instante.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="30" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M5 17 H35" stroke="currentColor" strokeWidth="2" />
        <path d="M11 24 H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

function HowItWorks() {
  return (
    <section id="como-funciona" className="how">
      <div className="container">
        <header className="how__head">
          <p className="section-eyebrow">Cómo funciona</p>
          <h2 className="section-title how__title">Reservar es simple</h2>
          <p className="how__lead">
            Tres pasos para asegurar tu vuelo. Sin filas, sin enredos.
          </p>
        </header>

        <ol className="how__steps">
          {STEPS.map((s) => (
            <li key={s.num} className="step">
              <span className="step__num">{s.num}</span>
              <div className="step__icon">{s.icon}</div>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__desc">{s.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
