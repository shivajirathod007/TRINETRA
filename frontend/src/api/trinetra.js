import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const trinetraApi = {
    startScan: (domain) => apiClient.post('/scan/', { domain }),
    getScanStatus: (scanId) => apiClient.get(`/scan/${scanId}`),
    getCbom: (scanId) => apiClient.get(`/cbom/${scanId}`),
    getCertificate: (assetId) => apiClient.get(`/certificate/${assetId}`),
    getDashboardSummary: (domain) => apiClient.get(`/dashboard/${domain}`)
};
