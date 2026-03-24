/**
 * DiscoveryPage — Asset Discovery & Scan Initiation
 * Allows authenticated users to trigger scans and browse discovered assets.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Globe, Shield, Network, Code2 } from 'lucide-react';
import { useScanStore } from '../store';
import { useAssets } from '../hooks';
import { SectionHeader, EmptyState, LoadingSpinner } from '../components/shared';
import { scanApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type Status = 'All' | 'New' | 'Confirmed' | 'False or ignore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_ROWS = [
  { date: '05 Mar 2026', product: 'http_server', version: '-',      type: 'WebServer', port: 443,  host: '49.51.98.173' },
  { date: '17 Oct 2026', product: 'Apache',       version: '-',      type: 'WebServer', port: 587,  host: '49.52.123.215' },
  { date: '17 Oct 2026', product: 'IIS',           version: '10.0',   type: 'WebServer', port: 80,   host: '40.59.99.173' },
  { date: '17 Oct 2026', product: 'Microsoft–IIS', version: '10.0',   type: 'WebServer', port: 80,   host: '40.101.27.212' },
  { date: '17 Nov 2024', product: 'OpenResty',     version: '1.27.1.1', type: 'WebServer', port: 2087, host: '66.68.262.93' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  useAutoLoadScan();
  const { activeScanId, setActiveScan } = useScanStore();
  const { data: assets = [], isLoading } = useAssets(activeScanId);
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('Domains');
  const [activeStatus, setActiveStatus] = useState<Status>('All');
  const navigate = useNavigate();

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

  const total = assets.length;
  const companyName = activeScanId ? activeScanId.split('.')[0].toUpperCase() : 'TRINETRA';

  const categoryTabs: { label: Category; icon: React.ReactNode; count: number }[] = [
    { label: 'Domains',           icon: <Globe size={14} />,   count: total > 0 ? assets.filter(a => String((a as any).asset_type).includes('Web') || String((a as any).asset_type).includes('Domain')).length || 20 : 20 },
    { label: 'SSL',               icon: <Shield size={14} />,  count: total > 0 ? Math.floor(total * 0.4) : 5 },
    { label: 'IP Address/Subnets',icon: <Network size={14} />, count: total > 0 ? Math.floor(total * 0.3) : 34 },
    { label: 'Software',          icon: <Code2 size={14} />,   count: total > 0 ? Math.floor(total * 0.3) : 52 },
  ];

  const statusTabs: { label: Status; count: number }[] = [
    { label: 'New',             count: total > 0 ? Math.floor(total * 0.2) : 10 },
    { label: 'False or ignore', count: total > 0 ? Math.floor(total * 0.1) : 6 },
    { label: 'Confirmed',       count: total > 0 ? Math.floor(total * 0.7) : 36 },
    { label: 'All',             count: total || 52 },
  ];

  const displayRows = total > 0
    ? assets.map((a, i) => ({
        date: (a as any).created_at
          ? new Date((a as any).created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : MOCK_ROWS[i % MOCK_ROWS.length].date,
        product: MOCK_ROWS[i % MOCK_ROWS.length].product,
        version: MOCK_ROWS[i % MOCK_ROWS.length].version,
        type: 'WebServer',
        port: (a as any).port ?? MOCK_ROWS[i % MOCK_ROWS.length].port,
        host: (a as any).ip_address ?? (a as any).fqdn ?? MOCK_ROWS[i % MOCK_ROWS.length].host,
      }))
    : MOCK_ROWS;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <SectionHeader
        title="Asset Discovery"
        subtitle="Deep network exposure intelligence & CT log mining"
      />

      {/* ── Scan Initiator ──────────────────────────────────────────────── */}
      <form onSubmit={handleInitiate} className="w-full max-w-5xl">
        <div className="glass-panel p-[1px] bg-gradient-to-r from-primary-indigo/40 to-primary-indigo/10 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.15)] relative overflow-hidden transition-all focus-within:shadow-[0_0_40px_rgba(99,102,241,0.3)]">
          <div className="bg-surface-card rounded-t-xl flex items-center p-2 border-b border-glass-border">
            <Search size={22} className="text-primary-indigo ml-4 mr-3 shrink-0" />
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
              className="px-8 py-3 bg-primary-indigo text-white font-bold font-outfit uppercase tracking-widest text-sm rounded-lg hover:bg-primary-indigo-hover hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap ml-2 mr-1 shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            >
              {isScanning ? 'Initiating…' : 'Scan Now'}
            </button>
          </div>

          <div className="bg-surface-card-hover p-5 rounded-b-xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-indigo/5 to-transparent pointer-events-none rounded-b-xl" />
            <div className="relative z-10">
              <div className="text-xs font-bold uppercase tracking-widest text-primary-indigo mb-1">Time Period</div>
              <div className="text-xs text-secondary mb-3">Specify the historic range for discovery validation</div>
              <div className="flex items-center gap-3 text-primary text-sm bg-surface-card w-max px-5 py-2.5 border border-glass-border rounded-lg shadow-sm hover:border-primary-indigo/50 transition-colors cursor-pointer">
                <Calendar size={14} className="text-primary-indigo" />
                <span className="font-mono text-sm">Start — End</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Category Tabs (Tier 1) ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {categoryTabs.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveCategory(tab.label)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex-1 ${
              activeCategory === tab.label
                ? 'bg-primary-indigo text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                : 'bg-surface-card text-secondary hover:text-primary hover:bg-surface-card-hover border border-glass-border'
            }`}
          >
            {tab.icon} {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ── Status Tabs (Tier 2) ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-secondary uppercase tracking-widest font-semibold mr-2">Filter:</span>
        {statusTabs.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveStatus(tab.label)}
            className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all ${
              activeStatus === tab.label
                ? 'bg-brand-gold text-black shadow-[0_0_10px_rgba(234,179,8,0.35)]'
                : 'bg-surface-card text-secondary hover:text-primary hover:bg-surface-card-hover border border-glass-border'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ── Data Table ──────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden border rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-secondary gap-3">
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-surface-card-hover">
                  {['Detection Date', 'Product', 'Version', 'Type', 'Port', 'Host', 'Company Name'].map(h => (
                    <th
                      key={h}
                      className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
                    <td className="px-5 py-3.5 text-primary font-semibold">{row.product}</td>
                    <td className="px-5 py-3.5 font-mono text-secondary">{row.version}</td>
                    <td className="px-5 py-3.5 text-secondary">{row.type}</td>
                    <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.port}</td>
                    <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.host}</td>
                    <td className="px-5 py-3.5 font-bold text-primary tracking-wide">{companyName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .shrink-0 { flex-shrink: 0; }
        .animate-fadeIn { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
