// ── Asset Detail Page ─────────────────────────────────────────────────────────
import { useParams, Link } from 'react-router-dom'
import { useAssetDetail, useCertificateDetail } from '@/hooks'
import { ScoreBadge, RiskBadge, CertBadge, AlgorithmTag, HNDLDeadline, LoadingSpinner, EmptyState } from '@/components/shared'
import { CertCard } from '@/components/certificate'
import { formatAlgorithm } from '@/utils'
import { clsx } from 'clsx'
import type { MigrationStep } from '@/types'

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: asset, isLoading } = useAssetDetail(id ?? null)
  const { data: cert } = useCertificateDetail(asset?.pqc_certificate_id ?? null)

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
            <div className="font-mono text-lg text-white mb-1">{asset.fqdn}</div>
            <div className="text-sm text-gray-400">{asset.asset_url}</div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={asset.quantum_exposure_score} size="lg" />
            <RiskBadge level={asset.risk_level} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-600 text-sm">
          <span className="text-gray-400">HNDL Deadline: <HNDLDeadline deadline={asset.hndl_deadline} urgency={asset.hndl_urgency} /></span>
          <span className="text-gray-400">Port: <span className="font-mono text-white">{asset.port}</span></span>
          <span className="text-gray-400">IP: <span className="font-mono text-white">{asset.ip_address ?? '—'}</span></span>
          {asset.is_shadow_asset && <span className="text-yellow-400 text-xs">👻 Shadow Asset</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* TLS */}
        <div className="card">
          <div className="section-title">TLS Configuration</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Active Version</dt><dd className="font-mono text-white">{asset.tls_version_active ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Key Exchange</dt><dd><AlgorithmTag algorithm={asset.key_exchange} /></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Cipher Suite</dt><dd className="font-mono text-xs text-gray-300 max-w-40 truncate">{asset.cipher_suite_active ?? '—'}</dd></div>
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
            <div className="flex justify-between"><dt className="text-gray-500">Expiry</dt><dd className={clsx('font-mono', (asset.cert_expiry_days ?? 999) < 90 ? 'text-red-400' : 'text-gray-300')}>{asset.cert_expiry_days != null ? `${asset.cert_expiry_days} days` : '—'}</dd></div>
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
                { label: 'Algorithm Risk (40%)', value: asset.score_breakdown.algorithm_risk },
                { label: 'HNDL Timeline (40%)',  value: asset.score_breakdown.hndl_timeline },
                { label: 'Public Exposure (20%)', value: asset.score_breakdown.public_exposure },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-mono">{item.value.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-600 rounded-full">
                    <div className="h-full rounded-full bg-brand-gold" style={{ width: `${item.value}%` }} />
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

      {/* Migration Plan */}
      {asset.migration_plan && (
        <div className="card mb-4">
          <div className="section-title">PQC Migration Plan</div>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-gray-400">Complexity: <span className="text-white capitalize">{asset.migration_plan.complexity}</span></span>
            <span className="text-gray-400">Sprints: <span className="text-white">{asset.migration_plan.estimated_sprints}</span></span>
          </div>
          <div className="bg-brand-red/10 border border-brand-red/30 rounded-lg p-3 mb-4 text-sm text-red-300">
            ⚡ {asset.migration_plan.immediate_action}
          </div>
          <div className="space-y-3">
            {asset.migration_plan.steps.map((step: MigrationStep) => (
              <div key={step.step} className="flex gap-4 p-3 bg-surface-700/50 rounded-lg">
                <span className="text-brand-gold font-bold text-sm shrink-0 mt-0.5">{step.step}.</span>
                <div>
                  <div className="text-sm font-medium text-white mb-1">{step.title}</div>
                  <div className="text-xs text-gray-400">{step.description}</div>
                  {step.command_example && (
                    <code className="block mt-1 text-xs bg-surface-900 text-emerald-400 px-2 py-1 rounded font-mono">
                      {step.command_example}
                    </code>
                  )}
                  {step.nist_reference && (
                    <span className="text-xs text-brand-gold mt-1 inline-block">{step.nist_reference}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PQC Certificate */}
      {cert && (
        <div className="mb-4">
          <div className="section-title text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">PQC Readiness Certificate</div>
          <CertCard cert={cert} />
        </div>
      )}
    </div>
  )
}
