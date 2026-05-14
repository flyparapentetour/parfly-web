import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { notifyAdminOfBooking } from './notifications'

export async function createBooking(payload) {
  const ref = await addDoc(collection(db, 'bookings'), {
    ...payload,
    status: payload.status || 'pending',
    createdAt: serverTimestamp(),
  })
  // Fire-and-forget admin notification. Wrapped so EmailJS failures never
  // break the booking creation.
  notifyAdminOfBooking({ id: ref.id, ...payload }).catch((e) =>
    console.error('notifyAdminOfBooking', e),
  )
  return ref.id
}

export async function updateBookingStatus(id, status) {
  return updateDoc(doc(db, 'bookings', id), { status })
}
