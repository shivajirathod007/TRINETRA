import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileJson, ShieldCheck, Moon, Sun,
  Home, Search, Star, BarChart2, LogOut, Database, History
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
    ],
  },
  {
    label: 'Analysis',
    items: [
      { name: 'Posture of PQC',  path: '/posture',    icon: ShieldCheck },
      { name: 'Cyber Rating',    path: '/rating',      icon: Star },
      { name: 'Reporting',       path: '/reporting',  icon: BarChart2 },
      { name: 'Scan History',    path: '/history',    icon: History },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

const Sidebar = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="sidebar" style={{ justifyContent: 'space-between' }}>
      {/* ── Top: Logo + Nav ──────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Logo */}
        <Link to="/home" className="sidebar-logo flex items-center gap-2 no-underline text-inherit hover:opacity-90 transition-opacity">
          <div className="relative flex-shrink-0">
            <img src="/logo.png" alt="TRINETRA" className="h-8 w-8 object-contain" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-safe border-2 border-surface-card"
              style={{ boxShadow: '0 0 6px #22c55e' }} />
          </div>
          <div className="sidebar-logo-text">
            <div className="font-black text-sm tracking-[0.12em] uppercase text-primary">TRINETRA</div>
            <div className="text-[10px] text-secondary font-medium tracking-wider opacity-80">Quantum Intelligence</div>
          </div>
        </Link>

        {/* Nav Groups */}
        <div className="flex flex-col" style={{ padding: '0 0.75rem', gap: '0.25rem' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '0.5rem' }}>
              {group.label && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  opacity: 0.55,
                  padding: '0.75rem 0.5rem 0.35rem',
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
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      borderLeft: '3px solid #6366f1',
                      paddingLeft: 'calc(1rem - 3px)',
                      fontWeight: 700,
                    } : {}}
                    title={item.name}
                  >
                    <Icon size={18} className="nav-icon" style={isActive ? { color: '#818cf8' } : {}} />
                    <span className="nav-text">{item.name}</span>
                    {isActive && (
                      <span style={{
                        marginLeft: 'auto',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        boxShadow: '0 0 6px #6366f1',
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
        <div className="nav-text" style={{ marginBottom: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.6rem',
            borderRadius: '8px',
            background: 'var(--surface-card-hover)',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#818cf8', flexShrink: 0,
            }}>
              {user[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Analyst</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{ marginLeft: 'auto', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px', flexShrink: 0 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Theme toggle + version */}
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn flex items-center gap-2 p-2 mb-3 rounded w-full text-secondary transition-colors"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span className="nav-text text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="nav-text flex items-center justify-between">
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', opacity: 0.6 }}>v1.2.0-beta</div>
          <div className="flex items-center gap-1.5" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
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
