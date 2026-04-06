/**
 * PosturePage — Posture of PQC
 * Shows organization-wide quantum cryptographic readiness breakdown.
 * All data is live from the backend via useAssets(); nothing is hardcoded.
 */
import { useScanStore } from '../store';
import { useAssets } from '../hooks';
import { EmptyState, SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp, Loader2 } from 'lucide-react';

// All possible backend statuses
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  hexColor: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  FULLY_QUANTUM_SAFE: {
    label: 'Fully Quantum Safe',
    color: 'text-status-safe',
    hexColor: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.25)',
    icon: <ShieldCheck size={28} />,
  },
  CLASSICAL_SAFE: {
    label: 'Classically Safe',
    color: 'text-status-safe',
    hexColor: '#22c55e',
    bg: 'rgba(34,197,94,0.07)',
    border: 'rgba(34,197,94,0.2)',
    icon: <ShieldCheck size={28} />,
  },
  PQC_READY: {
    label: 'PQC Ready (Hybrid)',
    color: 'text-status-medium',
    hexColor: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    border: 'rgba(234,179,8,0.25)',
    icon: <TrendingUp size={28} />,
  },
  VULNERABLE: {
    label: 'Quantum Vulnerable',
    color: 'text-status-critical',
    hexColor: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.25)',
    icon: <ShieldAlert size={28} />,
  },
  UNKNOWN: {
    label: 'Unknown / Unanalyzed',
    color: 'text-secondary',
    hexColor: '#818cf8',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.2)',
    icon: <ShieldX size={28} />,
  },
  SCAN_FAILED: {
    label: 'Scan Failed',
    color: 'text-secondary',
    hexColor: '#6b7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.2)',
    icon: <ShieldX size={28} />,
  },
};

// Display order for KPI tiles (most positive → most negative)
const TILE_ORDER = ['FULLY_QUANTUM_SAFE', 'CLASSICAL_SAFE', 'PQC_READY', 'VULNERABLE', 'UNKNOWN', 'SCAN_FAILED'];

export default function PosturePage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain } = useScanStore();
  const { data: assets = [], isLoading } = useAssets(activeScanId);

  if (!activeScanId) {
    return <EmptyState message="No active scan. Initiate a scan from Asset Discovery." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-24 text-secondary">
        <Loader2 size={40} className="animate-spin text-primary-indigo" />
        <p className="text-sm font-medium">Loading posture data for <span className="text-primary font-bold">{activeDomain}</span>…</p>
      </div>
    );
  }

  const total = assets.length || 1; // prevent div/0

  // Build counts by status
  const counts: Record<string, number> = {};
  for (const asset of assets) {
    const key = (asset.quantum_safe_status as string) || 'UNKNOWN';
    counts[key] = (counts[key] || 0) + 1;
  }

  // Only show tiles that actually exist in status config + have count > 0 (or all defined ones)
  const tiles = TILE_ORDER
    .filter(key => STATUS_CONFIG[key])
    .map(key => ({
      key,
      ...STATUS_CONFIG[key],
      count: counts[key] || 0,
      pct: Math.round(((counts[key] || 0) / total) * 100),
    }))
    .filter(tile => tile.count > 0 || ['FULLY_QUANTUM_SAFE', 'PQC_READY', 'VULNERABLE', 'UNKNOWN'].includes(tile.key));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Posture of PQC"
        subtitle={`Organization-wide quantum cryptographic readiness${activeDomain ? ` — ${activeDomain}` : ''}`}
      />

      {/* Summary line */}
      <div className="text-sm text-secondary font-medium">
        Analysed <span className="text-primary font-bold">{assets.length}</span> assets
        {activeDomain && <> for <span className="text-primary font-bold">{activeDomain}</span></>}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(tile => (
          <div
            key={tile.key}
            className="glass-card p-6 rounded-xl border text-center"
            style={{ background: tile.bg, borderColor: tile.border }}
          >
            <div className="flex justify-center mb-3" style={{ color: tile.hexColor }}>
              {tile.icon}
            </div>
            <div className={`text-4xl font-bold font-mono ${tile.color}`}>{tile.pct}%</div>
            <div className={`text-xl font-semibold ${tile.color} mt-1`}>{tile.count}</div>
            <div className="text-xs text-secondary mt-2 leading-snug font-medium">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Readiness Breakdown */}
      <div className="glass-card border rounded-xl p-6 flex flex-col gap-5">
        <h2 className="font-bold text-primary text-base border-b border-glass-border pb-3">
          Readiness Breakdown
        </h2>
        {tiles.map(tile => (
          <div key={tile.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-primary font-medium flex items-center gap-2" style={{ color: tile.hexColor }}>
                {tile.icon}
                <span className="text-primary">{tile.label}</span>
              </span>
              <span className={`font-mono font-bold ${tile.color}`}>
                {tile.pct}% ({tile.count})
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-card)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${tile.pct}%`, background: tile.hexColor }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-asset table */}
      {assets.length > 0 && (
        <div className="glass-card border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-glass-border bg-surface-card/50">
            <h2 className="font-bold text-primary text-base">Asset Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-glass-border/50 bg-surface-card/30 text-secondary text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Asset URL</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">TLS Version</th>
                  <th className="p-4 font-medium">Risk Score</th>
                  <th className="p-4 font-medium">PQC Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset: any) => {
                  const statusKey = asset.quantum_safe_status || 'UNKNOWN';
                  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG['UNKNOWN'];
                  return (
                    <tr
                      key={asset.id}
                      className="border-b border-glass-border/30 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-primary max-w-xs truncate">
                        {asset.url || asset.fqdn || '—'}
                      </td>
                      <td className="p-4 text-secondary text-xs">{asset.type || '—'}</td>
                      <td className="p-4 font-mono text-xs text-secondary">{asset.tls_version || '—'}</td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-xs" style={{ color: asset.score >= 70 ? '#ef4444' : asset.score >= 40 ? '#eab308' : '#22c55e' }}>
                          {asset.score ?? '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                          style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.hexColor,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
