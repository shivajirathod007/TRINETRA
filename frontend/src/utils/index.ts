import type { RiskLevel, QuantumStatus, CertTier, AssetType } from '@/types'

// ── Risk colors ───────────────────────────────────────────────────────────────

export const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#E24B4A',
  HIGH:     '#EF9F27',
  MEDIUM:   '#FAC775',
  LOW:      '#97C459',
  SAFE:     '#1D9E75',
}

export const RISK_BG: Record<RiskLevel, string> = {
  CRITICAL: 'bg-red-900/30 text-red-400 border-red-800/50',
  HIGH:     'bg-orange-900/30 text-orange-400 border-orange-800/50',
  MEDIUM:   'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  LOW:      'bg-green-900/30 text-green-400 border-green-800/50',
  SAFE:     'bg-emerald-900/30 text-emerald-400 border-emerald-800/50',
}

export function riskBadgeClass(level: RiskLevel | string): string {
  return RISK_BG[level as RiskLevel] ?? 'bg-gray-800 text-gray-400 border-gray-700'
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

export const CERT_TIER_LABEL: Record<CertTier, string> = {
  QUANTUM_VULNERABLE: 'Quantum Vulnerable',
  PQC_READY:          'PQC Ready',
  FULLY_QUANTUM_SAFE: 'Fully Quantum Safe',
}

export const CERT_TIER_COLOR: Record<CertTier, string> = {
  QUANTUM_VULNERABLE: '#E24B4A',
  PQC_READY:          '#EF9F27',
  FULLY_QUANTUM_SAFE: '#1D9E75',
}

export const CERT_TIER_BG: Record<CertTier, string> = {
  QUANTUM_VULNERABLE: 'bg-red-900/30 text-red-400 border border-red-800/50',
  PQC_READY:          'bg-orange-900/30 text-orange-400 border border-orange-800/50',
  FULLY_QUANTUM_SAFE: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50',
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
