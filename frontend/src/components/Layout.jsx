import Sidebar from './Sidebar'

// Wraps all dashboard pages with the sidebar layout
export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}