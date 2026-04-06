/**
 * RatingPage — Consolidated Enterprise Cyber-Rating
 */
import { Star, Shield, TrendingUp, AlertTriangle, Lock, Zap, Award, Target, Activity } from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { useScanStore } from '../store';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useDashboard, useScanHistory } from '../hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABLE = [
  { icon: '🔴', status: 'Legacy',    range: '< 40',       color: '#ef4444' },
  { icon: '🟡', status: 'Standard',  range: '40 – 70',    color: '#f59e0b' },
  { icon: '✅', status: 'Elite-PQC', range: '> 70',        color: '#22c55e' },
  { icon: null, status: 'Maximum Score after normalisation*', range: '100', color: '#64748b', italic: true },
];

const TIER_TABLE = [
  {
    tier: 'Tier-1 Elite', level: 'Modern best-practise crypto posture',
    criteria: 'TLS 1.2/1.3 only; AES-GCM / ChaCha20; ECDHE forward secrecy; cert ≥2048-bit; no weak protocols; HSTS enabled',
    action: 'Maintain configuration; periodic monitoring; recommended baseline for public-facing apps',
    color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)',
  },
  {
    tier: 'Tier-2 Standard', level: 'Acceptable enterprise configuration',
    criteria: 'TLS protocols allowed; key ≥2048-bit; mostly strong ciphers; backward compatibility allowed; forward secrecy option',
    action: 'Improve gradually; disable legacy protocols; standardise cipher suites',
    color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)',
  },
  {
    tier: 'Tier-3 Legacy', level: 'Weak but still operational',
    criteria: 'TLS 1.0/1.1 enabled; weak ciphers (CBC, 3DES); forward secrecy missing; key possibly 1024-bit',
    action: 'Remediation required; upgrade TLS stack; rotate certificates; remove weak cipher suites',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)',
  },
  {
    tier: 'Critical', level: 'Insecure / exploitable',
    criteria: 'SSL v2/v3 enabled; key <1024-bit; weak cipher suites (<112-bit security); known vulnerabilities',
    action: 'Immediate action — block or isolate service; replace certificate and TLS config; patch vulnerabilities',
    color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 70) return '#22c55e';
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

function tierLabel(score: number) {
  if (score >= 70) return { label: 'Elite-PQC', color: '#22c55e' };
  if (score >= 40) return { label: 'Standard',  color: '#f59e0b' };
  return                   { label: 'Legacy',    color: '#ef4444' };
}

// ─── Big Gauge ────────────────────────────────────────────────────────────────

function BigGauge({ score }: { score: number }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col  = scoreColor(score);
  const tier = tierLabel(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 190, height: 190 }}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }} />
      <svg width="190" height="190" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        {/* Track */}
        <circle cx="95" cy="95" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        {/* Progress */}
        <circle cx="95" cy="95" r={r} fill="none"
          stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 12px ${col}88)`, transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center text-center gap-0.5">
        <span className="text-4xl font-black font-mono leading-none" style={{ color: col }}>{score}</span>
        <span className="text-xs text-secondary font-mono">/ 100</span>
        <span className="text-[11px] font-bold mt-1.5 px-2.5 py-0.5 rounded-full"
          style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}40` }}>
          {tier.label}
        </span>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const TOOLTIP = {
  contentStyle: { background: 'rgba(10,16,36,0.97)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#f8fafc', fontSize: 12 },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RatingPage() {
  useAutoLoadScan();
  const { activeDomain } = useScanStore();
  const { data: stats } = useDashboard(activeDomain || null);
  const { data: scansData } = useScanHistory(null);

  const scans: any[] = scansData || [];
  const enterpriseScore = stats?.exposure_score ?? 0;
  const tier = tierLabel(enterpriseScore);

  const totalAssets  = stats?.total_assets ?? 0;
  const safeCount    = stats?.safe ?? 0;
  const critCount    = stats?.critical_count ?? 0;
  const shadowCount  = stats?.shadow_count ?? 0;
  const pqcReadiness = totalAssets > 0 ? Math.round((safeCount / totalAssets) * 100) : 0;

  // Per-scan URL scores
  const urlScores = scans.slice(0, 10).map(s => ({
    url: s.domain,
    score: Math.round(s.organization_score ?? s.exposure_score ?? 0),
  }));

  const chartData = urlScores.map(u => ({
    name: u.url.length > 12 ? u.url.slice(0, 12) + '…' : u.url,
    score: u.score,
  }));

  // Radar data
  const radarData = [
    { subject: 'Network',    value: enterpriseScore },
    { subject: 'Crypto',     value: pqcReadiness },
    { subject: 'PQC Ready',  value: pqcReadiness },
    { subject: 'Shadow',     value: Math.max(0, 100 - Math.round((shadowCount / Math.max(1, totalAssets)) * 100)) },
    { subject: 'Certs',      value: Math.max(0, 100 - critCount * 5) },
  ];

  // Domain breakdown
  const breakdown = [
    { label: 'Network Exposure',      score: enterpriseScore, icon: <Shield size={15} />,        color: '#6366f1' },
    { label: 'Cryptographic Posture', score: pqcReadiness,    icon: <Lock size={15} />,          color: '#f59e0b' },
    { label: 'PQC Readiness',         score: pqcReadiness,    icon: <Zap size={15} />,            color: '#8b5cf6' },
    { label: 'Attack Surface',        score: Math.max(0, 100 - Math.round((shadowCount / Math.max(1, totalAssets)) * 100)),
      icon: <AlertTriangle size={15} />, color: '#ef4444' },
    { label: 'Vulnerability Trend',   score: Math.max(0, 100 - critCount * 4), icon: <TrendingUp size={15} />, color: '#22c55e' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <SectionHeader
        title="Cyber Rating"
        subtitle="Consolidated enterprise-level PQC & cryptographic exposure scoring"
      />

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Enterprise Score', value: enterpriseScore, color: scoreColor(enterpriseScore), icon: <Target size={18} /> },
          { label: 'PQC Readiness',    value: `${pqcReadiness}%`, color: '#8b5cf6', icon: <Zap size={18} /> },
          { label: 'Critical Assets',  value: critCount,      color: '#ef4444',  icon: <AlertTriangle size={18} /> },
          { label: 'Rating Tier',      value: tier.label,     color: tier.color, icon: <Award size={18} /> },
        ].map(k => (
          <div key={k.label} className="glass-card border rounded-xl p-5 relative overflow-hidden"
            style={{ borderColor: `${k.color}28`, background: `${k.color}08` }}>
            <div className="absolute top-3 right-3 opacity-15" style={{ color: k.color }}>{k.icon}</div>
            <div className="text-2xl font-black font-mono mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-secondary font-semibold uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Score Banner ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-2xl overflow-hidden"
        style={{ borderColor: `${scoreColor(enterpriseScore)}30`, background: `linear-gradient(135deg, ${scoreColor(enterpriseScore)}06 0%, rgba(99,102,241,0.05) 100%)` }}>
        <div className="px-6 py-4 border-b border-glass-border text-center">
          <h2 className="font-black text-primary text-lg">Consolidated Enterprise-Level Cyber-Rating Score</h2>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 p-8">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <BigGauge score={enterpriseScore} />
            <div className="text-xs text-secondary font-mono">{activeDomain || 'Enterprise Average'}</div>
          </div>

          {/* Status table */}
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
                    <tr key={i} className={`border-b border-glass-border/30 transition-colors ${
                      !row.italic && tierLabel(enterpriseScore).label === row.status
                        ? 'bg-surface-card-hover/80'
                        : 'hover:bg-surface-card-hover/40'
                    }`}>
                      <td className="px-5 py-3.5 font-semibold flex items-center gap-2.5" style={{ color: row.color }}>
                        {row.icon && <span className="text-base">{row.icon}</span>}
                        <span className={row.italic ? 'text-secondary text-xs italic' : ''}>{row.status}</span>
                        {!row.italic && tierLabel(enterpriseScore).label === row.status && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: `${row.color}20`, color: row.color }}>← CURRENT</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold" style={{ color: row.color }}>{row.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── URL Scores + Radar ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* URL score table */}
        <div className="lg:col-span-2 glass-card border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-glass-border flex items-center gap-2">
            <Star size={15} className="text-amber-400" />
            <span className="font-bold text-primary text-sm">PQC Score by URL</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-card-hover">
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Tier</th>
                </tr>
              </thead>
              <tbody>
                {urlScores.length === 0 ? (
                  <tr><td colSpan={4} className="text-secondary text-center py-10 text-xs">
                    <Activity size={24} className="mx-auto mb-2 opacity-20" />
                    No scan data available
                  </td></tr>
                ) : urlScores.map((row, i) => {
                  const t = tierLabel(row.score);
                  return (
                    <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
                      <td className="px-4 py-3 text-secondary text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{row.url}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono text-sm" style={{ color: scoreColor(row.score) }}>{row.score}</span>
                          <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: scoreColor(row.score) }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: t.color, background: `${t.color}15`, borderColor: `${t.color}35` }}>
                          {t.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Radar chart */}
        <div className="glass-card border rounded-xl p-5 flex flex-col">
          <div className="text-sm font-bold text-primary mb-1">Security Posture Radar</div>
          <div className="text-xs text-secondary mb-4">Multi-dimensional risk profile</div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(148,163,184,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Score Comparison Bar Chart ───────────────────────────── */}
      {chartData.length > 0 && (
        <div className="glass-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary">Score Comparison</div>
              <div className="text-xs text-secondary">PQC exposure score per scanned domain</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} formatter={(v: any) => [v, 'PQC Score']} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.score)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Domain Breakdown ─────────────────────────────────────── */}
      <div className="glass-card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Activity size={14} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-primary">Domain Breakdown</div>
            <div className="text-xs text-secondary">Risk dimension scores</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {breakdown.map(cat => (
            <div key={cat.label} className="flex flex-col gap-2 p-4 rounded-xl border"
              style={{ borderColor: `${cat.color}20`, background: `${cat.color}06` }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: cat.color }}>
                  {cat.icon} {cat.label}
                </span>
                <span className="font-black font-mono text-sm" style={{ color: cat.color }}>{cat.score}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.score}%`, background: cat.color, boxShadow: `0 0 8px ${cat.color}55` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tier Classification ───────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex items-center gap-2"
          style={{ background: 'rgba(99,102,241,0.05)' }}>
          <Shield size={16} className="text-indigo-400" />
          <span className="font-bold text-primary">Tier Classification</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-glass-border/30">
          {TIER_TABLE.map((row, i) => (
            <div key={i} className="p-5 flex flex-col gap-3" style={{ background: row.bg }}>
              <div className="flex items-center gap-3">
                <span className="font-black text-sm px-3 py-1.5 rounded-lg border"
                  style={{ color: row.color, background: `${row.color}12`, borderColor: `${row.color}35` }}>
                  {row.tier}
                </span>
                <span className="text-xs text-secondary">{row.level}</span>
              </div>
              <div className="text-xs text-secondary leading-relaxed border-l-2 pl-3"
                style={{ borderColor: `${row.color}40` }}>
                {row.criteria}
              </div>
              <div className="text-xs font-medium leading-relaxed" style={{ color: row.color }}>
                → {row.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
