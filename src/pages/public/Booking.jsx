import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useCollection } from '../../hooks/useCollection'
import { useDoc } from '../../hooks/useDoc'
import { db } from '../../firebase/config'
import { createBooking } from '../../services/bookings'
import { startBoldCheckout, buildWhatsAppPaymentMessage } from '../../services/bold'
import { resolveSlots, sedeBase, todayISO } from '../../services/schedule'
import {
  SEDES,
  SEDE_BY_ID,
  formatCOP,
} from '../../constants/sedes'
import './Booking.css'

const STEP_LABELS = ['Experiencia', 'Sede y fecha', 'Adicionales', 'Tus datos', 'Pago']

function Stepper({ step }) {
  const pct = ((step + 1) / STEP_LABELS.length) * 100
  return (
    <div className="stepper">
      <div className="stepper__bar">
        <div className="stepper__fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="stepper__list">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            className={`stepper__item ${i <= step ? 'stepper__item--done' : ''} ${i === step ? 'stepper__item--current' : ''}`}
          >
            <span className="stepper__num">{i + 1}</span>
            <span className="stepper__label">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function CalendarPicker({ sedeId, sedeEnabled, value, onChange }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [blockedDates, setBlockedDates] = useState(new Set())

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const view = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset],
  )

  useEffect(() => {
    if (!sedeId) return
    let alive = true
    ;(async () => {
      try {
        const blockedSnap = await getDocs(collection(db, `blocked/${sedeId}/dates`))
        if (!alive) return
        const blocked = new Set()
        blockedSnap.forEach((d) => {
          if (d.data().blocked) blocked.add(d.id)
        })
        setBlockedDates(blocked)
      } catch (e) {
        console.error('blocked fetch', e)
      }
    })()
    return () => {
      alive = false
    }
  }, [sedeId])

  const monthName = view.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const firstDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const fmt = (d) => {
    const m = String(view.getMonth() + 1).padStart(2, '0')
    const day = String(d).padStart(2, '0')
    return `${view.getFullYear()}-${m}-${day}`
  }

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button
          type="button"
          className="calendar__nav"
          disabled={monthOffset === 0}
          onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
        >
          ‹
        </button>
        <span className="calendar__title">{monthName}</span>
        <button
          type="button"
          className="calendar__nav"
          disabled={monthOffset >= 2}
          onClick={() => setMonthOffset((m) => Math.min(2, m + 1))}
        >
          ›
        </button>
      </div>
      <div className="calendar__dow">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="calendar__grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />
          const iso = fmt(d)
          const dateObj = new Date(view.getFullYear(), view.getMonth(), d)
          const isPast = dateObj < today
          const isBlocked = blockedDates.has(iso)
          const available = sedeEnabled && !isPast && !isBlocked
          const selected = value === iso
          return (
            <button
              type="button"
              key={iso}
              className={`calendar__day ${available ? 'calendar__day--available' : ''} ${selected ? 'calendar__day--selected' : ''} ${isBlocked ? 'calendar__day--blocked' : ''}`}
              disabled={!available}
              onClick={() => onChange(iso)}
              title={isBlocked ? 'Fecha bloqueada' : ''}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimePicker({ sedeId, date, schedule, scheduleLoading, value, onChange }) {
  // Datos crudos del día: override + estado bloqueado. SOLO se refresca
  // cuando cambia sede o fecha — no cuando Firestore re-emite el doc
  // de `settings/schedule` (que es donde estaba el bug del parpadeo en
  // mobile: snapshot re-emit → effect re-fetch → red hipo durante
  // scroll → catch reseteaba slots a []).
  const [daySnap, setDaySnap] = useState(null) // { blocked, override }
  const [usage, setUsage] = useState({})

  useEffect(() => {
    if (!sedeId || !date) {
      setDaySnap(null)
      setUsage({})
      return
    }
    let alive = true
    ;(async () => {
      try {
        const [overrideSnap, blockedSnap] = await Promise.all([
          getDoc(doc(db, 'availability', sedeId, 'slots', date)),
          getDoc(doc(db, 'blocked', sedeId, 'dates', date)),
        ])
        if (!alive) return
        setDaySnap({
          blocked: blockedSnap.exists() && blockedSnap.data().blocked === true,
          override: overrideSnap.exists() ? overrideSnap.data().slots : null,
        })

        const q = query(
          collection(db, 'bookings'),
          where('sede', '==', sedeId),
          where('date', '==', date),
          where('status', '==', 'confirmed'),
        )
        const bookings = await getDocs(q)
        if (!alive) return
        const used = {}
        bookings.forEach((b) => {
          const t = b.data().time
          used[t] = (used[t] || 0) + 1
        })
        setUsage(used)
      } catch (e) {
        // OJO: no reseteamos `daySnap` ni `usage` si la red tiene un
        // hipo en mobile durante el scroll. Preservar el último estado
        // bueno evita el parpadeo de horarios.
        console.error('slots fetch', e)
      }
    })()
    return () => {
      alive = false
    }
  }, [sedeId, date])

  // Resolución de slots a partir del snap y el schedule. Cuando el
  // schedule cambia (snapshot re-emit) sólo recalculamos localmente,
  // sin volver a la red.
  const slots = useMemo(() => {
    if (!date || !daySnap) return []
    return resolveSlots({
      sedeId,
      date,
      baseSchedule: schedule,
      overrideSlots: daySnap.override,
      blocked: daySnap.blocked,
      today: todayISO(),
    })
  }, [sedeId, date, schedule, daySnap])

  if (!date) {
    return <p className="booking__hint">Selecciona primero una fecha.</p>
  }
  // Estado de carga: cualquiera de los dos inputs todavía sin llegar.
  // En mobile con red lenta, daySnap (override+blocked) y schedule
  // (settings/schedule) pueden llegar en orden invertido al de desktop.
  // Mostrar el resultado de resolveSlots antes de tener AMBOS produce
  // el bug del parpadeo: primero salen los defaults, luego al llegar
  // schedule real pueden resolverse a [] → "No hay horarios".
  if (scheduleLoading || !daySnap) {
    return <p className="booking__hint">Cargando horarios…</p>
  }
  if (slots.length === 0) {
    return <p className="booking__hint">No hay horarios disponibles para ese día.</p>
  }
  return (
    <div className="time-picker">
      {slots.map((s) => {
        const used = usage[s.time] || 0
        const free = Math.max(0, s.cupos - used)
        const full = free === 0
        return (
          <button
            type="button"
            key={s.time}
            className={`time-pill ${value === s.time ? 'time-pill--selected' : ''} ${full ? 'time-pill--full' : ''}`}
            onClick={() => onChange(s.time)}
            disabled={full}
            title={full ? 'Sin cupos' : `${free} cupos disponibles`}
          >
            <span>{s.time}</span>
            <small>{full ? 'Sin cupos' : `${free} cupo${free === 1 ? '' : 's'}`}</small>
          </button>
        )
      })}
    </div>
  )
}

function Booking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const timeColRef = useRef(null)
  const boldMountRef = useRef(null)
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState(null)
  const initialSede = searchParams.get('sede') && SEDE_BY_ID[searchParams.get('sede')]
    ? searchParams.get('sede')
    : ''
  const [sedeId, setSedeId] = useState(initialSede)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [pickedAdd, setPickedAdd] = useState({})
  const [client, setClient] = useState({ name: '', email: '', phone: '' })
  const [paymentType, setPaymentType] = useState('full') // 'full' | 'partial'
  const [submitting, setSubmitting] = useState(false)
  // Si Bold nos redirige a /reservar?ref=<orderId>, ese orderId es nuestro bookingId.
  // Cargamos directo el estado "esperando confirmación" del webhook.
  const refFromUrl = searchParams.get('ref') || ''
  const [bookingId, setBookingId] = useState(refFromUrl || null)
  const [submitError, setSubmitError] = useState('')
  // Flujo Bold: idle (wizard normal) → preparing (callable in flight) →
  // mounted (botón Bold listo, esperando que el usuario pague) → error.
  const [boldFlow, setBoldFlow] = useState(refFromUrl ? 'mounted' : 'idle')
  const [boldError, setBoldError] = useState('')

  const { data: services } = useCollection('services', [where('active', '==', true)])
  const { data: additionals } = useCollection('additionals', [where('active', '==', true)])
  const { data: settingsGeneral } = useDoc('settings/general')
  // Nota: NO leemos settings/bold aquí. Esa colección es admin-only
  // (contiene secretKey). El flag público está en settings/general.boldActive.
  const { data: schedule, loading: scheduleLoading } = useDoc('settings/schedule')
  // Suscripción al doc de la reserva en curso. Cuando el webhook de Bold
  // escriba paymentStatus='paid' / status='confirmed', este hook detecta
  // el cambio y la UI salta automáticamente a la pantalla de confirmación.
  const { data: bookingDoc, loading: bookingLoading } = useDoc(
    bookingId ? `bookings/${bookingId}` : null,
  )

  const isPaid = bookingDoc?.paymentStatus === 'paid' || bookingDoc?.status === 'confirmed'
  const isDeclined = bookingDoc?.paymentStatus === 'declined' || bookingDoc?.paymentStatus === 'voided'
  const isWhatsAppFlow = bookingDoc?.paymentMethod === 'whatsapp'
  const isBoldFlow = bookingDoc?.paymentMethod === 'bold' || (!!refFromUrl)

  // Preselección de servicio desde la URL.
  //  - ?service=ID: enlace legacy (cards de Services.jsx).
  //  - ?flow=experience|livegroup: viene del ServicePicker (PAR-02). Ambos
  //    flows del pivot v2 montan sobre `vuelos-experience` (único servicio
  //    activo). El flag de descuento Live Group lo aplica PAR-03 leyendo
  //    `?flow=livegroup` directamente.
  const initialServiceId = searchParams.get('service') || ''
  const flow = searchParams.get('flow') || ''
  useEffect(() => {
    if (selectedService || services.length === 0) return
    const targetId =
      initialServiceId ||
      (flow === 'experience' || flow === 'livegroup' ? 'vuelos-experience' : '')
    if (!targetId) return
    const match = services.find((s) => s.id === targetId)
    if (match) {
      setSelectedService(match)
      setStep((s) => (s === 0 ? 1 : s))
    }
  }, [initialServiceId, flow, selectedService, services])

  const sedeEnabled = useMemo(
    () => (sedeId ? sedeBase(schedule, sedeId).enabled : false),
    [schedule, sedeId],
  )

  const total = useMemo(() => {
    const base = selectedService?.price || 0
    const extras = (additionals || []).reduce(
      (acc, a) => acc + (pickedAdd[a.id] ? a.price : 0),
      0,
    )
    return base + extras
  }, [selectedService, pickedAdd, additionals])

  const amountPaid = useMemo(
    () => (paymentType === 'partial' ? Math.round(total / 2) : total),
    [paymentType, total],
  )

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return !!selectedService
      case 1:
        return !!sedeId && !!date && !!time
      case 2:
        return true
      case 3:
        return (
          client.name.trim().length > 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email) &&
          client.phone.replace(/\D/g, '').length >= 7
        )
      default:
        return true
    }
  }, [step, selectedService, sedeId, date, time, client])

  const pickedAdditionalsList = useMemo(
    () =>
      (additionals || [])
        .filter((a) => pickedAdd[a.id])
        .map((a) => ({ id: a.id, name: a.name, price: a.price })),
    [pickedAdd, additionals],
  )

  const buildBookingPayload = (paymentMethod) => ({
    serviceId: selectedService.id,
    serviceName: selectedService.name,
    sede: sedeId,
    sedeName: SEDE_BY_ID[sedeId]?.name || sedeId,
    date,
    time,
    clientName: client.name.trim(),
    clientEmail: client.email.trim(),
    clientPhone: client.phone.trim(),
    additionals: pickedAdditionalsList,
    total,
    paymentType,
    amountPaid,
    paymentMethod,
  })

  const submitBooking = async (paymentMethod) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const id = await createBooking(buildBookingPayload(paymentMethod))
      setBookingId(id)
      return id
    } catch (e) {
      console.error(e)
      setSubmitError('No se pudo registrar la reserva. Por favor intenta de nuevo o escríbenos por WhatsApp.')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  // Inicia el flujo Bold. Solo crea la reserva (status: 'pending') y
  // pasa a estado 'preparing'. El callable + montaje del botón ocurren
  // en el useEffect de más abajo, una vez React renderizó el contenedor
  // boldMountRef. La pantalla de "confirmada" NO se muestra aquí —
  // espera a que el webhook escriba paymentStatus='paid' en Firestore.
  const handleBold = async () => {
    setBoldError('')
    setSubmitError('')
    let id = bookingId
    if (!id) {
      id = await submitBooking('bold')
      if (!id) return // submitError ya se seteó
    }
    setBoldFlow('preparing')
  }

  // Cuando boldFlow pasa a 'preparing', el sub-pane "Completa tu pago"
  // se renderiza y boldMountRef.current existe. Aquí llamamos al callable
  // y montamos el botón Bold dentro de ese contenedor (no en document.body).
  //
  // IMPORTANTE: incluir `bookingDoc` en deps. En la primera transición
  // boldFlow:'idle'→'preparing', `bookingDoc` aún está null (useDoc
  // todavía cargando) y el guard de render muestra "Verificando…" en vez
  // del sub-pane, así que el ref no existe todavía. Cuando llega el
  // snapshot y bookingDoc se llena, este effect se re-ejecuta con el ref
  // ya montado. La guarda interna `if (boldFlow !== 'preparing')` evita
  // doble ejecución después de pasar a 'mounted'.
  useEffect(() => {
    if (boldFlow !== 'preparing' || !bookingId) return
    const target = boldMountRef.current
    if (!target) return
    let cancelled = false
    ;(async () => {
      try {
        await startBoldCheckout({
          booking: { ...buildBookingPayload('bold'), id: bookingId, total: amountPaid },
          mountEl: target,
        })
        if (!cancelled) setBoldFlow('mounted')
      } catch (e) {
        if (cancelled) return
        console.error(e)
        setBoldError(e?.message || 'No se pudo iniciar el pago online.')
        setBoldFlow('error')
      }
    })()
    return () => { cancelled = true }
    // buildBookingPayload depende de selectedService/sedeId/etc; el contrato
    // de re-ejecución es: dispara cuando boldFlow, bookingId o bookingDoc
    // cambien (este último es el que destraba el ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boldFlow, bookingId, bookingDoc])

  const retryBold = () => {
    setBoldError('')
    setBoldFlow('preparing')
  }

  const cancelBoldAndBack = () => {
    setBoldError('')
    setBoldFlow('idle')
    setBookingId(null)
    // limpiar el ref param de la URL si llegamos por redirect
    if (refFromUrl) navigate('/reservar/wizard', { replace: true })
  }

  const handleWhatsApp = async () => {
    const id = bookingId || (await submitBooking('whatsapp'))
    if (!id) return
    const payload = buildBookingPayload('whatsapp')
    const wa = buildWhatsAppPaymentMessage(
      { ...payload, id, sede: SEDE_BY_ID[sedeId]?.name || sedeId, total: amountPaid },
      settingsGeneral?.whatsapp || '',
    )
    window.open(wa, '_blank', 'noopener')
  }

  // ==========================================================
  // Renders condicionales post-creación de reserva
  // ==========================================================

  // Mientras llega el snapshot inicial del doc (refresco por redirect,
  // por ejemplo), un placeholder corto.
  if (bookingId && bookingLoading && !bookingDoc) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <p className="confirm__sub">Verificando tu reserva…</p>
        </div>
      </section>
    )
  }

  // CASO 1 — WhatsApp: la reserva queda en 'pending' y el cliente coordina
  // por chat. Se muestra "Reserva registrada" inmediatamente porque ese
  // canal no requiere pago digital.
  if (bookingId && bookingDoc && isWhatsAppFlow) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <div className="confirm__icon" aria-hidden="true">✓</div>
          <h1 className="confirm__title">¡Reserva registrada!</h1>
          <p className="confirm__sub">
            Tu número de reserva es <strong>{bookingId.slice(0, 8).toUpperCase()}</strong>.
            Te confirmaremos por WhatsApp en menos de 24 horas.
          </p>
          <div className="confirm__summary">
            <div><span>Servicio</span><strong>{bookingDoc.serviceName}</strong></div>
            <div><span>Sede</span><strong>{bookingDoc.sedeName}</strong></div>
            <div><span>Fecha</span><strong>{bookingDoc.date} · {bookingDoc.time}</strong></div>
            <div><span>Total reserva</span><strong>{formatCOP(bookingDoc.total)}</strong></div>
          </div>
          <div className="confirm__actions">
            <Link to="/" className="btn btn--primary">Volver al inicio</Link>
            <button type="button" className="btn btn--outline confirm__again" onClick={() => navigate(0)}>
              Hacer otra reserva
            </button>
          </div>
        </div>
      </section>
    )
  }

  // CASO 2 — Bold pagado: el webhook escribió paymentStatus='paid' /
  // status='confirmed'. La UI reacciona al cambio en Firestore.
  if (bookingId && bookingDoc && isBoldFlow && isPaid) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <div className="confirm__icon" aria-hidden="true">✓</div>
          <h1 className="confirm__title">¡Pago confirmado!</h1>
          <p className="confirm__sub">
            Tu reserva <strong>{bookingId.slice(0, 8).toUpperCase()}</strong> está
            confirmada. Te enviaremos los detalles del vuelo por WhatsApp.
          </p>
          <div className="confirm__summary">
            <div><span>Servicio</span><strong>{bookingDoc.serviceName}</strong></div>
            <div><span>Sede</span><strong>{bookingDoc.sedeName}</strong></div>
            <div><span>Fecha</span><strong>{bookingDoc.date} · {bookingDoc.time}</strong></div>
            <div><span>Pagado</span><strong>{formatCOP(bookingDoc.amountPaid ?? bookingDoc.total)}</strong></div>
          </div>
          <div className="confirm__actions">
            <Link to="/" className="btn btn--primary">Volver al inicio</Link>
            <button type="button" className="btn btn--outline confirm__again" onClick={() => navigate(0)}>
              Hacer otra reserva
            </button>
          </div>
        </div>
      </section>
    )
  }

  // CASO 3 — Bold rechazado/anulado: el webhook reportó declined/voided.
  // Damos opción de reintentar (genera nueva orden, reusa la misma reserva).
  if (bookingId && bookingDoc && isBoldFlow && isDeclined) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <div className="confirm__icon confirm__icon--warn" aria-hidden="true">!</div>
          <h1 className="confirm__title">Pago no completado</h1>
          <p className="confirm__sub">
            Bold reportó que tu pago fue {bookingDoc.paymentStatus === 'voided' ? 'anulado' : 'rechazado'}.
            Puedes intentar de nuevo o pagar por WhatsApp.
          </p>
          <div className="confirm__actions">
            <button type="button" className="btn btn--primary" onClick={retryBold}>
              Reintentar pago con Bold
            </button>
            <button type="button" className="btn btn--outline" onClick={cancelBoldAndBack}>
              Volver
            </button>
          </div>
        </div>
      </section>
    )
  }

  // CASO 4 — Bold pendiente: la reserva existe en 'pending' y aún no llegó
  // confirmación del webhook. Mostramos el botón de Bold y un mensaje de
  // espera. Cuando el webhook escriba 'paid', el render se va al CASO 2
  // automáticamente porque bookingDoc se actualiza por onSnapshot.
  if (bookingId && bookingDoc && isBoldFlow && !isPaid && !isDeclined) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <p className="section-eyebrow">Paso final</p>
          <h1 className="confirm__title confirm__title--sm">Completa tu pago</h1>
          <p className="confirm__sub">
            Tu reserva <strong>{bookingId.slice(0, 8).toUpperCase()}</strong> está
            apartada. Pulsa el botón de Bold para abrir el checkout seguro y
            completar el pago.
          </p>

          <div className="confirm__summary">
            <div><span>Servicio</span><strong>{bookingDoc.serviceName}</strong></div>
            <div><span>Sede</span><strong>{bookingDoc.sedeName}</strong></div>
            <div><span>Fecha</span><strong>{bookingDoc.date} · {bookingDoc.time}</strong></div>
            <div><span>A pagar</span><strong>{formatCOP(bookingDoc.amountPaid ?? bookingDoc.total)}</strong></div>
          </div>

          {boldFlow === 'error' ? (
            <div className="bold-flow-error" role="alert">
              <p>{boldError || 'No se pudo iniciar el pago online.'}</p>
              <div className="confirm__actions">
                <button type="button" className="btn btn--primary" onClick={retryBold}>
                  Intentar de nuevo
                </button>
                <button type="button" className="btn btn--outline" onClick={cancelBoldAndBack}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bold-flow-mount" ref={boldMountRef}>
                {boldFlow === 'preparing' && (
                  <p className="bold-flow-loading">Preparando botón de pago seguro…</p>
                )}
              </div>
              <p className="bold-flow-hint">
                {boldFlow === 'mounted'
                  ? 'Pulsa el botón de Bold para abrir el checkout y completar tu pago. Esta pantalla se actualiza sola cuando Bold confirme el pago.'
                  : 'Un momento mientras conectamos con Bold…'}
              </p>
              <button type="button" className="btn btn--outline" onClick={cancelBoldAndBack}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="booking">
      <div className="booking__topbar">
        <Link to="/" className="booking__logo">
          <span className="booking__logo-mark">▲</span>
          Fly Parapente Tour
        </Link>
        <span className="booking__total-mini">Total: {formatCOP(total)}</span>
      </div>

      <div className="container booking__container">
        <Stepper step={step} />

        <div className="booking__panel">
          {step === 0 && (
            <div className="step-pane">
              <h2 className="step-pane__title">Elige tu experiencia</h2>
              <p className="step-pane__lead">
                Tres formas de vivir el parapente. Elige la que más te inspira.
              </p>
              <div className="booking__cards">
                {(services || []).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`booking-card ${selectedService?.id === s.id ? 'booking-card--selected' : ''}`}
                    onClick={() => setSelectedService(s)}
                  >
                    {s.imageUrl && (
                      <div
                        className="booking-card__image"
                        style={{ backgroundImage: `url(${s.imageUrl})` }}
                      />
                    )}
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <span className="booking-card__price">{formatCOP(s.price)}</span>
                  </button>
                ))}
              </div>
              {services?.length === 0 && (
                <p className="booking__hint">
                  No hay servicios activos aún. El administrador puede inicializar
                  datos desde el panel.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="step-pane">
              <h2 className="step-pane__title">Sede y fecha</h2>
              <p className="step-pane__lead">Elige dónde y cuándo quieres volar.</p>

              <div className="sede-grid">
                {SEDES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`sede-btn ${sedeId === s.id ? 'sede-btn--selected' : ''}`}
                    onClick={() => {
                      setSedeId(s.id)
                      setDate('')
                      setTime('')
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2 C 7 2 4 6 4 10 C 4 16 12 22 12 22 C 12 22 20 16 20 10 C 20 6 17 2 12 2 Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                    <span>{s.name}</span>
                    <small>{s.region}</small>
                  </button>
                ))}
              </div>

              {sedeId && !sedeEnabled && (
                <p className="booking__hint" style={{ marginTop: 20 }}>
                  Esta sede no está operando en este momento. Elige otra o
                  contáctanos por WhatsApp.
                </p>
              )}
              {sedeId && sedeEnabled && (
                <div className="booking__cal-time">
                  <div className="booking__cal-col">
                    <h3 className="step-pane__sub">Selecciona fecha</h3>
                    <CalendarPicker
                      sedeId={sedeId}
                      sedeEnabled={sedeEnabled}
                      value={date}
                      onChange={(d) => {
                        setDate(d)
                        setTime('')
                        // En mobile el calendario ocupa casi toda la
                        // pantalla, así que el bloque de horarios queda
                        // debajo del fold. Hacemos un scroll INSTANTÁNEO
                        // (sin behavior: 'smooth') porque la animación
                        // de scroll en iOS dispara el colapso de la URL
                        // bar, lo que causaba un hipo de red mientras
                        // los snapshots de Firestore se re-emitían
                        // → se veían los horarios parpadear y desaparecer.
                        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
                          requestAnimationFrame(() => {
                            timeColRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
                          })
                        }
                      }}
                    />
                  </div>
                  <div className="booking__time-col" ref={timeColRef}>
                    <h3 className="step-pane__sub">Horario</h3>
                    <TimePicker
                      sedeId={sedeId}
                      date={date}
                      schedule={schedule}
                      scheduleLoading={scheduleLoading}
                      value={time}
                      onChange={setTime}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="step-pane">
              <h2 className="step-pane__title">Adicionales</h2>
              <p className="step-pane__lead">Personaliza tu experiencia. (Opcional)</p>
              <div className="addons">
                {(additionals || []).map((a) => {
                  const on = !!pickedAdd[a.id]
                  return (
                    <button
                      type="button"
                      key={a.id}
                      className={`addon ${on ? 'addon--on' : ''}`}
                      onClick={() => setPickedAdd((p) => ({ ...p, [a.id]: !p[a.id] }))}
                    >
                      <span className="addon__check">{on ? '✓' : '+'}</span>
                      <div className="addon__body">
                        <strong>{a.name}</strong>
                        <small>{a.description}</small>
                      </div>
                      <span className="addon__price">{formatCOP(a.price)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-pane">
              <h2 className="step-pane__title">Tus datos</h2>
              <p className="step-pane__lead">Necesitamos cómo contactarte.</p>
              <div className="form">
                <label className="field">
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    value={client.name}
                    onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Juan Pérez"
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={client.email}
                    onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))}
                    placeholder="juan@correo.com"
                  />
                </label>
                <label className="field">
                  <span>Teléfono / WhatsApp</span>
                  <input
                    type="tel"
                    value={client.phone}
                    onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="+57 300 000 0000"
                  />
                </label>
              </div>

              <div className="summary">
                <h3>Resumen</h3>
                <div className="summary__row"><span>Servicio</span><strong>{selectedService?.name}</strong></div>
                <div className="summary__row"><span>Sede</span><strong>{SEDE_BY_ID[sedeId]?.name}</strong></div>
                <div className="summary__row"><span>Fecha</span><strong>{date} · {time}</strong></div>
                {pickedAdditionalsList.map((a) => (
                  <div key={a.id} className="summary__row">
                    <span>+ {a.name}</span><strong>{formatCOP(a.price)}</strong>
                  </div>
                ))}
                <div className="summary__row summary__row--total">
                  <span>Total</span><strong>{formatCOP(total)}</strong>
                </div>
              </div>
            </div>
          )}

          {step === 4 && !bookingId && (
            <div className="step-pane">
              <h2 className="step-pane__title">Confirma y paga</h2>
              <p className="step-pane__lead">Elige cuánto pagar ahora y el método.</p>

              <h3 className="step-pane__sub">¿Cuánto quieres pagar ahora?</h3>
              <div className="pay-amount">
                <button
                  type="button"
                  className={`pay-amount__opt ${paymentType === 'full' ? 'pay-amount__opt--on' : ''}`}
                  onClick={() => setPaymentType('full')}
                >
                  <span className="pay-amount__label">Pago completo</span>
                  <span className="pay-amount__value">{formatCOP(total)}</span>
                  <small>Cubres toda la experiencia ahora.</small>
                </button>
                <button
                  type="button"
                  className={`pay-amount__opt ${paymentType === 'partial' ? 'pay-amount__opt--on' : ''}`}
                  onClick={() => setPaymentType('partial')}
                >
                  <span className="pay-amount__label">Anticipo 50%</span>
                  <span className="pay-amount__value">{formatCOP(Math.round(total / 2))}</span>
                  <small>Saldo: {formatCOP(total - Math.round(total / 2))} el día del vuelo.</small>
                </button>
              </div>

              <h3 className="step-pane__sub">Método de pago</h3>
              <div className="pay-options">
                {/* boldActive vive en settings/general (lectura pública).
                    No leemos settings/bold directamente porque esa colección
                    es admin-only por contener la secretKey. Un visitante sin
                    sesión no veía este botón antes — esto lo arregla. */}
                {settingsGeneral?.boldActive && (
                  <button
                    type="button"
                    className="btn btn--primary pay-btn"
                    onClick={handleBold}
                    disabled={submitting}
                  >
                    {submitting ? 'Procesando…' : `Pagar ${formatCOP(amountPaid)} online (Bold)`}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--outline pay-btn pay-btn--wa"
                  onClick={handleWhatsApp}
                  disabled={submitting}
                >
                  Pagar {formatCOP(amountPaid)} por WhatsApp
                </button>
              </div>

              {submitError && (
                <div className="booking__error" role="alert">
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="booking__nav">
          {step > 0 && !bookingId && (
            <button
              type="button"
              className="btn btn--outline booking__back"
              onClick={() => setStep((s) => s - 1)}
            >
              ← Atrás
            </button>
          )}
          {step < 4 && (
            <button
              type="button"
              className="btn btn--primary booking__next"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar →
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default Booking
