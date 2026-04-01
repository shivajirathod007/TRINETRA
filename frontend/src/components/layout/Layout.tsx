import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useScanStore } from '@/store'

const NAV_ITEMS = [
  { to: '/',            label: 'Home',            icon: '⌂' },
  { to: '/dashboard',   label: 'Asset Inventory', icon: '◫' },
  { to: '/discovery',   label: 'Asset Discovery', icon: '⊙' },
  { to: '/cbom',        label: 'CBOM',            icon: '☰' },
  { to: '/posture',     label: 'Posture of PQC',  icon: '◉' },
  { to: '/certificates',label: 'Cyber Rating',    icon: '★' },
  { to: '/history',     label: 'Reporting',       icon: '▤' },
]

export function Sidebar() {
  const { activeDomain } = useScanStore()

  return (
    <aside className="w-56 bg-surface-800 border-r border-surface-600 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-surface-600">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-brand-gold flex items-center justify-center text-xs font-bold">
            T3
          </div>
          <div>
            <div className="text-sm font-bold text-white">TRINETRA</div>
            <div className="text-xs text-gray-500">PQC Ready</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-brand-red/20 text-white border border-brand-red/30'
                : 'text-gray-400 hover:text-white hover:bg-surface-700'
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Active scan indicator */}
      {activeDomain && (
        <div className="p-3 border-t border-surface-600">
          <div className="text-xs text-gray-500 mb-1">Active domain</div>
          <div className="text-xs text-brand-gold font-mono truncate">{activeDomain}</div>
        </div>
      )}
    </aside>
  )
}

export function Topbar() {
  return (
    <header className="h-12 bg-surface-800 border-b border-surface-600 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm text-gray-400">Welcome User: <span className="text-white">hackathon_user</span></span>
      </div>
    </header>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-surface-900">
          {children}
        </main>
      </div>
    </div>
  )
}
