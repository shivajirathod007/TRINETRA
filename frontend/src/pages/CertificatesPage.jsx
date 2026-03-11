import React from 'react';
import { AlertOctagon, CheckCircle2, ShieldHalf, Download, Files, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const vulnerableAssets = [
    'netbanking.pnb.in', 'api-legacy.pnb.in', 'vpn.pnb.in',
    'test-payments.pnb.in', 'mobile-v1.pnb.in', 'uat-portal.pnb.in',
    '+ 23 more assets'
];

const readyAssets = [
    'secure-portal.pnb.in', 'auth.pnb.in', 'partner-api.pnb.in',
    'services.pnb.in', 'b2b.pnb.in', 'internal-vpn.pnb.in'
];

const safeAssets = [
    'quantum.pnb.in', 'nextgen-api.pnb.in', 'core-ledger.pnb.in'
];

const CertificateCard = ({ domain, date }) => (
    <div className="relative mt-4">
        {/* Glowing background */}
        <div className="absolute inset-0 bg-[#22C55E]/20 blur-[20px] rounded-lg"></div>

        <div className="relative bg-[#0A0D14] border border-[#22C55E]/50 rounded-lg overflow-hidden font-mono shadow-[0_0_15px_rgba(34,197,94,0.15)] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-overlay">
            {/* Decorative top border */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#22C55E] to-transparent"></div>

            <div className="p-5">
                <div className="flex items-center justify-center gap-3 border-b border-[#22C55E]/30 pb-4 mb-4">
                    <ShieldCheck size={24} className="text-[#22C55E]" />
                    <div className="font-bold tracking-wider text-[#F9FAFB] uppercase">TRINETRA QUANTUM CERTIFICATE</div>
                </div>

                <div className="text-center mb-6">
                    <div className="inline-block px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E] text-[#22C55E] text-xs font-bold tracking-widest rounded-full">
                        FULLY QUANTUM SAFE ✓
                    </div>
                </div>

                <div className="space-y-2 text-xs text-[#9CA3AF]">
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Asset:</span>
                        <span className="text-[#F9FAFB]">https://{domain}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Cert ID:</span>
                        <span className="text-[#F9FAFB]">TRN-{date.split('-')[0]}-0847-FQSAFE</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Key Exchange:</span>
                        <span className="text-[#3B82F6]">ML-KEM-768</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>KEM Standard:</span>
                        <span className="text-[#22C55E]">NIST FIPS 203</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Signature:</span>
                        <span className="text-[#3B82F6]">ML-DSA-65</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Sig Standard:</span>
                        <span className="text-[#22C55E]">NIST FIPS 204</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Valid Until:</span>
                        <span className="text-[#F9FAFB]">{date}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937] pb-1">
                        <span>Score:</span>
                        <span className="text-[#22C55E] font-bold">8 / 100 ✓</span>
                    </div>
                    <div className="flex justify-between pb-1">
                        <span>Issued by:</span>
                        <span className="text-[#F9FAFB]">TRINETRA v1.0</span>
                    </div>
                </div>

                <div className="mt-6 flex gap-2 font-sans">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-medium rounded hover:bg-[#22C55E]/20 transition-colors">
                        <Download size={14} /> PDF
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-medium rounded hover:bg-[#22C55E]/20 transition-colors">
                        <Files size={14} /> JSON
                    </button>
                    <button className="flex-1 py-2 bg-[#22C55E] text-[#F9FAFB] text-xs font-bold rounded hover:bg-[#16a34a] transition-colors shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                        Verify
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const CertificatesPage = () => {
    return (
        <div className="flex flex-col gap-6 min-h-[calc(100vh-6rem)]">

            <div className="bg-[#111827] p-4 rounded-lg border border-[#1F2937]">
                <h1 className="text-xl font-bold">PQC Readiness Certificates</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">

                {/* Column 1: Vulnerable */}
                <div className="glass-card flex flex-col border-[#EF4444]/30 h-full">
                    <div className="p-4 bg-gradient-to-b from-[#EF4444]/20 to-transparent border-b border-[#1F2937] text-center">
                        <AlertOctagon size={48} className="text-[#EF4444] mx-auto mb-2" />
                        <h2 className="font-bold text-[#EF4444] tracking-wider uppercase mb-1">Quantum Vulnerable</h2>
                        <div className="text-[#F9FAFB] font-mono font-bold text-2xl">29 <span className="text-sm font-sans text-[#9CA3AF] font-normal">assets</span></div>
                        <p className="text-[#EF4444] text-xs mt-2 uppercase tracking-wide font-bold">Immediate action required</p>
                    </div>
                    <div className="p-4 flex-1">
                        <ul className="space-y-2">
                            {vulnerableAssets.map((asset, i) => (
                                <li key={i}>
                                    {asset.startsWith('+') ? (
                                        <div className="text-[#9CA3AF] text-sm text-center italic py-2">{asset}</div>
                                    ) : (
                                        <Link to={`/asset/${i}`} className="flex justify-between items-center p-2 rounded hover:bg-[#1e293b] text-sm font-mono border-l-2 border-transparent hover:border-[#EF4444] transition-all group">
                                            {asset}
                                            <ChevronRight size={14} className="text-[#6B7280] group-hover:text-[#EF4444]" />
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Column 2: Ready */}
                <div className="glass-card flex flex-col border-[#F97316]/30 h-full">
                    <div className="p-4 bg-gradient-to-b from-[#F97316]/20 to-transparent border-b border-[#1F2937] text-center">
                        <ShieldHalf size={48} className="text-[#F97316] mx-auto mb-2" />
                        <h2 className="font-bold text-[#F97316] tracking-wider uppercase mb-1">PQC Ready</h2>
                        <div className="text-[#F9FAFB] font-mono font-bold text-2xl">6 <span className="text-sm font-sans text-[#9CA3AF] font-normal">assets</span></div>
                        <p className="text-[#F97316] text-xs mt-2 uppercase tracking-wide font-bold">Transitioning - Hybrid Protected</p>
                    </div>
                    <div className="p-4 flex-1">
                        <ul className="space-y-2">
                            {readyAssets.map((asset, i) => (
                                <li key={i}>
                                    <Link to={`/asset/${i}`} className="flex justify-between items-center p-2 rounded hover:bg-[#1e293b] text-sm font-mono border-l-2 border-transparent hover:border-[#F97316] transition-all group">
                                        <div>
                                            <div>{asset}</div>
                                            <div className="text-[10px] text-[#F97316] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">TLS 1.3 / Kyber-768 Hybrid</div>
                                        </div>
                                        <ChevronRight size={14} className="text-[#6B7280] group-hover:text-[#F97316]" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Column 3: Safe */}
                <div className="glass-card flex flex-col border-[#22C55E]/30 h-full">
                    <div className="p-4 bg-gradient-to-b from-[#22C55E]/20 to-transparent border-b border-[#1F2937] text-center">
                        <CheckCircle2 size={48} className="text-[#22C55E] mx-auto mb-2" />
                        <h2 className="font-bold text-[#22C55E] tracking-wider uppercase mb-1">Fully Quantum Safe</h2>
                        <div className="text-[#F9FAFB] font-mono font-bold text-2xl">3 <span className="text-sm font-sans text-[#9CA3AF] font-normal">assets</span></div>
                        <p className="text-[#22C55E] text-xs mt-2 uppercase tracking-wide font-bold">NIST FIPS Compiled</p>
                    </div>
                    <div className="p-4 flex-1">
                        <ul className="space-y-6">
                            {safeAssets.map((asset, i) => (
                                <li key={i}>
                                    <Link to={`/asset/${i}`} className="flex justify-between items-center p-2 rounded hover:bg-[#1e293b] text-sm font-mono border-l-2 border-[#22C55E] mb-2">
                                        {asset}
                                        <ChevronRight size={14} className="text-[#6B7280] hover:text-[#22C55E]" />
                                    </Link>
                                    <CertificateCard domain={asset} date={`2026-0${9 + i}-11`} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CertificatesPage;
