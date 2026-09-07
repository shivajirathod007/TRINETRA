import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scanApi, getActiveDomain, getScanIdForDomain } from '../api';
import { Maximize2, Shield, Loader, Zap } from 'lucide-react';

const GlobalScanPopup = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeScan, setActiveScan] = useState(null);
    const pollRef = useRef(null);

    const isOnScanPage = location.pathname.startsWith('/scan/');

    useEffect(() => {
        const checkGlobalScan = async () => {
            const domain = getActiveDomain();
            const scanId = getScanIdForDomain(domain);
            if (!domain || !scanId) { setActiveScan(null); return; }
            try {
                const data = await scanApi.getStatus(scanId);
                if (data.status === 'running' || data.status === 'pending') {
                    setActiveScan({ ...data, domain, scanId });
                } else {
                    setActiveScan(null);
                }
            } catch { /* silent */ }
        };

        checkGlobalScan();
        pollRef.current = setInterval(checkGlobalScan, 3000);
        return () => clearInterval(pollRef.current);
    }, [location.pathname]);

    if (!activeScan || isOnScanPage) return null;

    const { tls_progress = 0, ai_progress = 0, assets_found = 0, status, domain } = activeScan;
    const overallProgress = Math.round((tls_progress + ai_progress) / 2);

    return (
        <div
            className="fixed bottom-6 right-6 z-50 animate-scaleIn cursor-pointer"
            style={{ width: 296 }}
            onClick={() => navigate(`/scan/${encodeURIComponent(domain)}`)}
            role="status"
            aria-label={`Scan in progress for ${domain}`}
            title={`Scan running for ${domain} — click to view`}
        >
            <div
                className="eterna-phase-card overflow-hidden"
                style={{
                    border: '1px solid rgba(99,102,241,0.30)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.12)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.parentElement.style.transform = 'scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.parentElement.style.transform = 'scale(1)')}
            >
                {/* Header */}
                <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--surface-card-hover)', borderBottom: '1px solid var(--border-divider)' }}>
                    <div className="flex items-center gap-2">
                        <Loader size={13} className="animate-spin" style={{ color: 'var(--primary-indigo)' }} aria-hidden="true" />
                        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--text-primary)' }}>
                            Scan Running
                        </span>
                    </div>
                    <Maximize2 size={12} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
                </div>

                {/* Body */}
                <div className="px-4 py-3 space-y-2.5">
                    <div>
                        <div className="text-[9.5px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Target
                        </div>
                        <div className="font-mono text-sm font-bold truncate" style={{ color: 'var(--text-link)' }}>
                            {domain}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <Shield size={11} aria-hidden="true" /> Progress
                        </span>
                        <span className="font-mono font-bold" style={{ color: 'var(--primary-indigo)' }}>
                            {overallProgress}%
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-card-hover)' }}>
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${overallProgress}%`,
                                background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                                transition: 'width 0.6s ease',
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Assets:{' '}
                            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                                {assets_found}
                            </span>
                        </div>
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider animate-pulse-subtle flex items-center gap-1"
                            style={{ color: 'var(--status-safe)' }}
                        >
                            <Zap size={10} aria-hidden="true" /> {status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalScanPopup;
