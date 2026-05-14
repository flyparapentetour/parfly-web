import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import './Login.css'

const AUTH_MESSAGES = {
  'auth/invalid-credential': 'Credenciales incorrectas.',
  'auth/invalid-email': 'Email inválido.',
  'auth/user-disabled': 'Usuario deshabilitado.',
  'auth/user-not-found': 'Usuario no encontrado.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(AUTH_MESSAGES[err.code] || 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <Link to="/" className="login__brand">
          <span className="login__mark">▲</span>
          Fly Parapente Tour
        </Link>
        <h1 className="login__title">Panel Admin</h1>
        <p className="login__sub">Inicia sesión para gestionar reservas y contenido.</p>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <label className="login__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="admin@flyparapente.tours"
            />
          </label>

          <label className="login__field">
            <span>Contraseña</span>
            <div className="login__pw">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar' : 'Ver'}
                className="login__pw-toggle"
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </label>

          {error && <p className="login__error">{error}</p>}

          <button type="submit" className="btn btn--primary login__submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <Link to="/" className="login__back">← Volver al sitio</Link>
      </div>
    </div>
  )
}

export default Login
