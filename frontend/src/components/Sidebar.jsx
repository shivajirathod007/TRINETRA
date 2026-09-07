import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileJson, ShieldCheck, Moon, Sun,
  Home, Search, Star, BarChart2, LogOut, Database, History,
  Settings, ChevronRight, CalendarClock, Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import TrinetraLogo from './shared/TrinetraLogo';

// ─── Navigation structure ─────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { name: 'Home', path: '/home', icon: Home },
    ],
  },
  {
    label: 'Asset Intelligence',
    items: [
      { name: 'Dashboard',       path: '/dashboard',  icon: LayoutDashboard },
      { name: 'Asset Inventory', path: '/inventory',  icon: Database },
      { name: 'Asset Discovery', path: '/discovery',  icon: Search },
      { name: 'CBOM',            path: '/cbom',       icon: FileJson },
      { name: 'Manual Rules',    path: '/rules',      icon: Settings },
    ],
  },
  {
    label: 'Risk & Posture',
    items: [
      { name: 'Posture of PQC', path: '/posture',   icon: ShieldCheck },
      { name: 'Cyber Rating',   path: '/rating',    icon: Star },
      { name: 'Reporting',      path: '/reporting', icon: BarChart2 },
    ],
  },
  {
    label: 'Scan Management',
    items: [
      { name: 'Scheduled Scans', path: '/scheduled-scans', icon: CalendarClock },
      { name: 'Scan History',    path: '/history',          icon: History },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();
  const location = useLocation();

  const initials = user ? user[0].toUpperCase() : 'U';

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* ── Top: Logo + Nav ────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Logo */}
        <Link to="/home" className="sidebar-logo" aria-label="TRINETRA Home">
          <TrinetraLogo size={28} showText={true} />
        </Link>

        {/* Nav Groups */}
        <div style={{ padding: '0.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '0.25rem' }}>
              {group.label && (
                <div className="nav-group-label">{group.label}</div>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    title={item.name}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={15}
                      className="nav-icon"
                      style={isActive ? { color: 'var(--accent-amber)' } : {}}
                      aria-hidden="true"
                    />
                    <span style={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500 }}>
                      {item.name}
                    </span>
                    {isActive && (
                      <ChevronRight
                        size={11}
                        style={{ marginLeft: 'auto', color: 'var(--accent-amber)', opacity: 0.8, flexShrink: 0 }}
                        aria-hidden="true"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom: User chip + theme + status ─────────────────── */}
      <div className="sidebar-footer">

        {/* User chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.625rem',
          borderRadius: '10px',
          background: 'var(--surface-card-hover)',
          border: '1px solid var(--glass-border)',
          marginBottom: '0.5rem',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #d97706, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 6px rgba(217,119,6,0.28)',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '11px', fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user || 'Analyst'}
            </div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', opacity: 0.75 }}>
              {role || 'Analyst'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            style={{
              marginLeft: 'auto', color: 'var(--text-secondary)', cursor: 'pointer',
              background: 'none', border: 'none', padding: '4px', flexShrink: 0,
              borderRadius: '6px', transition: 'color 0.15s, background 0.15s',
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-critical)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={13} aria-hidden="true" />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ marginBottom: '0.5rem' }}
        >
          {isDarkMode
            ? <Sun size={13} style={{ color: 'var(--accent-amber)' }} aria-hidden="true" />
            : <Moon size={13} style={{ color: '#8b5cf6' }} aria-hidden="true" />}
          <span style={{ fontSize: '11.5px' }}>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Version + Live Feed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', opacity: 0.65 }}>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            TRINETRA v1.2.0
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', color: 'var(--text-secondary)' }}>
            <span
              className="badge-dot badge-dot-safe"
              aria-label="Live feed active"
            />
            <span style={{ fontWeight: 500 }}>Live Feed</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
