import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query as buildQuery,
} from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Real-time subscription to a Firestore collection.
 * @param {string} path - collection path, e.g. "services" or "availability/bucaramanga/slots"
 * @param {Array} constraints - optional array of query constraints (orderBy, where, limit)
 */
export function useCollection(path, constraints = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!path) return
    setLoading(true)
    const ref = collection(db, path)
    const q = constraints.length ? buildQuery(ref, ...constraints) : ref
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(constraints.map((c) => c?._op || c?.type || ''))])

  return { data, loading, error }
}
