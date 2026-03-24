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
}

// ── Assets API ────────────────────────────────────────────────────────────────

export const assetsApi = {
  getDetail: (assetId: string) =>
    api.get<AssetDetail>(`/assets/${assetId}`).then(r => r.data),

  getByScan: (scanId: string) =>
    api.get<AssetSummary[]>(`/dashboard/${scanId}/assets`).then(r => r.data),
}

// ── Dashboard API ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: (domain: string) =>
    api.get<DashboardStats>(`/dashboard/${domain}`).then(r => r.data),
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
