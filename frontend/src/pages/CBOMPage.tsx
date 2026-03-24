/**
 * CBOMPage — Cryptographic Bill of Materials (CycloneDX 1.6)
 * Fixed: Derives KPI summary from components array since API returns flat structure.
 */
import { useMemo, useState } from 'react';
import { Download, Shield, AlertTriangle, Eye, CheckCircle2, ExternalLink } from 'lucide-react';
import { useScanStore } from '../store';
import { useCBOM } from '../hooks';
import { LoadingSpinner, EmptyState, SectionHeader, ScoreBadge, AlgorithmTag, HNDLDeadline } from '../components/shared';
import { cbomApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

// ─── Status badge helpers ──────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  CRITICAL:     'bg-status-critical/15 text-status-critical border-status-critical/30',
  HIGH:         'bg-status-high/15 text-status-high border-status-high/30',
  MEDIUM:       'bg-status-medium/15 text-status-medium border-status-medium/30',
  LOW:          'bg-status-safe/15 text-status-safe border-status-safe/30',
  SAFE:         'bg-status-safe/15 text-status-safe border-status-safe/30',
  UNKNOWN:      'bg-surface-card text-secondary border-glass-border',
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? 'UNKNOWN').toUpperCase();
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_STYLE[s] ?? STATUS_STYLE.UNKNOWN}`}>
      {s}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CBOMPage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain } = useScanStore();
  const { data: cbom, isLoading } = useCBOM(activeScanId);
  const [search, setSearch] = useState('');

  // Derive KPI summary safely from flat components array
  const summary = useMemo(() => {
    const components: any[] = cbom?.components ?? [];
    return {
      total:  components.length,
      critical: components.filter(c => (c.status ?? c.risk_level ?? '').toUpperCase() === 'CRITICAL').length,
      shadow:   components.filter(c => c.is_shadow).length,
      safe:     components.filter(c => (c.status ?? '').toUpperCase() === 'SAFE').length,
    };
  }, [cbom]);

  const components: any[] = cbom?.components ?? [];
  const filtered = search
    ? components.filter(c => (c.url ?? c.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : components;

  if (!activeScanId) return <EmptyState message="No active scan. Initiate a scan from Asset Discovery." />;
  if (isLoading)     return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>;
  if (!cbom)         return <EmptyState message="CBOM not available yet. Scan may still be running." icon="⏳" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Cryptographic Bill of Materials"
        subtitle={`CycloneDX ${cbom.specVersion ?? '1.6'} — ${activeDomain ?? activeScanId}`}
        action={
          <a
            href={cbomApi.downloadUrl(activeScanId)}
            download
            className="action-btn flex items-center gap-2 text-sm"
          >
            <Download size={14} /> Export JSON
          </a>
        }
      />

      {/* ── KPI Summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Components', value: summary.total,    icon: <Eye size={20} />,          color: 'text-primary',        bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
          { label: 'Critical Risk',    value: summary.critical, icon: <AlertTriangle size={20} />, color: 'text-status-critical', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
          { label: 'Shadow Assets',   value: summary.shadow,   icon: <Shield size={20} />,         color: 'text-status-medium',  bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)' },
          { label: 'Quantum Safe',    value: summary.safe,     icon: <CheckCircle2 size={20} />,   color: 'text-status-safe',    bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-5 rounded-xl border text-center"
            style={{ background: kpi.bg, borderColor: kpi.border }}>
            <div className={`flex justify-center mb-2 ${kpi.color} opacity-70`}>{kpi.icon}</div>
            <div className={`text-3xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-secondary mt-2 uppercase tracking-wider font-semibold">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Table ──────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-primary">CBOM Components ({filtered.length})</span>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by URL…"
              className="bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary placeholder-secondary focus:outline-none focus:border-primary-indigo/50 w-52"
            />
            <span className="text-xs text-secondary font-mono">specVersion: {cbom.specVersion ?? '1.0'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="bg-surface-card-hover">
                {['URL / Host', 'TLS', 'Cipher', 'Key Exchange', 'Certificate', 'Score', 'Expiry', 'Status'].map(h => (
                  <th key={h} className="text-left text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-secondary">No components found.</td>
                </tr>
              ) : filtered.map((entry: any, i: number) => (
                <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-primary max-w-[200px]">
                    <div className="flex items-center gap-1.5 truncate">
                      {entry.url ?? entry.name ?? entry.asset?.fqdn ?? '—'}
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noreferrer" className="text-primary-indigo opacity-50 hover:opacity-100 shrink-0">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-secondary whitespace-nowrap">
                    {entry.tls ?? entry.tls_version ?? entry.asset?.highest_version ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {entry.cipher ?? entry.cipher_suite ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AlgorithmTag algorithm={entry.key_exchange ?? entry.kc} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-secondary">{entry.cert ?? entry.cert_algorithm ?? '—'}</span>
                      {entry.cert_issuer && <span className="text-secondary/60 text-[10px]">{entry.cert_issuer}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={entry.score ?? entry.quantum_risk?.quantum_exposure_score} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-mono text-secondary whitespace-nowrap">
                    {entry.cert_expiry
                      ? new Date(entry.cert_expiry).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })
                      : entry.hndl?.primary_deadline
                        ? <HNDLDeadline deadline={entry.hndl.primary_deadline} urgency={entry.hndl.urgency_level} />
                        : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status ?? entry.risk_level ?? entry.quantum_risk?.quantum_safe_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`.shrink-0{flex-shrink:0}`}</style>
    </div>
  );
}
