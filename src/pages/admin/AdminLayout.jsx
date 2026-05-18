import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ADMIN_NAV } from '../../constants/sedes'
import Logo from '../../components/Logo'
import './AdminLayout.css'

const ICONS = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  parapente: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 8 C 7 4, 17 4, 22 8 L 19 11 L 16 9 L 12 11 L 8 9 L 5 11 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 11 L 12 21 L 19 11" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="M3 17l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l2.7 5.7 6.3.6-4.7 4.3 1.3 6.2L12 17l-5.6 2.8 1.3-6.2L3 9.3l6.3-.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  'calendar-grid': (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M9 5v16M15 5v16M3 15h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
}

function userInitials(email) {
  if (!email) return 'PF'
  return email.slice(0, 2).toUpperCase()
}

function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo size={30} />
          <div className="admin-sidebar__brand-text">
            <strong>Fly Parapente Tour</strong>
            <small>Panel admin</small>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <span className="admin-sidebar__icon">{ICONS[item.icon]}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">{userInitials(user?.email)}</div>
            <div className="admin-sidebar__user-meta">
              <strong>{user?.displayName || 'Administrador'}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button type="button" className="admin-sidebar__logout" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-burger"
            aria-label="Menú"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
          <div className="admin-topbar__crumbs">
            <span>Fly Parapente Tour</span>
            <span>/</span>
            <strong>Panel admin</strong>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>

      {mobileOpen && <div className="admin-backdrop" onClick={() => setMobileOpen(false)} />}
    </div>
  )
}

export default AdminLayout
