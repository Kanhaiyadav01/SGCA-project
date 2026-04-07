import { useEffect, useState } from 'react'
import { getAllAssets, createAsset } from '../services/api'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
//  ASSETS PAGE
//  - View all assets with their ticket count + warning flag
//  - Create a new asset via inline form
//  - Warning row shown when total_ticket_count > 3
// ─────────────────────────────────────────────────────────────

const ASSET_TYPES = ['Laptop', 'Server', 'Desktop', 'Printer', 'Mobile', 'Other']

const TYPE_ICONS = {
  Laptop:  '💻',
  Server:  '🖥️',
  Desktop: '🖥️',
  Printer: '🖨️',
  Mobile:  '📱',
  Other:   '📦',
}

export default function Assets() {
  const [assets, setAssets]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ asset_name: '', asset_type: 'Laptop' })
  const [saving, setSaving]     = useState(false)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await getAllAssets()
      setAssets(res.data.data)
    } catch {
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAssets() }, [])

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.asset_name.trim()) {
      toast.error('Asset name is required')
      return
    }
    setSaving(true)
    try {
      await createAsset(form)
      toast.success(`Asset "${form.asset_name}" created`)
      setForm({ asset_name: '', asset_type: 'Laptop' })
      setShowForm(false)
      fetchAssets()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create asset')
    } finally {
      setSaving(false)
    }
  }

  const warningCount = assets.filter((a) => a.warning_flag).length

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Assets</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {assets.length} asset{assets.length !== 1 ? 's' : ''}
              {warningCount > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  · {warningCount} high maintenance
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? 'Cancel' : 'Add Asset'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-6 mb-6"
          >
            <h2 className="text-sm font-semibold text-slate-700 mb-4">New Asset</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="asset_name"
                  value={form.asset_name}
                  onChange={handleChange}
                  placeholder="e.g. Mac Studio, Dell Server R740"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="asset_type"
                  value={form.asset_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Creating...' : 'Create Asset'}
              </button>
            </div>
          </form>
        )}

        {/* Asset Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">No assets yet.</p>
            <p className="text-slate-400 text-xs mt-1">Create your first asset to start logging tickets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset._id}
                className={`bg-white rounded-xl border p-5 transition-colors ${
                  asset.warning_flag
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-slate-200'
                }`}
              >
                {/* Asset header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_ICONS[asset.asset_type] || '📦'}</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">
                        {asset.asset_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{asset.asset_type}</p>
                    </div>
                  </div>
                </div>

                {/* Ticket count */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-slate-800">
                      {asset.total_ticket_count}
                    </p>
                    <p className="text-xs text-slate-400">
                      ticket{asset.total_ticket_count !== 1 ? 's' : ''} logged
                    </p>
                  </div>

                  {/* Progress bar — fills as ticket count grows toward and beyond 3 */}
                  <div className="w-20">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          asset.warning_flag ? 'bg-orange-400' : 'bg-indigo-400'
                        }`}
                        style={{
                          width: `${Math.min(100, (asset.total_ticket_count / 5) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">
                      {asset.warning_flag ? 'limit exceeded' : `/ 3 limit`}
                    </p>
                  </div>
                </div>

                {/* Warning message */}
                {asset.warning_flag && (
                  <div className="mt-3 p-2.5 bg-orange-100 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-orange-700">
                      ⚠ High Maintenance Resource
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">Consider Replacement</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}