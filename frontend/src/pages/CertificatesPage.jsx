import React from 'react';
import { AlertOctagon, CheckCircle2, ShieldHalf, Download, Files, ShieldCheck, ChevronRight, RefreshCw, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScanStore } from '../store';
import { useCertificates } from '../hooks';

const PQC_STATUS = {
    QUANTUM_VULNERABLE: { color: 'var(--status-critical)', label: 'Quantum Vulnerable', column: 'vulnerable' },
    HIGH: { color: 'var(--status-high)', label: 'Quantum Vulnerable', column: 'vulnerable' },
    CRITICAL: { color: 'var(--status-critical)', label: 'Quantum Vulnerable', column: 'vulnerable' },
    PQC_READY: { color: 'var(--status-high)', label: 'PQC Ready', column: 'ready' },
    HYBRID: { color: 'var(--status-high)', label: 'PQC Ready', column: 'ready' },
    QUANTUM_SAFE: { color: 'var(--status-safe)', label: 'Quantum Safe', column: 'safe' },
    SAFE: { color: 'var(--status-safe)', label: 'Quantum Safe', column: 'safe' },
};

const CertificateCard = ({ cert }) => (
    <div className="relative mt-4">
        <div className="cert-card-container">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, transparent, var(--status-safe), transparent)' }} />
            <div className="p-5">
                <div className="flex items-center justify-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(34,197,94,0.3)' }}>
                    <ShieldCheck size={24} className="text-status-safe" />
                    <div className="font-bold tracking-wider text-primary uppercase">TRINETRA QUANTUM CERTIFICATE</div>
                </div>
                <div className="text-center mb-6">
                    <div className="inline-block px-3 py-1 text-xs font-bold tracking-widest rounded-full"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid var(--status-safe)', color: 'var(--status-safe)' }}>
                        FULLY QUANTUM SAFE ✓
                    </div>
                </div>
                <div className="space-y-2 text-xs text-secondary">
                    {[
                        ['Asset', `https://${cert.asset_url || cert.asset_id || 'Unknown'}`],
                        ['Cert ID', cert.id],
                        ['Key Exchange', cert.key_exchange ?? '—'],
                        ['Cert Algorithm', cert.cert_algorithm ?? '—'],
                        ['Valid Until', cert.valid_until ?? '—'],
                        ['Risk Score', `${cert.score ?? 0} / 100`],
                        ['Issued by', 'TRINETRA v1.0'],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b pb-1">
                            <span>{k}:</span>
                            <span className="text-primary">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-2 font-sans">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--status-safe)' }}>
                        <Download size={14} /> PDF
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--status-safe)' }}>
                        <Files size={14} /> JSON
                    </button>
                    <button className="flex-1 py-2 text-primary text-xs font-bold rounded transition-colors"
                        style={{ backgroundColor: 'var(--status-safe)', boxShadow: '0 0 10px rgba(34,197,94,0.4)' }}>
                        Verify
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const AssetCol = ({ title, icon: Icon, status, assets, borderColor, gradientColor }) => (
    <div className="glass-card flex flex-col h-full text-center" style={{ borderColor }}>
        <div className="p-4 border-b pb-4 mb-2" style={{ background: `linear-gradient(to bottom, ${gradientColor}, transparent)` }}>
            <Icon size={48} className="" style={{ color: status.color }} />
            <h2 className="font-bold tracking-wider uppercase mb-1 mt-2" style={{ color: status.color }}>{status.label}</h2>
            <div className="text-primary font-mono font-bold text-2xl">
                {assets.length} <span className="text-sm font-sans text-secondary font-normal">assets</span>
            </div>
        </div>
        <div className="p-4 flex-1 text-left">
            {assets.length === 0 ? (
                <p className="text-secondary text-sm text-center italic py-4">No assets in this category yet.</p>
            ) : (
                <ul className="space-y-2">
                    {assets.map((cert) => (
                        <li key={cert.id}>
                            <Link to={`/asset/${cert.asset_id ?? cert.id}`}
                                className="flex justify-between items-center p-2 rounded hover:bg-surface-card-hover text-sm font-mono border-l-2 border-transparent transition-all">
                                {cert.asset_url || cert.asset_id || cert.id}
                                <ChevronRight size={14} className="text-secondary" />
                            </Link>
                            {status.column === 'safe' && <CertificateCard cert={cert} />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </div>
);

const CertificatesPage = () => {
    const { activeScanId: scanId, activeDomain: domain } = useScanStore();
    const { data: certData, isLoading } = useCertificates(scanId || null);
    
    // certData could be an array of certs directly
    const certs = Array.isArray(certData) ? certData : (certData?.certificates || []);

    const vulnerable = certs.filter(c => ['QUANTUM_VULNERABLE', 'HIGH', 'CRITICAL', 'VULNERABLE'].includes(c.pqc_status ?? c.risk_level ?? c.status));
    const ready = certs.filter(c => ['PQC_READY', 'HYBRID', 'MEDIUM', 'READY'].includes(c.pqc_status ?? c.risk_level ?? c.status));
    const safe_ = certs.filter(c => ['QUANTUM_SAFE', 'SAFE', 'LOW'].includes(c.pqc_status ?? c.risk_level ?? c.status));

    return (
        <div className="flex flex-col gap-6 min-h-[calc(100vh-6rem)]">

            <div className="flex items-center justify-between bg-surface-card p-4 rounded-lg border">
                <div>
                    <h1 className="text-xl font-bold">PQC Readiness Certificates</h1>
                    <p className="text-secondary text-sm mt-0.5">Domain: <span className="text-primary font-mono">{domain || 'No active scan'}</span></p>
                </div>
                {isLoading && <RefreshCw size={18} className="animate-spin text-secondary" />}
            </div>

            {!isLoading && certs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
                    <Shield size={36} className="opacity-30" />
                    <p className="text-sm">No certificates yet — run a scan from the home page to generate PQC readiness reports.</p>
                </div>
            )}

            {(isLoading || certs.length > 0) && (
                <div className="grid grid-cols-1 md-grid-cols-3 gap-6 flex-1 items-start">
                    <AssetCol
                        title="Quantum Vulnerable"
                        icon={AlertOctagon}
                        status={PQC_STATUS.QUANTUM_VULNERABLE}
                        assets={vulnerable}
                        borderColor="rgba(239,68,68,0.3)"
                        gradientColor="rgba(239,68,68,0.15)"
                    />
                    <AssetCol
                        title="PQC Ready"
                        icon={ShieldHalf}
                        status={PQC_STATUS.PQC_READY}
                        assets={ready}
                        borderColor="rgba(249,115,22,0.3)"
                        gradientColor="rgba(249,115,22,0.15)"
                    />
                    <AssetCol
                        title="Fully Quantum Safe"
                        icon={CheckCircle2}
                        status={PQC_STATUS.QUANTUM_SAFE}
                        assets={safe_}
                        borderColor="rgba(34,197,94,0.3)"
                        gradientColor="rgba(34,197,94,0.15)"
                    />
                </div>
            )}

            <style>{`
        .glass-card { border: 1px solid var(--glass-border); }
        .cert-card-container { background: var(--glass-bg); border: 1px solid rgba(34,197,94,0.2); border-radius: 0.75rem; overflow: hidden; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .transition-all { transition: all 0.15s; }
        @media (min-width: 768px) {
          .md-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
      `}</style>
        </div>
    );
};

export default CertificatesPage;
