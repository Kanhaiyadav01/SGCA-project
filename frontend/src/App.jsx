import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// Pages
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import TicketForm from './pages/TicketForm'
import Assets     from './pages/Assets'

// ─────────────────────────────────────────────────────────────
//  APP — Root component
//
//  Route structure:
//    /login              → public (Login page)
//    /dashboard          → private
//    /tickets/new        → private
//    /tickets/edit/:id   → private
//    /assets             → private
//    /                   → redirects to /dashboard
//
//  AuthProvider wraps everything so useAuth() works anywhere.
//  PrivateRoute wraps each protected page individually.
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Toast notifications — appears top-right */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            },
            success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Private — each wrapped individually */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/tickets/new"
            element={<PrivateRoute><TicketForm /></PrivateRoute>}
          />
          <Route
            path="/tickets/edit/:id"
            element={<PrivateRoute><TicketForm /></PrivateRoute>}
          />
          <Route
            path="/assets"
            element={<PrivateRoute><Assets /></PrivateRoute>}
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}