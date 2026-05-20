import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDoc } from '../../hooks/useDoc'
import './ServicePicker.css'

function ServicePicker() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: picker, loading: pickerLoading } = useDoc('settings/servicePicker')
  const { data: general } = useDoc('settings/general')

  // Passthrough de enlaces legacy: el wizard antiguo vivía en /reservar,
  // así que enlaces ya emitidos (?ref del redirect de Bold post-pago,
  // ?service de Services.jsx, ?sede de SedePage) deben seguir llegando al
  // wizard, no quedarse en el picker.
  useEffect(() => {
    const hasLegacy = ['ref', 'service', 'sede'].some((k) => searchParams.has(k))
    if (!hasLegacy) return
    const qs = searchParams.toString()
    navigate(
      { pathname: '/reservar/wizard', search: qs ? `?${qs}` : '' },
      { replace: true },
    )
  }, [searchParams, navigate])

  const goExperience = () => navigate('/reservar/wizard?flow=experience')
  const goLiveGroup = () => navigate('/reservar/wizard?flow=livegroup')

  const openCoursesWhatsApp = () => {
    const phone = String(general?.whatsapp || '').replace(/\D/g, '')
    if (!phone) return
    const msg =
      picker?.courses?.whatsappMessage || 'Hola, me interesan los cursos de parapente.'
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener')
  }

  if (pickerLoading) {
    return (
      <section className="service-picker">
        <div className="container service-picker__loading">Cargando…</div>
      </section>
    )
  }

  const experience = picker?.experience || {}
  const courses = picker?.courses || {}
  const liveGroup = picker?.liveGroup || {}
  const coursesDisabled = !general?.whatsapp

  return (
    <section className="service-picker">
      <div className="service-picker__topbar">
        <Link to="/" className="service-picker__logo">
          <span className="service-picker__logo-mark">▲</span>
          Fly Parapente Tour
        </Link>
      </div>

      <div className="container service-picker__inner">
        <p className="service-picker__eyebrow">Reserva</p>
        <h1 className="service-picker__title">Elige cómo volar</h1>
        <p className="service-picker__lead">
          Tres caminos para vivir el parapente con Fly Parapente Tour.
        </p>

        <div className="service-picker__grid">
          <button
            type="button"
            className="picker-card picker-card--experience"
            onClick={goExperience}
          >
            <h2 className="picker-card__title">
              {experience.title || 'Vuelo Experience'}
            </h2>
            <p className="picker-card__desc">{experience.description}</p>
            {experience.priceLabel && (
              <span className="picker-card__price">{experience.priceLabel}</span>
            )}
            <span className="picker-card__cta">Reservar vuelo →</span>
          </button>

          <button
            type="button"
            className="picker-card picker-card--courses"
            onClick={openCoursesWhatsApp}
            disabled={coursesDisabled}
            title={coursesDisabled ? 'WhatsApp no configurado' : ''}
          >
            <h2 className="picker-card__title">
              {courses.title || 'Cursos de parapente'}
            </h2>
            <p className="picker-card__desc">{courses.description}</p>
            <span className="picker-card__cta picker-card__cta--wa">
              Coordinar por WhatsApp →
            </span>
          </button>

          <button
            type="button"
            className="picker-card picker-card--live-group"
            onClick={goLiveGroup}
          >
            <h2 className="picker-card__title">
              {liveGroup.title || 'Live Group (8+ personas)'}
            </h2>
            <p className="picker-card__desc">{liveGroup.description}</p>
            {liveGroup.discountBadge && (
              <span className="picker-card__badge">{liveGroup.discountBadge}</span>
            )}
            <span className="picker-card__cta">Reservar grupo →</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default ServicePicker
