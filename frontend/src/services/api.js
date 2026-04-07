import axios from 'axios'

// All API calls go through this single file.
// If the base URL changes, you only update it here — nowhere else.
const API = axios.create({
  baseURL: '/api', // proxied to http://localhost:5001/api via vite.config.js
})

// ── TICKETS ──────────────────────────────────────────────────
export const getAllTickets = (filters = {}) => {
  // Build query string from filters: ?asset=Mac&technician=Rahul
  const params = new URLSearchParams()
  if (filters.asset) params.append('asset', filters.asset)
  if (filters.technician) params.append('technician', filters.technician)
  return API.get(`/tickets?${params.toString()}`)
}

export const getTicketById = (id) => API.get(`/tickets/${id}`)
export const createTicket  = (data) => API.post('/tickets', data)
export const updateTicket  = (id, data) => API.put(`/tickets/${id}`, data)
export const deleteTicket  = (id) => API.delete(`/tickets/${id}`)
export const getAnalytics  = () => API.get('/tickets/analytics')

// ── ASSETS ───────────────────────────────────────────────────
export const getAllAssets  = () => API.get('/assets')
export const createAsset  = (data) => API.post('/assets', data)
export const getAssetById = (id) => API.get(`/assets/${id}`)
