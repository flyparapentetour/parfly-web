import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { ALL_SLOT_TIMES, DEFAULT_CUPOS, SEDES, normalizeSlots } from '../constants/sedes'

const SCHEDULE_DOC_PATH = 'settings/schedule'

export const DEFAULT_BASE_SLOTS = ALL_SLOT_TIMES.filter((t) => t !== '17:00').map((time) => ({
  time,
  cupos: DEFAULT_CUPOS,
}))

export function buildDefaultSchedule() {
  const out = {}
  SEDES.forEach((s) => {
    out[s.id] = { enabled: true, slots: DEFAULT_BASE_SLOTS }
  })
  return out
}

export function sedeBase(schedule, sedeId) {
  const node = schedule?.[sedeId]
  if (!node) return { enabled: true, slots: DEFAULT_BASE_SLOTS }
  return {
    enabled: node.enabled !== false,
    slots: normalizeSlots(node.slots),
  }
}

export async function ensureBaseScheduleExists() {
  const ref = doc(db, SCHEDULE_DOC_PATH)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const fresh = buildDefaultSchedule()
  await setDoc(ref, fresh)
  return fresh
}

export function isPastDate(iso, todayISO) {
  return iso < todayISO
}

export function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Resolve which slots apply for sede+date, applying the new "abierto por defecto" logic:
 *   1. Blocked date → []
 *   2. Past date → []
 *   3. Sede disabled → []
 *   4. Override doc in /availability/{sede}/slots/{date} → use that
 *   5. Otherwise → base schedule for sede
 *
 * Inputs are plain data so the caller can fetch with whatever hook fits.
 */
export function resolveSlots({ sedeId, date, baseSchedule, overrideSlots, blocked, today }) {
  if (blocked) return []
  if (isPastDate(date, today || todayISO())) return []
  const base = sedeBase(baseSchedule, sedeId)
  if (!base.enabled) return []
  if (overrideSlots !== undefined && overrideSlots !== null) {
    return normalizeSlots(overrideSlots)
  }
  return base.slots
}
