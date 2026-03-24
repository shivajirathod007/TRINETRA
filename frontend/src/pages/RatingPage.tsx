/**
 * RatingPage — Consolidated Enterprise Cyber-Rating
 * Features from uploaded prototype:
 *   1. Consolidated score banner (755/1000 Elite-PQC)
 *   2. Status / PQC Rating normalization table
 *   3. Per-URL PQC score table
 *   4. Tier classification table (Elite → Legacy → Critical)
 *   5. Domain breakdown progress bars (existing)
 */
import { useState } from 'react';
import { Star, Zap, Shield, TrendingUp, AlertTriangle, Lock, ChevronDown } from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { useScanStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

import { useDashboard, useScanHistory } from '../hooks';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MAX_SCORE = 100;

const STATUS_TABLE = [
  { icon: '🔴', status: 'Legacy',    range: '< 40',      color: '#ef4444' },
  { icon: '🟡', status: 'Standard',  range: '40 till 70', color: '#f59e0b' },
  { icon: '✅', status: 'Elite-PQC', range: '> 70',       color: '#22c55e' },
  { icon: null, status: 'Maximum Score after normalisation*', range: '100', color: 'var(--text-secondary)', bold: true },
];

const TIER_TABLE = [
  {
    tier: 'Tier-1 Elite',
    level: 'Modern best-practise crypto posture',
    criteria: 'TLS 1.2 / TLS 1.3 only; Strong Ciphers [AES-GCM / ChaCha20]; Forward Secrecy (ECDHE); certificate >2048-bit [prefer 3072/4096]; no weak protocols; no known vulnerabilities; HSTS enabled',
    action: 'Maintain Configuration; periodic monitoring; recommended baseline for public-facing apps',
    color: '#22c55e',
    bg:   'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    tier: 'Tier-2 Standard',
    level: 'Acceptable enterprise configuration',
    criteria: 'TLS protocols allowed; Key≥2048-bit; Mostly strong ciphers but backward compatibility allowed; Forward secrecy option',
    action: 'Improve gradually; disable legacy protocols; standardise cipher suites.',
    color: '#3b82f6',
    bg:   'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
  },
  {
    tier: 'Tier-3 Legacy',
    level: 'Weak but still operational',
    criteria: 'TLS 1.0 / TLS 1.1 enabled; weak ciphers (CBC, 3DES); Forward secrecy missing; Key possibly 1024-bit',
    action: 'Remediation required; upgrade TLS stack; rotate certificated; remove weak cipher suites',
    color: '#f59e0b',
    bg:   'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    tier: 'Critical',
    level: 'Insecure / exploitable',
    criteria: 'SSL v2 /SSL v3 enabled; Key <1024-bit; weak cipher suites (<112-bit security) Known vulnerabilities',
    action: 'Immediate action block or isolate service; replace certificate and TLS configuration patch vulnerabilities',
    color: '#ef4444',
    bg:   'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
];

const DOMAIN_BREAKDOWN = [
  { label: 'Network Exposure',      score: 72, icon: <Shield size={16} />,       color: '#6366f1' },
  { label: 'Cryptographic Posture', score: 58, icon: <Lock size={16} />,         color: '#f59e0b' },
  { label: 'Attack Surface',        score: 41, icon: <AlertTriangle size={16} />, color: '#ef4444' },
  { label: 'Vulnerability Trend',   score: 84, icon: <TrendingUp size={16} />,    color: '#22c55e' },
  { label: 'PQC Readiness',         score: 63, icon: <Zap size={16} />,           color: '#8b5cf6' },
];

// ─── Score colour helper ───────────────────────────────────────────────────────
function scoreColor(s: number, max = 100) {
  const pct = (s / max) * 100;
  return pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
}

function tierLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Elite-PQC', color: '#22c55e' };
  if (score >= 40) return { label: 'Standard',  color: '#f59e0b' };
  return                   { label: 'Legacy',    color: '#ef4444' };
}

// ─── Animated circle gauge ────────────────────────────────────────────────────
function BigGauge({ score, max }: { score: number; max: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const pct  = score / max;
  const dash = pct * circ;
  const col  = scoreColor(score, max);
  const tier = tierLabel(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        <circle cx="90" cy="90" r={r} fill="none"
          stroke={col} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 10px ${col})`, transition: 'stroke-dasharray 1.2s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-3xl font-black font-mono" style={{ color: col }}>{score}</span>
        <span className="text-xs text-secondary font-mono">/ {max}</span>
        <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full"
          style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}44` }}>
          {tier.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RatingPage() {
  useAutoLoadScan();
  const { activeDomain } = useScanStore();
  const { data: stats } = useDashboard(activeDomain || null);
  const { data: scansData } = useScanHistory(null);
  
  const scans: any[] = scansData || [];
  const ENTERPRISE_SCORE = stats?.exposure_score || 0;

  const urlScores = scans.slice(0, 10).map(s => ({
    url: s.domain,
    score: s.organization_score || 0,
  }));

  const chartData = urlScores.map(u => ({
    name: u.url.length > 10 ? u.url.slice(0, 10) + '…' : u.url,
    score: u.score,
  }));

  const dynPosture = Math.round(((stats?.safe ?? 0) / Math.max(1, stats?.total_assets ?? 1)) * 100);
  const dynShadow = Math.round(((stats?.shadow_count ?? 0) / Math.max(1, stats?.total_assets ?? 1)) * 100);
  
  const DOMAIN_BREAKDOWN = [
    { label: 'Network Exposure',      score: ENTERPRISE_SCORE, icon: <Shield size={16} />,       color: '#6366f1' },
    { label: 'Cryptographic Posture', score: dynPosture,       icon: <Lock size={16} />,         color: '#f59e0b' },
    { label: 'Attack Surface',        score: dynShadow,        icon: <AlertTriangle size={16} />, color: '#ef4444' },
    { label: 'Vulnerability Trend',   score: 84,               icon: <TrendingUp size={16} />,    color: '#22c55e' },
    { label: 'PQC Readiness',         score: dynPosture,       icon: <Zap size={16} />,           color: '#8b5cf6' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Cyber Rating"
        subtitle="Consolidated enterprise-level PQC & cryptographic exposure scoring"
      />

      {/* ── 1. Consolidated Score Banner ─────────────────────────── */}
      <div className="glass-card border rounded-2xl overflow-hidden"
        style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(99,102,241,0.06) 100%)' }}>
        <div className="px-6 py-4 border-b border-glass-border">
          <h2 className="font-black text-primary text-center text-lg">
            Consolidated Enterprise-Level Cyber-Rating Score
          </h2>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 p-8">
          {/* Big gauge */}
          <div className="flex flex-col items-center gap-2">
            <BigGauge score={ENTERPRISE_SCORE} max={MAX_SCORE} />
            <div className="text-xs text-secondary font-mono">{activeDomain || 'Enterprise Average'}</div>
          </div>

          {/* Status normalisation table */}
          <div className="flex-1 w-full">
            <div className="glass-card border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-card-hover">
                    <th className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">PQC Rating For Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_TABLE.map((row, i) => (
                    <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/50 transition-colors">
                      <td className="px-5 py-3 font-semibold flex items-center gap-2"
                        style={{ color: row.color }}>
                        {row.icon && <span>{row.icon}</span>}
                        <span className={(row as any).bold ? 'text-secondary text-xs italic' : ''}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold"
                        style={{ color: row.color }}>
                        {row.range}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Per-URL PQC Score Table + Bar Chart ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table */}
        <div className="glass-card border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-glass-border flex items-center gap-2">
            <Star size={16} className="text-brand-gold" />
            <span className="font-bold text-primary text-sm">PQC Score by URL</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-card-hover">
                <th className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">URL</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">PQC Score</th>
              </tr>
            </thead>
            <tbody>
              {urlScores.map((row, i) => (
                <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-primary">{row.url}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-black font-mono text-base" style={{ color: scoreColor(row.score, 100) }}>
                      {row.score}
                    </span>
                  </td>
                </tr>
              ))}
              {urlScores.length === 0 && (
                <tr><td colSpan={2} className="text-secondary text-center py-4 text-xs">No scan data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bar chart */}
        <div className="glass-card border rounded-xl p-5">
          <div className="text-sm font-bold text-primary mb-4">Score Comparison</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                itemStyle={{ color: '#f8fafc', fontSize: 11 }}
              />
              <Bar dataKey="score" name="PQC Score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. Domain Breakdown Progress Bars ────────────────────── */}
      <div className="glass-card border rounded-xl p-6">
        <h2 className="font-bold text-primary border-b border-glass-border pb-3 mb-4">Domain Breakdown</h2>
        <div className="flex flex-col gap-3">
          {DOMAIN_BREAKDOWN.map(cat => (
            <div key={cat.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium" style={{ color: cat.color }}>
                  {cat.icon} {cat.label}
                </span>
                <span className="font-mono font-bold" style={{ color: cat.color }}>{cat.score}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.score}%`, background: cat.color, boxShadow: `0 0 6px ${cat.color}55` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Tier Classification Table ─────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex items-center gap-2"
          style={{ background: 'rgba(99,102,241,0.05)' }}>
          <Shield size={18} className="text-primary-indigo" />
          <span className="font-bold text-primary">Tier Classification</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-card-hover">
                {['Tier', 'Security Level', 'Compliance Criteria', 'Priority / Action'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_TABLE.map((row, i) => (
                <tr key={i} className="border-b border-glass-border/30 transition-colors hover:bg-surface-card-hover/40"
                  style={{ background: row.bg }}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-black text-sm px-3 py-1.5 rounded-lg border"
                      style={{ color: row.color, background: `${row.color}12`, borderColor: `${row.color}33` }}>
                      {row.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-secondary text-xs max-w-[140px]">{row.level}</td>
                  <td className="px-5 py-4 text-secondary text-xs max-w-[300px] leading-relaxed">{row.criteria}</td>
                  <td className="px-5 py-4 text-xs leading-relaxed max-w-[200px]" style={{ color: row.color }}>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
