import type { RiskLevel, CertTier, AssetType } from '@/types'

// ── Risk colors ───────────────────────────────────────────────────────────────

export const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#3b82f6',
  SAFE:     '#22c55e',
}

export const RISK_BG: Record<RiskLevel, string> = {
  CRITICAL: 'badge-critical',
  HIGH:     'badge-high',
  MEDIUM:   'badge-medium',
  LOW:      'badge-low',
  SAFE:     'badge-safe',
}

export function riskBadgeClass(level: RiskLevel | string): string {
  const map: Record<string, string> = {
    CRITICAL: 'badge-critical',
    HIGH:     'badge-high',
    MEDIUM:   'badge-medium',
    LOW:      'badge-low',
    SAFE:     'badge-safe',
  }
  return map[(level as string)?.toUpperCase()] ?? 'tag'
}

export function riskColor(level: RiskLevel | string): string {
  return RISK_COLORS[level as RiskLevel] ?? '#888'
}

export function scoreToRisk(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  if (score >= 20) return 'LOW'
  return 'SAFE'
}

// ── PQC status ────────────────────────────────────────────────────────────────

export const CERT_TIER_LABEL: Record<string, string> = {
  QUANTUM_VULNERABLE: 'Quantum Vulnerable',
  VULNERABLE:         'Quantum Vulnerable',
  PQC_READY:          'PQC Ready',
  FULLY_QUANTUM_SAFE: 'Fully Quantum Safe',
}

export const CERT_TIER_COLOR: Record<CertTier, string> = {
  QUANTUM_VULNERABLE: '#ef4444',
  PQC_READY:          '#f97316',
  FULLY_QUANTUM_SAFE: '#22c55e',
}

export const CERT_TIER_BG: Record<CertTier, string> = {
  QUANTUM_VULNERABLE: 'badge-critical',
  PQC_READY:          'badge-high',
  FULLY_QUANTUM_SAFE: 'badge-safe',
}

// ── Asset type labels ─────────────────────────────────────────────────────────

export const ASSET_TYPE_LABEL: Record<AssetType | string, string> = {
  web_portal:     'Web Portal',
  api_endpoint:   'API Endpoint',
  vpn_gateway:    'VPN Gateway',
  ssh_endpoint:   'SSH Endpoint',
  smtp_mta:       'Email (MTA)',
  staging:        'Staging / UAT',
  shadow_asset:   'Shadow Asset',
  mobile_backend: 'Mobile Backend',
}

export const ASSET_TYPE_ICON: Record<AssetType | string, string> = {
  web_portal:     '🌐',
  api_endpoint:   '⚡',
  vpn_gateway:    '🔒',
  ssh_endpoint:   '💻',
  smtp_mta:       '📧',
  staging:        '🧪',
  shadow_asset:   '👻',
  mobile_backend: '📱',
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  return score.toFixed(1)
}

export function formatExpiry(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 0)   return 'Expired'
  if (days < 30)  return `${days}d (critical)`
  if (days < 90)  return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function truncateUrl(url: string, max = 50): string {
  return url.length > max ? url.slice(0, max) + '…' : url
}

export function formatAlgorithm(algo: string | null | undefined): string {
  if (!algo) return '—'
  const map: Record<string, string> = {
    'RSA-SHA256':       'RSA-2048 (SHA-256)',
    'ECDSA-SHA256':     'ECDSA P-256',
    'sha256WithRSAEncryption': 'RSA (SHA-256)',
  }
  return map[algo] ?? algo
}

export function isQuantumVulnerable(algo: string | null | undefined): boolean {
  if (!algo) return false
  const vuln = ['RSA', 'ECDSA', 'ECDHE', 'DHE', 'RS256', 'ES256', 'NTLM', 'DH']
  return vuln.some(v => algo.toUpperCase().includes(v))
}
