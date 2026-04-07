// ─────────────────────────────────────────────────────────────
//  STATUS BADGE
//  Renders a colored pill based on ticket status or SLA type.
//  Each status has a distinct color so the table is scannable.
// ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  'Pending':   'bg-amber-100 text-amber-800 border-amber-200',
  'In-Repair': 'bg-blue-100 text-blue-800 border-blue-200',
  'Resolved':  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Billed':    'bg-slate-100 text-slate-600 border-slate-200',
}

const STATUS_DOTS = {
  'Pending':   'bg-amber-400',
  'In-Repair': 'bg-blue-500',
  'Resolved':  'bg-emerald-500',
  'Billed':    'bg-slate-400',
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  const dot   = STATUS_DOTS[status]   || 'bg-gray-400'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

// Shown when is_critical = true
export function CriticalBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Critical SLA
    </span>
  )
}

// Lock icon badge for Billed tickets
export function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      Locked
    </span>
  )
}