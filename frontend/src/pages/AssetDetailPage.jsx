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
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">

            {/* Navigation & Header */}
            <div className="flex items-center gap-4 text-[#9CA3AF]">
                <Link to="/dashboard" className="hover:text-[#F9FAFB] flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <span>/</span>
                <span className="text-[#F9FAFB] font-mono">netbanking.pnb.in</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Panel: Asset Profile */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card p-6 border-[#1F2937] flex flex-col items-center text-center">
                        <h1 className="text-3xl font-bold font-mono mb-3">netbanking.pnb.in</h1>
                        <div className="flex gap-2 mb-8">
                            <ThreatBadge level="WEB PORTAL" className="bg-[#1F2937] text-[#D1D5DB] border-[#374151]" />
                            <ThreatBadge level="SHADOW ASSET" />
                        </div>

                        <div className="relative mb-4">
                            <ScoreGauge score={88} size={200} strokeWidth={16} />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap glow-critical">
                                CRITICAL EXPOSURE
                            </div>
                        </div>
                    </div>

                    <HNDLCountdownCard deadline="Q2 2027" urgency="IMMEDIATE" />
                </div>

                {/* Right Panel: CBOM Card */}
                <div className="glass-card flex flex-col overflow-hidden border-[#1F2937] h-full">
                    <div className="p-4 border-b border-[#1F2937] bg-[#1e293b] flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold font-mono text-sm">
                            <FileCode2 size={18} className="text-[#6366F1]" />
                            CRYPTOGRAPHIC BILL OF MATERIALS
                        </div>
                        <button className="text-xs text-[#6366F1] hover:text-white transition-colors">Export JSON</button>
                    </div>

                    <div className="p-6 flex-1 bg-[#0A0D14]/50">
                        <div className="grid grid-cols-[1fr_2fr] gap-y-4 text-sm font-mono">
                            <div className="text-[#9CA3AF]">TLS Version:</div>
                            <div>1.2 <span className="text-[#EF4444] ml-2">⚠</span></div>

                            <div className="text-[#9CA3AF]">Cipher Suite:</div>
                            <div className="text-[#F9FAFB] break-all">TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384</div>

                            <div className="text-[#9CA3AF]">Key Exchange:</div>
                            <div className="flex items-center gap-2">
                                ECDHE <span className="text-[10px] bg-[#EF4444]/20 text-[#EF4444] px-2 py-0.5 rounded border border-[#EF4444]/50">QUANTUM VULNERABLE</span>
                            </div>

                            <div className="text-[#9CA3AF]">Cert Algorithm:</div>
                            <div className="flex items-center gap-2">
                                RSA-2048 <span className="text-[10px] bg-[#EF4444]/20 text-[#EF4444] px-2 py-0.5 rounded border border-[#EF4444]/50">QUANTUM VULNERABLE</span>
                            </div>

                            <div className="text-[#9CA3AF]">Key Length:</div>
                            <div>2048 bits</div>

                            <div className="text-[#9CA3AF]">Cert Expiry:</div>
                            <div>2026-08-14</div>

                            <div className="text-[#9CA3AF]">Issuer:</div>
                            <div>DigiCert Inc</div>

                            <div className="text-[#9CA3AF]">OCSP Stapling:</div>
                            <div className="text-[#22C55E]">Enabled</div>

                            <div className="text-[#9CA3AF]">HSTS:</div>
                            <div><span className="text-[#22C55E]">Enabled</span> (max-age: 31536000)</div>

                            <div className="text-[#9CA3AF]">JWT Algorithm:</div>
                            <div className="flex items-center gap-2">
                                RS256 <span className="text-[10px] bg-[#6366F1]/20 text-[#6366F1] px-2 py-0.5 rounded border border-[#6366F1]/50 flex items-center gap-1"><ShieldAlert size={10} /> AI DETECTED</span>
                            </div>

                            <div className="text-[#9CA3AF] mt-4 pt-4 border-t border-[#1F2937]">Sources:</div>
                            <div className="mt-4 pt-4 border-t border-[#1F2937] flex flex-wrap gap-2">
                                <span className="text-[10px] bg-[#1F2937] px-2 py-1 rounded">TLS Scanner</span>
                                <span className="text-[10px] bg-[#1F2937] px-2 py-1 rounded">Cert Analyzer</span>
                                <span className="text-[10px] bg-[#6366F1]/20 border border-[#6366F1]/50 text-[#6366F1] px-2 py-1 rounded">AI Classifier</span>
                            </div>

                            <div className="text-[#9CA3AF]">Status:</div>
                            <div>
                                <ThreatBadge level="CRITICAL" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PQC Migration Plan */}
            <div className="mt-4 glass-card border-l-4 border-[#22C55E] overflow-hidden bg-[#22C55E]/5 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
                <button
                    onClick={() => setMigrationExpanded(!migrationExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 transition-colors"
                >
                    <div className="font-bold font-mono tracking-wide text-[#22C55E]">MIGRATION PLAN — netbanking.pnb.in</div>
                    {migrationExpanded ? <ChevronUp className="text-[#22C55E]" /> : <ChevronDown className="text-[#22C55E]" />}
                </button>

                {migrationExpanded && (
                    <div className="p-6 font-mono text-sm text-[#F9FAFB]">
                        <div className="mb-6 text-[#9CA3AF]">
                            Current: <span className="text-[#EF4444]">TLS 1.2 + TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-3 rounded bg-[#111827] border border-[#1F2937]">
                                <div className="w-6 h-6 rounded border border-[#374151] flex shrink-0 items-center justify-center bg-[#0A0D14]"></div>
                                <div>
                                    <div className="font-bold text-[#3B82F6]">Step 1: Enable TLS 1.3</div>
                                    <div className="text-[#9CA3AF] mt-1 text-xs">Disable TLS 1.0/1.1/1.2 fallback modes.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 rounded bg-[#111827] border border-[#1F2937]">
                                <div className="w-6 h-6 rounded border border-[#374151] flex shrink-0 items-center justify-center bg-[#0A0D14]"></div>
                                <div>
                                    <div className="font-bold text-[#3B82F6]">Step 2: Deploy Kyber-768 + ECDHE</div>
                                    <div className="text-[#9CA3AF] mt-1 text-xs">Implement hybrid key exchange to comply with NIST FIPS 203.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 rounded bg-[#111827] border border-[#1F2937]">
                                <div className="w-6 h-6 rounded border border-[#374151] flex shrink-0 items-center justify-center bg-[#0A0D14]"></div>
                                <div>
                                    <div className="font-bold text-[#3B82F6]">Step 3: Replace RSA-2048 with Dilithium-3</div>
                                    <div className="text-[#9CA3AF] mt-1 text-xs">Provision and install new PQC leaf certificate matching NIST FIPS 204.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 rounded bg-[#111827] border border-[#1F2937]">
                                <div className="w-6 h-6 rounded border border-[#374151] flex shrink-0 items-center justify-center bg-[#0A0D14]"></div>
                                <div>
                                    <div className="font-bold text-[#3B82F6]">Step 4: Update HSTS & Enforce Pinning</div>
                                    <div className="text-[#9CA3AF] mt-1 text-xs">Update Strict-Transport-Security header to maximum age.</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 rounded bg-[#111827] border border-[#1F2937]">
                                <div className="w-6 h-6 rounded border border-[#374151] flex justify-center shrink-0 items-center bg-[#0A0D14]"></div>
                                <div>
                                    <div className="font-bold text-[#22C55E]">Step 5: Re-scan with TRINETRA</div>
                                    <div className="text-[#9CA3AF] mt-1 text-xs">Validate configuration and receive Fully Quantum Safe certificate.</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#1F2937]/50 flex justify-between text-xs text-[#9CA3AF] font-sans">
                            <span>Estimated effort: <span className="text-[#F9FAFB] font-bold">2 sprints</span></span>
                            <span>Complexity: <span className="text-[#EAB308] font-bold">Medium</span></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Certificate Preview Strip */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#EF4444]/5 border border-[#EF4444]/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-[#9CA3AF] font-mono text-xs uppercase mb-4">Current Certificate Status</div>
                    <ThreatBadge level="QUANTUM VULNERABLE" className="shadow-[0_0_15px_rgba(239,68,68,0.2)]" />
                </div>

                <div className="bg-[#22C55E]/5 border border-[#22C55E]/30 rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <CheckCircle2 className="text-[#22C55E]/20" size={64} />
                    </div>
                    <div className="text-[#9CA3AF] font-mono text-xs uppercase mb-4">Post-Migration Status Expected</div>
                    <ThreatBadge level="QUANTUM SAFE" className="shadow-[0_0_15px_rgba(34,197,94,0.2)]" />
                </div>
            </div>

        </div>
    );
};

export default AssetDetailPage;
