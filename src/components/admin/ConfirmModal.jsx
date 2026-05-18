import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmCtx = createContext(() => Promise.resolve(false))

/**
 * Reemplazo del confirm() nativo, con estilos del design system.
 * Uso:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title, message, confirmLabel, danger })
 *   if (!ok) return
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { title, message, confirmLabel, cancelLabel, danger }
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        title: opts?.title || '¿Continuar?',
        message: opts?.message || '',
        confirmLabel: opts?.confirmLabel || 'Confirmar',
        cancelLabel: opts?.cancelLabel || 'Cancelar',
        danger: !!opts?.danger,
      })
    })
  }, [])

  const close = (value) => {
    setState(null)
    const r = resolverRef.current
    resolverRef.current = null
    r?.(value)
  }

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <>
          <div className="cm-backdrop" onClick={() => close(false)} />
          <div className="cm-modal" role="dialog" aria-modal="true" aria-label={state.title}>
            <h3>{state.title}</h3>
            {state.message && <p>{state.message}</p>}
            <div className="cm-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => close(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={`admin-btn ${state.danger ? 'admin-btn--danger' : ''}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
          <style>{`
            .cm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 90; }
            .cm-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; border-radius: 14px; padding: 24px; z-index: 91; max-width: 420px; width: calc(100% - 32px); box-shadow: 0 30px 80px rgba(0,0,0,0.3); }
            .cm-modal h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #0a1628; font-family: var(--font-body); }
            .cm-modal p { color: #4b5563; font-size: 14px; line-height: 1.55; margin-bottom: 18px; }
            .cm-modal__actions { display: flex; justify-content: flex-end; gap: 10px; }
          `}</style>
        </>
      )}
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmCtx)
}
