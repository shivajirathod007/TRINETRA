/**
 * AssetInventoryPage — Detailed asset table with Domains / SSL / IP tabs
 * Matches the enterprise prototype: tab counts, detection dates, IP/port/ASN columns.
 */
import { useState } from 'react';
import { Globe, Shield, Network, Code2, Download, Filter } from 'lucide-react';
import { SectionHeader } from '../components/shared';

import { useAssets, useDashboard } from '../hooks';
import { useScanStore } from '../store';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type StatusFilter = 'New' | 'False or ignore' | 'Confirmed' | 'All';

// Dynamic counts calculated in render
// const TAB_COUNTS: Record<Tab, number> = { 'Domains': 20, 'SSL': 5, 'IP Address/Subnets': 34, 'Software': 52 };
const STATUS_COUNTS: Record<StatusFilter, number> = { 'New': 0, 'False or ignore': 0, 'Confirmed': 0, 'All': 0 };

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

function DomainsTable({ assets }: { assets: any[] }) {
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>FQDN</TH><TH>Asset Type</TH><TH>Risk Level</TH><TH>PQC Status</TH>
      </tr></thead>
      <tbody>
        {assets.map((r, i) => (
          <tr key={r.id || i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.fqdn}</TD>
            <TD mono>{r.asset_type}</TD>
            <TD mono>{r.risk_level}</TD>
            <TD>{r.quantum_safe_status}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable({ assets }: { assets: any[] }) {
  const sslAssets = assets.filter(a => a.cert_algorithm || a.key_exchange);
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Domain</TH><TH>Algorithm</TH><TH>Key Exchange</TH><TH>PQC Status</TH>
      </tr></thead>
      <tbody>
        {sslAssets.map((r, i) => (
          <tr key={r.id || i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.fqdn}</TD>
            <TD mono>{r.cert_algorithm || '—'}</TD>
            <TD mono>{r.key_exchange || '—'}</TD>
            <TD>{r.quantum_safe_status}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ assets }: { assets: any[] }) {
  // Mock subset as IP details aren't fully exposed in AssetSummary yet
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Domain</TH><TH>Target URL</TH><TH>Risk Level</TH>
      </tr></thead>
      <tbody>
        {assets.map((r, i) => (
          <tr key={r.id || i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.fqdn}</TD>
            <TD mono>{r.asset_url}</TD>
            <TD>{r.risk_level}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable({ assets }: { assets: any[] }) {
  const softwareAssets = assets.filter(a => a.asset_type !== 'shadow_asset');
  return (
    <table className="w-full">
      <thead><tr className="bg-surface-card-hover">
        <TH>Domain</TH><TH>Type</TH><TH>Shadow Asset</TH>
      </tr></thead>
      <tbody>
        {softwareAssets.map((r, i) => (
          <tr key={r.id || i} className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors">
            <TD mono>{r.fqdn}</TD>
            <TD>{r.asset_type}</TD>
            <TD mono>{r.is_shadow_asset ? 'Yes' : 'No'}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetInventoryPage() {
  const [tab, setTab] = useState<Tab>('Domains');
  const [status, setStatus] = useState<StatusFilter>('All');

  const { activeScanId } = useScanStore();
  const { data: assets = [] } = useAssets(activeScanId);
  const sslAssetsCount = assets.filter((a: any) => a.cert_algorithm || a.key_exchange).length;
  
  const TAB_COUNTS: Record<Tab, number> = { 
    'Domains': assets.length, 
    'SSL': sslAssetsCount, 
    'IP Address/Subnets': assets.length, 
    'Software': assets.filter((a: any) => a.asset_type !== 'shadow_asset').length 
  };

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
          { label: 'Total Domains',   value: TAB_COUNTS['Domains'],  color: '#6366f1' },
          { label: 'SSL Certs',       value: TAB_COUNTS['SSL'],      color: '#06b6d4' },
          { label: 'IP / Subnets',    value: TAB_COUNTS['IP Address/Subnets'], color: '#8b5cf6' },
          { label: 'Software Found',  value: TAB_COUNTS['Software'], color: '#22c55e' },
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
          {tab === 'Domains'            && <DomainsTable assets={assets} />}
          {tab === 'SSL'                && <SSLTable assets={assets} />}
          {tab === 'IP Address/Subnets' && <IPTable assets={assets} />}
          {tab === 'Software'           && <SoftwareTable assets={assets} />}
        </div>
        <div className="px-5 py-3 border-t border-glass-border text-xs text-secondary text-center">
          TRINETRA — Quantum Exposure Intelligence Platform
        </div>
      </div>
    </div>
  );
}
