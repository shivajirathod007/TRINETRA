// ── Scan types ───────────────────────────────────────────────────────────────

export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type CRQCScenario = 'pessimistic' | 'moderate' | 'optimistic'

export interface ScanJob {
  scan_id: string
  domain: string
  status: ScanStatus
  current_stage?: string
  assets_discovered: number
  assets_scanned: number
  organization_score?: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  safe_count: number
  shadow_assets_found: number
  created_at: string
  completed_at?: string
}

// ── Asset types ───────────────────────────────────────────────────────────────

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE'
export type AssetType = 'web_portal' | 'api_endpoint' | 'vpn_gateway' | 'ssh_endpoint' | 'smtp_mta' | 'staging' | 'shadow_asset' | 'mobile_backend'
export type QuantumStatus = 'VULNERABLE' | 'PQC_READY' | 'FULLY_QUANTUM_SAFE' | 'UNKNOWN'

export interface AssetSummary {
  id: string
  fqdn: string
  asset_url: string
  asset_type: AssetType
  risk_level: RiskLevel
  quantum_exposure_score: number
  quantum_safe_status: QuantumStatus
  hndl_deadline: string
  is_shadow_asset: boolean
  cert_expiry_days?: number
  key_exchange?: string
  cert_algorithm?: string
}

export interface AssetDetail extends AssetSummary {
  ip_address?: string
  port: number
  scan_status: string
  // TLS
  tls_versions_supported?: string[]
  tls_version_active?: string
  cipher_suite_active?: string
  key_exchange?: string
  vulnerabilities?: string[]
  // Certificate
  cert_key_length?: number
  cert_issuer?: string
  ocsp_stapling?: boolean
  hsts_enabled?: boolean
  hsts_max_age?: number
  // API
  jwt_algorithm?: string
  auth_type?: string
  cors_policy?: string
  graphql_introspection?: boolean
  // Risk
  score_breakdown?: ScoreBreakdown
  hndl_urgency?: string
  // CBOM + Migration
  cbom_entry?: Record<string, unknown>
  migration_plan?: MigrationPlan
  pqc_certificate_id?: string
  scan_timestamp: string
}

export interface ScoreBreakdown {
  algorithm_risk: number
  hndl_timeline: number
  public_exposure: number
  weights: Record<string, number>
}

// ── Certificate types ─────────────────────────────────────────────────────────

export type CertTier = 'QUANTUM_VULNERABLE' | 'PQC_READY' | 'FULLY_QUANTUM_SAFE'

export interface PQCCertificate {
  id: string
  certificate_id: string
  asset_url: string
  status: CertTier
  label: string
  quantum_exposure_score?: number
  issued_date: string
  valid_until: string
}

export interface CertificateDetail {
  certificate_id: string
  issuing_platform: string
  issuing_team: string
  asset_url: string
  scan_id: string
  status: CertTier
  label: string
  color: string
  algorithm_detected: string
  key_exchange: string
  signature_algorithm: string
  nist_standard: string
  quantum_exposure_score: number
  risk_level: RiskLevel
  hndl_deadline: string
  scan_date: string
  issued_date: string
  valid_until: string
  validity_days: number
  signature: string
}

// ── CBOM types ────────────────────────────────────────────────────────────────

export interface CBOMExport {
  bomFormat: string
  specVersion: string
  serialNumber: string
  metadata: Record<string, unknown>
  organization_summary: {
    domain: string
    organization_quantum_exposure_score: number
    total_assets_scanned: number
    risk_distribution: Record<string, number>
    shadow_assets_found: number
    hndl_active_assets: number
    pqc_ready_assets: number
  }
  components: unknown[]
}

// ── Migration types ───────────────────────────────────────────────────────────

export interface MigrationStep {
  step: number
  title: string
  description: string
  nist_reference?: string
  command_example?: string
  estimated_hours?: number
}

export interface MigrationPlan {
  steps: MigrationStep[]
  estimated_sprints: number
  complexity: string
  immediate_action: string
  nist_standards: string[]
}

// ── Dashboard types ───────────────────────────────────────────────────────────

export interface DashboardStats {
  domain: string
  exposure_score: number
  total_assets: number
  critical_count: number
  high_count: number
  medium_count: number
  pqc_ready: number
  safe: number
  shadow_count: number
  live_sync: boolean
  risk_distribution: { name: string, value: number, color: string }[]
  algorithm_breakdown: { name: string, count: number }[]
  assets: AssetSummary[]
}
