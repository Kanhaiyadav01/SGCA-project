import { createContext, useContext, useState } from 'react'

// ─────────────────────────────────────────────────────────────
//  AUTH CONTEXT
//  Simple hardcoded admin auth — no backend needed.
//  Credentials are checked against a hardcoded object.
//  Session is persisted in localStorage.
//
//  In a real production app you'd:
//    - Hit a backend /api/auth/login endpoint
//    - Receive a JWT token
//    - Store token and attach it to every API request
//  For this assignment, hardcoded approach is intentional and clean.
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

// Hardcoded admin credentials
// You can change these — just update both values below
const ADMIN_CREDENTIALS = {
  email: 'admin@servicedesk.com',
  password: 'admin123',
  name: 'Admin',
}

export const AuthProvider = ({ children }) => {
  // Check localStorage on initial load — keeps user logged in on refresh
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sd_admin')
    return stored ? JSON.parse(stored) : null
  })

  // Returns null on success, or an error string on failure
  const login = (email, password) => {
    if (
      email === ADMIN_CREDENTIALS.email &&
      password === ADMIN_CREDENTIALS.password
    ) {
      const userData = { email, name: ADMIN_CREDENTIALS.name }
      localStorage.setItem('sd_admin', JSON.stringify(userData))
      setUser(userData)
      return null // success
    }
    return 'Invalid email or password' // failure
  }

  // Register is intentionally disabled — only one admin
  // Kept as a UI element so the page looks complete
  const register = (email, password, name) => {
    // For this assignment: pre-set credentials only
    // In real app: POST /api/auth/register
    return 'Registration is disabled. Use default admin credentials.'
  }

  const logout = () => {
    localStorage.removeItem('sd_admin')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — use this anywhere you need auth state
export const useAuth = () => useContext(AuthContext)