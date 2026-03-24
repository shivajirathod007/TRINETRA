/**
 * AssetInventoryPage — Detailed asset table with Domains / SSL / IP tabs
 * Matches the enterprise prototype: tab counts, detection dates, IP/port/ASN columns.
 */
import { useState } from 'react';
import { Globe, Shield, Network, Code2, Download, Filter } from 'lucide-react';
import { SectionHeader } from '../components/shared';

// ─── Mock Data (structured exactly like the uploaded screenshot) ───────────────

const DOMAIN_ROWS = [
  { date: '03 Mar 2026', domain: 'www.cos.pnb.bank.in',      regDate: '17 Feb 2005', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Oct 2024', domain: 'www2.pnbrbkiosk.in',       regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Oct 2024', domain: 'upload.pnbunion.et.in',    regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Oct 2024', domain: 'postman.pnb.bank.in',      regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Nov 2024', domain: 'proxy.pnb.bank.in',        regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Nov 2024', domain: 'netsafety.pnb.bank.in',    regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
  { date: '17 Nov 2024', domain: 'hcm.pnb.bank.in',          regDate: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'Punjab National Bank' },
];

const SSL_ROWS = [
  { date: '10 Mar 2026', fingerprint: 'b7563b683f...4a6',    validFrom: '08 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'Punjab National Bank', ca: 'Symantec' },
  { date: '10 Mar 2026', fingerprint: 'd85277fc3a99...c94',  validFrom: '07 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'Punjab National Bank', ca: 'Digi-Cert' },
  { date: '10 Mar 2026', fingerprint: 'Abe31953b867...493',  validFrom: '06 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'Punjab National Bank', ca: 'Entrust' },
  { date: '17 Oct 2024', fingerprint: 'c9d4e1f23a...881',    validFrom: '01 Jan 2024', commonName: 'pnb.bank.in',               company: 'Punjab National Bank', ca: 'DigiCert' },
  { date: '17 Nov 2024', fingerprint: '4a9c8bde...f72',      validFrom: '15 Nov 2024', commonName: '*.pnb.bank.in',             company: 'Punjab National Bank', ca: 'Sectigo' },
];

const IP_ROWS = [
  { date: '05 Mar 2026', ip: '40.104.62.216',  ports: '80',    subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'MSFT',              location: '-',             company: 'Punjab National Bank' },
  { date: '17 Oct 2024', ip: '40.101.72.212',  ports: '80',    subnet: '103.107.224.0/22', asn: 'AS9583', netname: '-',                 location: 'India',         company: 'Punjab National Bank' },
  { date: '17 Oct 2024', ip: '402.10.1.1',     ports: '80',    subnet: '103.107.224.0/22', asn: 'AS9583', netname: '-',                 location: '-',             company: 'Punjab National Bank' },
  { date: '17 Oct 2024', ip: '103.25.151.22',  ports: '53,80', subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'Quantum-Link-Co',   location: 'Nashik, India', company: 'Punjab National Bank' },
  { date: '17 Nov 2024', ip: '181.65.122.92',  ports: '80,44', subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'E2E-Networks-IN',   location: 'Chennai, India',company: 'Punjab National Bank' },
  { date: '17 Nov 2024', ip: '20.153.63.72',   ports: '443',   subnet: '103.107.224.0/22', asn: 'AS9583', netname: '-',                 location: 'Leh, India',    company: 'Punjab National Bank' },
  { date: '17 Nov 2024', ip: '21.151.42.188',  ports: '22',    subnet: '103.107.224.0/22', asn: 'AS9583', netname: '-',                 location: 'India',         company: 'Punjab National Bank' },
  { date: '17 Nov 2024', ip: '402.11.22.153',  ports: '3997',  subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'E2E-Networks-IN',   location: 'India',         company: 'Punjab National Bank' },
  { date: '17 Nov 2024', ip: '181.65.122.92',  ports: '80,44', subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'E2E-Networks-IN',   location: 'India',         company: 'Punjab National Bank' },
];

const SOFTWARE_ROWS = [
  { date: '05 Mar 2026', product: 'http_server',   version: '-',       type: 'WebServer', port: 443,  host: '49.51.98.173',  company: 'Punjab National Bank' },
  { date: '17 Oct 2024', product: 'Apache',         version: '-',       type: 'WebServer', port: 587,  host: '49.52.123.215', company: 'Punjab National Bank' },
  { date: '17 Oct 2024', product: 'IIS',             version: '10.0',   type: 'WebServer', port: 80,   host: '40.59.99.173',  company: 'Punjab National Bank' },
  { date: '17 Oct 2024', product: 'Microsoft–IIS',  version: '10.0',   type: 'WebServer', port: 80,   host: '40.101.27.212', company: 'Punjab National Bank' },
  { date: '17 Nov 2024', product: 'OpenResty',       version: '1.27.1.1', type: 'WebServer', port: 2087, host: '66.68.262.93', company: 'Punjab National Bank' },
];

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type StatusFilter = 'New' | 'False or ignore' | 'Confirmed' | 'All';

const TAB_COUNTS: Record<Tab, number> = { 'Domains': 20, 'SSL': 5, 'IP Address/Subnets': 34, 'Software': 52 };
const STATUS_COUNTS: Record<StatusFilter, number> = { 'New': 15, 'False or ignore': 10, 'Confirmed': 9, 'All': 34 };

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  'Domains':            <Globe size={14} />,
  'SSL':                <Shield size={14} />,
  'IP Address/Subnets': <Network size={14} />,
  'Software':           <Code2 size={14} />,
};

// ─── Table components ─────────────────────────────────────────────────────────

const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-xs uppercase tracking-wider px-4 py-3 font-bold border-b border-glass-border whitespace-nowrap"
    style={{ color: 'var(--text-secondary)' }}>
    {children}
  </th>
);

const TD = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) => (
  <td className={`px-4 py-3 text-sm ${mono ? 'font-mono' : ''}`} style={{ color: mono ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
    {children}
  </td>
);

function DomainsTable() {
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Detection Date</TH><TH>Domain Name</TH><TH>Registration Date</TH><TH>Registrar</TH><TH>Company</TH>
      </tr></thead>
      <tbody>
        {DOMAIN_ROWS.map((r, i) => (
          <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.date}</TD>
            <TD mono>{r.domain}</TD>
            <TD mono>{r.regDate}</TD>
            <TD>{r.registrar}</TD>
            <TD>{r.company}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable() {
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Detection Date</TH><TH>SSL SHA Fingerprint</TH><TH>Valid From</TH><TH>Common Name</TH><TH>Company</TH><TH>Certificate Authority</TH>
      </tr></thead>
      <tbody>
        {SSL_ROWS.map((r, i) => (
          <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.date}</TD>
            <TD mono>{r.fingerprint}</TD>
            <TD mono>{r.validFrom}</TD>
            <TD>{r.commonName}</TD>
            <TD>{r.company}</TD>
            <TD>{r.ca}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable() {
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Detection Date</TH><TH>IP Address</TH><TH>Ports</TH><TH>Subnet</TH><TH>ASN</TH><TH>Netname</TH><TH>Location</TH><TH>Company</TH>
      </tr></thead>
      <tbody>
        {IP_ROWS.map((r, i) => (
          <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.date}</TD>
            <TD mono>{r.ip}</TD>
            <TD mono>{r.ports}</TD>
            <TD mono>{r.subnet}</TD>
            <TD mono>{r.asn}</TD>
            <TD>{r.netname}</TD>
            <TD>{r.location}</TD>
            <TD>{r.company}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable() {
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Detection Date</TH><TH>Product</TH><TH>Version</TH><TH>Type</TH><TH>Port</TH><TH>Host</TH><TH>Company</TH>
      </tr></thead>
      <tbody>
        {SOFTWARE_ROWS.map((r, i) => (
          <tr key={i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.date}</TD>
            <TD>{r.product}</TD>
            <TD mono>{r.version}</TD>
            <TD>{r.type}</TD>
            <TD mono>{r.port}</TD>
            <TD mono>{r.host}</TD>
            <TD>{r.company}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetInventoryPage() {
  const [tab, setTab] = useState<Tab>('IP Address/Subnets');
  const [status, setStatus] = useState<StatusFilter>('All');

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Asset Inventory"
        subtitle="Discovered assets across domains, SSL, IPs and software"
        action={
          <button className="action-btn flex items-center gap-2 text-sm">
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {/* ── Summary KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Domains',   value: 20,  color: '#6366f1' },
          { label: 'SSL Certs',       value: 5,   color: '#06b6d4' },
          { label: 'IP / Subnets',    value: 34,  color: '#8b5cf6' },
          { label: 'Software Found',  value: 52,  color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className="glass-card border rounded-xl p-4 text-center"
            style={{ borderColor: `${k.color}33`, background: `${k.color}0d` }}>
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-secondary font-semibold mt-1 uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Category Tabs (Tier 1) ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_COUNTS) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 border ${
              tab === t
                ? 'bg-primary-indigo text-white border-primary-indigo shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                : 'bg-surface-card text-secondary hover:text-primary border-glass-border'
            }`}>
            {TAB_ICONS[t]} {t} ({TAB_COUNTS[t]})
          </button>
        ))}
      </div>

      {/* ── Status Tabs (Tier 2) ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-secondary mr-1">Status:</span>
        {(Object.keys(STATUS_COUNTS) as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all border ${
              status === s
                ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                : 'bg-surface-card text-secondary border-glass-border hover:text-primary'
            }`}>
            {s} ({STATUS_COUNTS[s]})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="action-btn flex items-center gap-1.5 text-xs">
            <Filter size={12} /> Filter
          </button>
        </div>
      </div>

      {/* ── Data Table ────────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'Domains'            && <DomainsTable />}
          {tab === 'SSL'                && <SSLTable />}
          {tab === 'IP Address/Subnets' && <IPTable />}
          {tab === 'Software'           && <SoftwareTable />}
        </div>
        <div className="px-5 py-3 border-t border-glass-border text-xs text-secondary text-center">
          TRINETRA — Quantum Exposure Intelligence Platform
        </div>
      </div>
    </div>
  );
}
