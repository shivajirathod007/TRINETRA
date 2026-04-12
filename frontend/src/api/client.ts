import axios from 'axios'
import type {
  ScanJob, AssetSummary, AssetDetail,
  PQCCertificate, CertificateDetail, CBOMExport, DashboardStats
} from '@/types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Request interceptor: Add auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trinetra_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Handle 401 Unauthorized
let isRedirecting = false
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true
      localStorage.removeItem('trinetra_token')
      localStorage.removeItem('trinetra_user')
      localStorage.removeItem('trinetra_auth')
      window.location.href = '/login'
      setTimeout(() => { isRedirecting = false }, 2000)
    }
    return Promise.reject(error)
  }
)

// ── Scan API ──────────────────────────────────────────────────────────────────

export const scanApi = {
  initiate: (domain: string, crqc_scenario = 'moderate') =>
    api.post<{ scan_id: string; domain: string; status: string; poll_url: string }>(
      '/scans/', { domain, crqc_scenario }
    ).then(r => r.data),

  getStatus: (scanId: string) =>
    api.get<ScanJob>(`/scans/${scanId}`).then(r => r.data),

  list: (domain: string | null = null, limit = 10) =>
    api.get<ScanJob[]>('/scans/', { params: { domain, limit } }).then(r => r.data),

  getResults: (scanId: string) =>
    api.get<any>(`/scans/${scanId}/results`).then(r => r.data),
}

// ── Assets API ────────────────────────────────────────────────────────────────

export const assetsApi = {
  getDetail: (assetId: string) =>
    api.get<AssetDetail>(`/assets/${assetId}`).then(r => r.data),

  getByScan: (scanId: string) =>
    api.get<any[]>(`/assets/`, { params: { scan_id: scanId } }).then(r => r.data),

  /**
   * Manually override the data sensitivity tier for an asset.
   * Synchronously recomputes HNDL urgency and QARS exposure score.
   * Returns updated scores in the response body.
   *
   * Requirements: 4.1–4.7
   */
  patchSensitivityTier: (
    assetId: string,
    tier: "transaction" | "authentication" | "static",
    overrideReason?: string,
  ) =>
    api.patch<{
      asset_id: string;
      data_sensitivity_tier: string;
      data_sensitivity_tier_source: string;
      quantum_exposure_score: number | null;
      risk_level: string | null;
      hndl_deadline: string | null;
      hndl_urgency: string | null;
      mosca_x: number | null;
      mosca_act_now: boolean | null;
      data_shelf_life_years: number | null;
      sensitivity_tier_impact: number | null;
      score_breakdown: Record<string, unknown> | null;
    }>(`/assets/${assetId}/sensitivity-tier`, {
      data_sensitivity_tier: tier,
      override_reason: overrideReason ?? null,
    }).then(r => r.data),
}

// ── Dashboard API ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: (domain: string, scanId?: string | null) =>
    api.get<DashboardStats>(`/dashboard/${domain}`, {
      params: scanId ? { scan_id: scanId } : undefined,
    }).then(r => r.data),
}

// ── CBOM API ──────────────────────────────────────────────────────────────────

export const cbomApi = {
  get: (scanId: string) =>
    api.get<CBOMExport>(`/cbom/${scanId}`).then(r => r.data),

  downloadUrl: (scanId: string) => `/api/v1/cbom/${scanId}/download`,
}

// ── Certificate API ───────────────────────────────────────────────────────────

export const certApi = {
  get: (certId: string) =>
    api.get<CertificateDetail>(`/certificates/${certId}`).then(r => r.data),

  verify: (certId: string) =>
    api.get<{ certificate_id: string; signature_valid: boolean; status: string }>(
      `/certificates/${certId}/verify`
    ).then(r => r.data),

  byScan: (scanId: string) =>
    api.get<PQCCertificate[]>(`/certificates/scan/${scanId}`).then(r => r.data),
}

export default api
