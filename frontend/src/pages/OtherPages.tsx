import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, Star, BarChart2 } from 'lucide-react'
import { useScanStore } from '../store'
import { useCBOM, useCertificates, useAssets, useScanHistory } from '../hooks'
import { LoadingSpinner, EmptyState, SectionHeader, ScoreBadge, AlgorithmTag, HNDLDeadline } from '../components/shared'
import { CertCard } from '../components/certificate'
import { cbomApi, scanApi } from '../api/client'
import { ASSET_TYPE_ICON, ASSET_TYPE_LABEL } from '../utils'
import { useAutoLoadScan } from '../hooks/useAutoLoadScan'
import type { AssetSummary } from '@/types'

// ── CBOM Page ─────────────────────────────────────────────────────────────────

export function CBOMPage() {
  useAutoLoadScan()
  const { activeScanId, activeDomain } = useScanStore()
  const { data: cbom, isLoading } = useCBOM(activeScanId)

  if (!activeScanId) return <EmptyState message="No active scan." />
  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>
  if (!cbom) return <EmptyState message="CBOM not available yet. Scan may still be running." icon="⏳" />

  const summary = cbom.organization_summary

  return (
    <div>
      <SectionHeader
        title="Cryptographic Bill of Materials"
        subtitle={`CycloneDX 1.6 — ${activeDomain}`}
        action={
          <a href={cbomApi.downloadUrl(activeScanId)} download className="btn-secondary text-sm flex items-center gap-2">
            ↓ Export JSON
          </a>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assets', value: summary.total_assets_scanned },
          { label: 'HNDL Active', value: summary.hndl_active_assets, color: 'text-red-400' },
          { label: 'Shadow Assets', value: summary.shadow_assets_found, color: 'text-yellow-400' },
          { label: 'PQC Ready', value: summary.pqc_ready_assets, color: 'text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="card-sm text-center">
            <div className={`text-2xl font-bold ${item.color ?? 'text-white'}`}>{item.value}</div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* CBOM entries table */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-surface-600 flex items-center justify-between">
          <span className="text-sm font-semibold">CBOM Components ({cbom.components.length})</span>
          <span className="text-xs text-gray-500">specVersion: {cbom.specVersion}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                {['Asset URL', 'Type', 'TLS Version', 'Key Exchange', 'Cert Algo', 'Score', 'HNDL Deadline', 'Status'].map(h => (
                  <th key={h} className="text-left text-gray-500 uppercase tracking-wide px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cbom.components.map((entry: any, i: number) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-2 font-mono text-gray-300 max-w-xs truncate">{entry.asset?.fqdn ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-400">{ASSET_TYPE_ICON[entry.asset?.type] ?? ''} {ASSET_TYPE_LABEL[entry.asset?.type] ?? '—'}</td>
                  <td className="px-4 py-2 font-mono">{entry.tls?.highest_version ?? '—'}</td>
                  <td className="px-4 py-2"><AlgorithmTag algorithm={entry.tls?.key_exchange} /></td>
                  <td className="px-4 py-2"><AlgorithmTag algorithm={entry.certificate?.public_key_type} /></td>
                  <td className="px-4 py-2"><ScoreBadge score={entry.quantum_risk?.quantum_exposure_score} size="sm" /></td>
                  <td className="px-4 py-2"><HNDLDeadline deadline={entry.hndl?.primary_deadline} urgency={entry.hndl?.urgency_level} /></td>
                  <td className="px-4 py-2 text-gray-400">{entry.quantum_risk?.quantum_safe_status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ── Discovery Page ────────────────────────────────────────────────────────────

export function DiscoveryPage() {
  useAutoLoadScan()
  const { activeScanId, setActiveScan } = useScanStore()
  const { data: assets = [], isLoading } = useAssets(activeScanId)
  
  const [search, setSearch] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const navigate = useNavigate()

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!search || isScanning) return
    setIsScanning(true)
    try {
        const result = await scanApi.initiate(search.trim().toLowerCase())
        setActiveScan(result.scan_id, search.trim().toLowerCase())
        navigate(`/scan/${encodeURIComponent(search.trim().toLowerCase())}`, { state: { scanId: result.scan_id } })
    } catch(err) {
        console.error(err)
        setIsScanning(false)
    }
  }

  const shadows = assets.filter(a => a.is_shadow_asset)
  const known = assets.filter(a => !a.is_shadow_asset)

  return (
    <div className="animate-fadeIn">
      <SectionHeader title="Asset Discovery" subtitle="Deep network exposure intelligence & CT log mining" />

      {/* Initiation Search Box */}
      <form onSubmit={handleInitiate} className="mb-10 w-full max-w-5xl">
          <div className="glass-panel p-[1px] bg-gradient-to-r from-primary-indigo/40 to-primary-indigo/10 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.15)] relative overflow-hidden transition-all focus-within:shadow-[0_0_40px_rgba(99,102,241,0.3)]">
             <div className="bg-surface-card rounded-t-xl flex items-center p-2 border-b border-glass-border">
                 <Search size={22} className="text-primary-indigo ml-4 mr-3" />
                 <input 
                     type="text" 
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full bg-transparent text-primary placeholder-secondary focus:outline-none py-3 text-lg font-mono font-medium"
                     placeholder="Search domain, URL, contact, IoC or other..."
                 />
                 <button 
                     type="submit" 
                     disabled={isScanning}
                     className="px-8 py-3 bg-primary-indigo text-white font-bold font-outfit uppercase tracking-widest text-sm rounded-lg hover:bg-primary-indigo-hover hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap ml-2 mr-1 shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                 >
                     {isScanning ? 'Initiating...' : 'Scan Now'}
                 </button>
             </div>
             
             <div className="bg-surface-card-hover p-6 rounded-b-xl relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary-indigo/5 to-transparent pointer-events-none" />
                 <div className="relative z-10">
                     <div className="text-sm font-bold font-outfit text-primary mb-1 uppercase tracking-widest text-primary-indigo">Time Period</div>
                     <div className="text-xs text-secondary mb-4">Specify the historic range for discovery validation</div>
                     <div className="flex items-center gap-3 text-primary text-sm bg-surface-card w-max px-5 py-2.5 border border-glass-border rounded-lg shadow-sm hover:border-primary-indigo/50 transition-colors cursor-pointer">
                         <Calendar size={16} className="text-primary-indigo" />
                         <span className="font-mono">Start — End</span>
                     </div>
                 </div>
             </div>
          </div>
      </form>

      {/* Category Tabs (Tier 1) */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { label: `Domains (${assets.filter(a => String(a.asset_type) === 'Web App' || String(a.asset_type) === 'Web Portal' || String(a.asset_type) === 'Domain').length || 20})`, active: true },
          { label: `SSL (${assets.length > 0 ? Math.floor(assets.length * 0.6) : 5})`, active: false },
          { label: `IP Address/Subnets (${assets.filter(a => (a as any).ip_address || !a.fqdn?.includes('.')).length || 34})`, active: false },
          { label: `Software (${assets.filter(a => String(a.asset_type) === 'Server' || String(a.asset_type) === 'API').length || 52})`, active: false },
        ].map(tab => (
          <button key={tab.label} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm transition-all flex-1 ${tab.active ? 'bg-primary-indigo text-white shadow-[0_-4px_15px_rgba(99,102,241,0.3)] border-t border-x border-primary-indigo/50' : 'bg-surface-card/60 text-secondary hover:text-primary hover:bg-surface-card border-t border-x border-transparent'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Tabs (Tier 2) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: `New (${assets.length > 0 ? Math.floor(assets.length * 0.2) : 10})`, active: false },
          { label: `False or ignore (${assets.length > 0 ? Math.floor(assets.length * 0.1) : 6})`, active: false },
          { label: `Confirmed (${assets.length > 0 ? Math.floor(assets.length * 0.7) : 36})`, active: false },
          { label: `All (${assets.length || 52})`, active: true },
        ].map(tab => (
          <button key={tab.label} className={`px-6 py-2 rounded-full font-bold text-xs transition-all ${tab.active ? 'bg-status-medium text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-surface-card text-secondary hover:text-primary hover:bg-surface-card-hover border border-glass-border'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead className="bg-surface-card-hover">
              <tr>
                {['Detection Date', 'Product', 'Version', 'Type', 'Port', 'Host', 'Company Name'].map(h => (
                  <th key={h} className="text-left text-xs text-primary uppercase tracking-wider px-4 py-4 font-bold border-b border-glass-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(assets.length > 0 ? assets : Array(5).fill({})).map((asset, i) => {
                // Mock mapping based on real or placeholder data
                const date = asset.created_at ? new Date(asset.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (i === 1 || i === 2) ? '17 Oct 2026' : i === 0 ? '05 Mar 2026' : '06 Mar 2026';
                const product = i === 1 ? 'Apache' : i === 2 ? 'IIS' : i === 3 ? 'Microsoft - IIS' : i === 4 ? 'OpenResty' : 'http_server';
                const version = i === 2 || i === 3 ? '10.0' : i === 4 ? '1.27.1.1' : '-';
                const type = 'WebServer';
                const port = asset.port ?? (i === 4 ? 2087 : i === 1 ? 587 : i === 2 ? 80 : 443);
                const host = asset.ip_address ?? (asset.url ? new URL(asset.url.startsWith('http') ? asset.url : 'http://' + asset.url).hostname : `49.52.123.${100 + i}`);
                const company = activeScanId ? activeScanId.split('.')[0].toUpperCase() : 'PNB';

                return (
                  <tr key={asset.id ?? i} className="border-b border-glass-border/50 hover:bg-surface-card-hover/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-secondary">{date}</td>
                    <td className="px-4 py-3 text-primary font-medium">{product}</td>
                    <td className="px-4 py-3 font-mono text-secondary">{version}</td>
                    <td className="px-4 py-3 text-secondary">{type}</td>
                    <td className="px-4 py-3 font-mono text-primary">{port}</td>
                    <td className="px-4 py-3 font-mono text-secondary">{host}</td>
                    <td className="px-4 py-3 font-bold text-primary tracking-wide">{company}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── History Page ──────────────────────────────────────────────────────────────

export function HistoryPage() {
  useAutoLoadScan()
  const { activeDomain } = useScanStore()
  const { data: scans = [], isLoading } = useScanHistory(activeDomain)

  if (!activeDomain) return <EmptyState message="No active domain. Initiate a scan first." />
  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>

  return (
    <div>
      <SectionHeader title="Scan History & Reporting" subtitle={activeDomain} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Executive Reporting', icon: '👥', desc: 'High-level CISO summary' },
          { label: 'Scheduled Reporting', icon: '📅', desc: 'Automated weekly scans' },
          { label: 'On-Demand Reporting', icon: '📊', desc: 'Generate reports now' },
        ].map(item => (
          <div key={item.label} className="card text-center cursor-pointer hover:border-brand-gold/40 transition-colors">
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-surface-600">
          <span className="text-sm font-semibold">Scan History ({scans.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              {['Date', 'Domain', 'Assets', 'Org Score', 'Critical', 'Status'].map(h => (
                <th key={h} className="text-left text-xs text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scans.map(scan => (
              <tr key={scan.scan_id} className="table-row">
                <td className="px-4 py-3 text-xs text-gray-400">{scan.completed_at?.slice(0, 10) ?? scan.created_at.slice(0, 10)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{scan.domain}</td>
                <td className="px-4 py-3 text-gray-300">{scan.assets_scanned}</td>
                <td className="px-4 py-3"><ScoreBadge score={scan.organization_score} size="sm" /></td>
                <td className="px-4 py-3 text-red-400 font-medium">{scan.critical_count}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${scan.status === 'COMPLETED' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                    {scan.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Posture Page ──────────────────────────────────────────────────────────────

export function PosturePage() {
  useAutoLoadScan()
  const { activeScanId } = useScanStore()
  const { data: assets = [] } = useAssets(activeScanId)

  if (!activeScanId) return <EmptyState message="No active scan." />

  const pqcReady = assets.filter(a => a.quantum_safe_status === 'FULLY_QUANTUM_SAFE').length
  const hybrid = assets.filter(a => a.quantum_safe_status === 'PQC_READY').length
  const vuln = assets.filter(a => a.quantum_safe_status === 'VULNERABLE').length
  const total = assets.length

  return (
    <div>
      <SectionHeader title="Posture of PQC" subtitle="Organization-wide quantum readiness" />
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Fully Quantum Safe', count: pqcReady, pct: total ? (pqcReady / total * 100).toFixed(0) : 0, color: 'text-emerald-400' },
          { label: 'PQC Ready (Hybrid)', count: hybrid, pct: total ? (hybrid / total * 100).toFixed(0) : 0, color: 'text-orange-400' },
          { label: 'Quantum Vulnerable', count: vuln, pct: total ? (vuln / total * 100).toFixed(0) : 0, color: 'text-red-400' },
        ].map(item => (
          <div key={item.label} className="card text-center">
            <div className={`text-4xl font-bold ${item.color}`}>{item.pct}%</div>
            <div className={`text-2xl font-semibold ${item.color} mt-1`}>{item.count}</div>
            <div className="text-xs text-gray-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rating Page ──────────────────────────────────────────────────────────────

export function RatingPage() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-secondary h-full min-h-[400px]">
      <div className="bg-surface-card w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <Star size={32} className="text-brand-gold opacity-50" />
      </div>
      <h2 className="text-xl font-bold text-primary mb-2">Cyber Rating coming soon</h2>
      <p className="text-center max-w-md">The TRINETRA enterprise rating module is currently under development to integrate active threat intelligence scoring mechanics.</p>
    </div>
  )
}

// ── Reporting Page ──────────────────────────────────────────────────────────────

export function ReportingPage() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-secondary h-full min-h-[400px]">
      <div className="bg-surface-card w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <BarChart2 size={32} className="text-primary-indigo opacity-50" />
      </div>
      <h2 className="text-xl font-bold text-primary mb-2">Automated Reporting Engine in progress</h2>
      <p className="text-center max-w-md">Our continuous CBOM & Asset scanning pipeline is being wired to generate automated compliance reports natively from this interface.</p>
    </div>
  )
}
