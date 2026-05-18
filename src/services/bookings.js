import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { notifyAdminOfBooking } from './notifications'

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled']

export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  no_show: 'No-show',
  cancelled: 'Cancelada',
}

// Counts towards revenue when this status applies.
export function isRevenueStatus(status) {
  return status === 'confirmed' || status === 'completed'
}

export async function createBooking(payload) {
  const ref = await addDoc(collection(db, 'bookings'), {
    ...payload,
    status: payload.status || 'pending',
    createdAt: serverTimestamp(),
  })
  // Fire-and-forget admin notification. Wrapped so EmailJS failures never
  // break the booking creation. Skip for admin-created manual bookings —
  // there's no point notifying the admin about a record they just typed in.
  if (payload.source !== 'manual') {
    notifyAdminOfBooking({ id: ref.id, ...payload }).catch((e) =>
      console.error('notifyAdminOfBooking', e),
    )
  }
  return ref.id
}

export async function updateBookingStatus(id, status) {
  return updateDoc(doc(db, 'bookings', id), { status })
}

export async function updateBookingNotes(id, notes) {
  return updateDoc(doc(db, 'bookings', id), { notes })
}
