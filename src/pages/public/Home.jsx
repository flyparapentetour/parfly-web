import './Home.css'

function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">San Gil · Santander</p>
          <h1 className="hero__title">Fly Parapente Tour</h1>
          <p className="hero__subtitle">
            Vuela el cañón del Chicamocha y vive una experiencia inolvidable.
          </p>
          <button type="button" className="hero__cta">
            Reservar mi vuelo
          </button>
        </div>
      </section>
    </main>
  )
}

export default Home
