import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/admin/ProtectedRoute'
import { ToastProvider } from './components/admin/Toast'
import { ConfirmProvider } from './components/admin/ConfirmModal'

import Home from './pages/public/Home'
import './App.css'

// Páginas secundarias (lazy): el visitante que solo ve la home no las descarga.
const ServicePicker = lazy(() => import('./components/booking/ServicePicker'))
const Booking = lazy(() => import('./pages/public/Booking'))
const Additionals = lazy(() => import('./pages/public/Additionals'))
const ClassesPage = lazy(() => import('./pages/public/ClassesPage'))
const SedePage = lazy(() => import('./pages/public/SedePage'))
const Legal = lazy(() => import('./pages/public/Legal'))

// Panel admin completo se aísla en su propio chunk.
const Login = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Reservas = lazy(() => import('./pages/admin/Reservas'))
const Calendario = lazy(() => import('./pages/admin/Calendario'))
const Servicios = lazy(() => import('./pages/admin/Servicios'))
const Adicionales = lazy(() => import('./pages/admin/Adicionales'))
const Testimonios = lazy(() => import('./pages/admin/Testimonios'))
const Galeria = lazy(() => import('./pages/admin/Galeria'))
const Ajustes = lazy(() => import('./pages/admin/Ajustes'))

function PageFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6b7280',
      fontSize: 14,
      fontWeight: 500,
    }}>
      Cargando…
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/reservar" element={<ServicePicker />} />
                <Route path="/reservar/wizard" element={<Booking />} />
                <Route path="/adicionales" element={<Additionals />} />
                <Route path="/clases" element={<ClassesPage />} />
                <Route path="/sede/:ciudad" element={<SedePage />} />
                <Route path="/terminos" element={<Legal which="terms" />} />
                <Route path="/privacidad" element={<Legal which="privacy" />} />
                <Route path="/cancelaciones" element={<Legal which="cancellations" />} />
                <Route path="/admin/login" element={<Login />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="reservas" element={<Reservas />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="servicios" element={<Servicios />} />
                  <Route path="adicionales" element={<Adicionales />} />
                  <Route path="testimonios" element={<Testimonios />} />
                  <Route path="galeria" element={<Galeria />} />
                  <Route path="ajustes" element={<Ajustes />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
