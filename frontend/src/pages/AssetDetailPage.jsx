import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert, FileCode2 } from 'lucide-react';
import ThreatBadge from '../components/ThreatBadge';
import ScoreGauge from '../components/ScoreGauge';
import HNDLCountdownCard from '../components/HNDLCountdownCard';

const AssetDetailPage = () => {
    const { id } = useParams();
    const [migrationExpanded, setMigrationExpanded] = useState(true);

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

            {/* Navigation & Header */}
            <div className="flex items-center gap-4 text-secondary">
                <Link to="/dashboard" className="flex items-center gap-2 hover:text-primary transition-colors">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <span>/</span>
                <span className="text-primary font-mono">netbanking.pnb.in</span>
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-2 gap-6">

                {/* Left Panel: Asset Profile */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card p-6 border flex flex-col items-center text-center">
                        <h1 className="text-3xl font-bold font-mono mb-3">netbanking.pnb.in</h1>
                        <div className="flex gap-2 mb-8">
                            <ThreatBadge level="WEB PORTAL" className="bg-surface-card-hover text-secondary border-highlight" />
                            <ThreatBadge level="SHADOW ASSET" />
                        </div>

                        <div className="relative mb-4">
                            <ScoreGauge score={88} size={200} strokeWidth={16} />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-critical-10 border border-status-critical/50 text-status-critical px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap glow-critical">
                                CRITICAL EXPOSURE
                            </div>
                        </div>
                    </div>

                    <HNDLCountdownCard deadline="Q2 2027" urgency="IMMEDIATE" />
                </div>

                {/* Right Panel: CBOM Card */}
                <div className="glass-card flex flex-col overflow-hidden border h-full">
                    <div className="p-4 border-b bg-surface-card-hover flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold font-mono text-sm">
                            <FileCode2 size={18} className="text-primary-indigo" />
                            CRYPTOGRAPHIC BILL OF MATERIALS
                        </div>
                        <button className="text-xs text-primary-indigo hover:text-primary transition-colors">Export JSON</button>
                    </div>

                    <div className="p-6 flex-1 bg-navy-black/50">
                        <div className="grid grid-cols-cbom gap-y-4 text-sm font-mono">
                            <div className="text-secondary">TLS Version:</div>
                            <div>1.2 <span className="text-status-critical ml-2">⚠</span></div>

                            <div className="text-secondary">Cipher Suite:</div>
                            <div className="text-primary break-all">TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384</div>

                            <div className="text-secondary">Key Exchange:</div>
                            <div className="flex items-center gap-2">
                                ECDHE <span className="text-[10px] bg-critical-20 text-status-critical px-2 py-0.5 rounded border border-status-critical/50">QUANTUM VULNERABLE</span>
                            </div>

                            <div className="text-secondary">Cert Algorithm:</div>
                            <div className="flex items-center gap-2">
                                RSA-2048 <span className="text-[10px] bg-critical-20 text-status-critical px-2 py-0.5 rounded border border-status-critical/50">QUANTUM VULNERABLE</span>
                            </div>

                            <div className="text-secondary">Key Length:</div>
                            <div>2048 bits</div>

                            <div className="text-secondary">Cert Expiry:</div>
                            <div>2026-08-14</div>

                            <div className="text-secondary">Issuer:</div>
                            <div>DigiCert Inc</div>

                            <div className="text-secondary">OCSP Stapling:</div>
                            <div className="text-status-safe">Enabled</div>

                            <div className="text-secondary">HSTS:</div>
                            <div><span className="text-status-safe">Enabled</span> (max-age: 31536000)</div>

                            <div className="text-secondary">JWT Algorithm:</div>
                            <div className="flex items-center gap-2">
                                RS256 <span className="text-[10px] bg-indigo-20 text-primary-indigo px-2 py-0.5 rounded border border-primary-indigo/50 flex items-center gap-1"><ShieldAlert size={10} /> AI DETECTED</span>
                            </div>

                            <div className="text-secondary mt-4 pt-4 border-t border-divider">Sources:</div>
                            <div className="mt-4 pt-4 border-t border-divider flex flex-wrap gap-2">
                                <span className="text-[10px] bg-surface-card-hover px-2 py-1 rounded">TLS Scanner</span>
                                <span className="text-[10px] bg-surface-card-hover px-2 py-1 rounded">Cert Analyzer</span>
                                <span className="text-[10px] bg-indigo-20 border border-primary-indigo/50 text-primary-indigo px-2 py-1 rounded">AI Classifier</span>
                            </div>

                            <div className="text-secondary mt-4 pt-4 border-t border-divider">Status:</div>
                            <div className="mt-4 pt-4 border-t border-divider">
                                <ThreatBadge level="CRITICAL" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PQC Migration Plan */}
            <div className="mt-4 glass-card border-l-safe" style={{ overflow: 'hidden', backgroundColor: 'rgba(34,197,94,0.05)', boxShadow: '0 0 15px rgba(34,197,94,0.05)' }}>
                <button
                    onClick={() => setMigrationExpanded(!migrationExpanded)}
                    className="w-full flex items-center justify-between p-4 transition-colors hover-bg-safe-20"
                    style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}
                >
                    <div className="font-bold font-mono tracking-wide text-status-safe">MIGRATION PLAN — netbanking.pnb.in</div>
                    {migrationExpanded ? <ChevronUp className="text-status-safe" /> : <ChevronDown className="text-status-safe" />}
                </button>

                {migrationExpanded && (
                    <div className="p-6 font-mono text-sm text-primary">
                        <div className="mb-6 text-secondary">
                            Current: <span className="text-status-critical">TLS 1.2 + TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-4 p-3 rounded bg-surface-card border">
                                    <div className="w-6 h-6 rounded border border-highlight flex shrink-0 items-center justify-center bg-navy-black"></div>
                                    <div>
                                        <div className="font-bold text-status-pqc">Step 1: Enable TLS 1.3</div>
                                        <div className="text-secondary mt-1 text-xs">Disable TLS 1.0/1.1/1.2 fallback modes.</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded bg-surface-card border border-highlight">
                                    <div className="w-6 h-6 rounded border border-highlight flex shrink-0 items-center justify-center bg-navy-black"></div>
                                    <div>
                                        <div className="font-bold text-status-pqc">Step 2: Deploy Kyber-768 + ECDHE</div>
                                        <div className="text-secondary mt-1 text-xs">Implement hybrid key exchange to comply with NIST FIPS 203.</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded bg-surface-card border">
                                    <div className="w-6 h-6 rounded border border-highlight flex shrink-0 items-center justify-center bg-navy-black"></div>
                                    <div>
                                        <div className="font-bold text-status-pqc">Step 3: Replace RSA-2048 with Dilithium-3</div>
                                        <div className="text-secondary mt-1 text-xs">Provision and install new PQC leaf certificate matching NIST FIPS 204.</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded bg-surface-card border border-highlight">
                                    <div className="w-6 h-6 rounded border border-border-highlight flex shrink-0 items-center justify-center bg-navy-black"></div>
                                    <div>
                                        <div className="font-bold text-status-pqc">Step 4: Update HSTS & Enforce Pinning</div>
                                        <div className="text-secondary mt-1 text-xs">Update Strict-Transport-Security header to maximum age.</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded bg-surface-card border border-highlight">
                                    <div className="w-6 h-6 rounded border border-highlight flex justify-center shrink-0 items-center bg-navy-black"></div>
                                    <div>
                                        <div className="font-bold text-status-safe">Step 5: Re-scan with TRINETRA</div>
                                        <div className="text-secondary mt-1 text-xs">Validate configuration and receive Fully Quantum Safe certificate.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-divider/50 flex justify-between text-xs text-secondary font-sans font-medium">
                            <span>Estimated effort: <span className="text-primary font-bold">2 sprints</span></span>
                            <span>Complexity: <span className="text-status-medium font-bold">Medium</span></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Certificate Preview Strip */}
            <div className="mt-4 grid grid-cols-1 md-grid-cols-2 gap-6 pb-6">
                <div className="bg-critical-5 border border-status-critical/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-secondary font-mono text-xs uppercase mb-4">Current Certificate Status</div>
                    <ThreatBadge level="QUANTUM VULNERABLE" className="glow-critical" />
                </div>

                <div className="bg-safe-5 border border-status-safe/30 rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <CheckCircle2 className="text-status-safe/20 opacity-20" size={64} />
                    </div>
                    <div className="text-secondary font-mono text-xs uppercase mb-4">Post-Migration Status Expected</div>
                    <ThreatBadge level="QUANTUM SAFE" className="glow-safe" />
                </div>
            </div>

            <style>{`
        .bg-critical-10 { background-color: rgba(239, 68, 68, 0.1); }
        .bg-critical-20 { background-color: rgba(239, 68, 68, 0.2); }
        .bg-critical-5 { background-color: rgba(239, 68, 68, 0.05); }
        .bg-indigo-20 { background-color: rgba(99, 102, 241, 0.2); }
        .bg-safe-5 { background-color: rgba(34, 197, 94, 0.05); }
        .grid-cols-cbom { grid-template-columns: 1fr 2fr; }
        .hover-bg-safe-20:hover { background-color: rgba(34, 197, 94, 0.2) !important; }
        .space-y-4 > * + * { margin-top: 1rem; }
        
        .break-all { word-break: break-all; }
        .shrink-0 { flex-shrink: 0; }
        .border-status-critical\\/50 { border-color: rgba(239, 68, 68, 0.5) !important; }
        .border-primary-indigo\\/50 { border-color: rgba(99, 102, 241, 0.5) !important; }
        
        @media (min-width: 768px) {
          .md-grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .lg-grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
        </div>
    );
};

export default AssetDetailPage;
