import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileJson, ShieldCheck,
  Star, BarChart2, ArrowRight, Activity, Zap, Lock
} from 'lucide-react';
import { useScanStore } from '../store';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-8">

      {/* ── Hero Banner ──────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 border backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.08) 100%)',
          borderColor: 'rgba(99,102,241,0.3)',
          boxShadow: '0 8px 40px rgba(99,102,241,0.15), 0 0 60px rgba(99,102,241,0.08)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <Lock size={256} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-status-safe animate-pulse" style={{ boxShadow: '0 0 8px #22c55e, inset 0 0 4px #22c55e' }} />
            <span className="text-xs text-secondary font-bold uppercase tracking-widest">🟢 System Online</span>
          </div>
          <h1 className="text-4xl font-black font-outfit text-primary mb-2 uppercase tracking-wider">
            Welcome back, <span style={{ color: '#6366f1' }}>{user?.split('@')[0] || 'Analyst'}</span>!
          </h1>
          <p className="text-secondary text-sm max-w-2xl mb-6 leading-relaxed font-medium">
            TRINETRA — Quantum Cryptography Exposure Intelligence Platform. Select a module below to begin your security analysis.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            {SYSTEM_STATS.map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all duration-300 hover:shadow-lg"
                style={{ 
                  background: `rgba(99,102,241,0.08)`, 
                  borderColor: 'rgba(99,102,241,0.3)', 
                  color: s.color,
                  boxShadow: `0 4px 12px ${s.color}20`
                }}>
                {s.icon} <span className="text-primary">{s.label}:</span> <span className="font-bold">{s.value}</span>
              </div>
            ))}
            {activeDomain && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold animate-pulse"
                style={{ 
                  background: 'rgba(99,102,241,0.12)', 
                  borderColor: 'rgba(99,102,241,0.4)', 
                  color: '#818cf8',
                  boxShadow: '0 4px 16px rgba(129,140,248,0.3)'
                }}>
                <span>🎯 Domain:</span> <span className="font-bold text-primary-indigo">{activeDomain}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Platform Modules ──────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-primary mb-5 flex items-center gap-3 uppercase tracking-wider">
          <span className="w-1 h-5 bg-gradient-to-b from-primary-indigo to-primary-indigo-hover rounded"></span>
          Platform Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="group relative rounded-xl border p-6 flex flex-col gap-3 transition-all duration-300 hover:scale-105 no-underline overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, ' + card.bg + ' 0%, ' + card.bg + ' 100%)',
                  borderColor: card.border,
                  boxShadow: `0 8px 20px ${card.color}15, inset 0 1px 1px rgba(255,255,255,0.1)`
                }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 translate-x-full group-hover:translate-x-0 transition-all duration-500"></div>
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{ background: `${card.color}20`, boxShadow: `0 4px 12px ${card.color}30` }}>
                    <Icon size={24} style={{ color: card.color }} />
                  </div>
                  <ArrowRight size={18} className="text-secondary opacity-30 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 mt-1" style={{ color: card.color }} />
                </div>
                <div className="relative z-10">
                  <div className="font-bold text-base text-primary group-hover:text-white transition-colors" style={{ color: card.color }}>
                    {card.name}
                  </div>
                  <div className="text-xs text-secondary mt-2 leading-relaxed font-medium">{card.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl p-6 backdrop-blur-xl" style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.04) 100%)', boxShadow: '0 8px 20px rgba(99,102,241,0.1)' }}>
        <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
          <Zap size={16} className="text-primary-indigo" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/discovery" className="action-btn group flex items-center gap-2 text-sm px-5 py-3 rounded-lg font-bold bg-gradient-to-r from-primary-indigo to-primary-indigo-hover text-white hover:shadow-lg hover:shadow-primary-indigo/40 transition-all duration-300 hover:scale-105">
            <Search size={16} className="transition-transform group-hover:rotate-12" /> New Scan
          </Link>
          <Link to="/reporting" className="action-btn group flex items-center gap-2 text-sm px-5 py-3 rounded-lg font-bold border-2 border-primary-indigo text-primary-indigo hover:bg-primary-indigo hover:text-white transition-all duration-300 hover:shadow-lg">
            <BarChart2 size={16} className="transition-transform group-hover:scale-110" /> View Reports
          </Link>
          {activeScanId && (
            <Link to="/dashboard" className="action-btn group flex items-center gap-2 text-sm px-5 py-3 rounded-lg font-bold border-2 border-purple-500 text-purple-400 hover:bg-purple-500/20 transition-all duration-300 hover:shadow-lg">
              <LayoutDashboard size={16} className="transition-transform group-hover:scale-110" /> Active Scan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
