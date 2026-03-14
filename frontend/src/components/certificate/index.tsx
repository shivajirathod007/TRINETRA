import { clsx } from 'clsx'
import type { PQCCertificate, CertificateDetail } from '@/types'
import { CERT_TIER_COLOR, CERT_TIER_LABEL } from '@/utils'
import { ScoreBadge } from '@/components/shared'

// ── Certificate Card ──────────────────────────────────────────────────────────

export function CertCard({ cert }: { cert: PQCCertificate }) {
  const color = CERT_TIER_COLOR[cert.status as keyof typeof CERT_TIER_COLOR] ?? '#888'
  const isVuln = cert.status === 'QUANTUM_VULNERABLE'
  const isSafe = cert.status === 'FULLY_QUANTUM_SAFE'

  return (
    <div
      className="card-sm relative overflow-hidden cursor-pointer hover:border-gray-500 transition-colors"
      style={{ borderColor: color + '44' }}
    >
      {/* Colored left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: color }} />

      <div className="pl-3">
        {/* Tier badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color, background: color + '22', border: `1px solid ${color}44` }}
          >
            {isSafe ? '● ' : isVuln ? '○ ' : '◑ '}
            {CERT_TIER_LABEL[cert.status as keyof typeof CERT_TIER_LABEL] ?? cert.status}
          </span>
          <ScoreBadge score={cert.quantum_exposure_score} size="sm" />
        </div>

        {/* Asset URL */}
        <div className="font-mono text-xs text-gray-300 truncate mb-2">
          {cert.asset_url}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{cert.certificate_id}</span>
          <span>Valid until {cert.valid_until}</span>
        </div>
      </div>
    </div>
  )
}

// ── Certificate Detail View ───────────────────────────────────────────────────

export function CertDetailView({ cert }: { cert: CertificateDetail }) {
  const color = CERT_TIER_COLOR[cert.status as keyof typeof CERT_TIER_COLOR] ?? '#888'

  return (
    <div className="card" style={{ borderColor: color + '55' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6 border-b border-surface-600">
        <div>
          <div
            className="text-xl font-bold mb-1"
            style={{ color }}
          >
            {cert.label}
          </div>
          <div className="font-mono text-sm text-gray-400">{cert.certificate_id}</div>
        </div>
        <ScoreBadge score={cert.quantum_exposure_score} size="lg" />
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ['Asset URL', cert.asset_url],
          ['Algorithm', cert.algorithm_detected],
          ['Key Exchange', cert.key_exchange],
          ['Signature', cert.signature_algorithm],
          ['NIST Standard', cert.nist_standard],
          ['HNDL Deadline', cert.hndl_deadline],
          ['Issued', cert.issued_date],
          ['Valid Until', cert.valid_until],
          ['Issuing Platform', cert.issuing_platform],
          ['Team', cert.issuing_team],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="section-title">{label}</div>
            <div className="font-mono text-xs text-gray-200 truncate">{value || '—'}</div>
          </div>
        ))}
      </div>

      {/* Signature */}
      <div className="mt-4 pt-4 border-t border-surface-600">
        <div className="section-title">HMAC-SHA256 Signature</div>
        <div className="font-mono text-xs text-gray-500 break-all">{cert.signature}</div>
      </div>
    </div>
  )
}
