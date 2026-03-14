import { useState } from 'react'
import { useScanStore, useDashboardStore } from '@/store'
import { useDashboard, useAssets, useScanStatus } from '@/hooks'
import { StatCards, AssetTable, RiskPieChart, ImprovementRecommendations } from '@/components/dashboard'
import { LoadingSpinner, EmptyState, SectionHeader, RiskBadge } from '@/components/shared'
import { RISK_COLORS } from '@/utils'
import type { AssetSummary, RiskLevel } from '@/types'

export default function DashboardPage() {
  const { activeScanId, activeDomain } = useScanStore()
  const { filterRisk, filterType, filterShadow, sortBy, sortDir, setFilterRisk, resetFilters } = useDashboardStore()

  const { data: stats, isLoading: statsLoading } = useDashboard(activeDomain)
  const { data: assets = [], isLoading: assetsLoading } = useAssets(activeScanId)

  if (!activeScanId) {
    return <EmptyState message="No active scan. Go to Home and initiate a scan first." icon="🔍" />
  }

  if (statsLoading || assetsLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>
  }

  if (!stats) {
    return <EmptyState message="Scan in progress or no completed scans yet." icon="⏳" />
  }

  // Filter + sort
  let filtered: AssetSummary[] = assets
  if (filterRisk !== 'ALL')   filtered = filtered.filter(a => a.risk_level === filterRisk)
  if (filterType !== 'ALL')   filtered = filtered.filter(a => a.asset_type === filterType)
  if (filterShadow)           filtered = filtered.filter(a => a.is_shadow_asset)

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1
    if (sortBy === 'score')  return dir * ((b.quantum_exposure_score ?? 0) - (a.quantum_exposure_score ?? 0))
    if (sortBy === 'expiry') return dir * ((a.cert_expiry_days ?? 999) - (b.cert_expiry_days ?? 999))
    return dir * a.fqdn.localeCompare(b.fqdn)
  })

  return (
    <div>
      {/* Page header */}
      <SectionHeader
        title="PQC Compliance Dashboard"
        subtitle={`Domain: ${activeDomain}`}
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Elite-PQC Ready: {stats.safe_count}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Critical: {stats.critical_count}</span>
          </div>
        }
      />

      {/* Stat Cards */}
      <StatCards stats={stats} />

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <RiskPieChart stats={stats} />

        {/* Classification bar chart */}
        <div className="card h-64">
          <div className="section-title">Assets by Risk Grade</div>
          <div className="flex items-end gap-4 h-40 mt-4">
            {[
              { label: 'Critical', count: stats.critical_count, color: RISK_COLORS.CRITICAL },
              { label: 'High',     count: stats.high_count,     color: RISK_COLORS.HIGH },
              { label: 'Medium',   count: stats.medium_count,   color: RISK_COLORS.MEDIUM },
              { label: 'Low',      count: stats.low_count,      color: RISK_COLORS.LOW },
              { label: 'Safe',     count: stats.safe_count,     color: RISK_COLORS.SAFE },
            ].map(item => {
              const maxCount = Math.max(stats.critical_count, stats.high_count, stats.medium_count, stats.low_count, stats.safe_count, 1)
              const heightPct = (item.count / maxCount) * 100
              return (
                <div key={item.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-gray-400 font-medium">{item.count}</span>
                  <div className="w-full rounded-t transition-all"
                    style={{ height: `${heightPct}%`, background: item.color, minHeight: item.count > 0 ? '8px' : '0' }} />
                  <span className="text-xs text-gray-500">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shadow assets */}
        <div className="card h-64">
          <div className="section-title">Shadow Asset Discovery</div>
          <div className="text-3xl font-bold text-yellow-400 mt-4">{stats.shadow_assets_found}</div>
          <div className="text-sm text-gray-400 mt-1">discovered via CT logs</div>
          <p className="text-xs text-gray-500 mt-3">
            Assets found in Certificate Transparency logs but not in the bank's known inventory.
            Each is a potential unmonitored attack surface.
          </p>
        </div>
      </div>

      {/* Risk filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-500">Filter:</span>
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as const).map(r => (
          <button
            key={r}
            onClick={() => setFilterRisk(r)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterRisk === r
                ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                : 'border-surface-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {r}
          </button>
        ))}
        {filterRisk !== 'ALL' && (
          <button className="text-xs text-gray-500 hover:text-white ml-2" onClick={resetFilters}>
            Reset
          </button>
        )}
      </div>

      {/* Asset table */}
      <AssetTable assets={filtered} />

      {/* Improvement recommendations */}
      <div className="mt-4">
        <ImprovementRecommendations assets={assets} />
      </div>
    </div>
  )
}
