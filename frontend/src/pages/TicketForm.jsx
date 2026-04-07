import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getAllAssets,
  createTicket,
  getTicketById,
  updateTicket,
} from '../services/api'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
//  TICKET FORM PAGE — handles both ADD and EDIT
//
//  If URL is /tickets/new     → create mode
//  If URL is /tickets/edit/:id → edit mode (pre-fills form)
//
//  KEY FEATURE: Live cost preview
//    As user changes category or parts_cost,
//    the preview updates instantly — before hitting save.
//    This mirrors the business logic from the backend.
// ─────────────────────────────────────────────────────────────

const CATEGORIES = ['Server Down', 'Security', 'Hardware', 'Software', 'Network', 'Other']
const CRITICAL_CATEGORIES = ['Server Down', 'Security']

// Same logic as backend calculateCostAndSLA()
const calculatePreview = (category, partsCost) => {
  const is_critical = CRITICAL_CATEGORIES.includes(category)
  const service_fee = is_critical ? 1000 : 500
  const total = service_fee + Number(partsCost || 0)
  return { is_critical, service_fee, total }
}

const defaultForm = {
  ticket_id: '',
  asset_id: '',
  issue_category: 'Hardware',
  assigned_technician: '',
  parts_cost: '',
}

export default function TicketForm() {
  const { id } = useParams() // present only in edit mode
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm]       = useState(defaultForm)
  const [assets, setAssets]   = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit) // fetching existing ticket data

  // Compute live preview from current form values
  const preview = calculatePreview(form.issue_category, form.parts_cost)

  // Load all assets for the dropdown
  useEffect(() => {
    getAllAssets()
      .then((res) => setAssets(res.data.data))
      .catch(() => toast.error('Could not load assets'))
  }, [])

  // If edit mode: load the existing ticket data
  useEffect(() => {
    if (!isEdit) return
    getTicketById(id)
      .then((res) => {
        const t = res.data.data
        if (t.is_locked) {
          toast.error('This ticket is Billed and locked — cannot edit.')
          navigate('/dashboard')
          return
        }
        setForm({
          ticket_id: t.ticket_id,
          asset_id: t.asset_id?._id || t.asset_id,
          issue_category: t.issue_category,
          assigned_technician: t.assigned_technician,
          parts_cost: t.parts_cost,
        })
      })
      .catch(() => {
        toast.error('Ticket not found')
        navigate('/dashboard')
      })
      .finally(() => setFetching(false))
  }, [id, isEdit, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic frontend validation
    if (!form.ticket_id || !form.asset_id || !form.assigned_technician) {
      toast.error('Please fill all required fields')
      return
    }
    if (Number(form.parts_cost) < 0) {
      toast.error('Parts cost cannot be negative')
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        // On edit, don't send ticket_id (unique, shouldn't change)
        const { ticket_id, asset_id, ...updateData } = form
        await updateTicket(id, { ...updateData, parts_cost: Number(form.parts_cost) })
        toast.success('Ticket updated successfully')
      } else {
        await createTicket({ ...form, parts_cost: Number(form.parts_cost) })
        toast.success('Ticket created successfully')
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Layout>
        <div className="p-6 text-slate-400 text-sm">Loading ticket...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              {isEdit ? 'Edit Ticket' : 'New Ticket'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? `Editing ${form.ticket_id}` : 'Log a new support request'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              {/* Ticket ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ticket ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ticket_id"
                  value={form.ticket_id}
                  onChange={handleChange}
                  placeholder="e.g. TKT-001"
                  disabled={isEdit} // Can't change ticket_id on edit
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                />
                {isEdit && (
                  <p className="text-xs text-slate-400 mt-1">Ticket ID cannot be changed after creation</p>
                )}
              </div>

              {/* Asset Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Asset <span className="text-red-500">*</span>
                </label>
                <select
                  name="asset_id"
                  value={form.asset_id}
                  onChange={handleChange}
                  disabled={isEdit} // Asset can't be re-linked on edit
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 bg-white"
                >
                  <option value="">Select an asset...</option>
                  {assets.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.asset_name} ({a.asset_type})
                      {a.warning_flag ? ' ⚠' : ''}
                    </option>
                  ))}
                </select>
                {assets.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    No assets found.{' '}
                    <span
                      className="underline cursor-pointer"
                      onClick={() => navigate('/assets')}
                    >
                      Create one first
                    </span>
                  </p>
                )}
              </div>

              {/* Issue Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Issue Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="issue_category"
                  value={form.issue_category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {preview.is_critical && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    ⚡ Critical category — service fee doubled to ₹1,000
                  </p>
                )}
              </div>

              {/* Technician */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Assigned Technician <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="assigned_technician"
                  value={form.assigned_technician}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Parts Cost */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Parts Cost (₹)
                </label>
                <input
                  type="number"
                  name="parts_cost"
                  value={form.parts_cost}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Must be greater than 0 before marking as Billed
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading
                  ? isEdit ? 'Saving...' : 'Creating...'
                  : isEdit ? 'Save Changes' : 'Create Ticket'}
              </button>
            </div>
          </form>

          {/* LIVE COST PREVIEW — right sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Cost Preview</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Service Fee</span>
                  <span className={`font-medium ${preview.is_critical ? 'text-red-600' : 'text-slate-700'}`}>
                    ₹{preview.service_fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Parts Cost</span>
                  <span className="font-medium text-slate-700">
                    ₹{Number(form.parts_cost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-lg font-semibold text-indigo-600">
                    ₹{preview.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* SLA indicator */}
              {preview.is_critical ? (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-red-700">Critical SLA Active</p>
                  <p className="text-xs text-red-500 mt-0.5">Server Down / Security issues are priority</p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-medium text-slate-600">Standard SLA</p>
                  <p className="text-xs text-slate-400 mt-0.5">Base service fee of ₹500</p>
                </div>
              )}
            </div>

            {/* Status flow reminder */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Status Flow</h3>
              {['Pending', 'In-Repair', 'Resolved', 'Billed'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                  <span className="text-xs text-slate-500 flex-1">{s}</span>
                  {i < arr.length - 1 && <span className="text-xs text-slate-300">↓</span>}
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-3">One step at a time. Billed = locked.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}