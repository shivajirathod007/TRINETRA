import { clsx } from 'clsx'
import type { RiskLevel, CertTier } from '@/types'
import { riskBadgeClass, CERT_TIER_BG, CERT_TIER_LABEL, CERT_TIER_COLOR, riskColor } from '@/utils'

// ── Score Badge ───────────────────────────────────────────────────────────────

interface ScoreBadgeProps {
  score: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score == null) return <span className="text-gray-500">—</span>

  const color = score >= 80 ? '#E24B4A'
    : score >= 60 ? '#EF9F27'
    : score >= 40 ? '#FAC775'
    : score >= 20 ? '#97C459'
    : '#1D9E75'

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-lg px-3 py-1' : 'text-sm px-2 py-0.5'

  return (
    <span
      className={clsx('font-mono font-bold rounded', sizeClass)}
      style={{ color, background: color + '22', border: `1px solid ${color}44` }}
    >
      {score.toFixed(0)}
    </span>
  )
}

// ── Risk Badge ────────────────────────────────────────────────────────────────

interface RiskBadgeProps { level: RiskLevel | string; size?: 'sm' | 'md' }

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  return (
    <span className={clsx(
      'font-medium rounded-full border',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
      riskBadgeClass(level)
    )}>
      {level}
    </span>
  )
}

// ── Cert Tier Badge ───────────────────────────────────────────────────────────

interface CertBadgeProps { tier: CertTier | string; showLabel?: boolean }

export function CertBadge({ tier, showLabel = true }: CertBadgeProps) {
  const dot = tier === 'FULLY_QUANTUM_SAFE' ? '●' : tier === 'PQC_READY' ? '◑' : '○'
  const cls = CERT_TIER_BG[tier as CertTier] ?? 'bg-gray-800 text-gray-400 border border-gray-700'
  return (
    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit', cls)}>
      <span>{dot}</span>
      {showLabel && <span>{CERT_TIER_LABEL[tier as CertTier] ?? tier}</span>}
    </span>
  )
}

// ── Algorithm Tag ─────────────────────────────────────────────────────────────

interface AlgorithmTagProps { algorithm: string | null | undefined }

export function AlgorithmTag({ algorithm }: AlgorithmTagProps) {
  if (!algorithm) return <span className="text-gray-500 text-xs">—</span>

  const isVuln = ['RSA', 'ECDSA', 'ECDHE', 'DHE', 'RS256', 'ES256', 'NTLM']
    .some(v => algorithm.toUpperCase().includes(v))
  const isSafe = ['ML-KEM', 'ML-DSA', 'KYBER', 'DILITHIUM', 'SPHINCS']
    .some(v => algorithm.toUpperCase().includes(v))

  return (
    <span className={clsx(
      'font-mono text-xs px-2 py-0.5 rounded border',
      isSafe  ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
      isVuln  ? 'bg-red-900/30 text-red-400 border-red-800/50' :
                'bg-surface-700 text-gray-300 border-surface-600'
    )}>
      {algorithm}
    </span>
  )
}

// ── HNDL Deadline ─────────────────────────────────────────────────────────────

interface HNDLDeadlineProps { deadline: string | null | undefined; urgency?: string }

export function HNDLDeadline({ deadline, urgency }: HNDLDeadlineProps) {
  if (!deadline) return <span className="text-gray-500 text-xs">—</span>

  const color = urgency === 'IMMEDIATE' ? 'text-red-400'
    : urgency === 'URGENT' ? 'text-orange-400'
    : urgency === 'PLANNED' ? 'text-yellow-400'
    : 'text-emerald-400'

  return (
    <span className={clsx('text-sm font-mono font-medium', color)}>
      {deadline}
    </span>
  )
}

// ── Loading Spinner ───────────────────────────────────────────────────────────

interface SpinnerProps { size?: number; className?: string }

export function LoadingSpinner({ size = 20, className }: SpinnerProps) {
  return (
    <svg
      className={clsx('animate-spin text-brand-gold', className)}
      width={size} height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

interface EmptyStateProps { message: string; icon?: string }

export function EmptyState({ message, icon = '🔍' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <p className="text-gray-400">{message}</p>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

interface SectionHeaderProps { title: string; subtitle?: string; action?: React.ReactNode }

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
