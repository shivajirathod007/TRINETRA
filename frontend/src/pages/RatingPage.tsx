/**
 * RatingPage — Consolidated Enterprise Cyber-Rating
 *
 * SCORING SEMANTICS (critical fix):
 *   exposure_score  = RISK score — higher is WORSE (86 = high risk)
 *   pqcReadiness    = % of assets with quantum_safe_status = PQC_READY or FULLY_QUANTUM_SAFE
 *   cyberRating     = inverted readiness score shown as a 0-100 "safety" gauge
 *
 * Tier classification is based on RISK level (exposure_score), not readiness:
 *   CRITICAL  ≥ 75  →  "Critical"
 *   HIGH      ≥ 50  →  "Legacy"
 *   MEDIUM    ≥ 25  →  "Standard"
 *   LOW/SAFE  < 25  →  "Elite-PQC"
 */
import { Star, Shield, TrendingUp, AlertTriangle, Lock, Zap, Award, Target, Activity, ShieldAlert } from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { useScanStore } from '../store';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid
} from 'recharts';
import { useDashboard, useAssets } from '../hooks';

// ─── Risk-based tier (exposure_score: higher = worse) ─────────────────────────

function riskTier(exposureScore: number): { label: string; color: string; desc: string } {
  if (exposureScore >= 75) return { label: 'Critical',   color: '#ef4444', desc: 'Immediate remediation required' };
  if (exposureScore >= 50) return { label: 'Legacy',     color: '#f97316', desc: 'Significant vulnerabilities present' };
  if (exposureScore >= 25) return { label: 'Standard',   color: '#f59e0b', desc: 'Acceptable with improvements needed' };
  return                          { label: 'Elite-PQC',  color: '#22c55e', desc: 'Strong cryptographic posture' };
}

// Color for risk score bar (higher score = more red)
function riskColor(s: number) {
  if (s >= 75) return '#ef4444';
  if (s >= 50) return '#f97316';
  if (s >= 25) return '#f59e0b';
  return '#22c55e';
}

// Color for readiness % (higher = more green)
function readinessColor(pct: number) {
  if (pct >= 70) return '#22c55e';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

// ─── Status table rows ────────────────────────────────────────────────────────

const STATUS_TABLE = [
  { icon: '🔴', status: 'Critical',   range: 'Risk ≥ 75',   color: '#ef4444' },
  { icon: '🟠', status: 'Legacy',     range: 'Risk 50–74',  color: '#f97316' },
  { icon: '🟡', status: 'Standard',   range: 'Risk 25–49',  color: '#f59e0b' },
  { icon: '✅', status: 'Elite-PQC',  range: 'Risk < 25',   color: '#22c55e' },
  { icon: null, status: 'Score = average quantum exposure across all scanned assets (higher = worse)', range: '', color: '#64748b', italic: true },
];

// ─── Tier classification table ────────────────────────────────────────────────

const TIER_TABLE = [
  {
    tier: 'Elite-PQC', level: 'Strong cryptographic posture',
    criteria: 'Risk score < 25; TLS 1.3 preferred; ECDHE forward secrecy; cert ≥2048-bit; no weak protocols; HSTS enabled; PQC-ready algorithms in use',
    action: 'Maintain configuration; periodic monitoring; recommended baseline for public-facing apps',
    color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)',
  },
  {
    tier: 'Standard', level: 'Acceptable enterprise configuration',
    criteria: 'Risk score 25–49; TLS 1.2/1.3 in use; key ≥2048-bit; mostly strong ciphers; some legacy compatibility',
    action: 'Improve gradually; disable legacy protocols; standardise cipher suites; plan PQC migration',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)',
  },
  {
    tier: 'Legacy', level: 'Weak but still operational',
    criteria: 'Risk score 50–74; TLS 1.0/1.1 enabled; weak ciphers (CBC, 3DES); forward secrecy missing; key possibly 1024-bit',
    action: 'Remediation required; upgrade TLS stack; rotate certificates; remove weak cipher suites',
    color: '#f97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.2)',
  },
  {
    tier: 'Critical', level: 'Insecure / exploitable',
    criteria: 'Risk score ≥ 75; SSL v2/v3 enabled; key <1024-bit; weak cipher suites; known vulnerabilities (ROBOT, HEARTBLEED)',
    action: 'Immediate action — block or isolate service; replace certificate and TLS config; patch vulnerabilities',
    color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)',
  },
];

const TOOLTIP = {
  contentStyle: { background: 'rgba(10,16,36,0.97)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#f8fafc', fontSize: 12 },
};

// ─── Risk Gauge (shows exposure score — higher arc = more risk) ───────────────

function RiskGauge({ exposureScore }: { exposureScore: number }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const dash = (exposureScore / 100) * circ;
  const col = riskColor(exposureScore);
  const tier = riskTier(exposureScore);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 190, height: 190 }}>
      <div className="absolute inset-0 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }} />
      <svg width="190" height="190" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="95" cy="95" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx="95" cy="95" r={r} fill="none"
          stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 12px ${col}88)`, transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center text-center gap-0.5">
        <span className="text-4xl font-black font-mono leading-none" style={{ color: col }}>{exposureScore}</span>
        <span className="text-[10px] text-secondary font-mono">RISK SCORE</span>
        <span className="text-[11px] font-bold mt-1.5 px-2.5 py-0.5 rounded-full"
          style={{ color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}40` }}>
          {tier.label}
        </span>
      </div>
    </div>
  );
}

// ─── Readiness Gauge (shows PQC readiness % — higher = better) ───────────────

function ReadinessGauge({ pct }: { pct: number }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const col = readinessColor(pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 190, height: 190 }}>
      <div className="absolute inset-0 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }} />
      <svg width="190" height="190" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="95" cy="95" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx="95" cy="95" r={r} fill="none"
          stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 12px ${col}88)`, transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center text-center gap-0.5">
        <span className="text-4xl font-black font-mono leading-none" style={{ color: col }}>{pct}%</span>
        <span className="text-[10px] text-secondary font-mono">PQC READY</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RatingPage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain } = useScanStore();
  const { data: stats } = useDashboard(activeDomain || null, activeScanId);
  const { data: assets = [] } = useAssets(activeScanId);

  const exposureScore = Math.round(stats?.exposure_score ?? 0);
  const tier = riskTier(exposureScore);
  const totalAssets = assets.length || stats?.total_assets || 0;
  const critCount   = stats?.critical_count ?? 0;
  const highCount   = stats?.high_count ?? 0;
  const shadowCount = stats?.shadow_count ?? 0;

  // PQC readiness = % of assets that are PQC_READY or FULLY_QUANTUM_SAFE
  // Uses actual quantum_safe_status from asset data (not risk_level)
  const pqcReadyCount = (assets as any[]).filter(a =>
    a.quantum_safe_status === 'PQC_READY' || a.quantum_safe_status === 'FULLY_QUANTUM_SAFE'
  ).length;
  const vulnerableCount = (assets as any[]).filter(a =>
    a.quantum_safe_status === 'VULNERABLE'
  ).length;
  const pqcReadiness = totalAssets > 0 ? Math.round((pqcReadyCount / totalAssets) * 100) : 0;

  // Per-asset URL scores — sorted by risk score descending (worst first)
  // Infer PQC status from risk_level when quantum_safe_status is missing/UNKNOWN
  function inferPqcStatus(asset: any): string {
    const qs = asset.quantum_safe_status;
    if (qs && qs !== 'UNKNOWN') return qs;
    // Fallback: infer from risk_level
    const rl = (asset.risk_level || '').toUpperCase();
    if (rl === 'CRITICAL' || rl === 'HIGH') return 'VULNERABLE';
    if (rl === 'MEDIUM') return 'PQC_READY';
    if (rl === 'LOW' || rl === 'SAFE') return 'FULLY_QUANTUM_SAFE';
    return 'UNKNOWN';
  }

  const urlScores = [...(assets as any[])]
    .filter(a => a.score != null || a.quantum_exposure_score != null)
    .sort((a, b) => (b.score ?? b.quantum_exposure_score ?? 0) - (a.score ?? a.quantum_exposure_score ?? 0))
    .slice(0, 15)
    .map(a => ({
      url: a.url || a.fqdn || '—',
      score: Math.round(a.score ?? a.quantum_exposure_score ?? 0),
      pqcStatus: inferPqcStatus(a),
      type: (a.type || a.asset_type || '—').replace(/_/g, ' '),
    }));

  // Chart data for bar chart
  const chartData = urlScores.slice(0, 10).map(u => ({
    name: u.url.length > 18 ? '…' + u.url.slice(-16) : u.url,
    score: u.score,
  }));

  // Domain breakdown — all scores are "safety" oriented (higher = better)
  const breakdown = [
    { label: 'Network Safety',        score: Math.max(0, 100 - exposureScore),  icon: <Shield size={15} />,        color: '#6366f1', note: `Inverted from risk score ${exposureScore}` },
    { label: 'PQC Readiness',         score: pqcReadiness,                       icon: <Zap size={15} />,           color: '#22c55e', note: `${pqcReadyCount} of ${totalAssets} assets PQC-ready` },
    { label: 'Vulnerability Control', score: Math.max(0, 100 - Math.round((vulnerableCount / Math.max(1, totalAssets)) * 100)),
      icon: <Lock size={15} />, color: '#f59e0b', note: `${vulnerableCount} quantum-vulnerable assets` },
    { label: 'Shadow Asset Control',  score: Math.max(0, 100 - Math.round((shadowCount / Math.max(1, totalAssets)) * 100)),
      icon: <AlertTriangle size={15} />, color: '#ef4444', note: `${shadowCount} shadow assets detected` },
    { label: 'Critical Risk Control', score: Math.max(0, 100 - Math.round(((critCount + highCount) / Math.max(1, totalAssets)) * 100)),
      icon: <TrendingUp size={15} />, color: '#8b5cf6', note: `${critCount} critical + ${highCount} high risk assets` },
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
          { label: 'Risk Score',      value: exposureScore,      color: riskColor(exposureScore), icon: <ShieldAlert size={18} />, note: 'Higher = worse' },
          { label: 'PQC Readiness',   value: `${pqcReadiness}%`, color: readinessColor(pqcReadiness), icon: <Zap size={18} />, note: 'Higher = better' },
          { label: 'Critical Assets', value: critCount,          color: '#ef4444', icon: <AlertTriangle size={18} />, note: `+${highCount} high` },
          { label: 'Rating Tier',     value: tier.label,         color: tier.color, icon: <Award size={18} />, note: tier.desc },
        ].map(k => (
          <div key={k.label} className="glass-card border rounded-xl p-5 relative overflow-hidden"
            style={{ borderColor: `${k.color}28`, background: `${k.color}08` }}>
            <div className="absolute top-3 right-3 opacity-15" style={{ color: k.color }}>{k.icon}</div>
            <div className="text-2xl font-black font-mono mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-secondary font-semibold uppercase tracking-wider">{k.label}</div>
            <div className="text-[10px] text-secondary/60 mt-1">{k.note}</div>
          </div>
        ))}
      </div>

      {/* ── Score Banner ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-2xl overflow-hidden"
        style={{ borderColor: `${tier.color}30`, background: `linear-gradient(135deg, ${tier.color}06 0%, rgba(99,102,241,0.05) 100%)` }}>
        <div className="px-6 py-4 border-b border-glass-border text-center">
          <h2 className="font-black text-primary text-lg">Consolidated Enterprise-Level Cyber-Rating Score</h2>
          <p className="text-xs text-secondary mt-1">Risk score = average quantum exposure across all assets. Higher score = greater risk.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 p-8">
          {/* Two gauges side by side */}
          <div className="flex flex-col sm:flex-row items-center gap-8 shrink-0">
            <div className="flex flex-col items-center gap-2">
              <RiskGauge exposureScore={exposureScore} />
              <div className="text-[10px] text-secondary font-mono text-center">
                {activeDomain || 'Enterprise'}<br/>
                <span className="text-status-critical">↑ higher = more risk</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ReadinessGauge pct={pqcReadiness} />
              <div className="text-[10px] text-secondary font-mono text-center">
                PQC Readiness<br/>
                <span className="text-status-safe">↑ higher = more ready</span>
              </div>
            </div>
          </div>

          {/* Status table */}
          <div className="flex-1 w-full">
            <div className="glass-card border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-card-hover">
                    <th className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Tier</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Risk Score Range</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_TABLE.map((row, i) => {
                    const isCurrent = !row.italic && riskTier(exposureScore).label === row.status;
                    return (
                      <tr key={i} className={`border-b border-glass-border/30 transition-colors ${isCurrent ? 'bg-surface-card-hover/80' : 'hover:bg-surface-card-hover/40'}`}>
                        <td className="px-5 py-3.5 font-semibold flex items-center gap-2.5" style={{ color: row.color }}>
                          {row.icon && <span className="text-base">{row.icon}</span>}
                          <span className={row.italic ? 'text-secondary text-[10px] italic' : ''}>{row.status}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: `${row.color}20`, color: row.color }}>← CURRENT</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-xs" style={{ color: row.color }}>{row.range}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── URL Scores + Radar ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Per-asset URL score table */}
        <div className="lg:col-span-2 glass-card border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-glass-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={15} className="text-amber-400" />
              <span className="font-bold text-primary text-sm">Risk Score by Asset</span>
            </div>
            <span className="text-[10px] text-secondary">sorted by highest risk first</span>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-card-hover z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Asset URL</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Risk Score</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">PQC Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider border-b border-glass-border">Tier</th>
                </tr>
              </thead>
              <tbody>
                {urlScores.length === 0 ? (
                  <tr><td colSpan={5} className="text-secondary text-center py-10 text-xs">
                    <Activity size={24} className="mx-auto mb-2 opacity-20" />
                    No asset data — run a scan first
                  </td></tr>
                ) : urlScores.map((row, i) => {
                  const t = riskTier(row.score);
                  const pqcColor = row.pqcStatus === 'FULLY_QUANTUM_SAFE' ? '#22c55e'
                    : row.pqcStatus === 'PQC_READY' ? '#f59e0b'
                    : row.pqcStatus === 'VULNERABLE' ? '#ef4444' : '#6366f1';
                  const pqcLabel = row.pqcStatus === 'FULLY_QUANTUM_SAFE' ? 'Quantum Safe'
                    : row.pqcStatus === 'PQC_READY' ? 'PQC Ready'
                    : row.pqcStatus === 'VULNERABLE' ? 'Vulnerable' : 'Unknown';
                  return (
                    <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
                      <td className="px-4 py-2.5 text-secondary text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-indigo-400 max-w-[220px] truncate" title={row.url}>{row.url}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono text-sm w-8" style={{ color: riskColor(row.score) }}>{row.score}</span>
                          <div className="w-14 h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: riskColor(row.score) }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: pqcColor, background: `${pqcColor}15`, borderColor: `${pqcColor}35` }}>
                          {pqcLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
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

        {/* PQC Status breakdown — replaces radar (easier to understand) */}
        <div className="glass-card border rounded-xl p-5 flex flex-col gap-4">
          <div>
            <div className="text-sm font-bold text-primary mb-1">PQC Status Breakdown</div>
            <div className="text-xs text-secondary">Asset classification by quantum readiness</div>
          </div>

          {/* Stacked bar */}
          {totalAssets > 0 && (
            <div className="w-full h-5 rounded-full overflow-hidden flex gap-0.5">
              {vulnerableCount > 0 && (
                <div className="h-full bg-red-500 transition-all duration-700 rounded-l-full"
                  style={{ width: `${Math.round((vulnerableCount / totalAssets) * 100)}%` }}
                  title={`Vulnerable: ${vulnerableCount}`} />
              )}
              {pqcReadyCount > 0 && (
                <div className="h-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${Math.round((pqcReadyCount / totalAssets) * 100)}%` }}
                  title={`PQC Ready: ${pqcReadyCount}`} />
              )}
              {(() => {
                const safeCount = (assets as any[]).filter(a => inferPqcStatus(a) === 'FULLY_QUANTUM_SAFE').length;
                return safeCount > 0 ? (
                  <div className="h-full bg-emerald-500 transition-all duration-700 rounded-r-full"
                    style={{ width: `${Math.round((safeCount / totalAssets) * 100)}%` }}
                    title={`Quantum Safe: ${safeCount}`} />
                ) : null;
              })()}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-col gap-3">
            {[
              { label: 'Quantum Vulnerable', count: vulnerableCount, color: '#ef4444', desc: 'RSA/ECDSA — broken by CRQC' },
              { label: 'PQC Ready (Hybrid)', count: pqcReadyCount,   color: '#f59e0b', desc: 'Partially protected' },
              { label: 'Fully Quantum Safe', count: (assets as any[]).filter(a => inferPqcStatus(a) === 'FULLY_QUANTUM_SAFE').length, color: '#22c55e', desc: 'NIST FIPS 203/204/205' },
              { label: 'Unknown / Unanalyzed', count: (assets as any[]).filter(a => inferPqcStatus(a) === 'UNKNOWN').length, color: '#6366f1', desc: 'Scan incomplete' },
            ].filter(r => r.count > 0).map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: row.color }}>{row.label}</span>
                    <span className="font-black font-mono text-sm" style={{ color: row.color }}>{row.count}</span>
                  </div>
                  <div className="text-[10px] text-secondary">{row.desc}</div>
                  <div className="w-full h-1.5 bg-surface-card rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${totalAssets > 0 ? Math.round((row.count / totalAssets) * 100) : 0}%`, background: row.color }} />
                  </div>
                </div>
                <span className="text-[10px] text-secondary w-8 text-right">
                  {totalAssets > 0 ? Math.round((row.count / totalAssets) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div className="mt-1 pt-3 border-t border-glass-border grid grid-cols-2 gap-2 text-[10px] text-secondary">
            <div>Total Assets: <span className="text-primary font-bold">{totalAssets}</span></div>
            <div>Shadow: <span className="text-orange-400 font-bold">{shadowCount}</span></div>
            <div>Critical Risk: <span className="text-red-400 font-bold">{critCount}</span></div>
            <div>High Risk: <span className="text-orange-400 font-bold">{highCount}</span></div>
          </div>
        </div>
      </div>

      {/* ── Score Comparison Bar Chart ───────────────────────────── */}
      {chartData.length > 0 && (
        <div className="glass-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary">Risk Score by Asset (Top 10)</div>
              <div className="text-xs text-secondary">Higher bar = higher risk. Red = critical, green = safe.</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28} margin={{ top: 5, right: 10, left: -15, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} dy={6} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} formatter={(v: any) => [v, 'Risk Score']} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={riskColor(entry.score)} fillOpacity={0.85} />
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
            <div className="text-sm font-bold text-primary">Security Dimension Breakdown</div>
            <div className="text-xs text-secondary">All scores are safety-oriented — higher = better</div>
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
                <span className="font-black font-mono text-sm" style={{ color: cat.color }}>{cat.score}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.score}%`, background: cat.color, boxShadow: `0 0 8px ${cat.color}55` }} />
              </div>
              <div className="text-[10px] text-secondary">{cat.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tier Classification ───────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex items-center gap-2"
          style={{ background: 'rgba(99,102,241,0.05)' }}>
          <Shield size={16} className="text-indigo-400" />
          <span className="font-bold text-primary">Tier Classification Reference</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-glass-border/30">
          {TIER_TABLE.map((row, i) => {
            const isCurrent = riskTier(exposureScore).label === row.tier;
            return (
              <div key={i} className="p-5 flex flex-col gap-3 relative" style={{ background: isCurrent ? `${row.color}10` : row.bg }}>
                {isCurrent && (
                  <div className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded"
                    style={{ background: `${row.color}20`, color: row.color }}>← CURRENT</div>
                )}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
