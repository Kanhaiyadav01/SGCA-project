import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateTicket, deleteTicket } from '../services/api'
import { StatusBadge, CriticalBadge, LockedBadge } from './StatusBadge'
import toast from 'react-hot-toast'

// Valid next status for each current status (mirrors backend STATUS_FLOW)
const NEXT_STATUS = {
  'Pending':   'In-Repair',
  'In-Repair': 'Resolved',
  'Resolved':  'Billed',
  'Billed':    null,
}

// ─────────────────────────────────────────────────────────────
//  TICKET TABLE
//  Props:
//    tickets  — array of ticket objects from API
//    onRefresh — callback to refetch data after any action
// ─────────────────────────────────────────────────────────────
export default function TicketTable({ tickets, onRefresh }) {
  const [search, setSearch] = useState({ asset: '', technician: '' })
  const [actionLoading, setActionLoading] = useState(null) // ticket id being actioned
  const navigate = useNavigate()

  // Client-side filter (on top of server-side search from Dashboard)
  const filtered = tickets.filter((t) => {
    const assetMatch = t.asset_name.toLowerCase().includes(search.asset.toLowerCase())
    const techMatch  = t.assigned_technician.toLowerCase().includes(search.technician.toLowerCase())
    return assetMatch && techMatch
  })

  // Move ticket to the next status in the flow
  const handleStatusAdvance = async (ticket) => {
    const next = NEXT_STATUS[ticket.status]
    if (!next) return

    // Frontend guard: warn before billing if parts_cost is 0
    if (next === 'Billed' && ticket.parts_cost === 0) {
      toast.error('Cannot bill a ticket with ₹0 parts cost. Edit the ticket first.')
      return
    }

    setActionLoading(ticket._id)
    try {
      await updateTicket(ticket._id, { status: next })
      toast.success(`Status updated to ${next}`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Delete ticket "${ticket.ticket_id}"? This cannot be undone.`)) return
    setActionLoading(ticket._id)
    try {
      await deleteTicket(ticket._id)
      toast.success(`Ticket ${ticket.ticket_id} deleted`)
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by asset name..."
          value={search.asset}
          onChange={(e) => setSearch((p) => ({ ...p, asset: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-52"
        />
        <input
          type="text"
          placeholder="Search by technician..."
          value={search.technician}
          onChange={(e) => setSearch((p) => ({ ...p, technician: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-52"
        />
        <span className="ml-auto self-center text-sm text-slate-400">
          {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Ticket ID', 'Asset', 'Category', 'Technician', 'Cost', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                  No tickets found
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <tr
                  key={ticket._id}
                  className={`ticket-row border-b border-slate-50 last:border-0 ${
                    ticket.is_critical ? 'bg-red-50 critical' : ''
                  }`}
                >
                  {/* Ticket ID */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-700">{ticket.ticket_id}</span>
                      {ticket.is_locked && <LockedBadge />}
                    </div>
                  </td>

                  {/* Asset + Warning */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-700">{ticket.asset_name}</p>
                      {ticket.asset_id?.warning_flag && (
                        <p className="text-xs text-orange-600 font-medium mt-0.5">
                          ⚠ High Maintenance — Consider Replacement
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Category + Critical badge */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-600">{ticket.issue_category}</span>
                      {ticket.is_critical && <CriticalBadge />}
                    </div>
                  </td>

                  {/* Technician */}
                  <td className="px-4 py-3 text-slate-600">{ticket.assigned_technician}</td>

                  {/* Cost */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-700">₹{ticket.total_cost.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">
                        Fee ₹{ticket.service_fee} + Parts ₹{ticket.parts_cost}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Advance Status button */}
                      {NEXT_STATUS[ticket.status] && !ticket.is_locked && (
                        <button
                          onClick={() => handleStatusAdvance(ticket)}
                          disabled={actionLoading === ticket._id}
                          className="px-2.5 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          → {NEXT_STATUS[ticket.status]}
                        </button>
                      )}

                      {/* Edit button — disabled if locked */}
                      <button
                        onClick={() => navigate(`/tickets/edit/${ticket._id}`)}
                        disabled={ticket.is_locked}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={ticket.is_locked ? 'Locked — cannot edit' : 'Edit ticket'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Delete button — disabled if locked */}
                      <button
                        onClick={() => handleDelete(ticket)}
                        disabled={ticket.is_locked || actionLoading === ticket._id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={ticket.is_locked ? 'Locked — cannot delete' : 'Delete ticket'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}