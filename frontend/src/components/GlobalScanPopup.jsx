import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scanApi, getActiveDomain, getScanIdForDomain } from '../api';
import { Terminal, Maximize2, Shield, Loader, ArrowRight } from 'lucide-react';

const GlobalScanPopup = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [activeScan, setActiveScan] = useState(null);
    const pollRef = useRef(null);

    // Don't show the popup if the user is currently on the scan page itself
    const isOnScanPage = location.pathname.startsWith('/scan/');

    useEffect(() => {
        const checkGlobalScan = async () => {
            const domain = getActiveDomain();
            const scanId = getScanIdForDomain(domain);

            if (!domain || !scanId) {
                setActiveScan(null);
                return;
            }

            try {
                const data = await scanApi.getStatus(scanId);
                // If it's still running or pending, we consider it an active scan
                if (data.status === 'running' || data.status === 'pending') {
                    setActiveScan({ ...data, domain, scanId });
                } else {
                    // It finished or failed, we can let it gracefully disappear or show completion briefly
                    // For now, we clear it out if it's completed
                    setActiveScan(null);
                }
            } catch (err) {
                console.error("Global polling failed:", err);
            }
        };

        // Poll every 3 seconds for global state
        checkGlobalScan();
        pollRef.current = setInterval(checkGlobalScan, 3000);

        return () => clearInterval(pollRef.current);
    }, [location.pathname]); // re-evaluate if path changes just in case

    if (!activeScan || isOnScanPage) {
        return null;
    }

    const { tls_progress = 0, ai_progress = 0, assets_found = 0, status, domain } = activeScan;
    const overallProgress = Math.round((tls_progress + ai_progress) / 2);

    return (
        <div 
            className="fixed bottom-6 right-6 z-50 animate-fade-in cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => navigate(`/scan/${encodeURIComponent(domain)}`)}
        >
            <div className="glass-card flex flex-col overflow-hidden min-w-[280px] shadow-2xl border" 
                 style={{ borderImage: "linear-gradient(to right, rgba(99, 102, 241, 0.5), rgba(59, 130, 246, 0.5)) 1" }}>
                
                {/* Header */}
                <div className="bg-surface-card-hover p-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Loader className="animate-spin text-primary-indigo" size={16} />
                        <span className="text-sm font-bold tracking-wider text-primary">SCAN RUNNING</span>
                    </div>
                    <Maximize2 size={14} className="text-secondary" />
                </div>

                {/* Body */}
                <div className="p-4 space-y-3 bg-navy-black/90">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-secondary uppercase tracking-widest">Target</span>
                        <span className="font-mono text-sm break-all text-white font-bold">{domain}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary flex items-center gap-1">
                            <Shield size={12} /> Scan Progress
                        </span>
                        <span className="text-xs font-mono font-bold text-primary-indigo">{overallProgress}%</span>
                    </div>
                    
                    <div className="w-full bg-surface-card rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-primary-indigo" style={{ width: `${overallProgress}%`, transition: 'width 0.5s' }} />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <div className="text-xs">
                           <span className="text-secondary">Assets: </span> 
                           <span className="font-mono text-white">{assets_found}</span>
                        </div>
                        <span className="text-[10px] uppercase text-status-safe tracking-wider font-bold animate-pulse-subtle">
                            {status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalScanPopup;
