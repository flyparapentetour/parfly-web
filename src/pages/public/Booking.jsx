import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, serverTimestamp, where } from 'firebase/firestore'
import { useCollection } from '../../hooks/useCollection'
import { useDoc } from '../../hooks/useDoc'
import { db } from '../../firebase/config'
import { createBooking } from '../../services/bookings'
import { startBoldCheckout, buildTransferWhatsAppMessage } from '../../services/bold'
import { resolveSlots, sedeBase, todayISO } from '../../services/schedule'
import {
  SEDES,
  SEDE_BY_ID,
  formatCOP,
} from '../../constants/sedes'
import { computePricing, clampPeople, flowLimits } from '../../lib/pricing'
import TermsModal from '../../components/booking/TermsModal'
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
  //
  // PAR-04: ya no consultamos `bookings` para contar cupos usados — el
  // pivot v2 elimina el badge visible "X cupos" y, con él, la query que
  // de todas formas fallaba silently para visitantes anónimos (rules
  // exigen isSignedIn para list). El bloqueo de día/sede sigue activo a
  // nivel `resolveSlots` (devuelve [] → empty state).
  const [daySnap, setDaySnap] = useState(null) // { blocked, override }

  useEffect(() => {
    if (!sedeId || !date) {
      setDaySnap(null)
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
      } catch (e) {
        // OJO: no reseteamos `daySnap` si la red tiene un hipo en mobile
        // durante el scroll. Preservar el último estado bueno evita el
        // parpadeo de horarios.
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
      {slots.map((s) => (
        <button
          type="button"
          key={s.time}
          className={`time-pill ${value === s.time ? 'time-pill--selected' : ''}`}
          onClick={() => onChange(s.time)}
        >
          <span>{s.time}</span>
        </button>
      ))}
    </div>
  )
}

function Booking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const timeColRef = useRef(null)
  const boldMountRef = useRef(null)
  // PAR-07 (BTN-001 fix): guard de un solo disparo para el mount del
  // botón Bold. El useEffect que monta el botón depende de bookingDoc
  // (vía bookingDocReady) para saber cuándo aparece el ref del contenedor,
  // pero NO queremos re-mountar cada vez que Firestore re-emite el doc
  // (resolución de serverTimestamp, update del webhook, etc.). Este ref
  // se resetea en retry/cancel/error para permitir reintentos limpios.
  const boldMountedRef = useRef(false)
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
  // PAR-06: T&C aceptación. termsAccepted se mantiene durante toda la
  // sesión del wizard (no se resetea al navegar entre steps). El modal
  // sólo controla visibilidad del texto.
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  // PAR-07: paymentType ('full' | 'partial') se eliminó. El pivot v2 colapsa
  // las 4 combinaciones de antes (full/partial × Bold/WhatsApp) en 2 opciones
  // explícitas: Bold 100% o transferencia 50% (WhatsApp). El método elegido
  // determina la cantidad sin que el usuario tenga que tildar nada extra.
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
  // PAR-06: T&C texto + versión. termsVersion se persiste con cada booking
  // junto a termsAcceptedAt para evidencia en caso de disputa.
  const { data: legal } = useDoc('settings/legal')
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
  // PAR-07: el método 'transfer_50' es el nuevo (Opción B). Mantenemos
  // compat con 'whatsapp' (bookings pre-pivot que aún se persistían así)
  // para no romper la pantalla de confirmación de reservas antiguas.
  const isTransferFlow =
    bookingDoc?.paymentMethod === 'transfer_50' ||
    bookingDoc?.paymentMethod === 'whatsapp'
  const isBoldFlow = bookingDoc?.paymentMethod === 'bold' || (!!refFromUrl)
  // PAR-07 (BTN-001 fix): "ya llegó el snapshot inicial al menos una vez".
  // Se usa como dep del useEffect del mount Bold en lugar de bookingDoc
  // directo para evitar que onSnapshot re-emita y dispare un re-mount.
  const bookingDocReady = !!bookingDoc

  // Preselección de servicio desde la URL.
  //  - ?service=ID: enlace legacy (cards de Services.jsx).
  //  - ?flow=experience|livegroup: viene del ServicePicker (PAR-02). Ambos
  //    flows del pivot v2 montan sobre `vuelos-experience` (único servicio
  //    activo). El flag de descuento Live Group lo aplica PAR-03 leyendo
  //    `?flow=livegroup` directamente.
  const initialServiceId = searchParams.get('service') || ''
  const flow = searchParams.get('flow') || ''
  // numPeople: default flow-aware (1 para experience, 8 para livegroup).
  // Si la URL cambia de flow durante la sesión (navegación back al picker
  // y elegir el otro flow), re-clampear en render — patrón "ajustar state
  // cuando un input externo cambia" (React docs) en vez de useEffect, así
  // evitamos el render extra y la warning de set-state-in-effect.
  const [numPeople, setNumPeople] = useState(() =>
    clampPeople(flow, flow === 'livegroup' ? 8 : 1),
  )
  const [prevFlow, setPrevFlow] = useState(flow)
  if (flow !== prevFlow) {
    setPrevFlow(flow)
    setNumPeople((n) => clampPeople(flow, n))
  }
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

  // Pricing dual (PAR-03). `pricing` es el desglose completo: respeta
  // billingMode de cada adicional (per_person × N · per_booking 1×) y
  // aplica 30% off al subtotal de VUELOS sólo si flow==='livegroup'.
  const pricing = useMemo(
    () =>
      computePricing({
        flow,
        unitPrice: selectedService?.price || 0,
        numPeople,
        additionals: additionals || [],
        picked: pickedAdd,
      }),
    [flow, selectedService, numPeople, additionals, pickedAdd],
  )
  const total = pricing.total
  // PAR-07: monto del anticipo en transferencia (siempre 50%). Persistido
  // en cada booking aunque el método elegido sea Bold (facilita que el
  // operador convierta a transfer_50 desde admin sin recalcular).
  const amountDue50 = useMemo(() => Math.round(total / 2), [total])
  const amountDueRemainder = total - amountDue50

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
          client.phone.replace(/\D/g, '').length >= 7 &&
          termsAccepted &&
          !!legal?.termsVersion
        )
      default:
        return true
    }
  }, [step, selectedService, sedeId, date, time, client, termsAccepted, legal])

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
    // PAR-03: desglose completo del Pivot v2.
    flow: flow || 'experience',
    numPeople: pricing.numPeople,
    flightUnitPrice: selectedService?.price || 0,
    flightSubtotal: pricing.flightSubtotal,
    discountRate: pricing.discountRate,
    discountAmount: pricing.discountAmount,
    flightSubtotalFinal: pricing.flightSubtotalFinal,
    additionals: pricing.additionalsBreakdown,
    additionalsTotal: pricing.additionalsTotal,
    total: pricing.total,
    // PAR-07: split 50/50 siempre persistido. paymentStatus derivado del
    // método (pending_bold vs pending_transfer). La Cloud Function
    // generateBoldHash sigue leyendo `total` de Firestore — no halving
    // server-side porque ya no existe paymentType='partial'.
    paymentMethod,
    paymentStatus: paymentMethod === 'bold' ? 'pending_bold' : 'pending_transfer',
    amountDue50,
    amountDueRemainder,
    // PAR-06: prueba de aceptación T&C. El gate de canAdvance en step 3
    // garantiza que este punto sólo se alcanza con termsAccepted=true y
    // legal.termsVersion definido. serverTimestamp lo resuelve Firestore
    // al persistir, no la máquina del cliente.
    termsAcceptedAt: serverTimestamp(),
    termsVersion: legal?.termsVersion || 'unknown',
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

  // PAR-07 · BTN-001 fix
  // -------------------------------------------------------------------
  // Cuando boldFlow pasa a 'preparing', el sub-pane "Completa tu pago" se
  // renderiza y boldMountRef.current aparece. Aquí llamamos al callable y
  // montamos el botón Bold dentro de ese contenedor.
  //
  // Bug previo (BTN-001): el effect dependía de `bookingDoc` directo. Como
  // useDoc usa onSnapshot, Firestore re-emite el doc varias veces (al
  // resolverse el serverTimestamp local→server, al llegar updates del
  // webhook, etc.). Cada re-emit cancelaba el mount en curso con el flag
  // `cancelled`, y aunque el siguiente intento limpiaba scripts viejos,
  // el primer `setBoldFlow('mounted')` ya no se aplicaba (cancelled=true)
  // → la UI quedaba congelada en "Preparando botón de pago seguro…".
  //
  // Fix:
  //   1) dep `bookingDocReady` (boolean) en lugar de `bookingDoc` — sólo
  //      cambia false→true UNA VEZ cuando el snapshot inicial llega.
  //   2) Ref `boldMountedRef` como guard de un solo disparo — si el effect
  //      se re-ejecuta por cualquier motivo, no relanza el mount.
  //   3) No hay flag `cancelled` — el mount se ejecuta una vez y commit
  //      el estado 'mounted' incondicionalmente al resolver. Los retry y
  //      cancel limpian explícitamente boldMountedRef antes de re-entrar.
  useEffect(() => {
    if (boldFlow !== 'preparing' || !bookingId || !bookingDocReady) return
    if (boldMountedRef.current) return
    const target = boldMountRef.current
    if (!target) return
    boldMountedRef.current = true
    ;(async () => {
      try {
        await startBoldCheckout({
          booking: { id: bookingId },
          mountEl: target,
        })
        setBoldFlow('mounted')
      } catch (e) {
        console.error(e)
        boldMountedRef.current = false
        setBoldError(e?.message || 'No se pudo iniciar el pago online.')
        setBoldFlow('error')
      }
    })()
  }, [boldFlow, bookingId, bookingDocReady])

  // Cleanup al desmontar el componente: si el usuario navega afuera mientras
  // el SDK estaba cargando, quitamos cualquier script Bold que haya quedado
  // colgando en el DOM (startBoldCheckout también limpia antes de mountar,
  // pero esto evita acumulación si el usuario rebota varias veces).
  useEffect(() => {
    return () => {
      document
        .querySelectorAll('script[data-bold-button], script[src*="boldPaymentButton.js"]')
        .forEach((n) => n.remove())
      document.querySelectorAll('bold-payment-button, button#boldPaymentButton').forEach((n) => n.remove())
    }
  }, [])

  const retryBold = () => {
    setBoldError('')
    boldMountedRef.current = false
    setBoldFlow('preparing')
  }

  const cancelBoldAndBack = () => {
    setBoldError('')
    boldMountedRef.current = false
    setBoldFlow('idle')
    setBookingId(null)
    // limpiar el ref param de la URL si llegamos por redirect
    if (refFromUrl) navigate('/reservar/wizard', { replace: true })
  }

  // PAR-07 Opción B (fresh): crea booking pending_transfer y abre WhatsApp
  // con el resumen + pedido de datos bancarios para pagar el 50%.
  const handleTransfer = async () => {
    setSubmitError('')
    if (!settingsGeneral?.whatsapp) {
      setSubmitError('WhatsApp no está configurado por el operador.')
      return
    }
    const id = bookingId || (await submitBooking('transfer_50'))
    if (!id) return
    const wa = buildTransferWhatsAppMessage(
      {
        id,
        flow: flow || 'experience',
        numPeople: pricing.numPeople,
        sedeName: SEDE_BY_ID[sedeId]?.name || sedeId,
        date,
        time,
        total: pricing.total,
      },
      settingsGeneral.whatsapp,
    )
    if (wa) window.open(wa, '_blank', 'noopener')
  }

  // PAR-07 fallback: si Bold falló, ofrecemos al cliente la opción de
  // coordinar el 50% por transferencia con la reserva ya creada
  // (pending_bold). NO actualizamos el doc — las rules no permiten update
  // anónimo. El operador reconcilia el método cuando reciba el WhatsApp
  // (cambia paymentMethod → transfer_50 en admin/reservas).
  const handleTransferFromBoldFallback = () => {
    if (!settingsGeneral?.whatsapp || !bookingId) return
    const wa = buildTransferWhatsAppMessage(
      {
        id: bookingId,
        flow: bookingDoc?.flow || flow || 'experience',
        numPeople: bookingDoc?.numPeople || pricing.numPeople,
        sedeName: bookingDoc?.sedeName || SEDE_BY_ID[sedeId]?.name || sedeId,
        date: bookingDoc?.date || date,
        time: bookingDoc?.time || time,
        total: bookingDoc?.total || pricing.total,
      },
      settingsGeneral.whatsapp,
    )
    if (wa) window.open(wa, '_blank', 'noopener')
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

  // CASO 1 — Transferencia 50% (Opción B): la reserva queda en
  // paymentStatus 'pending_transfer'. El cliente ya tiene WhatsApp abierto
  // en otra tab coordinando el anticipo. Le mostramos confirmación con el
  // ID + el split 50/50 explícito (anticipo ahora, saldo el día del vuelo).
  // Compat: bookings legacy con paymentMethod='whatsapp' también caen acá.
  if (bookingId && bookingDoc && isTransferFlow) {
    const due50 = bookingDoc.amountDue50 ?? Math.round((bookingDoc.total || 0) / 2)
    const dueRem = bookingDoc.amountDueRemainder ?? ((bookingDoc.total || 0) - due50)
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <div className="confirm__icon" aria-hidden="true">✓</div>
          <h1 className="confirm__title">¡Reserva registrada!</h1>
          <p className="confirm__sub">
            Tu número de reserva es <strong>{bookingId.slice(0, 8).toUpperCase()}</strong>.
            Te abrimos WhatsApp con el resumen. Coordinamos el 50% por
            transferencia y confirmamos los datos bancarios en el chat.
          </p>
          <div className="confirm__summary">
            <div><span>Servicio</span><strong>{bookingDoc.serviceName}</strong></div>
            <div><span>Sede</span><strong>{bookingDoc.sedeName}</strong></div>
            <div><span>Fecha</span><strong>{bookingDoc.date} · {bookingDoc.time}</strong></div>
            <div><span>Total reserva</span><strong>{formatCOP(bookingDoc.total)}</strong></div>
            <div><span>Anticipo (50%)</span><strong>{formatCOP(due50)}</strong></div>
            <div><span>Saldo el día del vuelo</span><strong>{formatCOP(dueRem)}</strong></div>
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
  // PAR-07: además de reintentar, ofrecemos el fallback de transferencia
  // 50% por WhatsApp (salida segura sin necesidad de Bold).
  if (bookingId && bookingDoc && isBoldFlow && isDeclined) {
    return (
      <section className="booking confirm">
        <div className="container confirm__inner">
          <div className="confirm__icon confirm__icon--warn" aria-hidden="true">!</div>
          <h1 className="confirm__title">Pago no completado</h1>
          <p className="confirm__sub">
            Bold reportó que tu pago fue {bookingDoc.paymentStatus === 'voided' ? 'anulado' : 'rechazado'}.
            Puedes intentar de nuevo, coordinar el 50% por WhatsApp, o cancelar.
          </p>
          <div className="confirm__actions">
            <button type="button" className="btn btn--primary" onClick={retryBold}>
              Reintentar pago con Bold
            </button>
            <button
              type="button"
              className="btn btn--outline pay-btn--wa"
              onClick={handleTransferFromBoldFallback}
              disabled={!settingsGeneral?.whatsapp}
            >
              Pagar 50% por WhatsApp
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
                {/* PAR-07: salida segura cuando Bold falla — coordina por
                    WhatsApp el 50% por transferencia con el operador. */}
                <button
                  type="button"
                  className="btn btn--outline pay-btn--wa"
                  onClick={handleTransferFromBoldFallback}
                  disabled={!settingsGeneral?.whatsapp}
                >
                  Pagar 50% por WhatsApp
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

          {step === 2 && (() => {
            const limits = flowLimits(flow)
            return (
            <div className="step-pane">
              <h2 className="step-pane__title">Personas y adicionales</h2>
              <p className="step-pane__lead">
                {flow === 'livegroup'
                  ? `Live Group: mínimo ${limits.min}, máximo ${limits.max} personas. 30% off al subtotal de vuelos.`
                  : `Vuelo individual o pequeño grupo: hasta ${limits.max} personas.`}
              </p>

              <h3 className="step-pane__sub">¿Cuántas personas vuelan?</h3>
              <div className="personas-stepper" role="group" aria-label="Cantidad de personas">
                <button
                  type="button"
                  className="personas-stepper__btn"
                  onClick={() => setNumPeople((n) => clampPeople(flow, n - 1))}
                  disabled={numPeople <= limits.min}
                  aria-label="Una persona menos"
                >
                  −
                </button>
                <span className="personas-stepper__value" aria-live="polite">{numPeople}</span>
                <button
                  type="button"
                  className="personas-stepper__btn"
                  onClick={() => setNumPeople((n) => clampPeople(flow, n + 1))}
                  disabled={numPeople >= limits.max}
                  aria-label="Una persona más"
                >
                  +
                </button>
                <small className="personas-stepper__hint">
                  Mín {limits.min} · Máx {limits.max}
                </small>
              </div>

              <h3 className="step-pane__sub">Adicionales (opcional)</h3>
              <div className="addons">
                {(additionals || []).map((a) => {
                  const on = !!pickedAdd[a.id]
                  // per_person muestra el precio multiplicado por personas para que
                  // el usuario vea el cargo real antes de seleccionar.
                  const qty = a.billingMode === 'per_person' ? numPeople : 1
                  const lineTotal = (a.price || 0) * qty
                  // PAR-05: meta visible con el billingMode + cálculo vivo.
                  //  - per_booking          → "$X · por reserva"
                  //  - per_person, N=1      → "$X · por persona"
                  //  - per_person, N>1      → "$X × N · por persona"
                  // (El total grande arriba es siempre lineTotal.)
                  const meta = a.billingMode === 'per_person'
                    ? (numPeople > 1
                        ? `${formatCOP(a.price)} × ${numPeople} · por persona`
                        : `${formatCOP(a.price)} · por persona`)
                    : `${formatCOP(a.price)} · por reserva`
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
                      <span className="addon__price-col">
                        <span className="addon__price">{formatCOP(lineTotal)}</span>
                        <small className="addon__meta">{meta}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            )
          })()}

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

              {/* PAR-06: T&C check + link inline al modal. El botón Continuar
                  queda disabled (canAdvance) hasta que el checkbox esté marcado
                  y settings/legal.termsVersion haya cargado. */}
              <label className="terms-check">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  Acepto los{' '}
                  <button
                    type="button"
                    className="terms-check__link"
                    onClick={() => setTermsModalOpen(true)}
                  >
                    términos y condiciones
                  </button>
                </span>
              </label>

              <div className="summary">
                <h3>Resumen</h3>
                <div className="summary__row"><span>Servicio</span><strong>{selectedService?.name}</strong></div>
                <div className="summary__row"><span>Sede</span><strong>{SEDE_BY_ID[sedeId]?.name}</strong></div>
                <div className="summary__row"><span>Fecha</span><strong>{date} · {time}</strong></div>
                <div className="summary__row">
                  <span>
                    Vuelos: {pricing.numPeople} × {formatCOP(selectedService?.price || 0)}
                  </span>
                  <strong>{formatCOP(pricing.flightSubtotal)}</strong>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="summary__row summary__row--discount">
                    <span>Descuento Live Group (30%)</span>
                    <strong>−{formatCOP(pricing.discountAmount)}</strong>
                  </div>
                )}
                {pricing.additionalsBreakdown.map((a) => (
                  <div key={a.id} className="summary__row">
                    <span>
                      + {a.name}
                      {a.billingMode === 'per_person' && ` (× ${a.quantity})`}
                    </span>
                    <strong>{formatCOP(a.lineTotal)}</strong>
                  </div>
                ))}
                {pricing.additionalsBreakdown.length > 0 && (
                  <div className="summary__row summary__row--subtotal">
                    <span>Subtotal adicionales</span>
                    <strong>{formatCOP(pricing.additionalsTotal)}</strong>
                  </div>
                )}
                <div className="summary__row summary__row--total">
                  <span>Total</span><strong>{formatCOP(total)}</strong>
                </div>
              </div>
            </div>
          )}

          {step === 4 && !bookingId && (
            <div className="step-pane">
              <h2 className="step-pane__title">Confirma y paga</h2>
              <p className="step-pane__lead">
                Elegí cómo querés completar el pago de tu reserva.
              </p>

              {/* PAR-07: 2 opciones de pago claramente separadas (pivot v2).
                  A — Bold 100% online. B — Transferencia 50% coordinada por
                  WhatsApp con saldo el día del vuelo. boldActive vive en
                  settings/general (lectura pública); settings/bold es admin-only
                  por contener la secretKey. */}
              <div className="pay-options-v2">
                <div className="pay-option pay-option--bold">
                  <h3 className="pay-option__title">💳 Pago completo por Bold</h3>
                  <div className="pay-option__amount">
                    <span className="pay-option__label">Total</span>
                    <strong className="pay-option__value">{formatCOP(total)}</strong>
                  </div>
                  <p className="pay-option__desc">
                    Pagás el 100% ahora con tarjeta, PSE u otros métodos
                    digitales. La reserva queda confirmada al instante cuando
                    Bold confirme el pago.
                  </p>
                  {settingsGeneral?.boldActive ? (
                    <button
                      type="button"
                      className="btn btn--primary pay-option__cta"
                      onClick={handleBold}
                      disabled={submitting}
                    >
                      {submitting ? 'Procesando…' : 'Pagar con Bold'}
                    </button>
                  ) : (
                    <p className="pay-option__hint">
                      Bold no está habilitado por el momento.
                    </p>
                  )}
                </div>

                <div className="pay-option pay-option--transfer">
                  <h3 className="pay-option__title">
                    💬 50% por transferencia (WhatsApp)
                  </h3>
                  <div className="pay-option__amount">
                    <span className="pay-option__label">Anticipo</span>
                    <strong className="pay-option__value">{formatCOP(amountDue50)}</strong>
                  </div>
                  <p className="pay-option__desc">
                    Pagás el 50% ahora por transferencia. Saldo restante (
                    {formatCOP(amountDueRemainder)}) el día del vuelo.
                    Te abrimos WhatsApp para coordinar los datos bancarios.
                  </p>
                  <button
                    type="button"
                    className="btn btn--outline pay-option__cta pay-option__cta--wa"
                    onClick={handleTransfer}
                    disabled={submitting || !settingsGeneral?.whatsapp}
                  >
                    {submitting ? 'Procesando…' : 'Coordinar por WhatsApp'}
                  </button>
                  {!settingsGeneral?.whatsapp && (
                    <p className="pay-option__hint">
                      WhatsApp no está configurado por el operador.
                    </p>
                  )}
                </div>
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
              {step === 3 ? 'Continuar al pago →' : 'Continuar →'}
            </button>
          )}
        </div>
      </div>

      {termsModalOpen && (
        <TermsModal
          terms={legal?.terms}
          termsVersion={legal?.termsVersion}
          onClose={() => setTermsModalOpen(false)}
        />
      )}
    </section>
  )
}

export default Booking
