/**
 * Observabilidad — envoltura opcional sobre Sentry.
 *
 * Activación: define VITE_SENTRY_DSN en .env.local (y opcionalmente
 * VITE_SENTRY_ENV). Si no hay DSN, las funciones son no-ops y el
 * paquete @sentry/react NUNCA se carga (lazy import). Esto deja la
 * wiring lista sin agregar peso al bundle hasta que el cliente la
 * active.
 *
 * Uso típico:
 *   import { initObservability, reportError } from './services/observability'
 *   initObservability()
 *   try { ... } catch (e) { reportError(e, { where: 'createBooking' }) }
 */

const DSN = import.meta.env.VITE_SENTRY_DSN
const ENV = import.meta.env.VITE_SENTRY_ENV || (import.meta.env.PROD ? 'production' : 'development')

let sentryRef = null
let initPromise = null

async function ensureLoaded() {
  if (!DSN) return null
  if (sentryRef) return sentryRef
  if (initPromise) return initPromise
  initPromise = import('@sentry/react')
    .then((mod) => {
      mod.init({
        dsn: DSN,
        environment: ENV,
        tracesSampleRate: 0.1,
      })
      sentryRef = mod
      return mod
    })
    .catch((err) => {
      // Si Sentry no está instalado en node_modules, no rompemos la app.
      console.warn('[observability] Sentry no disponible:', err.message)
      return null
    })
  return initPromise
}

export function initObservability() {
  if (!DSN) return
  ensureLoaded()
}

export function reportError(error, context) {
  if (!DSN) return
  ensureLoaded().then((mod) => {
    if (!mod) return
    if (context) mod.setContext('parfly', context)
    mod.captureException(error)
  })
}

export function reportMessage(message, level = 'info') {
  if (!DSN) return
  ensureLoaded().then((mod) => {
    if (!mod) return
    mod.captureMessage(message, level)
  })
}
