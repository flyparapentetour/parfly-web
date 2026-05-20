import { useEffect } from 'react'
import './TermsModal.css'

/**
 * TermsModal — modal full-screen mobile, centrado desktop, con scroll
 * interno. Cierra por: botón X, click en backdrop, tecla Escape.
 * Bloquea scroll del body mientras está abierto.
 *
 * El texto viene de `settings/legal.terms` (string con \n preservados).
 * Renderizamos con white-space: pre-wrap para conservar la estructura
 * de párrafos del Briefing.
 */
function TermsModal({ terms, termsVersion, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="terms-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      onClick={onClose}
    >
      <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
        <header className="terms-modal__head">
          <h2 id="terms-modal-title" className="terms-modal__title">
            Términos y condiciones
          </h2>
          <button
            type="button"
            className="terms-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="terms-modal__body">
          <div className="terms-modal__text">{terms || 'Cargando…'}</div>
        </div>
        {termsVersion && (
          <footer className="terms-modal__foot">
            <small>Versión {termsVersion}</small>
          </footer>
        )}
      </div>
    </div>
  )
}

export default TermsModal
