import './Security.css'

const ITEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.5 12.5l2.5 2.5L16 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Instructores certificados',
    text: 'Pilotos con licencia vigente y experiencia mínima de 5 años. Formación continua y reentrenamientos cada temporada.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: 'Equipos revisados',
    text: 'Parapentes, arneses y paracaídas de emergencia inspeccionados antes de cada vuelo y certificados anualmente.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 8l4-4h8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Seguro incluido',
    text: 'Cada vuelo incluye póliza de accidentes para piloto y pasajero. Cobertura activa desde el despegue hasta el aterrizaje.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1.6A4 4 0 0 1 18 17H7a4 4 0 0 1-4-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 21l1-2M14 21l1-2M11 22l1-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: 'Monitoreo del clima',
    text: 'Monitoreamos viento, lluvia y visibilidad en tiempo real. Si las condiciones no son seguras, reagendamos sin costo.',
  },
]

function Security() {
  return (
    <section id="seguridad" className="security">
      <div className="container">
        <header className="security__head">
          <p className="section-eyebrow">Volamos con responsabilidad</p>
          <h2 className="section-title">Tu seguridad es primero</h2>
          <p className="security__lead">
            Cada vuelo está respaldado por protocolos, equipos certificados y
            personas que aman lo que hacen.
          </p>
        </header>

        <div className="security__grid">
          {ITEMS.map((it) => (
            <article key={it.title} className="security-card">
              <span className="security-card__icon">{it.icon}</span>
              <h3 className="security-card__title">{it.title}</h3>
              <p className="security-card__text">{it.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Security
