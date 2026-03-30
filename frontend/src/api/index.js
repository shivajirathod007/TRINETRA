/**
 * TRINETRA Frontend API Client
 * All API calls go through the Vite proxy to /api/v1/...
 */

// Use relative paths so Vite's dev proxy forwards /api → http://api:8000
const BASE = '/api/v1';

async function request(path, options = {}) {
    const resp = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!resp.ok) {
        const msg = await resp.text().catch(() => resp.statusText);
        throw new Error(`API ${resp.status}: ${msg}`);
    }
    return resp.json();
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
