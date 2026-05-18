import { useCallback, useRef, useState } from 'react'

/**
 * Wrapper para operaciones de escritura (Firestore, Cloudinary, etc.)
 * con estados explícitos: idle → saving → saved | error.
 *
 *   const { run, saving, error, saved, reset } = useMutation()
 *   await run(async () => updateDoc(...))
 *
 * Si el callback lanza, `error` se setea con el mensaje y `saved` queda
 * false. Si tiene éxito, `saved` pulsa true durante 2.2 s y vuelve a
 * idle. Reemplaza el patrón try/finally sin catch del panel admin —
 * con esto los fallos de Firestore ya no son silenciosos.
 */
export function useMutation() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const timeoutRef = useRef(null)

  const reset = useCallback(() => {
    setError('')
    setSaved(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const run = useCallback(async (fn, options = {}) => {
    const { successMs = 2200, onError, onSuccess } = options
    setSaving(true)
    setError('')
    setSaved(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    try {
      const result = await fn()
      setSaved(true)
      onSuccess?.(result)
      timeoutRef.current = setTimeout(() => {
        setSaved(false)
        timeoutRef.current = null
      }, successMs)
      return { ok: true, result }
    } catch (e) {
      const msg = e?.message || 'Ocurrió un error.'
      setError(msg)
      onError?.(e)
      console.error('mutation error', e)
      return { ok: false, error: e }
    } finally {
      setSaving(false)
    }
  }, [])

  return { run, saving, error, saved, reset }
}
