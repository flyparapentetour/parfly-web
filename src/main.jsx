import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initObservability } from './services/observability'

// No-op si no hay VITE_SENTRY_DSN — wiring listo para activar.
initObservability()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
