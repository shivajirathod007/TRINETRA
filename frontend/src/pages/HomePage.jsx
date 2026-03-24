/**
 * HomePage — Platform Home/Overview
 * Quick nav cards, system status, and recent activity.
 * This is what "Home" in the sidebar correctly links to.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileJson, ShieldCheck,
  Star, BarChart2, ArrowRight, Activity, Zap, Lock
} from 'lucide-react';
import { useScanStore } from '../store';

const NAV_CARDS = [
  {
    name: 'Asset Inventory',
    path: '/dashboard',
    icon: LayoutDashboard,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
    desc: 'Full risk dashboard — KPIs, charts, and the cryptographic asset map.',
  },
  {
    name: 'Asset Discovery',
    path: '/discovery',
    icon: Search,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    desc: 'Discover domains, SSL certs, IPs, and software across your network.',
  },
  {
    name: 'CBOM',
    path: '/cbom',
    icon: FileJson,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    desc: 'CycloneDX 1.6 Cryptographic Bill of Materials — export and analyse.',
  },
  {
    name: 'Posture of PQC',
    path: '/posture',
    icon: ShieldCheck,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    desc: 'Quantum-safe readiness breakdown across all scanned assets.',
  },
  {
    name: 'Cyber Rating',
    path: '/rating',
    icon: Star,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Enterprise threat scoring across network, crypto, and surfaces.',
  },
  {
    name: 'Reporting',
    path: '/reporting',
    icon: BarChart2,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    desc: 'Executive summaries, scan history, and compliance exports.',
  },
];

const SYSTEM_STATS = [
  { label: 'Active Modules', value: '7', icon: <Zap size={18} />, color: '#6366f1' },
  { label: 'System Status',  value: 'Online', icon: <Activity size={18} />, color: '#22c55e' },
  { label: 'Security Level', value: 'PQC-Ready', icon: <Lock size={18} />, color: '#a78bfa' },
];

export default function HomePage() {
  const { activeDomain, activeScanId } = useScanStore();
  const user = localStorage.getItem('trinetra_user') || 'shiva@gmail.com';

  return (
    <div className="flex flex-col gap-8">

      {/* ── Hero Banner ──────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 border"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)',
          borderColor: 'rgba(99,102,241,0.25)',
          boxShadow: '0 0 40px rgba(99,102,241,0.1)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <Lock size={256} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-status-safe" style={{ boxShadow: '0 0 6px #22c55e' }} />
            <span className="text-xs text-secondary font-semibold uppercase tracking-widest">System Online</span>
          </div>
          <h1 className="text-3xl font-black font-outfit text-primary mb-1">
            Welcome back, <span style={{ color: '#6366f1' }}>{user.split('@')[0]}</span>
          </h1>
          <p className="text-secondary text-sm max-w-xl mb-6">
            TRINETRA — Quantum Exposure Intelligence Platform. Select a module below or navigate using the sidebar.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4">
            {SYSTEM_STATS.map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: s.color }}>
                {s.icon} <span className="text-primary">{s.label}:</span> {s.value}
              </div>
            ))}
            {activeDomain && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold"
                style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>
                <Activity size={16} /> Active Scan: <span className="font-mono">{activeDomain}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Module Navigation Cards ───────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Platform Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="glass-card rounded-xl border p-5 flex flex-col gap-3 group transition-all duration-200 hover:scale-[1.02] no-underline"
                style={{ background: card.bg, borderColor: card.border }}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl" style={{ background: `${card.color}15` }}>
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  <ArrowRight size={16} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                <div>
                  <div className="font-bold text-primary group-hover:text-primary-indigo transition-colors">
                    {card.name}
                  </div>
                  <div className="text-xs text-secondary mt-1 leading-relaxed">{card.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl p-5" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/discovery" className="action-btn flex items-center gap-2 text-sm">
            <Search size={14} /> New Scan
          </Link>
          <Link to="/reporting" className="action-btn flex items-center gap-2 text-sm">
            <BarChart2 size={14} /> View Reports
          </Link>
          {activeScanId && (
            <Link to="/dashboard" className="action-btn flex items-center gap-2 text-sm">
              <LayoutDashboard size={14} /> Current Scan Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
