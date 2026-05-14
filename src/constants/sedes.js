export const SEDES = [
  { id: 'bucaramanga', name: 'Bucaramanga', region: 'Santander' },
  { id: 'antioquia', name: 'Antioquia', region: 'Medellín y alrededores' },
  { id: 'cundinamarca', name: 'Cundinamarca', region: 'Sopó · Sasaima' },
  { id: 'valle-del-cauca', name: 'Valle del Cauca', region: 'Roldanillo · Cali' },
]

export const SEDE_BY_ID = Object.fromEntries(SEDES.map((s) => [s.id, s]))

// Slot model: { time: 'HH:MM', cupos: number }. Backwards-compatible with the
// legacy ["09:00", "10:00", ...] string array (old docs auto-promote to cupos: 1).
export const DEFAULT_SLOT_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
export const ALL_SLOT_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
export const DEFAULT_CUPOS = 2

export const DEFAULT_SLOTS = DEFAULT_SLOT_TIMES.map((time) => ({ time, cupos: DEFAULT_CUPOS }))

export function normalizeSlots(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      if (typeof s === 'string') return { time: s, cupos: 1 }
      if (s && typeof s === 'object' && s.time) {
        return { time: s.time, cupos: Number(s.cupos) || 1 }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.time.localeCompare(b.time))
}

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/admin/reservas', label: 'Reservas', icon: 'calendar' },
  { to: '/admin/calendario', label: 'Calendario', icon: 'calendar-grid' },
  { to: '/admin/servicios', label: 'Servicios', icon: 'parapente' },
  { to: '/admin/adicionales', label: 'Adicionales', icon: 'plus' },
  { to: '/admin/testimonios', label: 'Testimonios', icon: 'star' },
  { to: '/admin/galeria', label: 'Galería', icon: 'image' },
  { to: '/admin/ajustes', label: 'Ajustes', icon: 'settings' },
]

export const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0)
