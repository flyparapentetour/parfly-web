// Defaults that ship with the build so the public site never appears empty
// before the admin saves anything in /settings/stats or /settings/faq.

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
