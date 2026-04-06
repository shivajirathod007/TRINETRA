/**
 * AssetInventoryPage — Full asset inventory with tabs, search, export, and drill-down.
 * Data comes from /api/v1/assets/?scan_id=... which returns the full asset list.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Shield, Network, Code2, Download, Filter, Search,
  ChevronRight, RefreshCw, AlertTriangle, Server, ExternalLink
} from 'lucide-react';
import { SectionHeader, LoadingSpinner, RiskBadge, CertBadge } from '../components/shared';
import { SensitivityBadge } from '../components/shared/SensitivityBadge';
import { useQuery } from '@tanstack/react-query';
import { useScanStore } from '../store';
import { assetsApi } from '../api/index';
import { RISK_COLORS } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'Domains' | 'SSL' | 'IP / Subnets' | 'APIs';
type RiskFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score?: number }) {
  const s = score ?? 0;
  const color = s >= 75 ? '#EF4444' : s >= 50 ? '#F97316' : s >= 25 ? '#EAB308' : '#22C55E';
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono font-bold text-sm w-8" style={{ color }}>{s}</span>
      <div className="w-16 bg-surface-card rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function exportCSV(assets: any[], tab: Tab) {
  const headers: Record<Tab, string[]> = {
    'Domains': ['URL', 'Type', 'Risk Level', 'Score', 'PQC Status', 'Discovery', 'Sensitivity Tier', 'Scan Date'],
    'SSL': ['URL', 'TLS Version', 'Cert Algorithm', 'Cert Issuer', 'Cert Expiry', 'Risk Level', 'Score'],
    'IP / Subnets': ['URL', 'IP Address', 'Port', 'Type', 'Risk Level', 'Score'],
    'APIs': ['URL', 'Type', 'Risk Level', 'Score', 'Sensitivity Tier', 'Discovery'],
  };
  const rows: Record<Tab, (a: any) => string[]> = {
    'Domains': a => [a.url, a.type, a.risk_level, a.score, a.quantum_safe_status ?? '', a.discovery, a.data_sensitivity_tier ?? '', a.scan_timestamp ?? ''],
    'SSL': a => [a.url, a.tls_version ?? '', a.cert_algorithm ?? '', a.cert_issuer ?? '', a.cert_expiry ?? '', a.risk_level, a.score],
    'IP / Subnets': a => [a.url, a.ip_address ?? '', a.port ?? '', a.type, a.risk_level, a.score],
    'APIs': a => [a.url, a.type, a.risk_level, a.score, a.data_sensitivity_tier ?? '', a.discovery],
  };
  const h = headers[tab];
  const r = rows[tab];
  const csv = [h.join(','), ...assets.map(a => r(a).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `trinetra-${tab.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Table components ─────────────────────────────────────────────────────────

function DomainsTable({ assets, onRowClick }: { assets: any[]; onRowClick: (a: any) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['URL / FQDN', 'Type', 'Sensitivity', 'Risk Level', 'Score', 'PQC Status', 'Discovery', ''].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {assets.map((a, i) => (
          <tr key={a.id || i}
            onClick={() => onRowClick(a)}
            className={`border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group ${a.discovery === 'Shadow' ? 'bg-status-high/5' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {a.discovery === 'Shadow' && <AlertTriangle size={12} className="text-status-high flex-shrink-0" />}
                <span className="font-mono text-primary-indigo font-medium text-xs truncate max-w-[220px]" title={a.url}>{a.url}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-secondary text-xs">{a.type ?? '—'}</td>
            <td className="px-4 py-3">
              <SensitivityBadge tier={a.data_sensitivity_tier || 'static'} source={a.data_sensitivity_tier_source} />
            </td>
            <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
            <td className="px-4 py-3"><ScoreBar score={a.score} /></td>
            <td className="px-4 py-3"><CertBadge tier={a.quantum_safe_status ?? 'UNKNOWN'} /></td>
            <td className="px-4 py-3">
              {a.discovery === 'Shadow'
                ? <span className="text-xs font-bold text-status-high">Shadow</span>
                : <span className="text-xs text-secondary">Known</span>}
            </td>
            <td className="px-4 py-3 text-right">
              <ChevronRight size={16} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable({ assets, onRowClick }: { assets: any[]; onRowClick: (a: any) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['URL', 'TLS Version', 'Cert Algorithm', 'Cert Issuer', 'Expiry', 'Risk', 'Score', ''].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {assets.map((a, i) => (
          <tr key={a.id || i}
            onClick={() => onRowClick(a)}
            className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
            <td className="px-4 py-3 font-mono text-primary-indigo text-xs truncate max-w-[180px]" title={a.url}>{a.url}</td>
            <td className="px-4 py-3">
              <span className={`font-mono text-xs font-bold ${a.tls_version === 'TLS_1_3' ? 'text-status-safe' : a.tls_version === 'TLS_1_2' ? 'text-status-medium' : 'text-status-critical'}`}>
                {a.tls_version ?? '—'}
              </span>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-secondary">{a.cert_algorithm ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-secondary truncate max-w-[140px]">{a.cert_issuer ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs text-secondary">{a.cert_expiry ?? '—'}</td>
            <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
            <td className="px-4 py-3"><ScoreBar score={a.score} /></td>
            <td className="px-4 py-3 text-right">
              <ChevronRight size={16} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ assets, onRowClick }: { assets: any[]; onRowClick: (a: any) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['URL', 'IP Address', 'Port', 'Type', 'Risk Level', 'Score', ''].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {assets.map((a, i) => (
          <tr key={a.id || i}
            onClick={() => onRowClick(a)}
            className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
            <td className="px-4 py-3 font-mono text-primary-indigo text-xs truncate max-w-[200px]" title={a.url}>{a.url}</td>
            <td className="px-4 py-3 font-mono text-xs text-secondary">{a.ip_address ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs text-secondary">{a.port ?? '—'}</td>
            <td className="px-4 py-3 text-xs text-secondary">{a.type ?? '—'}</td>
            <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
            <td className="px-4 py-3"><ScoreBar score={a.score} /></td>
            <td className="px-4 py-3 text-right">
              <ChevronRight size={16} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function APIsTable({ assets, onRowClick }: { assets: any[]; onRowClick: (a: any) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['URL', 'Type', 'Sensitivity', 'Risk Level', 'Score', 'Discovery', ''].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {assets.map((a, i) => (
          <tr key={a.id || i}
            onClick={() => onRowClick(a)}
            className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
            <td className="px-4 py-3 font-mono text-primary-indigo text-xs truncate max-w-[220px]" title={a.url}>{a.url}</td>
            <td className="px-4 py-3 text-xs text-secondary">{a.type ?? '—'}</td>
            <td className="px-4 py-3">
              <SensitivityBadge tier={a.data_sensitivity_tier || 'static'} source={a.data_sensitivity_tier_source} />
            </td>
            <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
            <td className="px-4 py-3"><ScoreBar score={a.score} /></td>
            <td className="px-4 py-3">
              {a.discovery === 'Shadow'
                ? <span className="text-xs font-bold text-status-high flex items-center gap-1"><AlertTriangle size={10} /> Shadow</span>
                : <span className="text-xs text-secondary">Known</span>}
            </td>
            <td className="px-4 py-3 text-right">
              <ChevronRight size={16} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const API_TYPES = new Set(['api_endpoint', 'api_public', 'api_authenticated', 'mobile_backend']);

export default function AssetInventoryPage() {
  const [tab, setTab] = useState<Tab>('Domains');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('ALL');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { activeScanId } = useScanStore();

  const { data: rawAssets = [], isLoading, refetch } = useQuery({
    queryKey: ['assets-inventory', activeScanId],
    queryFn: () => assetsApi.list({ scan_id: activeScanId, limit: 500 }),
    enabled: !!activeScanId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const assets: any[] = rawAssets as any[];

  // ── Derived tab datasets ──────────────────────────────────────────────────
  const sslAssets = useMemo(() => assets.filter(a => a.tls_version || a.cert_algorithm), [assets]);
  const ipAssets = useMemo(() => assets.filter(a => a.ip_address), [assets]);
  const apiAssets = useMemo(() => {
    const result: any[] = [];
    for (const a of assets) {
      if (API_TYPES.has(a.type)) {
        result.push(a);
      }
      const endpoints = a.score_breakdown?.endpoints_scanned;
      if (Array.isArray(endpoints) && endpoints.length > 0) {
        for (const ep of endpoints) {
          result.push({
            ...a,
            id: `${a.id}-${ep}`,
            url: `${a.url}${ep}`,
            type: 'api_route',
            discovery: 'API Inspector',
          });
        }
      }
    }
    return result;
  }, [assets]);

  const tabData: Record<Tab, any[]> = {
    'Domains': assets,
    'SSL': sslAssets,
    'IP / Subnets': ipAssets,
    'APIs': apiAssets,
  };

  const tabCounts: Record<Tab, number> = {
    'Domains': assets.length,
    'SSL': sslAssets.length,
    'IP / Subnets': ipAssets.length,
    'APIs': apiAssets.length,
  };

  const tabIcons: Record<Tab, React.ReactNode> = {
    'Domains': <Globe size={14} />,
    'SSL': <Shield size={14} />,
    'IP / Subnets': <Network size={14} />,
    'APIs': <Code2 size={14} />,
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = tabData[tab];
    if (riskFilter !== 'ALL') {
      data = data.filter(a => (a.risk_level ?? 'UNKNOWN').toUpperCase() === riskFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(a =>
        (a.url ?? '').toLowerCase().includes(q) ||
        (a.type ?? '').toLowerCase().includes(q) ||
        (a.ip_address ?? '').toLowerCase().includes(q) ||
        (a.cert_issuer ?? '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [tab, riskFilter, search, assets]);

  const handleRowClick = (asset: any) => {
    if (asset.id) navigate(`/asset/${asset.id}`);
  };

  // ── KPI counts ────────────────────────────────────────────────────────────
  const criticalCount = assets.filter(a => (a.risk_level ?? '').toUpperCase() === 'CRITICAL').length;
  const shadowCount = assets.filter(a => a.discovery === 'Shadow').length;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Asset Inventory"
        subtitle="Discovered assets across domains, SSL, IPs and APIs"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="action-btn flex items-center gap-1.5 text-xs"
              title="Refresh"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => exportCSV(filtered, tab)}
              className="action-btn flex items-center gap-2 text-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {/* ── Summary KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, color: '#6366f1' },
          { label: 'SSL / TLS', value: sslAssets.length, color: '#06b6d4' },
          { label: 'Critical Risk', value: criticalCount, color: '#EF4444' },
          { label: 'Shadow Assets', value: shadowCount, color: '#F97316' },
        ].map(k => (
          <div key={k.label} className="card-sm text-center"
            style={{ borderColor: `${k.color}33`, background: `${k.color}0d` }}>
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>
              {isLoading ? '—' : k.value}
            </div>
            <div className="text-xs text-secondary font-semibold mt-1 uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Risk filter ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search URL, type, IP, issuer…"
            className="w-full bg-surface-card border border-glass-border rounded-lg pl-9 pr-4 py-2 text-sm text-primary placeholder-secondary focus:outline-none focus:border-primary-indigo"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as RiskFilter[]).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${riskFilter === r
                  ? 'text-white border-transparent'
                  : 'bg-surface-card text-secondary border-glass-border hover:text-primary'
                }`}
              style={riskFilter === r ? { background: RISK_COLORS[r] ?? '#6366f1', borderColor: RISK_COLORS[r] ?? '#6366f1' } : {}}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category Tabs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(tabCounts) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 border ${tab === t
                ? 'bg-primary-indigo text-white border-primary-indigo shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                : 'bg-surface-card text-secondary hover:text-primary border-glass-border'
              }`}>
            {tabIcons[t]} {t} ({tabCounts[t]})
          </button>
        ))}
      </div>

      {/* ── Data Table ────────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-secondary">
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : !activeScanId ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary">
            <Server size={32} className="opacity-30" />
            <p className="text-sm">No active scan. Run a scan from Asset Discovery.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary">
            <Filter size={28} className="opacity-30" />
            <p className="text-sm">No assets match the current filter.</p>
            <button onClick={() => { setRiskFilter('ALL'); setSearch(''); }}
              className="text-xs text-primary-indigo hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'Domains' && <DomainsTable assets={filtered} onRowClick={handleRowClick} />}
            {tab === 'SSL' && <SSLTable assets={filtered} onRowClick={handleRowClick} />}
            {tab === 'IP / Subnets' && <IPTable assets={filtered} onRowClick={handleRowClick} />}
            {tab === 'APIs' && <APIsTable assets={filtered} onRowClick={handleRowClick} />}
          </div>
        )}
        <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between text-xs text-secondary">
          <span>Showing {filtered.length} of {tabData[tab].length} assets</span>
          <span>TRINETRA — Quantum Exposure Intelligence Platform</span>
        </div>
      </div>
    </div>
  );
}
