import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Terminal, Shield, Cpu, ArrowRight, Code2, ChevronDown, ChevronUp,
    Copy, Check, StopCircle, LayoutDashboard, Wifi, Globe, Lock,
    AlertTriangle, Activity, Zap, Eye, Server, Network
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { scanApi, assetsApi, setActiveScan, getScanIdForDomain } from '../api/index';

const POLL_INTERVAL_MS = 2000;

/** Collapsible JSON viewer */
const JsonViewer = ({ data, title }) => {
    const [open, setOpen] = useState(true);
    const [copied, setCopied] = useState(false);
    if (!data) return null;
    const assetCount = Array.isArray(data) ? data.length : 1;
    const json = JSON.stringify(data, null, 2);
    const handleCopy = () => {
        navigator.clipboard.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="glass-card border overflow-hidden" style={{ borderColor: 'var(--glass-border)' }}>
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 transition-colors"
                style={{ background: 'var(--surface-card-hover)' }}>
                <div className="flex items-center gap-3">
                    <Code2 size={14} className="text-primary-indigo" />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {assetCount} asset{assetCount !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {open ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
                </div>
            </button>
            {open && (
                <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--surface-card-hover)', borderBottom: '1px solid var(--glass-border)' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                            Total assets found: <span className="font-bold" style={{ color: '#818cf8' }}>{assetCount}</span>
                        </span>
                        <button type="button" onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                            {copied ? <Check size={12} className="text-status-safe" /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy JSON'}
                        </button>
                    </div>
                    <pre className="p-4 text-xs font-mono overflow-x-auto overflow-y-auto leading-relaxed"
                        style={{ maxHeight: 520, background: '#0f1117', color: '#a5f3fc' }}>{json}</pre>
                </div>
            )}
        </div>
    );
};

/** Animated stat card */
const StatCard = ({ label, value, color = 'text-primary', icon: Icon, pulse = false, accent }) => (
    <div className="p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden"
        style={{ background: accent ? `rgba(${accent},0.06)` : 'var(--surface-card-hover)', borderColor: accent ? `rgba(${accent},0.25)` : 'var(--glass-border)' }}>
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            {Icon && <Icon size={14} className={color} />}
        </div>
        <div className={`text-2xl font-bold font-mono ${color} ${pulse ? 'animate-pulse' : ''}`}>{value}</div>
        {accent && <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: `rgba(${accent},0.4)` }} />}
    </div>
);

/** Animated progress bar */
const ProgressBar = ({ label, value, icon: Icon, color = '#6366f1' }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
            <span className="text-secondary flex items-center gap-1.5">
                {Icon && <Icon size={12} />}{label}
            </span>
            <span className="font-mono font-bold" style={{ color }}>{value}%</span>
        </div>
        <div className="w-full bg-surface-card-hover rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}>
                {value > 0 && value < 100 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
            </div>
        </div>
    </div>
);

/** Phase checklist item */
const PhaseItem = ({ label, done, active }) => (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300"
        style={{ background: active && !done ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all duration-500
            ${done ? 'bg-status-safe text-black' : active ? 'bg-primary-indigo/30 border border-primary-indigo animate-pulse' : 'border border-glass-border bg-surface-card-hover'}`}>
            {done ? '✓' : active ? '●' : '○'}
        </div>
        <span className={`text-xs transition-colors duration-300 ${done ? 'text-status-safe' : active ? 'text-primary' : 'text-secondary'}`}>{label}</span>
        {done && <span className="ml-auto text-[10px] text-status-safe font-mono font-bold">DONE</span>}
        {active && !done && <span className="ml-auto text-[10px] text-primary-indigo font-mono animate-pulse">ACTIVE</span>}
    </div>
);

const LiveScanPage = () => {
    const { domain } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [scanId, setScanId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('pending');
    const [tlsProgress, setTlsProgress] = useState(0);
    const [aiProgress, setAiProgress] = useState(0);
    const [assetsFound, setAssetsFound] = useState(0);
    const [shadowAssets, setShadowAssets] = useState(0);
    const [startedAt, setStartedAt] = useState(null);
    const [error, setError] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [scanSummary, setScanSummary] = useState(null);
    const [liveTelemetry, setLiveTelemetry] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const bottomRef = useRef(null);
    const terminalRef = useRef(null);
    const pollRef = useRef(null);
    const timerRef = useRef(null);
    const initStartedRef = useRef(false);
    const userScrolledRef = useRef(false);

    /* ── Smart auto-scroll: pause when user scrolls up ── */
    const handleTerminalScroll = useCallback(() => {
        const el = terminalRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        userScrolledRef.current = !atBottom;
    }, []);

    useEffect(() => {
        if (userScrolledRef.current) return;
        const el = terminalRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [logs]);

    /* ── Elapsed timer ── */
    useEffect(() => {
        if (status !== 'running' && status !== 'pending') return;
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, [status]);

    const fmtElapsed = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    /* ── Init scan ── */
    useEffect(() => {
        if (!domain) { navigate('/'); return; }
        if (initStartedRef.current) return;
        initStartedRef.current = true;
        const existingId = location.state?.scanId || getScanIdForDomain(domain);
        if (existingId) {
            setScanId(existingId);
            setLogs([`Resuming scan status for ${domain}...`]);
            return;
        }
        scanApi.initiate(domain)
            .then(result => {
                setScanId(result.scan_id);
                setActiveScan(result.scan_id, domain);
                setLogs([`Initializing TRINETRA scanner for ${domain}...`]);
            })
            .catch(err => setError(err.message));
    }, [domain, navigate, location.state?.scanId]);

    /* ── Poll ── */
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
                setStartedAt(data.started_at);
                setLiveTelemetry(data);
                if (data.error_message) setError(data.error_message);
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollRef.current);
                    clearInterval(timerRef.current);
                    if (data.status === 'completed') {
                        try {
                            const assets = await assetsApi.list({ scan_id: scanId });
                            setScanResult(assets);
                        } catch (e) { console.warn('Could not fetch scan result:', e); }
                        setScanSummary(data);
                    }
                }
            } catch (err) { console.error('Poll error:', err); }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(pollRef.current);
    }, [scanId, status]);

    const isPending = status === 'pending' || status === 'running';
    const overallProgress = Math.round((tlsProgress + aiProgress) / 2);

    const handleCancel = async () => {
        if (!scanId || cancelling) return;
        setCancelling(true);
        try {
            await scanApi.cancel(scanId);
            setStatus('failed');
            setError('Scan cancelled by user.');
            clearInterval(pollRef.current);
        } catch (e) { console.error('Cancel failed:', e); }
        finally { setCancelling(false); }
    };

    const stages = [
        { step: 1, name: 'INPUT',       active: true,                  done: true },
        { step: 2, name: 'ENUMERATION', active: tlsProgress > 0,       done: tlsProgress === 100 },
        { step: 3, name: 'CRYPTO SCAN', active: tlsProgress > 50,      done: tlsProgress === 100 },
        { step: 4, name: 'ANALYSIS',    active: aiProgress > 0,        done: aiProgress === 100 },
        { step: 5, name: 'OUTPUT',      active: status === 'completed', done: status === 'completed' },
    ];

    const phases = [
        { label: '🌐  CT Log Mining & DNS',    done: (assetsFound) > 0,       active: isPending && assetsFound === 0 },
        { label: '🔌  Port Scanning',          done: tlsProgress > 0,         active: isPending && assetsFound > 0 && tlsProgress === 0 },
        { label: '🔒  TLS / Certificate Scan', done: tlsProgress >= 100,      active: isPending && tlsProgress > 0 && tlsProgress < 100 },
        { label: '⚡  API & SSH Inspection',   done: aiProgress > 0,          active: isPending && tlsProgress >= 100 && aiProgress === 0 },
        { label: '🧠  AI Risk Classification', done: aiProgress >= 100,       active: isPending && aiProgress > 0 && aiProgress < 100 },
    ];

    return (
        <div className="flex flex-col gap-5 pb-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap glass-card border px-5 py-4"
                style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-indigo/20 border border-primary-indigo/40 flex items-center justify-center flex-shrink-0">
                        <Terminal className="text-primary-indigo" size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)', filter: 'contrast(1.2)' }}>Active Reconnaissance</h1>
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>Target: <span style={{ color: '#818cf8' }}>{domain}</span> | Mode: Deep Inspection</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {isPending && scanId && (
                        <button onClick={handleCancel} disabled={cancelling}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <StopCircle size={14} />
                            {cancelling ? 'Cancelling…' : 'Cancel Scan'}
                        </button>
                    )}
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border flex items-center gap-1.5 ${
                        status === 'completed' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : status === 'failed'  ? 'text-red-400 border-red-500/30 bg-red-500/10'
                        : 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
                    }`}>
                        {status !== 'completed' && status !== 'failed' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                        )}
                        {status === 'completed' ? 'SCAN COMPLETE' : status === 'failed' ? 'FAILED' : 'SCAN IN PROGRESS'}
                    </div>
                </div>
            </div>

            {/* ── Metadata strip ── */}
            <div className="glass-card border" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 divide-x divide-y sm:divide-y-0" style={{ borderColor: 'var(--glass-border)' }}>
                    {[
                        { label: 'Target Domain',  value: domain,                                                    mono: true, accent: '#818cf8', icon: <Globe size={11} /> },
                        { label: 'Scan UUID',       value: scanId ? scanId.slice(0, 18) + '…' : 'Initializing…',    mono: true, accent: '#818cf8' },
                        { label: 'Started At',      value: startedAt ? new Date(startedAt).toLocaleString() : '—',  mono: true, accent: '#4ade80' },
                        { label: 'Elapsed',         value: fmtElapsed(elapsed),                                      mono: true, accent: '#fbbf24', hide: !isPending },
                        { label: 'Status',          value: status.toUpperCase(),                                     mono: false, accent: status === 'completed' ? '#4ade80' : status === 'failed' ? '#ef4444' : '#818cf8', bold: true },
                    ].filter(f => !f.hide).map(f => (
                        <div key={f.label} className="px-4 py-3 flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                            <span className={`text-sm ${f.mono ? 'font-mono' : ''} ${f.bold ? 'font-bold' : ''} flex items-center gap-1.5 truncate`} style={{ color: f.accent }}>
                                {f.icon}{f.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-4 text-status-critical text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* ── Main two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

                {/* Terminal */}
                <div className="glass-card flex flex-col overflow-hidden" style={{ minHeight: 480 }}>
                    <div className="p-3 border-b flex items-center justify-between flex-shrink-0" style={{ background: '#1a1d27', borderColor: '#2d3148' }}>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                            </div>
                            <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>root@trinetra-node:~#</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: '#94a3b8' }}>
                            {isPending && <span className="flex items-center gap-1" style={{ color: '#4ade80' }}><span className="w-1.5 h-1.5 rounded-full bg-status-safe animate-pulse inline-block" /> LIVE</span>}
                            <span>{logs.length} lines</span>
                            {userScrolledRef.current && (
                                <button onClick={() => { userScrolledRef.current = false; const el = terminalRef.current; if (el) el.scrollTop = el.scrollHeight; }}
                                    className="text-primary-indigo hover:underline">↓ scroll to bottom</button>
                            )}
                        </div>
                    </div>
                    <div ref={terminalRef} onScroll={handleTerminalScroll}
                        className="p-4 font-mono text-xs overflow-y-auto flex-1" style={{ lineHeight: '1.8', background: '#0f1117' }}>
                        {logs.map((log, i) => {
                            const isWarn = log.toLowerCase().includes('warning') || log.toLowerCase().includes('critical') || log.includes('⚠');
                            const isSuccess = log.toLowerCase().includes('complete') || log.toLowerCase().includes('found') || log.toLowerCase().includes('✓');
                            return (
                                <div key={i} className="mb-0.5 flex gap-2">
                                    <span className="flex-shrink-0 select-none" style={{ color: '#4ade80', opacity: 0.7 }}>$</span>
                                    <span style={{ color: isWarn ? '#f87171' : isSuccess ? '#4ade80' : '#cbd5e1' }}>{log}</span>
                                </div>
                            );
                        })}
                        {isPending && scanId && (
                            <div className="flex gap-2 animate-pulse mt-1" style={{ color: '#818cf8' }}>
                                <span style={{ color: '#4ade80', opacity: 0.7 }}>$</span>
                                <span>Scanning<span className="inline-block animate-bounce">.</span><span className="inline-block animate-bounce" style={{ animationDelay: '0.1s' }}>.</span><span className="inline-block animate-bounce" style={{ animationDelay: '0.2s' }}>.</span></span>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Right panel — telemetry */}
                <div className="flex flex-col gap-4">
                    <div className="glass-card p-4 border">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={14} className="text-primary-indigo" />
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Real-Time Telemetry</span>
                            {isPending && <span className="ml-auto text-[10px] text-status-safe font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-safe animate-pulse inline-block" /> STREAMING</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <StatCard label="Discovered" value={assetsFound} icon={Server} color="text-primary" accent="148,163,184" />
                            <StatCard label="Live Hosts" value={Math.max(0, assetsFound - shadowAssets)} icon={Wifi} color="text-status-safe" accent="34,197,94" />
                        </div>
                        <div className="mb-4">
                            <StatCard label="Shadow Assets Detected" value={shadowAssets} icon={Eye} color="text-status-high" pulse={shadowAssets > 0} accent="249,115,22" />
                        </div>
                        <div className="space-y-3">
                            <ProgressBar label="TLS Scanners" value={tlsProgress} icon={Lock} color="#6366f1" />
                            <ProgressBar label="AI Classifier" value={aiProgress} icon={Cpu} color="#22c55e" />
                            <ProgressBar label="Overall Progress" value={overallProgress} icon={Zap} color="#f59e0b" />
                        </div>
                    </div>

                    {/* Phase checklist */}
                    <div className="glass-card p-4 border">
                        <div className="flex items-center gap-2 mb-3">
                            <Network size={14} className="text-primary-indigo" />
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Scan Phases</span>
                        </div>
                        <div className="space-y-0.5">
                            {phases.map(p => <PhaseItem key={p.label} {...p} />)}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Pipeline stages ── */}
            <div className="glass-card p-5 border">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-8 right-8 h-0.5 bg-glass-border -z-10" />
                    {stages.map((stage) => (
                        <div key={stage.step} className="flex flex-col items-center gap-2 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500
                                ${stage.done ? 'bg-status-safe text-black shadow-lg shadow-status-safe/30'
                                    : stage.active ? 'bg-primary-indigo text-white animate-pulse-subtle shadow-lg shadow-primary-indigo/40'
                                        : 'bg-surface-card border border-glass-border text-secondary'}`}>
                                {stage.done ? '✓' : stage.step}
                            </div>
                            <span className={`text-[10px] font-bold tracking-widest ${stage.active || stage.done ? 'text-primary' : 'text-secondary'}`}>
                                {stage.name}
                            </span>
                        </div>
                    ))}
                </div>
                {/* Global progress bar under pipeline */}
                <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs text-secondary">
                        <span className="flex items-center gap-1.5"><Zap size={11} /> Global Progress</span>
                        <span className="font-mono font-bold text-primary">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-surface-card-hover rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full relative overflow-hidden transition-all duration-700"
                            style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #6366f1, #22c55e)' }}>
                            {overallProgress > 0 && overallProgress < 100 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Completed state ── */}
            {status === 'completed' && scanResult && (
                <div className="flex flex-col gap-3">
                    {scanSummary && (
                        <div className="glass-card border p-4 flex flex-wrap gap-6 items-center"
                            style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-status-safe" />
                                <span className="text-sm font-bold text-status-safe uppercase tracking-wider">Scan Complete</span>
                            </div>
                            <div className="text-xs text-secondary">Assets scanned: <span className="font-mono text-primary">{scanSummary.assets_found ?? assetsFound}</span></div>
                            <div className="text-xs text-secondary">Org score: <span className="font-mono text-primary">{scanSummary.exposure_score ?? '—'}</span></div>
                            <div className="ml-auto">
                                <button onClick={() => navigate('/dashboard')}
                                    className="flex items-center gap-2 px-5 py-2 bg-primary-indigo text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity">
                                    <LayoutDashboard size={14} /> Go to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                    <JsonViewer data={scanResult} title={`Scan Result — ${domain} (${Array.isArray(scanResult) ? scanResult.length : 1} assets)`} />
                </div>
            )}

            <style>{`
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                .animate-shimmer { animation: shimmer 1.8s infinite; }
                .bg-status-critical\\/10 { background-color: rgba(239,68,68,0.1); }
                .border-status-critical\\/30 { border-color: rgba(239,68,68,0.3); }
                .badge-safe { background: rgba(34,197,94,0.15); color: var(--status-safe); border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; }
            `}</style>
        </div>
    );
};

export default LiveScanPage;
