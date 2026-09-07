import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileJson, ShieldCheck,
  Star, BarChart2, ArrowRight, Activity, Zap, Lock,
  Globe, Cpu, TrendingUp, AlertTriangle, CheckCircle2,
  Rocket, Clock, Shield, Building, ChevronRight, Sparkles
} from 'lucide-react';
import { useScanStore } from '../store';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/index';
import { SilkWaveHero } from '../components/visuals/SilkWaveHero';

// ─── Nav cards ────────────────────────────────────────────────────────────────
const NAV_CARDS = [
  {
    phase: '01', name: 'Asset Inventory',      path: '/inventory',  icon: LayoutDashboard,
    color: '#f59e0b', glowColor: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.28)', tag: 'Telemetry',
    desc: 'Full risk dashboard — KPIs, cryptographic asset map, and algorithm inventory.',
  },
  {
    phase: '02', name: 'Asset Discovery',      path: '/discovery',  icon: Search,
    color: '#06b6d4', glowColor: 'rgba(6,182,212,0.14)',  border: 'rgba(6,182,212,0.28)',  tag: 'Recon',
    desc: 'Continuous CT log discovery, DNS tree tracing, SSL/TLS handshakes, and port probing.',
  },
  {
    phase: '03', name: 'CBOM Intelligence',    path: '/cbom',       icon: FileJson,
    color: '#8b5cf6', glowColor: 'rgba(139,92,246,0.14)', border: 'rgba(139,92,246,0.28)', tag: 'Audit',
    desc: 'CycloneDX 1.6 Cryptographic Bill of Materials — export, audit, and component breakdown.',
  },
  {
    phase: '04', name: 'Posture of PQC',       path: '/posture',    icon: ShieldCheck,
    color: '#10b981', glowColor: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.28)', tag: 'Compliance',
    desc: 'NIST FIPS 203/204/205 quantum-safe readiness breakdown across active cryptography.',
  },
  {
    phase: '05', name: 'Cyber Rating & QARS',  path: '/rating',     icon: Star,
    color: '#ec4899', glowColor: 'rgba(236,72,153,0.14)', border: 'rgba(236,72,153,0.28)', tag: 'Risk',
    desc: 'Quantum Asset Risk Score (QARS) with Mosca migration urgency and exposure factors.',
  },
  {
    phase: '06', name: 'Reporting & Compliance', path: '/reporting', icon: BarChart2,
    color: '#3b82f6', glowColor: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.28)', tag: 'Export',
    desc: 'Executive summaries, compliance scorecards, audit evidence, and PDF/JSON generation.',
  },
];

// ─── Platform benefits ────────────────────────────────────────────────────────
const PLATFORM_BENEFITS = [
  { title: 'Quantum-Safe Readiness',  icon: Cpu,       color: '#f59e0b', desc: 'Identify vulnerable RSA & ECC keys before cryptanalytically relevant quantum computers emerge.' },
  { title: 'Shadow Asset Discovery',  icon: Globe,     color: '#06b6d4', desc: 'Auto-discover unmanaged endpoints via Certificate Transparency logs and multi-depth DNS trees.' },
  { title: 'QARS Risk Quantification',icon: TrendingUp,color: '#8b5cf6', desc: 'Algorithm weakness + data shelf-life + exposure surface = prioritized migration queue.' },
  { title: 'Mosca-HNDL Timelines',    icon: Clock,     color: '#10b981', desc: 'Actionable migration deadlines calibrated against Harvest Now, Decrypt Later attack scenarios.' },
];

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { activeDomain, activeScanId } = useScanStore();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalAssets: 0, activeModules: 6, securityLevel: 'Protected', systemStatus: 'Optimal',
  });

  useEffect(() => {
    if (!activeDomain) return;
    dashboardApi.getStats(activeDomain)
      .then(res => {
        const score = res.exposure_score ?? 0;
        const securityLevel =
          score >= 75 ? 'Critical' : score >= 50 ? 'Elevated' : score >= 25 ? 'Guarded' : 'Protected';
        setDashboardData({
          totalAssets:   res.total_assets || 0,
          activeModules: 6,
          securityLevel,
          systemStatus:  (res.total_assets || 0) > 0 ? 'Online' : 'Optimal',
        });
      })
      .catch(() => {}); // silent — fallback to defaults
  }, [activeDomain]);

  const displayName = user ? user.split('@')[0] : 'Analyst';

  return (
    <div className="flex flex-col gap-8">

      {/* ── WELCOME HERO ──────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border eterna-phase-card"
        style={{ minHeight: 220 }}>
        <div className="relative z-10 p-7 md:p-10">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <span className="eterna-pill flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                System Grid: Nominal
              </span>
            </span>
            <span className="text-xs font-mono tracking-wider" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              {new Date().toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          <div className="max-w-3xl mb-7">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 font-outfit">
              Command Nexus,{' '}
              <span className="eterna-headline-dual">{displayName}</span>
            </h1>
            <p className="text-sm md:text-base leading-relaxed font-normal"
              style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
              Continuous quantum exposure intelligence, cryptographic telemetry, and transition path orchestration.
            </p>
          </div>

          {/* Quick metrics pills */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { icon: Zap,      label: 'Active Modules',     value: String(dashboardData.activeModules), color: '#f59e0b' },
              { icon: Activity, label: 'Grid Status',        value: dashboardData.systemStatus,           color: '#10b981' },
              { icon: Shield,   label: 'Security Level',     value: dashboardData.securityLevel,          color: '#8b5cf6' },
              ...(activeDomain ? [{ icon: Building, label: 'Monitored Target', value: activeDomain, color: '#3b82f6' }] : []),
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold backdrop-blur-md"
                style={{ background: `${color}0d`, borderColor: `${color}28`, color }}>
                <Icon size={14} aria-hidden="true" />
                <span style={{ color: 'var(--text-primary)', opacity: 0.8 }}>{label}:</span>
                <span className="font-bold font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLATFORM MODULES ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: 'var(--accent-amber)' }}>
              Architecture
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-outfit" style={{ color: 'var(--text-primary)' }}>
              Core Operations Grid
            </h2>
          </div>
          <Link to="/discovery" className="eterna-pill flex items-center gap-1.5 text-xs no-underline"
            style={{ color: 'var(--text-secondary)' }}>
            <span>Launch Diagnostics</span>
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="eterna-phase-card group flex flex-col justify-between no-underline rounded-2xl"
                style={{
                  padding: '1.25rem',
                  minHeight: 190,
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border"
                      style={{ background: `${card.color}14`, borderColor: `${card.color}30`, color: card.color }}>
                      {card.phase} · {card.tag}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--surface-card-hover)', border: '1px solid var(--glass-border)' }}>
                      <ArrowRight size={13} style={{ color: card.color }} aria-hidden="true" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${card.color}16`, border: `1px solid ${card.color}28` }}>
                      <Icon size={18} style={{ color: card.color }} aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-sm font-outfit transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = card.color)}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}>
                      {card.name}
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {card.desc}
                  </p>
                </div>

                <div className="pt-3.5 mt-3.5 flex items-center justify-between text-[11px] font-mono"
                  style={{ borderTop: '1px solid var(--border-divider)', color: 'var(--text-secondary)' }}>
                  <span>Status: Verified</span>
                  <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                    Access <ChevronRight size={11} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── PLATFORM ADVANTAGES ───────────────────────────────── */}
      <section>
        <div className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: 'var(--status-pqc)' }}>
          Defense Foundation
        </div>
        <h2 className="text-xl md:text-2xl font-bold font-outfit mb-5" style={{ color: 'var(--text-primary)' }}>
          Quantum Defense Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_BENEFITS.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} className="eterna-phase-card p-5 rounded-2xl"
                style={{ transition: 'transform 0.2s ease' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5"
                  style={{ background: `${benefit.color}16`, border: `1px solid ${benefit.color}28` }}>
                  <Icon size={17} style={{ color: benefit.color }} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm font-outfit mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {benefit.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {benefit.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── JARSH AI COPILOT ──────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden border eterna-phase-card p-7 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <span className="eterna-pill inline-flex items-center gap-2 mb-3">
              <Sparkles size={12} style={{ color: 'var(--status-pqc)' }} aria-hidden="true" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider"
                style={{ color: 'var(--status-pqc)' }}>
                Cognitive Co-Pilot
              </span>
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-outfit mb-3"
              style={{ color: 'var(--text-primary)' }}>
              Meet{' '}
              <span className="eterna-headline-violet">JARSH AI</span>
            </h2>
            <p className="text-xs md:text-sm leading-relaxed mb-6 font-medium max-w-xl"
              style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>J</strong>arvis{' '}
              <strong style={{ color: 'var(--text-primary)' }}>A</strong>dvanced{' '}
              <strong style={{ color: 'var(--text-primary)' }}>R</strong>esearch{' '}
              <strong style={{ color: 'var(--text-primary)' }}>S</strong>ecurity{' '}
              <strong style={{ color: 'var(--text-primary)' }}>H</strong>elper.
              Instant telemetry synthesis, Mosca timeline modeling, and context-aware PQC migration recipes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Automated CBOM risk correlation',
                'NIST FIPS 203/204 parameter checks',
                'Real-time remediation roadmaps',
                'Natural language security queries',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--status-pqc)', flexShrink: 0 }} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} aria-hidden="true" />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Threat Diagnostics</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Quantum-compromised asymmetric keys detected in current zone.
              </p>
            </div>
            <div className="p-4 rounded-xl border"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Rocket size={14} style={{ color: '#60a5fa' }} aria-hidden="true" />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Migration Orchestration</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Algorithmic migration blueprints for ML-KEM and ML-DSA transition.
              </p>
            </div>
            <Link to="/discovery" className="eterna-btn-primary text-xs font-bold text-center no-underline mt-1">
              <Search size={13} aria-hidden="true" />
              Launch Reconnaissance
            </Link>
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
      <div className="eterna-phase-card rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            Execution Hub
          </div>
          <div className="text-sm font-bold font-outfit" style={{ color: 'var(--text-primary)' }}>
            Swift Platform Actions
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/discovery" className="eterna-btn-primary text-xs py-2 px-4 font-bold no-underline">
            <Search size={13} aria-hidden="true" />
            New Enterprise Scan
          </Link>
          <Link to="/reporting" className="eterna-btn-secondary text-xs py-2 px-4 font-semibold no-underline">
            <BarChart2 size={13} aria-hidden="true" />
            Audit Reports
          </Link>
          {activeScanId && (
            <Link to="/dashboard"
              className="eterna-pill flex items-center gap-2 text-xs py-2 px-3 font-semibold no-underline"
              style={{ color: 'var(--status-pqc)', borderColor: 'rgba(167,139,250,0.35)' }}>
              <LayoutDashboard size={13} aria-hidden="true" />
              Active Scan Telemetry
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
