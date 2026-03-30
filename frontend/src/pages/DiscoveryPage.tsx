/**
 * DiscoveryPage — Asset Discovery & Scan Initiation
 * All data is sourced from the backend — no hardcoded values.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Shield, Network, Code2, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { useScanStore } from '../store';
import { useAssets, useScanStatus } from '../hooks';
import { SectionHeader, LoadingSpinner } from '../components/shared';
import { scanApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

type Category = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type StatusFilter = 'All' | 'Shadow' | 'Known';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  'Domains':            <Globe size={14} />,
  'SSL':                <Shield size={14} />,
  'IP Address/Subnets': <Network size={14} />,
  'Software':           <Code2 size={14} />,
};

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-blue-400',
  SAFE:     'text-green-400',
  UNKNOWN:  'text-secondary',
};

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-10 text-center text-secondary text-sm">
        No data available for this scan yet.
      </td>
    </tr>
  );
}

function DomainsTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'Domain Name', 'Asset Type', 'Risk Level', 'Discovery', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.domain}</td>
            <td className="px-5 py-3.5 text-secondary text-xs capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className={`px-5 py-3.5 text-xs font-bold ${RISK_COLORS[row.risk] ?? 'text-secondary'}`}>{row.risk}</td>
            <td className="px-5 py-3.5 text-xs">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.discovery === 'Shadow' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                {row.discovery}
              </span>
            </td>
            <td className="px-5 py-3.5 font-bold text-primary tracking-wide flex items-center justify-between">
              {company} <ChevronRight size={14} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'SSL SHA256 Fingerprint', 'Expires', 'Common Name', 'Certificate Authority', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary text-xs truncate max-w-xs" title={row.fingerprint}>{row.fingerprint}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.expiry}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.commonName}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.ca}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'IP Address', 'Port', 'TLS Version', 'Asset Type', 'Company'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.ip}</td>
            <td className="px-5 py-3.5 font-mono text-primary">{row.port ?? '—'}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.tlsVersion ?? '—'}</td>
            <td className="px-5 py-3.5 text-secondary text-xs capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'Asset Type', 'TLS Version', 'Cipher Suite', 'Port', 'Host', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={7} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 text-primary font-semibold capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.tlsVersion ?? '—'}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs truncate max-w-xs" title={row.cipherSuite}>{row.cipherSuite ?? '—'}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.port ?? '—'}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.host ?? '—'}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopologyGraph({ assets, domain }: { assets: any[]; domain: string }) {
  const satellites = useMemo(() => {
    const seen = new Set<string>();
    return assets
      .filter(a => a.url)
      .slice(0, 15)
      .map(a => {
        const label = (a.url as string)
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .split('/')[0]
          .slice(0, 12);
        if (seen.has(label)) return null;
        seen.add(label);
        return { label, risk: a.risk_level as string };
      })
      .filter(Boolean) as { label: string; risk: string }[];
  }, [assets]);

  const cx = 450, cy = 120, radius = 130;
  const positions = satellites.map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(satellites.length, 1) - Math.PI / 2;
    return {
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
    };
  });

  const rootLabel = domain ? domain.split('.')[0].toUpperCase().slice(0, 6) : 'ROOT';

  const nodeColor = (risk: string) => {
    if (risk === 'CRITICAL') return '#EF4444';
    if (risk === 'HIGH')     return '#F97316';
    if (risk === 'MEDIUM')   return '#EAB308';
    if (risk === 'LOW')      return '#3B82F6';
    if (risk === 'SAFE')     return '#22C55E';
    return '#6366f1';
  };

  return (
    <div className="glass-card border rounded-xl overflow-hidden"
      style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(10,16,36,0.6)' }}>
      <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-secondary">Domain Relationship Map</span>
        <span className="text-xs font-mono text-primary-indigo">Live Topology</span>
      </div>
      <div style={{ height: 240, position: 'relative', overflow: 'hidden' }}>
        {assets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary text-sm gap-2">
            <AlertTriangle size={16} /> No scan data — run a scan to populate the topology
          </div>
        ) : (
          <svg width="100%" height="240" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="rootGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1"/>
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.8"/>
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {positions.map((pos, i) => (
              <line key={i} x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke="rgba(99,102,241,0.35)" strokeWidth="1.2" strokeDasharray="4 3">
                <animate attributeName="stroke-opacity" values="0.2;0.6;0.2"
                  dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
              </line>
            ))}
            {satellites.map((node, i) => (
              <g key={i}>
                <circle cx={positions[i].x} cy={positions[i].y} r="11"
                  fill={nodeColor(node.risk)} filter="url(#glow)" opacity="0.85">
                  <animate attributeName="r" values="9;12;9"
                    dur={`${3 + i * 0.4}s`} repeatCount="indefinite"/>
                </circle>
                <text x={positions[i].x} y={positions[i].y + 22}
                  textAnchor="middle" fontSize="8"
                  fill="rgba(148,163,184,0.8)" fontFamily="monospace">
                  {node.label}
                </text>
              </g>
            ))}
            <circle cx={cx} cy={cy} r="22" fill="url(#rootGrad)" filter="url(#glow)">
              <animate attributeName="r" values="20;25;20" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9"
              fill="white" fontWeight="bold" fontFamily="monospace">{rootLabel}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7"
              fill="rgba(255,255,255,0.7)" fontFamily="monospace">ROOT</text>
          </svg>
        )}
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          fontSize: 10, fontFamily: 'monospace', color: 'rgba(148,163,184,0.5)',
        }}>
          {assets.length} nodes discovered
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain, setActiveScan } = useScanStore();
  const { data: assets = [], isLoading } = useAssets(activeScanId);
  const { data: scanStatus } = useScanStatus(activeScanId);

  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [category, setCategory] = useState<Category>('Domains');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const navigate = useNavigate();

  // Company label derived from the active domain, not the UUID scan ID
  const company = activeDomain ? activeDomain.split('.')[0].toUpperCase() : '—';

  const filteredAssets = useMemo(() => {
    if (statusFilter === 'All') return assets;
    return assets.filter((a: any) =>
      statusFilter === 'Shadow' ? a.discovery === 'Shadow' : a.discovery === 'Known'
    );
  }, [assets, statusFilter]);

  const domainsData = useMemo(() =>
    filteredAssets.map((a: any) => ({
      date: a.scan_timestamp ?? '—',
      domain: a.url ?? '—',
      type: a.type ?? '—',
      risk: a.risk_level ?? 'UNKNOWN',
      discovery: a.discovery ?? 'Known',
    })), [filteredAssets]);

  const sslData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.cert_issuer || a.cert_sha256 || a.cert_subject)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        fingerprint: a.cert_sha256 ?? '—',
        expiry: a.cert_expiry ?? '—',
        commonName: a.cert_subject ?? '—',
        ca: a.cert_issuer ?? '—',
      })), [filteredAssets]);

  const ipData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.ip_address)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        ip: a.ip_address,
        port: a.port ?? '—',
        tlsVersion: a.tls_version ?? '—',
        type: a.type ?? '—',
      })), [filteredAssets]);

  const softwareData = useMemo(() =>
    filteredAssets.map((a: any) => ({
      date: a.scan_timestamp ?? '—',
      type: a.type ?? '—',
      tlsVersion: a.tls_version ?? '—',
      cipherSuite: a.cipher_suite ?? '—',
      port: a.port ?? '—',
      host: a.ip_address ?? '—',
    })), [filteredAssets]);

  const CATEGORY_COUNTS: Record<Category, number> = {
    'Domains':            domainsData.length,
    'SSL':                sslData.length,
    'IP Address/Subnets': ipData.length,
    'Software':           softwareData.length,
  };

  const STATUS_COUNTS: Record<StatusFilter, number> = {
    'All':    assets.length,
    'Shadow': assets.filter((a: any) => a.discovery === 'Shadow').length,
    'Known':  assets.filter((a: any) => a.discovery === 'Known').length,
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim() || isScanning) return;
    setIsScanning(true);
    try {
      const result = await scanApi.initiate(search.trim().toLowerCase());
      setActiveScan(result.scan_id, search.trim().toLowerCase());
      navigate(`/scan/${encodeURIComponent(search.trim().toLowerCase())}`, { state: { scanId: result.scan_id } });
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  const isRunning = scanStatus?.status?.toLowerCase() === 'running' || scanStatus?.status?.toLowerCase() === 'pending';

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Asset Discovery"
        subtitle="Deep network exposure intelligence & CT log mining"
      />

      <TopologyGraph assets={assets} domain={activeDomain ?? ''} />

      <form onSubmit={handleInitiate} className="w-full">
        <div className="glass-card border rounded-xl overflow-hidden"
          style={{ boxShadow: '0 0 25px rgba(99,102,241,0.1)' }}>
          <div className="flex items-center p-2 border-b border-glass-border">
            <Search size={20} className="text-primary-indigo ml-4 mr-3 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-primary placeholder-secondary focus:outline-none py-3 text-lg font-mono font-medium"
              placeholder="Search domain, URL, contact, IoC or other..."
            />
            <button
              type="submit"
              disabled={isScanning || !search.trim()}
              className="px-7 py-3 bg-primary-indigo text-white font-bold font-outfit uppercase tracking-widest text-sm rounded-lg hover:bg-primary-indigo-hover transition-all whitespace-nowrap ml-2 mr-1 disabled:opacity-50"
            >
              {isScanning ? <RefreshCw size={14} className="animate-spin" /> : 'Scan Now'}
            </button>
          </div>
          {activeDomain && (
            <div className="bg-surface-card-hover px-6 py-3 flex items-center gap-4 text-xs">
              <span className="text-secondary font-mono">Active domain:</span>
              <span className="text-primary font-bold font-mono">{activeDomain}</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <RefreshCw size={11} className="animate-spin" />
                  Scanning… {(scanStatus as any)?.progress ?? 0}%
                </span>
              )}
              {scanStatus?.status?.toLowerCase() === 'completed' && (
                <span className="text-green-400 font-semibold">
                  ✓ Scan complete — {(scanStatus as any)?.assets_found ?? assets.length} assets found
                </span>
              )}
            </div>
          )}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_COUNTS) as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 border ${
              category === cat
                ? 'bg-primary-indigo text-white border-primary-indigo shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                : 'bg-surface-card text-secondary hover:text-primary hover:bg-surface-card-hover border-glass-border'
            }`}
          >
            {CATEGORY_ICONS[cat]} {cat} ({CATEGORY_COUNTS[cat]})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-secondary uppercase tracking-widest">Status:</span>
        {(Object.keys(STATUS_COUNTS) as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all border ${
              statusFilter === s
                ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_10px_rgba(234,179,8,0.35)]'
                : 'bg-surface-card text-secondary hover:text-primary border-glass-border'
            }`}
          >
            {s} ({STATUS_COUNTS[s]})
          </button>
        ))}
      </div>

      <div className="glass-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-secondary gap-3">
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : (
          <div className="overflow-x-auto">
            {category === 'Domains'            && <DomainsTable  company={company} data={domainsData} />}
            {category === 'SSL'                && <SSLTable      company={company} data={sslData} />}
            {category === 'IP Address/Subnets' && <IPTable       company={company} data={ipData} />}
            {category === 'Software'           && <SoftwareTable company={company} data={softwareData} />}
          </div>
        )}
      </div>

      <style>{`.shrink-0{flex-shrink:0}`}</style>
    </div>
  );
}
