/**
 * DiscoveryPage — Asset Discovery & Scan Initiation
 * Per-tab column schemas matching the prototype screenshots:
 *   Domains  → Detection Date, Domain Name, Registration Date, Registrar, Company Name
 *   SSL      → Detection Date, SSL SHA Fingerprint, Valid From, Common Name, Company Name, CA
 *   IP       → Detection Date, IP Address, Ports, Subnet, ASN, ISP, Location, Company
 *   Software → Detection Date, Product, Version, Type, Port, Host, Company Name
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Globe, Shield, Network, Code2, ChevronRight, RefreshCw } from 'lucide-react';
import { useScanStore } from '../store';
import { useAssets } from '../hooks';
import { SectionHeader, LoadingSpinner } from '../components/shared';
import { scanApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

// ─── Mock data matching screenshots ───────────────────────────────────────────

const MOCK_DOMAINS = [
  { date: '03 Mar 2026', domain: 'www.cos.pnb.bank.in',   regDate: '17 Feb 2005', registrar: 'National Internet Exchange of India', company: 'PNB' },
  { date: '17 Oct 2024', domain: 'www2.pnbrbkiosk.in',    regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB' },
  { date: '17 Oct 2024', domain: 'upload.pnbunion.et.in', regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB' },
  { date: '17 Oct 2024', domain: 'postman.pnb.bank.in',   regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB' },
  { date: '17 Nov 2024', domain: 'proxy.pnb.bank.in',     regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB' },
];

const MOCK_SSL = [
  { date: '10 Mar 2026', fingerprint: 'b7563b683f d2170471fb0 7c9bcSOd03 4a6',    validFrom: '08 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Symantec' },
  { date: '10 Mar 2026', fingerprint: 'd85277fc3a99 b37164a8f327 4a914506c94',   validFrom: '07 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Digi-Cert' },
  { date: '10 Mar 2026', fingerprint: 'Abe31953b86 7d4f886b75c7b cd11c69b9e4 93', validFrom: '06 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Entrust' },
];

const MOCK_IP = [
  { date: '03 Mar 2026', ip: '80.50.10.214',   ports: 80,   subnet: '103.187.210.0/31', asn: 'AS9583', isp: '—',                          location: '—',             company: 'MSMT' },
  { date: '17 Oct 2024', ip: '20.40.72.112',   ports: '—',  subnet: '103.187.210.0/31', asn: 'AS9583', isp: '—',                          location: '—',             company: 'PNB' },
  { date: '17 Oct 2024', ip: '125.23.131.22',  ports: '—',  subnet: '103.187.210.0/31', asn: 'AS9583', isp: 'E26 Networks',                location: 'Chennai, India', company: 'PNB' },
  { date: '17 Oct 2024', ip: '103.40.122.92',  ports: '—',  subnet: '103.187.210.0/31', asn: 'AS9583', isp: 'E26 Networks PS',             location: '—',             company: 'PNB' },
  { date: '17 Nov 2024', ip: '20.20.69.73',    ports: 443,  subnet: '103.187.210.0/31', asn: 'AS9583', isp: '—',                          location: 'Leh, India',    company: 'PNB' },
  { date: '17 Nov 2024', ip: '21.50.42.188',   ports: '—',  subnet: '103.187.210.0/31', asn: 'AS9583', isp: '—',                          location: '—',             company: 'PNB' },
  { date: '17 Nov 2024', ip: '801.11.22.153',  ports: 1997, subnet: '103.187.210.0/31', asn: 'AS9583', isp: 'E26 Networks',                location: '—',             company: 'PNB' },
  { date: '17 Nov 2024', ip: '103.40.122.92',  ports: '—',  subnet: '103.187.210.0/31', asn: 'AS9583', isp: 'E26 Networks',                location: 'India',         company: 'PNB' },
];

const MOCK_SOFTWARE = [
  { date: '05 Mar 2026', product: 'http_server',   version: '-',       type: 'WebServer', port: 443,  host: '49.51.98.173' },
  { date: '17 Oct 2024', product: 'Apache',         version: '-',       type: 'WebServer', port: 587,  host: '49.52.123.215' },
  { date: '17 Oct 2024', product: 'IIS',             version: '10.0',   type: 'WebServer', port: 443,  host: '40.59.99.173' },
  { date: '17 Oct 2024', product: 'IIS',             version: '10.0',   type: 'WebServer', port: 80,   host: '40.101.27.212' },
  { date: '17 Nov 2024', product: 'Microsoft–IIS',  version: '10.0',   type: 'WebServer', port: 80,   host: '401.10.274.14' },
  { date: '06 Mar 2006', product: 'OpenResty',       version: '1.27.1.1', type: 'Web Server', port: 2087, host: '66.68.262.93' },
];

// ─── Tab configuration ─────────────────────────────────────────────────────────

type Category = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type StatusFilter = 'All' | 'New' | 'Confirmed' | 'False or ignore';

const CATEGORY_COUNTS: Record<Category, number> = { 'Domains': 20, 'SSL': 5, 'IP Address/Subnets': 34, 'Software': 52 };
const STATUS_COUNTS: Record<StatusFilter, number> = { 'New': 5, 'False or ignore': 10, 'Confirmed': 2, 'All': 3 };

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  'Domains':           <Globe size={14} />,
  'SSL':               <Shield size={14} />,
  'IP Address/Subnets':<Network size={14} />,
  'Software':          <Code2 size={14} />,
};

// ─── Table renderers ───────────────────────────────────────────────────────────

function DomainsTable({ company }: { company: string }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'Domain Name', 'Registration Date', 'Registrar', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCK_DOMAINS.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.domain}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.regDate}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.registrar}</td>
            <td className="px-5 py-3.5 font-bold text-primary tracking-wide flex items-center justify-between">
              {company} <ChevronRight size={14} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable({ company }: { company: string }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'SSL SHA Fingerprint', 'Valid From', 'Common Name', 'Company Name', 'Certificate Authority'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCK_SSL.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary text-xs">{row.fingerprint}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.validFrom}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.commonName}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.ca}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ company }: { company: string }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'IP Address', 'Ports', 'Subnet', 'ASN', 'ISP', 'Location', 'Company'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCK_IP.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.ip}</td>
            <td className="px-5 py-3.5 font-mono text-primary">{row.ports}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.subnet}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.asn}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.isp}</td>
            <td className="px-5 py-3.5 text-secondary text-xs">{row.location}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable({ company }: { company: string }) {
  return (
    <table className="data-table w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'Product', 'Version', 'Type', 'Port', 'Host', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MOCK_SOFTWARE.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-5 py-3.5 text-primary font-semibold">{row.product}</td>
            <td className="px-5 py-3.5 font-mono text-secondary">{row.version}</td>
            <td className="px-5 py-3.5 text-secondary">{row.type}</td>
            <td className="px-5 py-3.5 font-mono text-primary font-medium">{row.port}</td>
            <td className="px-5 py-3.5 font-mono text-secondary text-xs">{row.host}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  useAutoLoadScan();
  const { activeScanId, setActiveScan } = useScanStore();
  const { isLoading } = useAssets(activeScanId);
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [category, setCategory] = useState<Category>('Domains');
  const [status, setStatus] = useState<StatusFilter>('All');
  const navigate = useNavigate();

  const company = activeScanId
    ? activeScanId.split('.')[0].toUpperCase().replace(/-/g, '')
    : 'PNB';

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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Asset Discovery"
        subtitle="Deep network exposure intelligence & CT log mining"
      />

      {/* ── Network Topology Graph ───────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden"
        style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(10,16,36,0.6)' }}>
        <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-secondary">Domain Relationship Map</span>
          <span className="text-xs font-mono text-primary-indigo">Live Topology</span>
        </div>
        <div style={{ height: 240, position: 'relative', overflow: 'hidden' }}>
          <svg width="100%" height="240" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0.6"/>
              </radialGradient>
              <radialGradient id="rootGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1"/>
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.8"/>
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Edge lines */}
            {[
              [450,120, 200,60], [450,120, 150,140], [450,120, 250,190],
              [450,120, 380,50], [450,120, 520,45],  [450,120, 600,80],
              [450,120, 680,130],[450,120, 620,190], [450,120, 340,185],
              [200,60,  120,30], [200,60,  90,90],
              [600,80,  700,40], [600,80,  750,110],
              [680,130, 780,160],[680,130, 820,90],
            ].map(([x1,y1,x2,y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(99,102,241,0.35)" strokeWidth="1.2" strokeDasharray="4 3">
                <animate attributeName="stroke-opacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
              </line>
            ))}

            {/* Satellite nodes */}
            {[
              [200,60,'www.cos'], [150,140,'pnb.bank'], [250,190,'postman'], [380,50,'m.pnb'],
              [520,45,'api.pnb'], [600,80,'hcm.pnb'], [680,130,'proxy'], [620,190,'netsafety'],
              [340,185,'cbom.io'],[120,30,'cert1'], [90,90,'cert2'], [700,40,'ip1'],
              [750,110,'subnet'],[780,160,'ip2'],[820,90,'scan4'],
            ].map(([cx,cy,label], i) => (
              <g key={i}>
                <circle cx={cx as number} cy={cy as number} r="12" fill="url(#nodeGrad)" filter="url(#glow)" opacity="0.85">
                  <animate attributeName="r" values="10;13;10" dur={`${3 + i * 0.4}s`} repeatCount="indefinite"/>
                </circle>
                <text x={cx as number} y={(cy as number) + 22} textAnchor="middle" fontSize="8"
                  fill="rgba(148,163,184,0.8)" fontFamily="monospace">{label as string}</text>
              </g>
            ))}

            {/* Root node */}
            <circle cx="450" cy="120" r="22" fill="url(#rootGrad)" filter="url(#glow)">
              <animate attributeName="r" values="20;25;20" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <text x="450" y="115" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="monospace">PNB</text>
            <text x="450" y="126" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.7)" fontFamily="monospace">ROOT</text>
          </svg>
          <div style={{
            position: 'absolute', bottom: 8, right: 12,
            fontSize: 10, fontFamily: 'monospace', color: 'rgba(148,163,184,0.5)',
          }}>
            {MOCK_DOMAINS.length + MOCK_IP.length} nodes discovered
          </div>
        </div>
      </div>


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
          <div className="bg-surface-card-hover px-6 py-4 flex items-center gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary-indigo mb-1">Time Period</div>
              <div className="flex items-center gap-2 text-sm bg-surface-card px-4 py-2 border border-glass-border rounded-lg cursor-pointer hover:border-primary-indigo/50 transition-colors w-fit">
                <Calendar size={13} className="text-primary-indigo" />
                <span className="font-mono text-secondary text-xs">Start — End</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Category Tabs (Tier 1) ───────────────────────────────────── */}
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

      {/* ── Status Tabs (Tier 2) ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-secondary uppercase tracking-widest">Status:</span>
        {(Object.keys(STATUS_COUNTS) as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all border ${
              status === s
                ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_10px_rgba(234,179,8,0.35)]'
                : 'bg-surface-card text-secondary hover:text-primary border-glass-border'
            }`}
          >
            {s} ({STATUS_COUNTS[s]})
          </button>
        ))}
      </div>

      {/* ── Data Table ──────────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-secondary gap-3">
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : (
          <div className="overflow-x-auto">
            {category === 'Domains'            && <DomainsTable  company={company} />}
            {category === 'SSL'                && <SSLTable      company={company} />}
            {category === 'IP Address/Subnets' && <IPTable       company={company} />}
            {category === 'Software'           && <SoftwareTable company={company} />}
          </div>
        )}
      </div>

      <style>{`.shrink-0{flex-shrink:0}`}</style>
    </div>
  );
}
