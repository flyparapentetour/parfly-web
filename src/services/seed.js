import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { buildDefaultSchedule } from './schedule'

const SERVICES_SEED = [
  {
    id: 'clases',
    name: 'Clases de Parapente',
    description:
      'Aprende a volar con instructores certificados. Cursos progresivos desde nivel principiante hasta autonomía total.',
    price: 350000,
    active: true,
    icon: 'graduation',
  },
  {
    id: 'vuelos',
    name: 'Vuelos Turísticos',
    description:
      'Vuelo biplaza con piloto profesional. Sin experiencia previa. Vive la adrenalina y la vista desde el cielo.',
    price: 220000,
    active: true,
    icon: 'parapente',
  },
  {
    id: 'paquetes',
    name: 'Paquetes Completos',
    description:
      'Combina vuelos, hospedaje y transporte. Experiencias diseñadas para grupos, parejas y empresas.',
    price: 580000,
    active: true,
    icon: 'package',
  },
]

const ADDITIONALS_SEED = [
  { id: 'fotografia', name: 'Fotografía HD', description: 'Set de fotos en vuelo en alta resolución.', price: 80000, active: true },
  { id: 'video', name: 'Video profesional', description: 'Video editado del vuelo en 4K.', price: 120000, active: true },
  { id: 'transporte', name: 'Transporte', description: 'Recogida y regreso desde tu hospedaje.', price: 50000, active: true },
  { id: 'cena', name: 'Cena romántica', description: 'Cena con vista al atardecer post-vuelo.', price: 150000, active: true },
]

const TESTIMONIALS_SEED = [
  { id: 't1', name: 'Laura Méndez', city: 'Bogotá', rating: 5, active: true, text: 'Volamos en Bucaramanga y fue espectacular. El piloto súper profesional y la vista del cañón es de otro planeta.' },
  { id: 't2', name: 'Andrés Vargas', city: 'Medellín', rating: 5, active: true, text: 'Mi primera vez en parapente y no será la última. Logística impecable, vídeo HD increíble. 100% recomendado.' },
  { id: 't3', name: 'Camila Restrepo', city: 'Cali', rating: 5, active: true, text: 'Regalé un vuelo a mi pareja y se enamoró. La sede de Roldanillo es magia pura. Repetiremos sin dudarlo.' },
]

async function isCollectionEmpty(path) {
  const snap = await getDocs(collection(db, path))
  return snap.empty
}

export async function seedDemoData({ force = false } = {}) {
  const report = []
  const batch = writeBatch(db)

  if (force || (await isCollectionEmpty('services'))) {
    SERVICES_SEED.forEach((s) => batch.set(doc(db, 'services', s.id), s))
    report.push(`services: ${SERVICES_SEED.length}`)
  }
  if (force || (await isCollectionEmpty('additionals'))) {
    ADDITIONALS_SEED.forEach((a) => batch.set(doc(db, 'additionals', a.id), a))
    report.push(`additionals: ${ADDITIONALS_SEED.length}`)
  }
  if (force || (await isCollectionEmpty('testimonials'))) {
    TESTIMONIALS_SEED.forEach((t) =>
      batch.set(doc(db, 'testimonials', t.id), { ...t, createdAt: serverTimestamp() }),
    )
    report.push(`testimonials: ${TESTIMONIALS_SEED.length}`)
  }

  // Importante: NO sembrar un WhatsApp placeholder. Si quedara
  // "+57 300 000 0000" en producción, los clientes intentarían
  // contactar un número falso. El admin debe configurarlo en
  // Ajustes → Contacto antes de exponer el sitio.
  batch.set(
    doc(db, 'settings', 'general'),
    {
      whatsapp: '',
      email: '',
      instagram: '',
      tiktok: '',
      facebook: '',
    },
    { merge: true },
  )
  batch.set(
    doc(db, 'settings', 'bold'),
    { publicKey: '', secretKey: '', active: false },
    { merge: true },
  )
  batch.set(doc(db, 'settings', 'schedule'), buildDefaultSchedule(), { merge: true })
  report.push('settings/general + settings/bold + settings/schedule')

  await batch.commit()
  report.push('disponibilidad: abierta por defecto en todas las sedes')

  return report
}
