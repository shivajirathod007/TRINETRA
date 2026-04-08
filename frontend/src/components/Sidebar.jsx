import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileJson, ShieldCheck, Moon, Sun,
  Home, Search, Star, BarChart2, LogOut, Database, History, Settings,
  ChevronRight, Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// ─── Navigation Structure ─────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { name: 'Home', path: '/home', icon: Home },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Dashboard',       path: '/dashboard',  icon: LayoutDashboard },
      { name: 'Asset Inventory', path: '/inventory',  icon: Database },
      { name: 'Asset Discovery', path: '/discovery',  icon: Search },
      { name: 'CBOM',            path: '/cbom',        icon: FileJson },
      { name: 'Manual Rules',    path: '/rules',       icon: Settings },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { name: 'Posture of PQC',  path: '/posture',    icon: ShieldCheck },
      { name: 'Cyber Rating',    path: '/rating',      icon: Star },
      { name: 'Reporting',       path: '/reporting',  icon: BarChart2 },
      { name: 'Scan History',    path: '/history',    icon: History },
      { name: 'Scheduled Scans', path: '/scheduled-scans', icon: Clock },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

const Sidebar = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="sidebar" style={{ justifyContent: 'space-between' }}>
      {/* ── Top: Logo + Nav ──────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Logo */}
        <Link to="/home" className="sidebar-logo flex items-center gap-3 no-underline text-inherit hover:opacity-90 transition-opacity">
          <div className="relative flex-shrink-0">
            <img src="/logo.png" alt="TRINETRA" className="h-8 w-8 object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-status-safe border-2 border-surface-card"
              style={{ boxShadow: '0 0 5px #22c55e' }} />
          </div>
          <div className="sidebar-logo-text">
            <div className="font-black text-sm tracking-[0.1em] uppercase" style={{ color: 'var(--text-primary)' }}>TRINETRA</div>
            <div className="text-[10px] font-medium tracking-wider" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Quantum Intelligence</div>
          </div>
        </Link>

        {/* Nav Groups */}
        <div className="flex flex-col" style={{ padding: '0.25rem 0.625rem', gap: '0.125rem' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '0.375rem' }}>
              {group.label && (
                <div style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  opacity: 0.5,
                  padding: '0.625rem 0.625rem 0.3rem',
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="nav-item"
                    style={isActive ? {
                      background: 'rgba(99,102,241,0.12)',
                      color: '#818cf8',
                      borderLeftColor: '#6366f1',
                      fontWeight: 600,
                    } : {}}
                    title={item.name}
                  >
                    <Icon size={16} className="nav-icon" style={isActive ? { color: '#818cf8' } : {}} />
                    <span className="nav-text" style={{ fontSize: '0.8125rem' }}>{item.name}</span>
                    {isActive && (
                      <ChevronRight size={12} style={{
                        marginLeft: 'auto',
                        color: '#6366f1',
                        opacity: 0.7,
                        flexShrink: 0,
                      }} />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom: User + Theme ─────────────────────────────────── */}
      <div className="sidebar-footer">
        {/* User chip */}
        <div className="nav-text" style={{ marginBottom: '0.625rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.625rem',
            borderRadius: '10px',
            background: 'var(--surface-card-hover)',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#818cf8', flexShrink: 0,
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              {user[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>{role || 'Analyst'}</div>
            </div>
            <button onClick={logout} title="Logout" style={{ marginLeft: 'auto', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: '3px', flexShrink: 0, borderRadius: '4px', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-critical)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn flex items-center gap-2 p-2 mb-3 rounded w-full"
          style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}
        >
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span className="nav-text">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Version + status */}
        <div className="nav-text flex items-center justify-between" style={{ opacity: 0.6 }}>
          <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>v1.2.0-beta</div>
          <div className="flex items-center gap-1.5" style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
            <span className="badge-dot badge-dot-safe" />
            <span>Online</span>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar-logo-text { display: none; }
        @media (min-width: 768px) { .sidebar-logo-text { display: block !important; } }
      `}</style>
    </nav>
  );
};

export default Sidebar;
