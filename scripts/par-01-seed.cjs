#!/usr/bin/env node
/**
 * PAR-01 · Seed Firestore para Pivot v2.
 *
 * Aplica:
 *   1. additionals: reemplaza la oferta completa.
 *      - Desactiva los 4 viejos (cena/fotografia/transporte/video): `active:
 *        false`. No se borran porque hay bookings históricos que los
 *        referencian (cada booking guarda snapshot, así que la data
 *        histórica queda íntegra).
 *      - Crea los 7 nuevos de la tabla canónica del Briefing (sección
 *        "📋 TABLA CANÓNICA — 7 adicionales del Pivot v2").
 *   2. services: desactiva clases/vuelos/paquetes (active:false) y crea
 *      `vuelos-experience` activo (Briefing D9).
 *   3. settings/servicePicker: 3 cards con copy del Briefing.
 *   4. settings/legal: sobrescribe `terms` con texto base del Briefing +
 *      `termsVersion: 'v1-2026-05'` (Opción A confirmada por Jefe D11).
 *
 * Auth: Firebase Auth REST con email/password del admin del panel.
 * Uso:
 *   ADMIN_EMAIL=admin@flyparapente.tours ADMIN_PWD='xxxxx' \
 *     node scripts/par-01-seed.cjs
 *
 * El API key (público) se lee de .env.local. La password nunca se
 * persiste; es solo argumento de proceso.
 */

const fs = require('node:fs')
const path = require('node:path')

const PROJECT_ID = 'parfly-prod'
const TERMS_VERSION = 'v1-2026-05'

/* ---------- carga API key desde .env.local ---------- */
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const raw = fs.readFileSync(envPath, 'utf8')
  const out = {}
  raw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  })
  return out
}

const env = loadEnvLocal()
const API_KEY = env.VITE_FIREBASE_API_KEY
if (!API_KEY) {
  console.error('Falta VITE_FIREBASE_API_KEY en .env.local')
  process.exit(1)
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PWD = process.env.ADMIN_PWD
if (!ADMIN_EMAIL || !ADMIN_PWD) {
  console.error('Uso: ADMIN_EMAIL=... ADMIN_PWD=... node scripts/par-01-seed.cjs')
  process.exit(1)
}

/* ---------- helpers Firestore REST ---------- */
async function signIn() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD, returnSecureToken: true }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Auth falló: ' + JSON.stringify(data))
  return data.idToken
}

// Convierte un objeto JS plano a fields Firestore REST.
function toFields(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toValue(v)
  }
  return fields
}
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) }
    return { doubleValue: v }
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } }
  throw new Error('Tipo no soportado: ' + typeof v)
}

// PATCH con updateMask para merge de campos específicos.
async function patchDoc(token, docPath, partial) {
  const fields = Object.keys(partial)
  const mask = fields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?${mask}&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: toFields(partial) }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PATCH ${docPath} falló: ${JSON.stringify(data)}`)
  return data
}

// PATCH sin updateMask = overwrite completo del doc.
async function setDoc(token, docPath, full) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?key=${API_KEY}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: toFields(full) }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`SET ${docPath} falló: ${JSON.stringify(data)}`)
  return data
}

/* ---------- datos ---------- */

const TERMS = `TÉRMINOS Y CONDICIONES — FLY PARAPENTE TOUR

1. NATURALEZA DE LA ACTIVIDAD
El parapente biplaza es una actividad de turismo de aventura que implica
riesgos inherentes propios de los deportes de aire libre. Al realizar esta
reserva, el cliente declara conocer y aceptar dichos riesgos.

2. REQUISITOS DEL PASAJERO
- Edad mínima: 8 años. Menores de edad deben ir acompañados de padre,
  madre o tutor legal con autorización firmada.
- Peso del pasajero: entre 25 kg y 110 kg.
- No se permite el vuelo a personas con problemas cardíacos, presión
  arterial alta no controlada, embarazo, cirugías recientes, lesiones de
  columna, epilepsia, vértigo severo o bajo efectos de alcohol o sustancias
  psicoactivas. El pasajero declara bajo su responsabilidad estar apto.

3. CONDICIONES CLIMÁTICAS
El vuelo está sujeto a condiciones meteorológicas seguras determinadas por
el piloto instructor. Si las condiciones no son aptas el día reservado, se
reprogramará sin costo adicional en una nueva fecha acordada con el cliente.
No se realiza reembolso por suspensión climática.

4. RESERVAS, PAGOS Y CANCELACIONES
- La reserva se confirma con el pago del 100% por pasarela Bold o con el
  50% anticipado por transferencia (saldo el día del vuelo).
- Cancelaciones con más de 48 horas: reembolso del 100% o reprogramación
  sin costo.
- Cancelaciones entre 48 y 24 horas: reembolso del 50%.
- Cancelaciones con menos de 24 horas o no-show: no hay reembolso.
- La reprogramación está sujeta a disponibilidad.

5. PUNTUALIDAD
El pasajero debe presentarse 30 minutos antes de la hora reservada en el
punto de encuentro de la sede correspondiente. La impuntualidad mayor a
20 minutos puede causar la pérdida del turno sin derecho a reembolso.

6. EQUIPO Y SEGURIDAD
Todo el equipo cuenta con certificación vigente. Los pilotos son
instructores certificados. Es obligatorio seguir las instrucciones del
piloto en briefing pre-vuelo, despegue, vuelo y aterrizaje.

7. AUTORIZACIÓN DE IMAGEN
El cliente autoriza a Fly Parapente Tour a utilizar las imágenes y videos
tomados durante la actividad con fines publicitarios y en redes sociales.
En caso de no aceptar esto, debe notificarlo por escrito antes del vuelo.

8. RESPONSABILIDAD
Fly Parapente Tour cuenta con seguro de responsabilidad civil. El cliente
exime a Fly Parapente Tour de responsabilidad por daños derivados de la
omisión de información relevante sobre su salud o del incumplimiento de
las instrucciones del piloto.

9. ACEPTACIÓN
Al marcar la casilla "Acepto los términos y condiciones" y completar la
reserva, el cliente declara haber leído, comprendido y aceptado estos
términos en su totalidad.

Última actualización: mayo 2026.
Contacto: info@flyparapente.tours`

// Pivot v2 reemplaza la oferta completa de additionals. Los 4 viejos
// (cena/fotografia/transporte/video) se DESACTIVAN — no se borran porque
// hay bookings históricos que los referencian; cada reserva guarda el
// snapshot del adicional al momento, así que desactivar los oculta del
// wizard público sin afectar la data histórica.
const ADDITIONAL_DEACTIVATE_IDS = ['cena', 'fotografia', 'transporte', 'video']

// 7 adicionales nuevos del Pivot v2. Tabla canónica del Briefing
// (sección "📋 TABLA CANÓNICA — 7 adicionales del Pivot v2 (PAR-01)").
const ADDITIONAL_NEW = [
  {
    id: 'foto-video-profesional',
    name: 'Foto + video profesional',
    description:
      'Video profesional de toda la actividad, con un set de fotos en los mejores paisajes.',
    price: 115000,
    billingMode: 'per_booking',
    active: true,
    order: 1,
  },
  {
    id: 'tiempo-adicional',
    name: 'Tiempo adicional',
    description: '15 minutos adicionales de vuelo.',
    price: 55000,
    billingMode: 'per_person',
    active: true,
    order: 2,
  },
  {
    id: 'conduccion-pasajero',
    name: 'Conducción del pasajero',
    description:
      'Si deseas entender cómo se maneja la vela del parapente y manejarla, puedes hacerlo siempre bajo supervisión de tu guía.',
    price: 50000,
    billingMode: 'per_person',
    active: true,
    order: 3,
  },
  {
    id: 'cartel-personalizado',
    name: 'Cartel personalizado en el aterrizaje',
    description:
      'Pancarta de 2,5 metros x 80 cm con mensaje personalizado que se mostrará en el aterrizaje del parapente.',
    price: 60000,
    billingMode: 'per_booking',
    active: true,
    order: 4,
  },
  {
    id: 'comida',
    name: 'Comida',
    description:
      'Ofrecemos desayuno, almuerzo, cena o brunch por ese valor fijo. Incluye entrada, refresco, plato fuerte, postre y bebida caliente.',
    price: 40000,
    billingMode: 'per_person',
    active: true,
    order: 5,
  },
  {
    id: 'plan-romantico',
    name: 'Plan romántico (por pareja)',
    description:
      'Ramo de 30 rosas, botella de champagne y set de fotos en pareja con portaretratos.',
    price: 180000,
    billingMode: 'per_booking',
    active: true,
    order: 6,
  },
  {
    id: 'plan-cumpleanos',
    name: 'Plan cumpleaños',
    description:
      'Pancarta de feliz cumpleaños en el aterrizaje, mini torta con vela tipo volcán y set de fotos con portaretrato.',
    price: 160000,
    billingMode: 'per_booking',
    active: true,
    order: 7,
  },
]

const SERVICE_DEACTIVATE_IDS = ['clases', 'vuelos', 'paquetes']

const VUELOS_EXPERIENCE = {
  id: 'vuelos-experience',
  name: 'Vuelo Experience',
  description:
    'Vuelo biplaza de 20 minutos con piloto profesional. Incluye acrobacias, video del instructor (2 min) y certificado de vuelo. Sin experiencia previa.',
  price: 150000,
  duration: 20,
  features: ['Video del instructor (2 min)', 'Acrobacias', 'Certificado de vuelo'],
  active: true,
  order: 1,
  icon: 'parapente',
  imageUrl: '',
  imageCloudinaryId: '',
}

const SERVICE_PICKER = {
  experience: {
    title: 'Vuelo Experience',
    description:
      '20 min · acrobacias · video del instructor · certificado de vuelo. Sin experiencia previa.',
    priceLabel: '$150.000',
    image: '',
  },
  courses: {
    title: 'Cursos de parapente',
    description:
      'Aprende a volar con instructores certificados. Programa personalizado por nivel — coordinamos contigo por WhatsApp.',
    whatsappMessage: 'Hola, me interesan los cursos de parapente.',
    image: '',
  },
  liveGroup: {
    title: 'Live Group (8+ personas)',
    description:
      'Reserva para grupos de 8 o más. 30% OFF aplicado al subtotal de los vuelos.',
    discountBadge: '−30% en vuelos',
    image: '',
  },
}

/* ---------- ejecución ---------- */
async function main() {
  console.log('1) Auth …')
  const token = await signIn()
  console.log('   ok')

  console.log('2a) additionals: desactivar los 4 viejos')
  for (const id of ADDITIONAL_DEACTIVATE_IDS) {
    await patchDoc(token, `additionals/${id}`, { active: false })
    console.log(`   - ${id}: active=false`)
  }

  console.log('2b) additionals: crear los 7 nuevos del Pivot v2')
  for (const a of ADDITIONAL_NEW) {
    const { id, ...body } = a
    await setDoc(token, `additionals/${id}`, body)
    console.log(`   - ${id}: ${a.name} · $${a.price} · ${a.billingMode}`)
  }

  console.log('3) services: desactivar viejos')
  for (const id of SERVICE_DEACTIVATE_IDS) {
    await patchDoc(token, `services/${id}`, { active: false })
    console.log(`   - ${id}: active=false`)
  }

  console.log('4) services/vuelos-experience: activo')
  await setDoc(token, 'services/vuelos-experience', VUELOS_EXPERIENCE)
  console.log('   ok')

  console.log('5) settings/servicePicker: 3 cards')
  await setDoc(token, 'settings/servicePicker', SERVICE_PICKER)
  console.log('   ok')

  console.log('6) settings/legal: overwrite (Opción A)')
  await setDoc(token, 'settings/legal', {
    terms: TERMS,
    termsVersion: TERMS_VERSION,
    updatedAt: new Date(),
  })
  console.log(`   ok · termsVersion=${TERMS_VERSION}`)

  console.log('\nPAR-01 OK.')
}

main().catch((e) => {
  console.error('FALLÓ:', e.message)
  process.exit(1)
})
