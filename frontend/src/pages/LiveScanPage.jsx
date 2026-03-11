import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Cpu, Activity, Server, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockLogs = [
    "Initializing TRINETRA Quantum Exposure Scanner v1.2.0-beta...",
    "Loading Advanced Heuristics Engine...",
    "Connecting to Certificate Transparency Logs (crt.sh)...",
    "Target acquired: pnb.in",
    "Commencing Layer 7 protocol mapping...",
    "Discovered endpoint: netbanking.pnb.in",
    "⚠ WARNING: netbanking.pnb.in operating on TLS 1.2",
    "Analyzing cipher suite: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "Key Exchange: ECDHE (Elliptic Curve Diffie-Hellman Ephemeral)",
    "⚠ CRITICAL VULNERABILITY: ECDHE is vulnerable to Shor's Algorithm.",
    "Certificate Signature: RSA-2048",
    "⚠ CRITICAL VULNERABILITY: RSA-2048 is not quantum safe.",
    "Discovered endpoint: api-legacy.pnb.in",
    "⚠ CRITICAL WARNING: TLS 1.0 detected. Deprecated protocol.",
    "Deep Packet Inspection routing active...",
    "Discovered shadow asset: test-payments.pnb.in (Not in inventory)",
    "Probing VPN gateway: vpn.pnb.in",
    "Generating Cryptographic Bill of Materials (CBOM)...",
    "Validating against NIST FIPS 203 & 204 draft standards...",
    "Scan complete. Aggregating telemetry..."
];

const LiveScanPage = () => {
    const [logs, setLogs] = useState([]);
    const [logIndex, setLogIndex] = useState(0);
    const [tlsProgress, setTlsProgress] = useState(0);
    const [aiProgress, setAiProgress] = useState(0);
    const [discovered, setDiscovered] = useState(0);
    const bottomRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (logIndex < mockLogs.length) {
            const timer = setTimeout(() => {
                setLogs(prev => [...prev, mockLogs[logIndex]]);
                setLogIndex(prev => prev + 1);
                setDiscovered(prev => prev + Math.floor(Math.random() * 3));
                setTlsProgress(prev => Math.min(100, prev + 5));
                setAiProgress(prev => Math.min(100, prev + 4));
            }, 300 + Math.random() * 500);
            return () => clearTimeout(timer);
        } else {
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    }, [logIndex, navigate]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-4">
                    <Terminal className="text-primary-indigo" size={24} />
                    <div>
                        <h1 className="text-xl font-bold">Active Reconnaissance</h1>
                        <p className="text-xs text-secondary font-mono">Target: pnb.in | Mode: Deep Inspection</p>
                    </div>
                </div>
                <div className="badge badge-high animate-pulse-subtle">
                    SCAN IN PROGRESS
                </div>
            </div>

            <div className="flex flex-col lg-flex-row gap-6 flex-1 min-h-[500px]">
                {/* Terminal Log */}
                <div className="flex-1 glass-card flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-surface-card-hover flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-status-critical"></div>
                            <div className="w-3 h-3 rounded-full bg-status-medium"></div>
                            <div className="w-3 h-3 rounded-full bg-status-safe"></div>
                        </div>
                        <span className="text-xs font-mono text-secondary ml-2">root@trinetra-node-01:~#</span>
                    </div>
                    <div className="p-4 font-mono text-sm overflow-y-auto flex-1 bg-navy-black/50" style={{ lineHeight: '1.6' }}>
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 ${log.includes('⚠') ? 'text-status-critical font-medium glow-critical-text' : 'text-status-pqc'}`} style={log.includes('⚠') ? { textShadow: '0 0 8px rgba(239, 68, 68, 0.4)' } : {}}>
                                <span className="text-secondary mr-2">[{new Date().toLocaleTimeString()}]</span>
                                <span className="animate-fade-in">{log}</span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Live Counters */}
                <div className="w-full lg-w-96 glass-card p-6 flex flex-col gap-6 overflow-y-auto">
                    <h2 className="font-bold border-b pb-2">Real-Time Telemetry</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-card-hover rounded border">
                            <div className="text-xs text-secondary uppercase tracking-widest mb-1">Discovered</div>
                            <div className="text-2xl font-bold font-mono">{discovered}</div>
                        </div>
                        <div className="p-4 bg-surface-card-hover rounded border">
                            <div className="text-xs text-secondary uppercase tracking-widest mb-1">Live Host</div>
                            <div className="text-2xl font-bold font-mono text-status-safe">{Math.max(0, discovered - 2)}</div>
                        </div>
                    </div>

                    <div className="p-4 border-l-high bg-status-high/5 rounded">
                        <div className="text-xs text-status-high uppercase tracking-widest mb-1 font-bold">Shadow Assets Detected</div>
                        <div className="text-3xl font-bold font-mono text-status-high animate-pulse-subtle">{Math.floor(discovered / 8)}</div>
                    </div>

                    <div className="space-y-4 mt-2">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-secondary flex items-center gap-1"><Shield size={12} /> TLS Scanners</span>
                                <span className="font-mono">{tlsProgress}%</span>
                            </div>
                            <div className="w-full bg-surface-card-hover rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary-indigo" style={{ width: `${tlsProgress}%`, transition: 'width 0.3s' }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-secondary flex items-center gap-1"><Cpu size={12} /> AI Classifier</span>
                                <span className="font-mono">{aiProgress}%</span>
                            </div>
                            <div className="w-full bg-surface-card-hover rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary-indigo" style={{ width: `${aiProgress}%`, transition: 'width 0.3s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pipeline Progress Bar */}
            <div className="glass-card p-6 border">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border-divider -z-10 -translate-y-1/2"></div>

                    {[
                        { step: 1, name: 'INPUT', active: true, done: true },
                        { step: 2, name: 'ENUMERATION', active: tlsProgress > 0, done: tlsProgress === 100 },
                        { step: 3, name: 'CRYPTO SCAN', active: tlsProgress > 50, done: tlsProgress === 100 },
                        { step: 4, name: 'ANALYSIS', active: aiProgress > 0, done: aiProgress === 100 },
                        { step: 5, name: 'OUTPUT', active: logIndex >= mockLogs.length - 1, done: false }
                    ].map((stage, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 bg-navy-black px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${stage.done ? 'bg-status-safe text-navy-black glow-safe' :
                                    stage.active ? 'bg-primary-indigo text-white glow-indigo animate-pulse-subtle' :
                                        'bg-surface-card border text-secondary'
                                }`}>
                                {stage.done ? '✓' : stage.step}
                            </div>
                            <span className={`text-[10px] font-bold tracking-widest ${stage.active ? 'text-primary' : 'text-secondary'}`}>{stage.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media (min-width: 1024px) {
          .lg-flex-row { flex-direction: row !important; }
          .lg-w-96 { width: 24rem !important; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default LiveScanPage;
