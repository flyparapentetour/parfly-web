// Defaults that ship with the build so the public site never appears empty
// before the admin saves anything in /settings/*.

export const DEFAULT_HOME_INTROS = {
  servicesEyebrow: 'Lo que ofrecemos',
  servicesTitle: 'Experiencias en el aire',
  servicesLead: 'Tres formas de vivir el parapente, diseñadas para cada nivel y cada momento. El precio que ves es el que pagas.',

  additionalsEyebrow: 'Personaliza tu vuelo',
  additionalsTitle: 'Mejora tu experiencia',
  additionalsLead: 'Foto profesional, video, transporte y más. Suma adicionales para vivirlo a tu manera.',
  additionalsCta: 'Ver adicionales',

  classesEyebrow: 'Aprende a volar',
  classesTitle: 'Programa de clases',
  classesLead: 'Formación progresiva con instructores certificados, desde tu primer vuelo en ladera hasta el vuelo libre autónomo.',
  classesCta: 'Conocer el programa',

  locationsEyebrow: 'Nuestras sedes',
  locationsTitle: 'Vuela por toda Colombia',
  locationsLead: 'Cuatro destinos de élite con vientos perfectos y paisajes únicos. Elige tu ciudad.',
}

export const DEFAULT_INCLUDED = {
  eyebrow: 'Todo en uno',
  title: '¿Qué incluye tu experiencia?',
  lead: 'No tienes que traer nada. Nosotros nos encargamos de todo para que solo te dediques a disfrutar.',
  items: [
    { icon: 'shield', title: 'Instructor certificado', text: 'Pilotos con licencia vigente que te guían desde el briefing hasta el aterrizaje.' },
    { icon: 'helmet', title: 'Equipo de seguridad', text: 'Casco, arnés y parapente biplaza revisados antes de cada vuelo.' },
    { icon: 'check', title: 'Briefing previo', text: 'Te explicamos qué esperar, cómo despegar y cómo disfrutarlo al máximo.' },
    { icon: 'umbrella', title: 'Seguro de vuelo', text: 'Póliza de accidentes activa desde el despegue hasta el aterrizaje.' },
    { icon: 'cloud', title: 'Monitoreo del clima', text: 'Si no hay condiciones seguras, reagendamos sin costo o devolvemos el anticipo.' },
    { icon: 'medal', title: 'Certificado de vuelo', text: 'Te entregamos un certificado digital de tu primer vuelo en parapente.' },
  ],
}

export const DEFAULT_CLASSES = {
  eyebrow: 'Aprende a volar',
  title: 'Programa de clases de parapente',
  lead: 'Formación progresiva con instructores certificados. Desde el primer vuelo en ladera hasta vuelos libres autónomos bajo estándares de seguridad internacionales.',
  priceFrom: 350000,
  priceLabel: 'Clases desde',
  durationLabel: 'Duración total',
  durationValue: '12 a 16 sesiones',
  groupLabel: 'Formato',
  groupValue: 'Personalizado (1 a 3 alumnos)',
  levels: [
    { n: '01', title: 'Iniciación', desc: 'Teoría básica, conocimiento del equipo y primeros vuelos en ladera con instructor. Aprendes a despegar, planear y aterrizar.' },
    { n: '02', title: 'Progresión', desc: 'Vuelos autónomos, meteorología, planificación de la jornada y técnicas avanzadas de despegue y aterrizaje en distintos terrenos.' },
    { n: '03', title: 'Avanzado', desc: 'Técnicas de vuelo libre, lectura de térmicas, vuelo de distancia, seguridad activa y maniobras de emergencia.' },
  ],
  whatsappPrompt: 'Hola, quiero información sobre las clases de parapente.',
  ctaLabel: 'Solicitar información por WhatsApp',
}

export const DEFAULT_SEDES = {
  bucaramanga: {
    name: 'Bucaramanga',
    region: 'Santander',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600&q=80',
    shortIntro: 'Vuela sobre el Cañón del Chicamocha, uno de los paisajes más impresionantes de Colombia.',
    description: 'Bucaramanga es la cuna del parapente colombiano. Vuelos sobre el Cañón del Chicamocha con vientos predecibles y temporada activa casi todo el año. Despegue a 1.500 m con vistas a un cañón de 2.000 m de profundidad.',
    highlights: [
      'Cañón del Chicamocha de fondo',
      'Temporada de vuelo todo el año',
      'Despegue y aterrizaje accesibles',
    ],
  },
  antioquia: {
    name: 'Antioquia',
    region: 'Medellín y alrededores',
    image: 'https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=1600&q=80',
    shortIntro: 'Sobrevuela las montañas de Antioquia con vista a Medellín y los valles paisas.',
    description: 'Volamos en San Félix y otros sitios cercanos a Medellín. Térmicas suaves, vientos constantes y la posibilidad de aterrizar con vista directa a la ciudad. Ideal para primer vuelo.',
    highlights: [
      'Vista a Medellín desde el aire',
      'Térmicas suaves todo el año',
      'A 40 min del centro de Medellín',
    ],
  },
  cundinamarca: {
    name: 'Cundinamarca',
    region: 'Sopó · Sasaima',
    image: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=1600&q=80',
    shortIntro: 'A una hora de Bogotá. Despega en Sopó o Sasaima y vuela sobre la sabana.',
    description: 'Para quienes están en Bogotá, Sopó y Sasaima son nuestras sedes más cercanas. Vuelos sobre la sabana, lagunas y bosques de niebla. Temporada principal entre diciembre y marzo.',
    highlights: [
      'A 1 hora de Bogotá',
      'Vista a la sabana cundiboyacense',
      'Combinable con planes de fin de semana',
    ],
  },
  'valle-del-cauca': {
    name: 'Valle del Cauca',
    region: 'Roldanillo · Cali',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    shortIntro: 'Roldanillo es uno de los mejores sitios del mundo para parapente.',
    description: 'Roldanillo tiene fama internacional: clima estable, vientos predecibles y térmicas potentes. Volamos sobre el valle del río Cauca con vista a la cordillera. Perfecto para vuelos largos.',
    highlights: [
      'Reconocido a nivel internacional',
      'Vuelos largos y térmicas potentes',
      'Cerca de Cali y Buga',
    ],
  },
}

export const DEFAULT_STATS = {
  flights: '+500',
  rating: '4.9',
  years: '8',
  sedes: '4',
  flightsLabel: 'Vuelos realizados',
  ratingLabel: 'Calificación Google',
  yearsLabel: 'Años de experiencia',
  sedesLabel: 'Sedes en Colombia',
}

export function mergeHomeIntros(data) {
  return { ...DEFAULT_HOME_INTROS, ...(data || {}) }
}
export function mergeIncluded(data) {
  const items = Array.isArray(data?.items) && data.items.length > 0 ? data.items : DEFAULT_INCLUDED.items
  return { ...DEFAULT_INCLUDED, ...(data || {}), items }
}
export function mergeClasses(data) {
  const levels = Array.isArray(data?.levels) && data.levels.length > 0 ? data.levels : DEFAULT_CLASSES.levels
  return { ...DEFAULT_CLASSES, ...(data || {}), levels }
}
export function mergeSede(data, sedeId) {
  const base = DEFAULT_SEDES[sedeId] || {}
  const node = data?.[sedeId] || {}
  return {
    ...base,
    ...node,
    highlights: Array.isArray(node.highlights) && node.highlights.length > 0 ? node.highlights : base.highlights || [],
  }
}

export const DEFAULT_FAQ = [
  {
    q: '¿Necesito experiencia previa?',
    a: 'No. Nuestros vuelos turísticos son biplaza con piloto certificado. Tú solo disfrutas del paisaje. Para clases sí enseñamos desde cero.',
  },
  {
    q: '¿Cuál es el peso máximo permitido?',
    a: 'El límite estándar es 110 kg. Si superas ese peso, escríbenos por WhatsApp para revisar la sede y equipo adecuados.',
  },
  {
    q: '¿Qué ropa debo usar?',
    a: 'Ropa cómoda, deportiva, zapatos cerrados (tenis o botas) y una chaqueta liviana. Si es temporada fría, abrígate. Evita faldas, sandalias o tacones.',
  },
  {
    q: '¿Cuánto dura la experiencia?',
    a: 'El vuelo dura entre 20 y 30 minutos según las condiciones. Sumando llegada, briefing y equipamiento, planea unas 2 horas en total.',
  },
  {
    q: '¿Qué pasa si el clima no es favorable?',
    a: 'La seguridad manda. Si el clima no permite volar, reagendamos sin costo o te devolvemos el anticipo. Confirmamos condiciones la mañana del vuelo.',
  },
  {
    q: '¿Puedo llevar acompañantes?',
    a: 'Sí. El acompañante puede esperar en la zona de despegue/aterrizaje. Si también quiere volar, agenda otro turno para él.',
  },
  {
    q: '¿Es seguro?',
    a: 'Sí. Pilotos con licencia vigente, equipos revisados periódicamente, seguro incluido y monitoreo del clima en tiempo real.',
  },
  {
    q: '¿Cómo recibo mis fotos y videos?',
    a: 'Si contrataste el adicional, te enviamos las fotos y video por WhatsApp o un enlace de Drive en las 24 horas siguientes al vuelo.',
  },
]
