import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';

const mockLogs = [
    "CT Log Mining initiated → crt.sh query",
    "47 subdomains discovered",
    "DNS resolution: 38 live assets confirmed",
    "⚠ 9 SHADOW ASSETS flagged",
    "Port scanning: 443, 8443, 4433...",
    "TLS Scanner dispatched → 38 workers",
    "VPN endpoint detected: vpn.{domain} (Cisco AnyConnect)",
    "AI Classifier analyzing HTTP responses...",
    "CBOM generation in progress...",
    "Scan complete. Redirecting to dashboard..."
];

const STAGES = ['INPUT', 'ENUMERATION', 'CRYPTO SCAN', 'ANALYSIS', 'OUTPUT'];

const LiveScanPage = () => {
    const { domain } = useParams();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [activeStage, setActiveStage] = useState(0);
    const [stats, setStats] = useState({
        discovered: 0,
        live: 0,
        shadow: 0,
        vpn: 0,
        api: 0,
        tlsComplete: 0,
        aiComplete: 0
    });

    const bottomRef = useRef(null);

    const scanId = `TRN-2026-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;
    const startTime = new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST';

    useEffect(() => {
        let currentLogIndex = 0;

        // Auto-scroll terminal
        const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

        const interval = setInterval(() => {
            if (currentLogIndex < mockLogs.length) {
                const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
                let logText = mockLogs[currentLogIndex].replace('{domain}', domain || 'example.com');

                setLogs(prev => [...prev, `[${timeStr}] ${logText}`]);

                // Update stats based on log index to simulate progress
                setStats(prev => ({
                    discovered: currentLogIndex >= 1 ? 47 : prev.discovered,
                    live: currentLogIndex >= 2 ? 38 : prev.live,
                    shadow: currentLogIndex >= 3 ? 9 : prev.shadow,
                    vpn: currentLogIndex >= 6 ? 3 : prev.vpn,
                    api: currentLogIndex >= 7 ? 14 : prev.api,
                    tlsComplete: currentLogIndex >= 5 ? Math.min(31 + currentLogIndex, 38) : prev.tlsComplete,
                    aiComplete: currentLogIndex >= 7 ? Math.min(22 + currentLogIndex, 38) : prev.aiComplete
                }));

                // Update pipeline stage
                if (currentLogIndex === 1) setActiveStage(1);
                if (currentLogIndex === 4) setActiveStage(2);
                if (currentLogIndex === 7) setActiveStage(3);
                if (currentLogIndex === 8) setActiveStage(4);

                if (currentLogIndex === mockLogs.length - 1) {
                    setTimeout(() => navigate('/dashboard'), 1500);
                }

                currentLogIndex++;
                setTimeout(scrollToBottom, 50);
            } else {
                clearInterval(interval);
            }
        }, 1200);

        return () => clearInterval(interval);
    }, [domain, navigate]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-6">

            {/* Header */}
            <div className="flex justify-between items-center bg-[#111827] p-4 rounded-lg border border-[#1F2937]">
                <div className="flex items-center gap-4">
                    <Loader2 className="animate-spin text-[#6366F1]" size={24} />
                    <h1 className="text-xl font-bold">Scanning: <span className="text-[#6366F1]">{domain}</span></h1>
                </div>
                <div className="flex gap-6 text-sm text-[#9CA3AF] font-mono">
                    <span>Scan ID: <span className="text-[#F9FAFB]">{scanId}</span></span>
                    <span>Started: <span className="text-[#F9FAFB]">{startTime}</span></span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

                {/* Left Panel: Terminal Log */}
                <div className="flex-1 glass-card flex flex-col overflow-hidden border-[#1F2937]">
                    <div className="bg-[#1e293b] px-4 py-2 text-xs font-mono text-[#9CA3AF] border-b border-[#1F2937]">
                        TRINETRA SCAN AGENT v2.4.1 — LIVE LOG
                    </div>
                    <div className="p-4 font-mono text-sm leading-relaxed overflow-y-auto flex-1">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 ${log.includes('⚠') ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                                <span className="text-[#9CA3AF] mr-2">{log.substring(0, 10)}</span>
                                <span className={log.includes('⚠') ? 'text-[#EF4444] font-bold' : 'text-[#e2e8f0]'}>
                                    {log.substring(10)}
                                </span>
                            </div>
                        ))}
                        <div className="animate-pulse inline-block w-2 h-4 bg-[#6366F1] ml-1 align-middle mt-1"></div>
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Right Panel: Live Counters */}
                <div className="w-full lg:w-96 glass-card p-6 flex flex-col gap-6 overflow-y-auto">
                    <h2 className="text-lg font-bold border-b border-[#1F2937] pb-2">Real-time Discovery</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0A0D14] p-3 rounded border border-[#1F2937]">
                            <div className="text-xs text-[#9CA3AF] uppercase mb-1">Assets Discovered</div>
                            <div className="text-2xl font-bold text-[#F9FAFB] font-mono">{stats.discovered}</div>
                        </div>
                        <div className="bg-[#0A0D14] p-3 rounded border border-[#1F2937]">
                            <div className="text-xs text-[#9CA3AF] uppercase mb-1">Live Assets</div>
                            <div className="text-2xl font-bold text-[#F9FAFB] font-mono">{stats.live}</div>
                        </div>
                    </div>

                    <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 p-4 rounded glow-critical relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#EF4444]"></div>
                        <div className="text-xs font-bold text-[#EF4444] uppercase mb-1 flex items-center justify-between">
                            Shadow Assets
                            {stats.shadow > 0 && <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>}
                        </div>
                        <div className="text-3xl font-bold text-[#EF4444] font-mono">{stats.shadow}</div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 bg-[#0A0D14] p-3 rounded border border-[#1F2937]">
                            <div className="text-xs text-[#9CA3AF] uppercase mb-1">VPN Endpoints</div>
                            <div className="text-xl font-bold text-[#EAB308] font-mono">{stats.vpn}</div>
                        </div>
                        <div className="flex-1 bg-[#0A0D14] p-3 rounded border border-[#1F2937]">
                            <div className="text-xs text-[#9CA3AF] uppercase mb-1">APIs Detected</div>
                            <div className="text-xl font-bold text-[#3B82F6] font-mono">{stats.api}</div>
                        </div>
                    </div>

                    <div className="space-y-4 mt-2">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-[#9CA3AF] uppercase">TLS Scans Complete</span>
                                <span className="font-mono text-[#F9FAFB]">{stats.tlsComplete} / 38</span>
                            </div>
                            <div className="h-2 w-full bg-[#1F2937] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#6366F1] transition-all duration-300 relative"
                                    style={{ width: `${(stats.tlsComplete / 38) * 100}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 left-0 scan-progress"></div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-[#9CA3AF] uppercase">AI Classifications</span>
                                <span className="font-mono text-[#F9FAFB]">{stats.aiComplete} / 38</span>
                            </div>
                            <div className="h-2 w-full bg-[#1F2937] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#3B82F6] transition-all duration-300 relative"
                                    style={{ width: `${(stats.aiComplete / 38) * 100}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 left-0 scan-progress"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Pipeline Progress Bar */}
            <div className="glass-card p-6 border-[#1F2937]">
                <div className="flex items-center justify-between relative">
                    {/* Connecting line background */}
                    <div className="absolute left-0 right-0 h-0.5 bg-[#1F2937] top-1/2 -translate-y-1/2 z-0"></div>

                    {/* Animated fill line */}
                    <div
                        className="absolute left-0 h-0.5 bg-[#6366F1] top-1/2 -translate-y-1/2 z-0 transition-all duration-1000"
                        style={{ width: `${(activeStage / (STAGES.length - 1)) * 100}%` }}
                    ></div>

                    {STAGES.map((stage, idx) => {
                        const isActive = idx <= activeStage;
                        const isCurrent = idx === activeStage;
                        return (
                            <div key={stage} className="relative z-10 flex flex-col items-center gap-2 bg-[#111827] px-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500
                  ${isActive ? 'bg-[#6366F1] border-[#6366F1] text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-[#0A0D14] border-[#374151] text-[#374151]'}
                `}>
                                    {isActive ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                </div>
                                <span className={`text-xs font-bold tracking-wider transition-colors duration-500
                  ${isCurrent ? 'text-[#F9FAFB]' : isActive ? 'text-[#9CA3AF]' : 'text-[#374151]'}
                `}>
                                    {stage}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

        </div>
    );
};

export default LiveScanPage;
