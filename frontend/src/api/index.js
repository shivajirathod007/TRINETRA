/**
 * TRINETRA Frontend API Client
 * All API calls go through Vite dev proxy (/api → http://localhost:8000) with JWT authentication
 */

import axios from 'axios';

// Create axios instance using Vite dev proxy (baseURL: /api/v1)
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token on ALL requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trinetra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on 401
      localStorage.removeItem('trinetra_token');
      localStorage.removeItem('trinetra_user');
      localStorage.removeItem('trinetra_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

async function request(path, options = {}) {
    try {
        const config = {
            ...options,
            method: options.method || 'GET',
        };
        if (options.body) {
            config.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        }
        const resp = await apiClient(path, config);
        return resp.data;
    } catch (error) {
        const msg = error.response?.data?.detail || error.message;
        throw new Error(`API ${error.response?.status || 'error'}: ${msg}`);
    }
}

// ── Scans ─────────────────────────────────────────────────────────────────────

export const scanApi = {
    initiate: (domain, crqc_scenario = 'moderate') =>
        request('/scans/', {
            method: 'POST',
            body: JSON.stringify({ domain, crqc_scenario }),
        }),

    getStatus: (scanId) => request(`/scans/${scanId}`),

    list: (domain = null, limit = 20) => {
        const q = new URLSearchParams();
        if (domain) q.set('domain', domain);
        q.set('limit', limit);
        return request(`/scans/?${q}`);
    },

    cancel: (scanId) =>
        request(`/scans/${scanId}/cancel`, { method: 'POST' }),
};


// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
    getStats: (domain) => {
        const path = domain ? `/dashboard/${domain}` : '/dashboard/';
        return request(path);
    },
    getAggregate: () => request('/dashboard/aggregate'),
};

// ── Assets ────────────────────────────────────────────────────────────────────

export const assetsApi = {
    list: (params = {}) => {
        const q = new URLSearchParams();
        if (params.scan_id) q.set('scan_id', params.scan_id);
        if (params.domain) q.set('domain', params.domain);
        if (params.limit) q.set('limit', params.limit);
        return request(`/assets/?${q}`);
    },

    getDetail: (assetId) => request(`/assets/${assetId}`),

    patchSensitivityTier: (assetId, tier, overrideReason = null) =>
        request(`/assets/${assetId}/sensitivity-tier`, {
            method: 'PATCH',
            body: JSON.stringify({ data_sensitivity_tier: tier, override_reason: overrideReason }),
        }),
};

// ── CBOM ──────────────────────────────────────────────────────────────────────

export const cbomApi = {
    get: (params = {}) => {
        const q = new URLSearchParams();
        if (params.scan_id) q.set('scan_id', params.scan_id);
        if (params.domain) q.set('domain', params.domain);
        return request(`/cbom/?${q}`);
    },

    getByScan: (scanId) => request(`/cbom/${scanId}`),
};

// ── Certificates ──────────────────────────────────────────────────────────────

export const certApi = {
    list: (params = {}) => {
        const q = new URLSearchParams();
        if (params.domain) q.set('domain', params.domain);
        if (params.scan_id) q.set('scan_id', params.scan_id);
        return request(`/certificates/?${q}`);
    },

    getByScan: (scanId) => request(`/certificates/scan/${scanId}`),

    getDetail: (assetId) => request(`/certificates/${assetId}`),
};

// ── Scheduled Scans ───────────────────────────────────────────────────────────

export const scheduledScanApi = {
    list: () => request('/scheduled-scans/'),
    create: (data) => request('/scheduled-scans/', { method: 'POST', body: JSON.stringify(data) }),
    patch: (id, data) => request(`/scheduled-scans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/scheduled-scans/${id}`, { method: 'DELETE' }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retrieve the last scanned domain from localStorage */
export function getActiveDomain() {
    return localStorage.getItem('trinetra_active_domain') || '';
}

/** Retrieve the last scan ID from localStorage */
export function getActiveScanId() {
    return localStorage.getItem('trinetra_scan_id') || '';
}

/** Persist domain + scan ID for use across pages */
export function setActiveScan(domain, scanId) {
    localStorage.setItem('trinetra_active_domain', domain);
    localStorage.setItem('trinetra_scan_id', scanId);
    if (domain) sessionStorage.setItem(`trinetra_scan_${domain}`, scanId);
}

/** Get scan ID for a domain (avoids starting a new scan on refresh) */
export function getScanIdForDomain(domain) {
    return domain ? sessionStorage.getItem(`trinetra_scan_${domain}`) : null;
}
