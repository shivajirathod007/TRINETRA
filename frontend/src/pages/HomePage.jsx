import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileJson, ShieldCheck,
  Star, BarChart2, ArrowRight, Activity, Zap, Lock,
  Globe, Cpu, TrendingUp, AlertTriangle, CheckCircle2,
  MessageCircle, Rocket, Brain, Clock, Shield, Building, BarChart3
} from 'lucide-react';
import { useScanStore } from '../store';
import { useAuth } from '../context/AuthContext';
import { trinetraApi } from '../api/trinetra';

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

const PLATFORM_BENEFITS = [
  {
    title: 'Quantum-Safe Readiness',
    desc: 'Identify cryptographic vulnerabilities before quantum computers threaten your data.',
    icon: Cpu,
    color: '#6366f1',
  },
  {
    title: 'Comprehensive Discovery',
    desc: 'Auto-discover 30-40% more shadow assets via CT logs, DNS chains, and port scanning.',
    icon: Globe,
    color: '#06b6d4',
  },
  {
    title: 'Risk Scoring (QARS)',
    desc: 'Data sensitivity + algorithm risk + exposure timeline = actionable priority matrix.',
    icon: TrendingUp,
    color: '#f59e0b',
  },
  {
    title: 'HNDL-Based Deadlines',
    desc: 'Mosca\'s theorem + data retention mandates = migration timelines you can trust.',
    icon: Clock,
    color: '#8b5cf6',
  },
];

export default function HomePage() {
  const { activeDomain, activeScanId } = useScanStore();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalAssets: 0,
    activeModules: 7,
    securityLevel: 'Loading...',
    systemStatus: 'Online'
  });
  const [loading, setLoading] = useState(false);

  // Fetch dashboard summary when domain changes
  useEffect(() => {
    if (activeDomain) {
      setLoading(true);
      trinetraApi.getDashboardSummary(activeDomain)
        .then(response => {
          setDashboardData({
            totalAssets: response.data?.total_assets || 0,
            activeModules: response.data?.active_modules || 7,
            securityLevel: response.data?.security_level || 'Unassessed',
            systemStatus: response.data?.system_status || 'Online'
          });
        })
        .catch(error => {
          console.error('Failed to fetch dashboard summary:', error);
          setDashboardData({
            totalAssets: 0,
            activeModules: 7,
            securityLevel: 'Unassessed',
            systemStatus: 'Online'
          });
        })
        .finally(() => setLoading(false));
    }
  }, [activeDomain]);

  return (
    <div className="flex flex-col gap-10">

      {/* ── WELCOME HERO BANNER ──────────────────────────────────────────── */}
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
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-status-safe animate-pulse"></span>
              <span className="text-xs text-secondary font-bold uppercase tracking-widest">System Status: Active</span>
            </div>
            <span className="text-xs text-secondary font-mono">{new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <h1 className="text-4xl font-black font-outfit text-primary mb-2 uppercase tracking-wider">
            Welcome back, <span style={{ color: '#6366f1' }}>{user?.split('@')[0] || 'Analyst'}</span>!
          </h1>
          <p className="text-secondary text-sm max-w-2xl mb-6 leading-relaxed font-medium">
            TRINETRA — Quantum Cryptography Exposure Intelligence Platform. Discover shadow assets, assess quantum risk, and plan migration. Your defence starts here.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all duration-300 hover:shadow-lg"
              style={{ 
                background: `rgba(99,102,241,0.08)`, 
                borderColor: 'rgba(99,102,241,0.3)', 
                color: '#6366f1',
                boxShadow: `0 4px 12px #6366f130`
              }}>
              <Zap size={18} /> <span className="text-primary">Active Modules:</span> <span className="font-bold">{dashboardData.activeModules}</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all duration-300 hover:shadow-lg"
              style={{ 
                background: `rgba(34,197,94,0.08)`, 
                borderColor: 'rgba(34,197,94,0.3)', 
                color: '#22c55e',
                boxShadow: `0 4px 12px #22c55e30`
              }}>
              <Activity size={18} /> <span className="text-primary">System Status:</span> <span className="font-bold">{dashboardData.systemStatus}</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold transition-all duration-300 hover:shadow-lg"
              style={{ 
                background: `rgba(168,85,247,0.08)`, 
                borderColor: 'rgba(168,85,247,0.3)', 
                color: '#a78bfa',
                boxShadow: `0 4px 12px #a78bfa30`
              }}>
              <Shield size={18} /> <span className="text-primary">Security Level:</span> <span className="font-bold">{dashboardData.securityLevel}</span>
            </div>

            {activeDomain && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold animate-pulse"
                style={{ 
                  background: 'rgba(99,102,241,0.12)', 
                  borderColor: 'rgba(99,102,241,0.4)', 
                  color: '#818cf8',
                  boxShadow: '0 4px 16px rgba(129,140,248,0.3)'
                }}>
                <Building size={18} /> <span>Enterprise:</span> <span className="font-bold text-primary-indigo">{activeDomain}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── WHY TRINETRA ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-primary mb-5 flex items-center gap-3 uppercase tracking-wider">
          <span className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded"></span>
          Why TRINETRA?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_BENEFITS.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} 
                className="rounded-lg p-5 border backdrop-blur-sm group transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${benefit.color}12 0%, ${benefit.color}06 100%)`,
                  borderColor: `${benefit.color}30`,
                  boxShadow: `0 4px 12px ${benefit.color}10`
                }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 rounded-lg transition-all duration-300 group-hover:scale-110" style={{ background: `${benefit.color}20` }}>
                    <Icon size={20} style={{ color: benefit.color }} />
                  </div>
                </div>
                <h3 className="font-bold text-sm text-primary mb-2">{benefit.title}</h3>
                <p className="text-xs text-secondary leading-relaxed">{benefit.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── JARSH AI ASSISTANT ──────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 border backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(99,102,241,0.08) 100%)',
          borderColor: 'rgba(168,85,247,0.3)',
          boxShadow: '0 8px 32px rgba(168,85,247,0.12), 0 0 50px rgba(168,85,247,0.06)',
        }}
      >
        <div className="absolute top-0 left-0 w-48 h-48 opacity-5 pointer-events-none">
          <Brain size={192} style={{ color: '#a855f7' }} />
        </div>
        <div className="absolute bottom-0 right-0 w-72 h-72 opacity-5 pointer-events-none rounded-full blur-3xl"
          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', filter: 'blur(60px)' }}></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)' }}>
              <Brain size={20} style={{ color: '#fff' }} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Advanced AI Assistant</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Text content */}
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-black text-primary mb-3 uppercase tracking-wider">
                Meet <span style={{ color: '#a855f7' }}>JARSH</span>
              </h2>
              <p className="text-secondary text-sm leading-relaxed mb-4 font-medium">
                <span className="font-bold" style={{ color: '#7c3aed' }}>J</span>arvis <span className="font-bold" style={{ color: '#7c3aed' }}>A</span>dvanced <span className="font-bold" style={{ color: '#7c3aed' }}>R</span>esearch <span className="font-bold" style={{ color: '#7c3aed' }}>S</span>ecurity <span className="font-bold" style={{ color: '#7c3aed' }}>H</span>elper — Your AI-powered security companion.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} style={{ color: '#a855f7', marginTop: '2px' }} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-primary">Real-Time Analysis</div>
                    <div className="text-xs text-secondary">Get instant insights on vulnerabilities and risk scores</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} style={{ color: '#a855f7', marginTop: '2px' }} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-primary">Mitigation Planning</div>
                    <div className="text-xs text-secondary">AI-guided migration strategies with step-by-step guidance</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} style={{ color: '#a855f7', marginTop: '2px' }} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-primary">Compliance Guidance</div>
                    <div className="text-xs text-secondary">Context-aware PQC readiness recommendations</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} style={{ color: '#a855f7', marginTop: '2px' }} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-primary">24/7 Support</div>
                    <div className="text-xs text-secondary">Always available to answer security questions</div>
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium mb-4 p-3 rounded-lg" style={{ background: 'rgba(168,85,247,0.2)', color: '#6d28d9', borderLeft: '3px solid #6d28d9' }}>💬 Chat with JARSH anytime using the floating button in the bottom-right corner.</p>
            </div>

            {/* Right: Feature showcase */}
            <div className="lg:col-span-1">
              <div className="space-y-3">
                <div className="rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ 
                    background: 'rgba(168,85,247,0.1)',
                    borderColor: 'rgba(168,85,247,0.3)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-bold text-primary">Threat Detection</span>
                  </div>
                  <p className="text-xs text-secondary">Quantum vulnerabilities in your assets</p>
                </div>
                <div className="rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ 
                    background: 'rgba(168,85,247,0.1)',
                    borderColor: 'rgba(168,85,247,0.3)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket size={16} style={{ color: '#06b6d4' }} />
                    <span className="text-xs font-bold text-primary">PQC Migration</span>
                  </div>
                  <p className="text-xs text-secondary">Post-quantum readiness plans</p>
                </div>
                <div className="rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ 
                    background: 'rgba(168,85,247,0.1)',
                    borderColor: 'rgba(168,85,247,0.3)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} style={{ color: '#22c55e' }} />
                    <span className="text-xs font-bold text-primary">Compliance Check</span>
                  </div>
                  <p className="text-xs text-secondary">Regulatory alignment + certifications</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLATFORM MODULES ──────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-primary mb-5 flex items-center gap-3 uppercase tracking-wider">
          <span className="w-1 h-6 bg-gradient-to-b from-primary-indigo to-primary-indigo-hover rounded"></span>
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

      {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
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
          <button className="action-btn group flex items-center gap-2 text-sm px-5 py-3 rounded-lg font-bold border-2 border-purple-500/50 text-purple-300 hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-300 hover:shadow-lg">
            <MessageCircle size={16} className="transition-transform group-hover:scale-110" /> Chat with JARVIS
          </button>
        </div>
      </div>
    </div>
  );
}
