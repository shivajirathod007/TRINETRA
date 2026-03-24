/**
 * PosturePage — Posture of PQC
 * Shows organization-wide quantum cryptographic readiness breakdown.
 */
import { useScanStore } from '../store';
import { useAssets } from '../hooks';
import { EmptyState, SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp } from 'lucide-react';

export default function PosturePage() {
  useAutoLoadScan();
  const { activeScanId } = useScanStore();
  const { data: assets = [] } = useAssets(activeScanId);

  if (!activeScanId) return <EmptyState message="No active scan. Initiate a scan from Asset Discovery." />;

  const total   = assets.length || 1; // prevent div/0
  const pqcSafe = assets.filter(a => a.quantum_safe_status === 'FULLY_QUANTUM_SAFE').length;
  const hybrid  = assets.filter(a => a.quantum_safe_status === 'PQC_READY').length;
  const vuln    = assets.filter(a => a.quantum_safe_status === 'VULNERABLE').length;
  const unknown = assets.length - pqcSafe - hybrid - vuln;

  const tiles = [
    { label: 'Fully Quantum Safe',  count: pqcSafe, pct: +(pqcSafe / total * 100).toFixed(0), color: 'text-status-safe',     bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  icon: <ShieldCheck size={28} className="text-status-safe" /> },
    { label: 'PQC Ready (Hybrid)',  count: hybrid,  pct: +(hybrid  / total * 100).toFixed(0), color: 'text-status-medium',   bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  icon: <TrendingUp  size={28} className="text-status-medium" /> },
    { label: 'Quantum Vulnerable',  count: vuln,    pct: +(vuln    / total * 100).toFixed(0), color: 'text-status-critical', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  icon: <ShieldAlert size={28} className="text-status-critical" /> },
    { label: 'Unknown / Unanalyzed',count: unknown, pct: +(unknown / total * 100).toFixed(0), color: 'text-secondary',       bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.2)', icon: <ShieldX    size={28} className="text-secondary" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Posture of PQC"
        subtitle="Organization-wide quantum cryptographic readiness"
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(tile => (
          <div
            key={tile.label}
            className="glass-card p-6 rounded-xl border text-center"
            style={{ background: tile.bg, borderColor: tile.border }}
          >
            <div className="flex justify-center mb-3">{tile.icon}</div>
            <div className={`text-4xl font-bold font-mono ${tile.color}`}>{tile.pct}%</div>
            <div className={`text-xl font-semibold ${tile.color} mt-1`}>{tile.count}</div>
            <div className="text-xs text-secondary mt-2 leading-snug font-medium">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Bars */}
      <div className="glass-card border rounded-xl p-6 flex flex-col gap-5">
        <h2 className="font-bold text-primary text-base border-b border-glass-border pb-3">Readiness Breakdown</h2>
        {tiles.map(tile => (
          <div key={tile.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-primary font-medium flex items-center gap-2">{tile.icon} {tile.label}</span>
              <span className={`font-mono font-bold ${tile.color}`}>{tile.pct}% ({tile.count})</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${tile.pct}%`, background: tile.color.replace('text-', 'var(--') + ')' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
