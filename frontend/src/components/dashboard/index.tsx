import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import type { DashboardStats, AssetSummary } from '@/types'
import { ScoreBadge, RiskBadge, CertBadge, AlgorithmTag, HNDLDeadline } from '@/components/shared'
import { RISK_COLORS, ASSET_TYPE_ICON, ASSET_TYPE_LABEL, truncateUrl } from '@/utils'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'

// ── Stat Cards ────────────────────────────────────────────────────────────────

export function StatCards({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: 'Org Score',     value: <ScoreBadge score={stats.exposure_score} size="lg" />,     sub: 'quantum exposure' },
    { label: 'Critical Risk', value: <span className="text-2xl font-bold text-status-critical">{stats.critical_count}</span>, sub: 'high priority' },
    { label: 'PQC Ready',     value: <span className="text-2xl font-bold text-emerald-400">{stats.pqc_ready}</span>,        sub: 'crypto-agile' },
    { label: 'Shadow Assets', value: <span className="text-2xl font-bold text-yellow-500">{stats.shadow_count}</span>,     sub: 'unmanaged' },
    { label: 'Scanned',       value: <span className="text-2xl font-bold text-white">{stats.total_assets}</span>,     sub: 'total assets' },
  ]
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {items.map(item => (
        <div key={item.label} className="card-sm">
          <div className="section-title">{item.label}</div>
          <div className="flex items-end gap-2">{item.value}</div>
          <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Risk Distribution Chart ───────────────────────────────────────────────────

export function RiskPieChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: 'Critical', value: stats.critical_count, color: RISK_COLORS.CRITICAL },
    { name: 'High',     value: stats.high_count,     color: RISK_COLORS.HIGH },
    { name: 'Medium',   value: stats.medium_count,   color: RISK_COLORS.MEDIUM },
    { name: 'Low',      value: stats.low_count,      color: RISK_COLORS.LOW },
    { name: 'Safe',     value: stats.safe_count,     color: RISK_COLORS.SAFE },
  ].filter(d => d.value > 0)

  return (
    <div className="card h-64">
      <div className="section-title">Application Status</div>
      <div className="flex items-center gap-6 h-48">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-gray-400">{d.name}</span>
              <span className="text-white font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Asset Table ───────────────────────────────────────────────────────────────

interface AssetTableProps {
  assets: AssetSummary[]
  onSelect?: (id: string) => void
}

export function AssetTable({ assets, onSelect }: AssetTableProps) {
  const navigate = useNavigate()

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-surface-600">
        <span className="text-sm font-semibold text-white">Assets ({assets.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              {['Asset', 'Type', 'Score', 'Risk', 'Status', 'HNDL Deadline', 'Algorithm', 'Cert Expiry'].map(h => (
                <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wide px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => (
              <tr
                key={asset.id}
                className="table-row cursor-pointer"
                onClick={() => { onSelect?.(asset.id); navigate(`/asset/${asset.id}`) }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {asset.is_shadow_asset && (
                      <span className="text-yellow-400 text-xs" title="Shadow asset">👻</span>
                    )}
                    <span className="font-mono text-xs text-gray-300">{truncateUrl(asset.fqdn, 35)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">
                    {ASSET_TYPE_ICON[asset.asset_type]} {ASSET_TYPE_LABEL[asset.asset_type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={asset.quantum_exposure_score} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <RiskBadge level={asset.risk_level} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <CertBadge tier={asset.quantum_safe_status as any} />
                </td>
                <td className="px-4 py-3">
                  <HNDLDeadline deadline={asset.hndl_deadline} />
                </td>
                <td className="px-4 py-3">
                  <AlgorithmTag algorithm={asset.cert_algorithm} />
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('text-xs', (asset.cert_expiry_days ?? 999) < 90 ? 'text-red-400' : 'text-gray-400')}>
                    {asset.cert_expiry_days != null ? `${asset.cert_expiry_days}d` : '—'}
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

// ── Improvement Recommendations ───────────────────────────────────────────────

export function ImprovementRecommendations({ assets }: { assets: AssetSummary[] }) {
  const critical = assets.filter(a => a.risk_level === 'CRITICAL').slice(0, 3)
  const recs = [
    'Upgrade to TLS 1.3 with PQC cipher suites',
    'Implement ML-KEM-768 for key exchange (NIST FIPS 203)',
    'Replace RSA certificates with ML-DSA-65 (NIST FIPS 204)',
    'Update cryptographic libraries to OpenSSL 3.x PQC build',
    'Develop PQC migration plan for all critical assets',
  ]
  return (
    <div className="card">
      <div className="section-title">Improvement Recommendations</div>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-brand-gold mt-0.5">→</span>
            <span className="text-gray-300">{r}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
