import { useScanStore } from '@/store'
import { useCBOM, useCertificates, useAssets, useScanHistory } from '@/hooks'
import { LoadingSpinner, EmptyState, SectionHeader, ScoreBadge, AlgorithmTag, HNDLDeadline } from '@/components/shared'
import { CertCard } from '@/components/certificate'
import { cbomApi } from '@/api/client'
import { ASSET_TYPE_ICON, ASSET_TYPE_LABEL } from '@/utils'
import type { AssetSummary } from '@/types'

// ── CBOM Page ─────────────────────────────────────────────────────────────────

export function CBOMPage() {
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

// ── Certificates Page ─────────────────────────────────────────────────────────

export function CertificatesPage() {
  const { activeScanId } = useScanStore()
  const { data: certs = [], isLoading } = useCertificates(activeScanId)

  if (!activeScanId) return <EmptyState message="No active scan." />
  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>

  const byTier = {
    FULLY_QUANTUM_SAFE: certs.filter(c => c.status === 'FULLY_QUANTUM_SAFE'),
    PQC_READY: certs.filter(c => c.status === 'PQC_READY'),
    QUANTUM_VULNERABLE: certs.filter(c => c.status === 'QUANTUM_VULNERABLE'),
  }

  return (
    <div>
      <SectionHeader title="PQC Readiness Certificates" subtitle={`${certs.length} certificates issued`} />

      {Object.entries(byTier).map(([tier, tierCerts]) => {
        if (!tierCerts.length) return null
        return (
          <div key={tier} className="mb-8">
            <div className="section-title mb-3">{tier.replace(/_/g, ' ')} ({tierCerts.length})</div>
            <div className="grid grid-cols-2 gap-3">
              {tierCerts.map(cert => <CertCard key={cert.id} cert={cert} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Discovery Page ────────────────────────────────────────────────────────────

export function DiscoveryPage() {
  const { activeScanId } = useScanStore()
  const { data: assets = [], isLoading } = useAssets(activeScanId)

  if (!activeScanId) return <EmptyState message="No active scan." />
  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>

  const shadows = assets.filter(a => a.is_shadow_asset)
  const known = assets.filter(a => !a.is_shadow_asset)

  return (
    <div>
      <SectionHeader title="Asset Discovery" subtitle="CT Log mining results" />

      {/* Filter tabs */}
      <div className="flex gap-4 mb-4 border-b border-surface-600">
        {[
          { label: `Domains (${assets.length})`, active: true },
          { label: `Shadow Assets (${shadows.length})`, active: false },
          { label: `Known Assets (${known.length})`, active: false },
        ].map(tab => (
          <button key={tab.label} className={`pb-3 text-sm font-medium transition-colors ${tab.active ? 'border-b-2 border-brand-gold text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                {['Detection Date', 'FQDN', 'Type', 'Port', 'IP Address', 'Shadow', 'Score'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} className="table-row">
                  <td className="px-4 py-2 text-xs text-gray-400">—</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-300">{asset.fqdn}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{ASSET_TYPE_ICON[asset.asset_type]} {ASSET_TYPE_LABEL[asset.asset_type]}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">443</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">—</td>
                  <td className="px-4 py-2">
                    {asset.is_shadow_asset
                      ? <span className="text-yellow-400 text-xs">👻 Shadow</span>
                      : <span className="text-gray-500 text-xs">Known</span>}
                  </td>
                  <td className="px-4 py-2"><ScoreBadge score={asset.quantum_exposure_score} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── History Page ──────────────────────────────────────────────────────────────

export function HistoryPage() {
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
