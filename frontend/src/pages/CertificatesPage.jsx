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
        <div className="cert-card-bg"></div>

        <div className="cert-card-container">
            {/* Decorative top border */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, transparent, var(--status-safe), transparent)' }}></div>

            <div className="p-5">
                <div className="flex items-center justify-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(34,197,94,0.3)' }}>
                    <ShieldCheck size={24} className="text-status-safe" />
                    <div className="font-bold tracking-wider text-primary uppercase">TRINETRA QUANTUM CERTIFICATE</div>
                </div>

                <div className="text-center mb-6">
                    <div className="inline-block px-3 py-1 text-xs font-bold tracking-widest rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid var(--status-safe)', color: 'var(--status-safe)' }}>
                        FULLY QUANTUM SAFE ✓
                    </div>
                </div>

                <div className="space-y-2 text-xs text-secondary">
                    <div className="flex justify-between border-b pb-1">
                        <span>Asset:</span>
                        <span className="text-primary">https://{domain}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Cert ID:</span>
                        <span className="text-primary">TRN-{date.split('-')[0]}-0847-FQSAFE</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Key Exchange:</span>
                        <span className="text-status-pqc">ML-KEM-768</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>KEM Standard:</span>
                        <span className="text-status-safe">NIST FIPS 203</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Signature:</span>
                        <span className="text-status-pqc">ML-DSA-65</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Sig Standard:</span>
                        <span className="text-status-safe">NIST FIPS 204</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Valid Until:</span>
                        <span className="text-primary">{date}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span>Score:</span>
                        <span className="text-status-safe font-bold">8 / 100 ✓</span>
                    </div>
                    <div className="flex justify-between pb-1">
                        <span>Issued by:</span>
                        <span className="text-primary">TRINETRA v1.0</span>
                    </div>
                </div>

                <div className="mt-6 flex gap-2 font-sans">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--status-safe)' }}>
                        <Download size={14} /> PDF
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--status-safe)' }}>
                        <Files size={14} /> JSON
                    </button>
                    <button className="flex-1 py-2 text-primary text-xs font-bold rounded transition-colors" style={{ backgroundColor: 'var(--status-safe)', boxShadow: '0 0 10px rgba(34,197,94,0.4)' }}>
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

            <div className="bg-surface-card p-4 rounded-lg border">
                <h1 className="text-xl font-bold">PQC Readiness Certificates</h1>
            </div>

            <div className="grid grid-cols-1 md-grid-cols-3 gap-6 flex-1 items-start">

                {/* Column 1: Vulnerable */}
                <div className="glass-card flex flex-col h-full border-critical text-center">
                    <div className="p-4 border-b pb-4 mb-2 bg-gradient-critical">
                        <AlertOctagon size={48} className="text-status-critical mx-auto mb-2" />
                        <h2 className="font-bold text-status-critical tracking-wider uppercase mb-1">Quantum Vulnerable</h2>
                        <div className="text-primary font-mono font-bold text-2xl">29 <span className="text-sm font-sans text-secondary font-normal">assets</span></div>
                        <p className="text-status-critical text-xs mt-2 uppercase tracking-wide font-bold">Immediate action required</p>
                    </div>
                    <div className="p-4 flex-1 text-left">
                        <ul className="space-y-2">
                            {vulnerableAssets.map((asset, i) => (
                                <li key={i}>
                                    {asset.startsWith('+') ? (
                                        <div className="text-secondary text-sm text-center italic py-2">{asset}</div>
                                    ) : (
                                        <Link to={`/asset/${i}`} className="asset-link text-sm font-mono group hover-border-critical">
                                            {asset}
                                            <ChevronRight size={14} className="text-muted group-hover:text-status-critical transition-colors" />
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Column 2: Ready */}
                <div className="glass-card flex flex-col h-full border-high text-center">
                    <div className="p-4 border-b pb-4 mb-2 bg-gradient-high">
                        <ShieldHalf size={48} className="text-status-high mx-auto mb-2" />
                        <h2 className="font-bold text-status-high tracking-wider uppercase mb-1">PQC Ready</h2>
                        <div className="text-primary font-mono font-bold text-2xl">6 <span className="text-sm font-sans text-secondary font-normal">assets</span></div>
                        <p className="text-status-high text-xs mt-2 uppercase tracking-wide font-bold">Transitioning - Hybrid Protected</p>
                    </div>
                    <div className="p-4 flex-1 text-left">
                        <ul className="space-y-2">
                            {readyAssets.map((asset, i) => (
                                <li key={i}>
                                    <Link to={`/asset/${i}`} className="asset-link text-sm font-mono group hover-border-high">
                                        <div>
                                            <div>{asset}</div>
                                            <div className="text-[10px] text-status-high mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">TLS 1.3 / Kyber-768 Hybrid</div>
                                        </div>
                                        <ChevronRight size={14} className="text-muted group-hover:text-status-high transition-colors" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Column 3: Safe */}
                <div className="glass-card flex flex-col h-full border-safe text-center">
                    <div className="p-4 border-b pb-4 mb-2 bg-gradient-safe">
                        <CheckCircle2 size={48} className="text-status-safe mx-auto mb-2" />
                        <h2 className="font-bold text-status-safe tracking-wider uppercase mb-1">Fully Quantum Safe</h2>
                        <div className="text-primary font-mono font-bold text-2xl">3 <span className="text-sm font-sans text-secondary font-normal">assets</span></div>
                        <p className="text-status-safe text-xs mt-2 uppercase tracking-wide font-bold">NIST FIPS Compiled</p>
                    </div>
                    <div className="p-4 flex-1 text-left">
                        <ul className="space-y-6">
                            {safeAssets.map((asset, i) => (
                                <li key={i}>
                                    <Link to={`/asset/${i}`} className="flex justify-between items-center p-2 rounded hover:bg-surface-card-hover text-sm font-mono border-l-safe mb-2 transition-all">
                                        {asset}
                                        <ChevronRight size={14} className="text-muted hover:text-status-safe transition-colors" />
                                    </Link>
                                    <CertificateCard domain={asset} date={`2026-0${9 + i}-11`} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>
            <style>{`
        .bg-surface-card { background-color: var(--surface-card); }
        .text-muted { color: var(--text-muted); }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-6 > * + * { margin-top: 1.5rem; }
        .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .opacity-0 { opacity: 0; }
        .group:hover .group-hover\\:opacity-100 { opacity: 1; }
        .group:hover .group-hover\\:text-status-critical { color: var(--status-critical); }
        .group:hover .group-hover\\:text-status-high { color: var(--status-high); }
        .hover-border-critical:hover { border-color: var(--status-critical); }
        .hover-border-high:hover { border-color: var(--status-high); }
        
        .border-critical { border-color: rgba(239, 68, 68, 0.3); }
        .border-high { border-color: rgba(249, 115, 22, 0.3); }
        .border-safe { border-color: rgba(34, 197, 94, 0.3); }
        
        .bg-gradient-critical { background-image: linear-gradient(to bottom, rgba(239, 68, 68, 0.2), transparent); }
        .bg-gradient-high { background-image: linear-gradient(to bottom, rgba(249, 115, 22, 0.2), transparent); }
        .bg-gradient-safe { background-image: linear-gradient(to bottom, rgba(34, 197, 94, 0.2), transparent); }
        
        .asset-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border-radius: 0.25rem;
          border-left: 2px solid transparent;
          transition: all 0.15s;
        }
        .asset-link:hover {
          background-color: var(--surface-card-hover);
        }
        
        @media (min-width: 768px) {
          .md-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
      `}</style>
        </div>
    );
};

export default CertificatesPage;
