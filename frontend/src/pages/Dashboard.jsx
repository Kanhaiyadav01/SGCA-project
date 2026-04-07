import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllTickets, getAnalytics } from '../services/api'
import Layout from '../components/Layout'
import AnalyticsBar from '../components/AnalyticsBar'
import TicketTable from '../components/TicketTable'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
//  DASHBOARD PAGE
//  - Fetches analytics and all tickets on mount
//  - Passes tickets down to TicketTable
//  - onRefresh is passed to TicketTable so it can trigger reload
//    after status changes or deletes
// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tickets, setTickets]     = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]     = useState(true)
  const navigate = useNavigate()

  // useCallback so we can pass this as a stable reference to TicketTable
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Run both requests in parallel
      const [ticketRes, analyticsRes] = await Promise.all([
        getAllTickets(),
        getAnalytics(),
      ])
      setTickets(ticketRes.data.data)
      setAnalytics(analyticsRes.data.data)
    } catch (err) {
      toast.error('Failed to load data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <Layout>
      <div className="p-6 max-w-screen-xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Support Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage all support tickets and assets</p>
          </div>
          <button
            onClick={() => navigate('/tickets/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Ticket
          </button>
        </div>

        {/* Analytics Cards */}
        <AnalyticsBar data={analytics} loading={loading} />

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">All Tickets</h2>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Ticket Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            Loading tickets...
          </div>
        ) : (
          <TicketTable tickets={tickets} onRefresh={fetchData} />
        )}
      </div>
    </Layout>
  )
}