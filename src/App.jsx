import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/admin/ProtectedRoute'

import Home from './pages/public/Home'
import Booking from './pages/public/Booking'
import Additionals from './pages/public/Additionals'
import ClassesPage from './pages/public/ClassesPage'
import SedePage from './pages/public/SedePage'
import Legal from './pages/public/Legal'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Reservas from './pages/admin/Reservas'
import Calendario from './pages/admin/Calendario'
import Servicios from './pages/admin/Servicios'
import Adicionales from './pages/admin/Adicionales'
import Testimonios from './pages/admin/Testimonios'
import Galeria from './pages/admin/Galeria'
import Ajustes from './pages/admin/Ajustes'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Booking />} />
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
