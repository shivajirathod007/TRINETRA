import { clsx } from 'clsx'
import type { RiskLevel, CertTier } from '@/types'
import { CERT_TIER_LABEL } from '@/utils'
import { RefreshCw } from 'lucide-react'

// ── Score Badge ────────────────────────────────────────────────────────────────

interface ScoreBadgeProps {
  score: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>

  const color =
    score >= 80 ? '#ef4444'
    : score >= 60 ? '#f97316'
    : score >= 40 ? '#eab308'
    : score >= 20 ? '#84cc16'
    : '#22c55e'

  const sizeClass =
    size === 'sm' ? 'text-xs px-1.5 py-0.5'
    : size === 'lg' ? 'text-base px-3 py-1'
    : 'text-xs px-2 py-0.5'

  return (
    <span
      className={clsx('font-mono font-bold rounded-lg', sizeClass)}
      style={{ color, background: color + '18', border: `1px solid ${color}35` }}
    >
      {score.toFixed(0)}
    </span>
  )
}

// ── Risk Badge ────────────────────────────────────────────────────────────────

interface RiskBadgeProps { level: RiskLevel | string; size?: 'sm' | 'md' }

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const lvl = (level || 'UNKNOWN').toUpperCase()

  /* Map level → design token colours so both dark and light themes work */
  const styleMap: Record<string, { bg: string; color: string; border: string }> = {
    CRITICAL:            { bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)' },
    HIGH:                { bg: 'rgba(249,115,22,0.13)', color: 'var(--status-high)',     border: 'rgba(249,115,22,0.30)' },
    MEDIUM:              { bg: 'rgba(234,179,8,0.13)',  color: 'var(--status-medium)',   border: 'rgba(234,179,8,0.30)' },
    LOW:                 { bg: 'rgba(59,130,246,0.13)', color: 'var(--status-low)',      border: 'rgba(59,130,246,0.30)' },
    SAFE:                { bg: 'rgba(34,197,94,0.13)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.30)' },
    QUANTUM_VULNERABLE:  { bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)' },
    VULNERABLE:          { bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)' },
    PQC_READY:           { bg: 'rgba(249,115,22,0.13)', color: 'var(--status-high)',     border: 'rgba(249,115,22,0.30)' },
    FULLY_QUANTUM_SAFE:  { bg: 'rgba(34,197,94,0.13)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.30)' },
    UNKNOWN:             { bg: 'rgba(99,102,241,0.10)', color: 'var(--primary-indigo)',  border: 'rgba(99,102,241,0.25)' },
  }

  const s = styleMap[lvl] ?? styleMap.UNKNOWN
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <span
      className={clsx('font-semibold rounded-full border inline-flex items-center', sizeClass)}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {level}
    </span>
  )
}

// ── Cert Tier Badge ───────────────────────────────────────────────────────────

interface CertBadgeProps { tier: CertTier | string; showLabel?: boolean }

export function CertBadge({ tier, showLabel = true }: CertBadgeProps) {
  const styleMap: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    FULLY_QUANTUM_SAFE: { bg: 'rgba(34,197,94,0.12)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.30)',  dot: '●' },
    PQC_READY:          { bg: 'rgba(249,115,22,0.12)', color: 'var(--status-high)',     border: 'rgba(249,115,22,0.30)', dot: '◑' },
    QUANTUM_VULNERABLE: { bg: 'rgba(239,68,68,0.12)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)',  dot: '○' },
    VULNERABLE:         { bg: 'rgba(239,68,68,0.12)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)',  dot: '○' },
    UNKNOWN:            { bg: 'rgba(99,102,241,0.10)', color: 'var(--primary-indigo)',  border: 'rgba(99,102,241,0.25)', dot: '○' },
  }
  const s = styleMap[tier as string] ?? styleMap.UNKNOWN
  const label = CERT_TIER_LABEL[tier as CertTier] ?? tier
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      <span aria-hidden="true">{s.dot}</span>
      {showLabel && <span>{label}</span>}
    </span>
  )
}

// ── Algorithm Tag ─────────────────────────────────────────────────────────────

interface AlgorithmTagProps { algorithm: string | null | undefined }

export function AlgorithmTag({ algorithm }: AlgorithmTagProps) {
  if (!algorithm) return <span style={{ color: 'var(--text-muted)' }} className="text-xs">—</span>

  const isVuln = ['RSA', 'ECDSA', 'ECDHE', 'DHE', 'RS256', 'ES256', 'NTLM']
    .some(v => algorithm.toUpperCase().includes(v))
  const isSafe = ['ML-KEM', 'ML-DSA', 'KYBER', 'DILITHIUM', 'SPHINCS']
    .some(v => algorithm.toUpperCase().includes(v))

  const style = isSafe
    ? { background: 'rgba(34,197,94,0.10)',  color: 'var(--status-safe)',     borderColor: 'rgba(34,197,94,0.25)' }
    : isVuln
    ? { background: 'rgba(239,68,68,0.10)',  color: 'var(--status-critical)', borderColor: 'rgba(239,68,68,0.25)' }
    : { background: 'var(--surface-card-hover)', color: 'var(--text-secondary)', borderColor: 'var(--glass-border)' }

  return (
    <span
      className="font-mono text-xs px-2 py-0.5 rounded border"
      style={style}
    >
      {algorithm}
    </span>
  )
}

// ── HNDL Deadline ─────────────────────────────────────────────────────────────

interface HNDLDeadlineProps { deadline: string | null | undefined; urgency?: string }

export function HNDLDeadline({ deadline, urgency }: HNDLDeadlineProps) {
  if (!deadline) return <span style={{ color: 'var(--text-muted)' }} className="text-xs">—</span>

  const colorMap: Record<string, string> = {
    IMMEDIATE: 'var(--status-critical)',
    URGENT:    'var(--status-high)',
    PLANNED:   'var(--status-medium)',
  }
  const color = colorMap[urgency ?? ''] ?? 'var(--status-safe)'

  return (
    <span className="text-sm font-mono font-medium" style={{ color }}>
      {deadline}
    </span>
  )
}

// ── Loading Spinner ───────────────────────────────────────────────────────────

interface SpinnerProps { size?: number; className?: string }

export function LoadingSpinner({ size = 20, className }: SpinnerProps) {
  return (
    <RefreshCw
      className={clsx('animate-spin', className)}
      width={size}
      height={size}
      style={{ color: 'var(--primary-indigo)' }}
      aria-label="Loading"
    />
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

interface EmptyStateProps { message: string; icon?: string }

export function EmptyState({ message, icon = '🔍' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-fadeIn">
      <span className="text-4xl mb-4" role="img" aria-label="empty">{icon}</span>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

interface SectionHeaderProps { title: string; subtitle?: string; action?: React.ReactNode }

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div className="min-w-0">
        <h2
          className="font-bold font-outfit"
          style={{
            color: 'var(--text-primary)',
            fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
            letterSpacing: '-0.015em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 flex-shrink-0">{action}</div>
      )}
    </div>
  )
}
