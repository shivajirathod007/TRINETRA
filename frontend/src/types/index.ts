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
  url: string  // API returns 'url' not 'asset_url'
  fqdn: string
  domain?: string
  type: AssetType  // API returns 'type' not 'asset_type'
  risk_level: RiskLevel
  score: number  // API returns 'score' not 'quantum_exposure_score'
  discovery: 'Shadow' | 'Known'  // API returns this instead of is_shadow_asset boolean
  scan_id: string
  quantum_safe_status: QuantumStatus
  tls_version?: string
  cert_algorithm?: string
  cert_key_length?: number
  cert_issuer?: string
  cert_subject?: string
  cert_sha256?: string
  cert_expiry?: string
  cert_expiry_days?: number
  ip_address?: string
  port?: number
  scan_timestamp?: string
  data_classification?: {
    sensitivity_tier: string
    sensitivity_source: string
    shelf_life_years: number
    override_reason?: string
  }
}

export interface AssetDetail extends AssetSummary {
  ip_address?: string
  port?: number
  scan_status?: string
  // TLS - note: API returns 'tls_version' not 'tls_version_active'
  tls_versions_supported?: string[]
  tls_version?: string
  cipher_suite?: string
  key_exchange?: string
  vulnerabilities?: string[]
  // Certificate
  cert_key_length?: number
  cert_issuer?: string
  cert_subject?: string
  cert_sha256?: string
  cert_is_self_signed?: boolean
  ocsp_stapling?: boolean
  hsts_enabled?: boolean
  hsts_max_age?: number
  // API
  jwt_algorithm?: string
  auth_type?: string
  cors_policy?: string
  graphql_introspection?: boolean
  // Risk breakdown - structure from API
  score_breakdown?: {
    formula: string
    final_score: number
    risk_level: string
    algorithm_risk: { raw: number; weighted: number; weight: string }
    hndl_timeline: { raw: number; weighted: number; weight: string }
    public_exposure: { raw: number; weighted: number; weight: string }
  }
  hndl_urgency?: string
  hndl_deadline?: string
  scan_timestamp?: string
  // Additional fields from detail endpoint
  cert_expiry?: string
  pqc_status?: string
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
  scan_job_id: string
  status: CertTier
  label: string
  key_exchange: string | null
  signature_algorithm: string | null
  nist_standard: string | null
  quantum_exposure_score: number
  issued_date: string
  valid_until: string
  issuing_platform: string
  certificate_json: any
}

export interface CertificateDetail extends PQCCertificate {
  signature: string
  issuing_team?: string
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
  low_count?: number
  safe_count?: number
  pqc_ready: number
  safe: number  // Note: API returns 'safe' not 'safe_count'
  shadow_count: number  // Maps to shadow_assets_found in API
  shadow_assets_found?: number
  live_sync: boolean
  risk_distribution: { name: string, value: number, color: string }[]
  algorithm_breakdown: { name: string, count: number }[]
  ip_distribution?: { name: string, value: number, color: string }[]
  geographic_distribution?: { country: string, count: number, color: string }[]
  assets: AssetSummary[]
}
