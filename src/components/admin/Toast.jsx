import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ToastCtx = createContext({ push: () => {}, success: () => {}, error: () => {} })

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((msg, opts = {}) => {
    const id = nextId++
    const tone = opts.tone || 'info'
    const duration = opts.duration ?? (tone === 'error' ? 6000 : 3000)
    setToasts((t) => [...t, { id, msg, tone }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const success = useCallback((msg, opts) => push(msg, { ...opts, tone: 'success' }), [push])
  const error = useCallback((msg, opts) => push(msg, { ...opts, tone: 'error' }), [push])

  return (
    <ToastCtx.Provider value={{ push, success, error, dismiss }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`} role="status">
            <span>{t.msg}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Cerrar"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        .toast-stack { position: fixed; bottom: 16px; right: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; max-width: calc(100vw - 32px); }
        .toast { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; box-shadow: 0 12px 28px rgba(10,22,40,.18); font-size: 14px; font-weight: 500; min-width: 240px; max-width: 420px; animation: toast-rise .25s ease-out; }
        @keyframes toast-rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
        .toast--info { background: #0a1628; color: #fff; }
        .toast--success { background: #047857; color: #fff; }
        .toast--error { background: #b91c1c; color: #fff; }
        .toast__close { background: transparent; border: none; color: inherit; font-size: 18px; cursor: pointer; opacity: 0.7; line-height: 1; padding: 0; }
        .toast__close:hover { opacity: 1; }
      `}</style>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
