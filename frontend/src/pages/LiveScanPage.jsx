import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { scanApi, setActiveScan } from '../api/index';

const POLL_INTERVAL_MS = 2000;

const LiveScanPage = () => {
    const { domain } = useParams();
    const navigate = useNavigate();

    const [scanId, setScanId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('pending');
    const [tlsProgress, setTlsProgress] = useState(0);
    const [aiProgress, setAiProgress] = useState(0);
    const [assetsFound, setAssetsFound] = useState(0);
    const [shadowAssets, setShadowAssets] = useState(0);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);
    const pollRef = useRef(null);

    /* ──── 1. Initiate scan on mount ──────────────────────────────── */
    useEffect(() => {
        if (!domain) { navigate('/'); return; }
        scanApi.initiate(domain)
            .then(result => {
                setScanId(result.scan_id);
                setActiveScan(domain, result.scan_id);
                setLogs([`Initializing TRINETRA scanner for ${domain}...`]);
            })
            .catch(err => setError(err.message));
    }, [domain, navigate]);

    /* ──── 2. Poll for status/logs ────────────────────────────────── */
    useEffect(() => {
        if (!scanId || status === 'completed' || status === 'failed') return;

        pollRef.current = setInterval(async () => {
            try {
                const data = await scanApi.getStatus(scanId);
                setLogs(data.logs ?? []);
                setTlsProgress(data.tls_progress ?? 0);
                setAiProgress(data.ai_progress ?? 0);
                setAssetsFound(data.assets_found ?? 0);
                setShadowAssets(data.shadow_assets ?? 0);
                setStatus(data.status);

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollRef.current);
                    if (data.status === 'completed') {
                        setTimeout(() => navigate('/dashboard'), 1500);
                    }
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(pollRef.current);
    }, [scanId, status, navigate]);

    /* ──── 3. Auto-scroll terminal ────────────────────────────────── */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const isPending = status === 'pending' || status === 'running';
    const overallProgress = Math.round((tlsProgress + aiProgress) / 2);

    const stages = [
        { step: 1, name: 'INPUT', active: true, done: true },
        { step: 2, name: 'ENUMERATION', active: tlsProgress > 0, done: tlsProgress === 100 },
        { step: 3, name: 'CRYPTO SCAN', active: tlsProgress > 50, done: tlsProgress === 100 },
        { step: 4, name: 'ANALYSIS', active: aiProgress > 0, done: aiProgress === 100 },
        { step: 5, name: 'OUTPUT', active: status === 'completed', done: status === 'completed' },
    ];

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-4">
                    <Terminal className="text-primary-indigo" size={24} />
                    <div>
                        <h1 className="text-xl font-bold">Active Reconnaissance</h1>
                        <p className="text-xs text-secondary font-mono">
                            Target: {domain} | Mode: Deep Inspection
                        </p>
                    </div>
                </div>
                <div className={`badge ${status === 'completed' ? 'badge-safe' : 'badge-high animate-pulse-subtle'}`}>
                    {status === 'completed' ? 'SCAN COMPLETE' : status === 'failed' ? 'FAILED' : 'SCAN IN PROGRESS'}
                </div>
            </div>

            {error && (
                <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-4 text-status-critical text-sm">
                    Error: {error}
                </div>
            )}

            <div className="flex flex-col lg-flex-row gap-6 flex-1 min-h-[500px]">
                {/* Terminal Log */}
                <div className="flex-1 glass-card flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-surface-card-hover flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-status-critical" />
                            <div className="w-3 h-3 rounded-full bg-status-medium" />
                            <div className="w-3 h-3 rounded-full bg-status-safe" />
                        </div>
                        <span className="text-xs font-mono text-secondary ml-2">root@trinetra-node:~#</span>
                    </div>
                    <div className="p-4 font-mono text-sm overflow-y-auto flex-1" style={{ lineHeight: '1.6' }}>
                        {logs.map((log, i) => (
                            <div key={i}
                                className={`mb-1 ${log.toLowerCase().includes('warning') || log.toLowerCase().includes('critical') || log.includes('⚠')
                                    ? 'text-status-critical font-medium'
                                    : 'text-status-pqc'}`}>
                                <span className="text-secondary mr-2">[{new Date().toLocaleTimeString()}]</span>
                                <span>{log}</span>
                            </div>
                        ))}
                        {isPending && scanId && (
                            <div className="text-status-pqc animate-pulse">
                                <span className="text-secondary mr-2">[{new Date().toLocaleTimeString()}]</span>
                                Scanning...
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Live Counters */}
                <div className="w-full lg-w-96 glass-card p-6 flex flex-col gap-6 overflow-y-auto">
                    <h2 className="font-bold border-b pb-2">Real-Time Telemetry</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-card-hover rounded border">
                            <div className="text-xs text-secondary uppercase tracking-widest mb-1">Discovered</div>
                            <div className="text-2xl font-bold font-mono">{assetsFound}</div>
                        </div>
                        <div className="p-4 bg-surface-card-hover rounded border">
                            <div className="text-xs text-secondary uppercase tracking-widest mb-1">Live Host</div>
                            <div className="text-2xl font-bold font-mono text-status-safe">{Math.max(0, assetsFound - shadowAssets)}</div>
                        </div>
                    </div>

                    <div className="p-4 rounded" style={{ borderLeft: '3px solid var(--status-high)', background: 'rgba(249,115,22,0.05)' }}>
                        <div className="text-xs text-status-high uppercase tracking-widest mb-1 font-bold">Shadow Assets Detected</div>
                        <div className="text-3xl font-bold font-mono text-status-high animate-pulse-subtle">{shadowAssets}</div>
                    </div>

                    <div className="space-y-4 mt-2">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-secondary flex items-center gap-1"><Shield size={12} /> TLS Scanners</span>
                                <span className="font-mono">{tlsProgress}%</span>
                            </div>
                            <div className="w-full bg-surface-card-hover rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary-indigo" style={{ width: `${tlsProgress}%`, transition: 'width 0.5s' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-secondary flex items-center gap-1"><Cpu size={12} /> AI Classifier</span>
                                <span className="font-mono">{aiProgress}%</span>
                            </div>
                            <div className="w-full bg-surface-card-hover rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary-indigo" style={{ width: `${aiProgress}%`, transition: 'width 0.5s' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-secondary flex items-center gap-1"><ArrowRight size={12} /> Overall Progress</span>
                                <span className="font-mono">{overallProgress}%</span>
                            </div>
                            <div className="w-full bg-surface-card-hover rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-status-safe" style={{ width: `${overallProgress}%`, transition: 'width 0.5s' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pipeline Steps */}
            <div className="glass-card p-6 border">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border-divider -z-10 -translate-y-1/2" />
                    {stages.map((stage, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 bg-navy-black px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                ${stage.done ? 'bg-status-safe text-black'
                                    : stage.active ? 'bg-primary-indigo text-white animate-pulse-subtle'
                                        : 'bg-surface-card border text-secondary'}`}>
                                {stage.done ? '✓' : stage.step}
                            </div>
                            <span className={`text-[10px] font-bold tracking-widest ${stage.active || stage.done ? 'text-primary' : 'text-secondary'}`}>
                                {stage.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .bg-status-critical\\/10 { background-color: rgba(239,68,68,0.1); }
        .border-status-critical\\/30 { border-color: rgba(239,68,68,0.3); }
        .badge-safe { background: rgba(34,197,94,0.15); color: var(--status-safe); border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; }
        @media (min-width: 1024px) {
          .lg-flex-row { flex-direction: row !important; }
          .lg-w-96 { width: 24rem !important; }
        }
      `}</style>
        </div>
    );
};

export default LiveScanPage;
