/**
 * PosturePage — Posture of PQC
 * Enhanced visualization of organization-wide quantum cryptographic readiness.
 */
import { useState } from 'react';
import { useScanStore } from '../store';
import { useAssets } from '../hooks';
import { EmptyState, SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import {
  ShieldCheck, ShieldAlert, ShieldX, TrendingUp, Loader2,
  ChevronRight, Search, Filter, Download
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; shortLabel: string;
  color: string; bg: string; border: string;
  icon: React.ReactNode; iconSm: React.ReactNode;
}> = {
  FULLY_QUANTUM_SAFE: {
    label: 'Fully Quantum Safe', shortLabel: 'Safe',
    color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)',
    icon: <ShieldCheck size={28} />, iconSm: <ShieldCheck size={16} />,
  },
  CLASSICAL_SAFE: {
    label: 'Classically Safe', shortLabel: 'Classical',
    color: '#22c55e', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.2)',
    icon: <ShieldCheck size={28} />, iconSm: <ShieldCheck size={16} />,
  },
  PQC_READY: {
    label: 'PQC Ready (Hybrid)', shortLabel: 'Hybrid',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    icon: <TrendingUp size={28} />, iconSm: <TrendingUp size={16} />,
  },
  VULNERABLE: {
    label: 'Quantum Vulnerable', shortLabel: 'Vulnerable',
    color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)',
    icon: <ShieldAlert size={28} />, iconSm: <ShieldAlert size={16} />,
  },
  UNKNOWN: {
    label: 'Unknown / Unanalyzed', shortLabel: 'Unknown',
    color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)',
    icon: <ShieldX size={28} />, iconSm: <ShieldX size={16} />,
  },
  SCAN_FAILED: {
    label: 'Scan Failed', shortLabel: 'Failed',
    color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)',
    icon: <ShieldX size={28} />, iconSm: <ShieldX size={16} />,
  },
};

const TILE_ORDER = ['FULLY_QUANTUM_SAFE', 'CLASSICAL_SAFE', 'PQC_READY', 'VULNERABLE', 'UNKNOWN', 'SCAN_FAILED'];

const TOOLTIP_STYLE = {
  contentStyle: { background: 'rgba(10,16,36,0.97)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#f8fafc', fontSize: 12 },
};

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 75) return '#ef4444';
  if (s >= 50) return '#f97316';
  if (s >= 25) return '#eab308';
  return '#22c55e';
}

// ─── Donut gauge ──────────────────────────────────────────────────────────────

function DonutGauge({ pct, color, label }: { pct: number; color: string; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 90, height: 90 }}>
        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="45" cy="45" r={r} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black font-mono leading-none" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-secondary font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PosturePage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain } = useScanStore();
  const { data: assets = [], isLoading } = useAssets(activeScanId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  if (!activeScanId) {
    return <EmptyState message="No active scan. Initiate a scan from Asset Discovery." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-24 text-secondary">
        <Loader2 size={40} className="animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Loading posture data for <span className="text-primary font-bold">{activeDomain}</span>…</p>
      </div>
    );
  }

  const total = assets.length || 1;

  // Build counts
  const counts: Record<string, number> = {};
  for (const asset of assets) {
    const key = (asset.quantum_safe_status as string) || 'UNKNOWN';
    counts[key] = (counts[key] || 0) + 1;
  }

  const tiles = TILE_ORDER
    .filter(k => STATUS_CONFIG[k])
    .map(k => ({
      key: k,
      ...STATUS_CONFIG[k],
      count: counts[k] || 0,
      pct: Math.round(((counts[k] || 0) / total) * 100),
    }))
    .filter(t => t.count > 0 || ['FULLY_QUANTUM_SAFE', 'PQC_READY', 'VULNERABLE', 'UNKNOWN'].includes(t.key));

  // Pie data
  const pieData = tiles.filter(t => t.count > 0).map(t => ({
    name: t.shortLabel, value: t.count, color: t.color,
  }));

  // Bar chart — TLS version distribution
  const tlsCounts: Record<string, number> = {};
  for (const a of assets) {
    const v = (a as any).tls_version || 'Unknown';
    tlsCounts[v] = (tlsCounts[v] || 0) + 1;
  }
  const tlsData = Object.entries(tlsCounts)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([name, value]) => ({
      name: name.replace('TLS_', 'TLS ').replace(/_/g, '.'),
      value,
      color: name.includes('1_3') ? '#22c55e' : name.includes('1_2') ? '#f59e0b' : '#ef4444',
    }));

  // Filtered table assets
  const filtered = assets.filter((a: any) => {
    const matchStatus = statusFilter === 'ALL' || (a.quantum_safe_status || 'UNKNOWN') === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (a.url || a.fqdn || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <SectionHeader
        title="Posture of PQC"
        subtitle={`Organization-wide quantum cryptographic readiness${activeDomain ? ` — ${activeDomain}` : ''}`}
      />

      {/* Summary line */}
      <div className="text-sm text-secondary">
        Analysed <span className="text-primary font-bold">{assets.length}</span> assets
        {activeDomain && <> for <span className="text-primary font-bold font-mono">{activeDomain}</span></>}
      </div>

      {/* ── KPI Tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(tile => (
          <div key={tile.key} className="glass-card rounded-xl border p-5 flex flex-col items-center text-center gap-2 relative overflow-hidden"
            style={{ background: tile.bg, borderColor: tile.border }}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5 blur-xl rounded-full"
              style={{ background: tile.color }} />
            <div style={{ color: tile.color }}>{tile.icon}</div>
            <div className="text-3xl font-black font-mono" style={{ color: tile.color }}>{tile.pct}%</div>
            <div className="text-xl font-bold" style={{ color: tile.color }}>{tile.count}</div>
            <div className="text-xs text-secondary font-medium leading-snug">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Donut gauges */}
        <div className="glass-card border rounded-xl p-6">
          <div className="text-sm font-bold text-primary mb-1">Readiness at a Glance</div>
          <div className="text-xs text-secondary mb-5">Per-category percentage</div>
          <div className="flex flex-wrap justify-center gap-5">
            {tiles.filter(t => t.count > 0).map(t => (
              <DonutGauge key={t.key} pct={t.pct} color={t.color} label={t.shortLabel} />
            ))}
          </div>
        </div>

        {/* Pie chart */}
        <div className="glass-card border rounded-xl p-6">
          <div className="text-sm font-bold text-primary mb-1">Distribution</div>
          <div className="text-xs text-secondary mb-3">PQC status breakdown</div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, n: string) => [v + ' assets', n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-secondary">{d.name}</span>
                    <span className="font-bold text-primary">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-secondary text-xs">No data</div>
          )}
        </div>

        {/* TLS version bar chart */}
        <div className="glass-card border rounded-xl p-6">
          <div className="text-sm font-bold text-primary mb-1">TLS Version Distribution</div>
          <div className="text-xs text-secondary mb-3">Protocol versions in use</div>
          {tlsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tlsData} barSize={28} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Assets" radius={[5, 5, 0, 0]}>
                  {tlsData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-secondary text-xs">No TLS data</div>
          )}
        </div>
      </div>

      {/* ── Readiness Breakdown bars ────────────────────────────────── */}
      <div className="glass-card border rounded-xl p-6">
        <h2 className="font-bold text-primary mb-5 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
          Readiness Breakdown
        </h2>
        <div className="flex flex-col gap-4">
          {tiles.map(tile => (
            <div key={tile.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium" style={{ color: tile.color }}>
                  {tile.iconSm}
                  <span className="text-primary">{tile.label}</span>
                </span>
                <span className="font-mono font-bold text-sm" style={{ color: tile.color }}>
                  {tile.pct}% <span className="text-secondary font-normal text-xs">({tile.count})</span>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${tile.pct}%`, background: tile.color, boxShadow: `0 0 8px ${tile.color}55` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Asset Details Table ─────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="glass-card border rounded-xl overflow-hidden">
          {/* Table header + filters */}
          <div className="px-5 py-4 border-b border-glass-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">Asset Details</span>
              <span className="text-xs text-secondary">({filtered.length} of {assets.length})</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search URL or type…"
                  className="bg-surface-card border border-glass-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-primary placeholder-secondary focus:outline-none focus:border-indigo-500/50 w-44"
                />
              </div>
              {/* Status filter */}
              <div className="flex gap-1 flex-wrap">
                {['ALL', ...TILE_ORDER.filter(k => counts[k] > 0)].map(k => {
                  const cfg = k === 'ALL' ? null : STATUS_CONFIG[k];
                  return (
                    <button key={k} onClick={() => setStatusFilter(k)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                        statusFilter === k
                          ? 'text-white border-transparent'
                          : 'border-glass-border text-secondary hover:text-primary'
                      }`}
                      style={statusFilter === k ? {
                        background: cfg ? cfg.color : '#6366f1',
                        borderColor: cfg ? cfg.color : '#6366f1',
                      } : {}}>
                      {k === 'ALL' ? 'All' : cfg?.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-card-hover">
                  {['Asset URL', 'Type', 'TLS Version', 'Risk Score', 'PQC Status'].map(h => (
                    <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset: any) => {
                  const statusKey = asset.quantum_safe_status || 'UNKNOWN';
                  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG['UNKNOWN'];
                  const score = asset.score ?? asset.quantum_exposure_score ?? 0;
                  return (
                    <tr key={asset.id}
                      className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors group cursor-pointer">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-indigo-400 font-medium truncate max-w-[260px] block" title={asset.url || asset.fqdn}>
                          {asset.url || asset.fqdn || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-secondary text-xs capitalize">
                        {(asset.type || '—').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-bold ${
                          (asset.tls_version || '').includes('1_3') || (asset.tls_version || '').includes('1.3') ? 'text-emerald-400' :
                          (asset.tls_version || '').includes('1_2') || (asset.tls_version || '').includes('1.2') ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {(asset.tls_version || '—').replace('TLS_', 'TLS ').replace(/_/g, '.')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm" style={{ color: scoreColor(score) }}>{score || '—'}</span>
                          {score > 0 && (
                            <div className="w-12 h-1.5 bg-surface-card rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor(score) }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border"
                          style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}>
                          {cfg.iconSm}
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-14 text-secondary">
                      <Filter size={24} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No assets match the current filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between text-xs text-secondary">
            <span>Showing {filtered.length} of {assets.length} assets</span>
            <span>TRINETRA — Quantum Exposure Intelligence Platform</span>
          </div>
        </div>
      )}
    </div>
  );
}
