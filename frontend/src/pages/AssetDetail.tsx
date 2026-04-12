// ── Asset Detail Page ─────────────────────────────────────────────────────────
import { useParams, Link } from 'react-router-dom'
import { useAssetDetail } from '@/hooks'
import { ScoreBadge, RiskBadge, CertBadge, AlgorithmTag, HNDLDeadline, LoadingSpinner, EmptyState } from '@/components/shared'
import { clsx } from 'clsx'

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: asset, isLoading } = useAssetDetail(id ?? null)

  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>
  if (!asset)    return <EmptyState message="Asset not found" />

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-flex items-center gap-1">
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-lg text-white mb-1">{asset.url}</div>
            <div className="text-sm text-gray-400">{asset.fqdn}</div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={asset.score} size="lg" />
            <RiskBadge level={asset.risk_level} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-600 text-sm">
          <span className="text-gray-400">HNDL Urgency: <span className="font-bold text-white">{asset.hndl_urgency || 'N/A'}</span></span>
          <span className="text-gray-400">Port: <span className="font-mono text-white">{asset.port}</span></span>
          <span className="text-gray-400">IP: <span className="font-mono text-white">{asset.ip_address ?? '—'}</span></span>
          {asset.discovery === 'Shadow' && <span className="text-yellow-400 text-xs">👻 Shadow Asset</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* TLS */}
        <div className="card">
          <div className="section-title">TLS Configuration</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Active Version</dt><dd className="font-mono text-white">{asset.tls_version ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Key Exchange</dt><dd><AlgorithmTag algorithm={asset.key_exchange} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Cipher Suite</dt><dd className="font-mono text-xs text-gray-300 max-w-40 truncate">{asset.cipher_suite ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">HSTS</dt><dd className={asset.hsts_enabled ? 'text-emerald-400' : 'text-red-400'}>{asset.hsts_enabled ? 'Enabled' : 'Missing'}</dd></div>
            {(asset.vulnerabilities?.length ?? 0) > 0 && (
              <div className="flex justify-between"><dt className="text-gray-500">Vulnerabilities</dt>
                <dd className="flex gap-1">{asset.vulnerabilities!.map(v => <span key={v} className="tag text-red-400">{v}</span>)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Certificate */}
        <div className="card">
          <div className="section-title">Certificate</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Algorithm</dt><dd><AlgorithmTag algorithm={asset.cert_algorithm} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Key Length</dt><dd className="font-mono text-white">{asset.cert_key_length ? `${asset.cert_key_length} bits` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Expiry</dt><dd className="font-mono text-gray-300">{asset.cert_expiry ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Issuer</dt><dd className="text-xs text-gray-300 truncate max-w-40">{asset.cert_issuer ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">OCSP</dt><dd className={asset.ocsp_stapling ? 'text-emerald-400' : 'text-gray-500'}>{asset.ocsp_stapling ? 'Stapled' : 'Not stapled'}</dd></div>
          </dl>
        </div>

        {/* Score Breakdown */}
        <div className="card">
          <div className="section-title">Score Breakdown</div>
          {asset.score_breakdown && (
            <div className="space-y-3">
              {[
                { label: 'Algorithm Risk (40%)', value: asset.score_breakdown.algorithm_risk.raw },
                { label: 'HNDL Timeline (40%)',  value: asset.score_breakdown.hndl_timeline.raw },
                { label: 'Public Exposure (20%)', value: asset.score_breakdown.public_exposure.raw },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-mono">{item.value.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-600 rounded-full">
                    <div className="h-full rounded-full bg-brand-gold" style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API findings */}
        <div className="card">
          <div className="section-title">API Findings</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">JWT Algorithm</dt><dd><AlgorithmTag algorithm={asset.jwt_algorithm} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Auth Type</dt><dd className="font-mono text-xs text-gray-300">{asset.auth_type ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">CORS Policy</dt><dd className={clsx('text-xs', asset.cors_policy === 'permissive' ? 'text-red-400' : 'text-gray-300')}>{asset.cors_policy ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">GraphQL Introspection</dt><dd className={asset.graphql_introspection ? 'text-red-400' : 'text-emerald-400'}>{asset.graphql_introspection ? 'Exposed' : 'Disabled'}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
