import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, Shield, AlertTriangle, CheckCircle2, RefreshCw,
    Server, Key, FileText, Lock, ExternalLink
} from 'lucide-react';
import { assetsApi } from '../api/index';
import ThreatBadge from '../components/ThreatBadge';

const Section = ({ title, children }) => (
    <div className="glass-card border p-6">
        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">{title}</h3>
        {children}
    </div>
);

const Row = ({ label, value, mono = false, accent }) => (
    <div className="flex justify-between items-center border-b py-2 last:border-0 last:pb-0">
        <span className="text-secondary text-sm">{label}</span>
        <span className={`text-sm ${mono ? 'font-mono' : ''} ${accent ? `text-${accent}` : 'text-primary'}`}>
            {value ?? '—'}
        </span>
    </div>
);

const AssetDetailPage = () => {
    const { id: assetId } = useParams();
    const navigate = useNavigate();

    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset', assetId],
        queryFn: () => assetsApi.getDetail(assetId),
        enabled: !!assetId,
        staleTime: 30_000,
    });

    const riskColor = {
        CRITICAL: 'status-critical',
        HIGH: 'status-high',
        MEDIUM: 'status-medium',
        'QUANTUM SAFE': 'status-safe',
        SAFE: 'status-safe',
        PQC_READY: 'status-pqc',
    }[asset?.risk_level ?? ''] ?? 'secondary';

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-secondary">
                <RefreshCw size={28} className="animate-spin" />
                <p>Loading asset details…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-status-critical">
                <AlertTriangle size={28} />
                <p>Failed to load asset: {error.message}</p>
                <button onClick={() => navigate(-1)} className="action-btn mt-2"><ArrowLeft size={14} /> Go Back</button>
            </div>
        );
    }

    if (!asset || !asset.url) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-secondary">
                <Server size={28} className="opacity-30" />
                <p>Asset not found or has no data yet.</p>
                <button onClick={() => navigate(-1)} className="action-btn mt-2"><ArrowLeft size={14} /> Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 bg-surface-card p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-secondary hover:text-primary transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-bold font-mono">{asset.url}</h1>
                            <a href={`https://${asset.url}`} target="_blank" rel="noreferrer"
                                className="text-secondary hover:text-primary transition-colors">
                                <ExternalLink size={14} />
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-secondary">
                            <span>{asset.type ?? 'Unknown'}</span>
                            <span>•</span>
                            <span className={`font-bold uppercase ${asset.discovery === 'Shadow' ? 'text-status-high' : 'text-secondary'}`}>
                                {asset.discovery === 'Shadow' ? '⚠ Shadow Asset' : 'Known Asset'}
                            </span>
                        </div>
                    </div>
                </div>
                <ThreatBadge level={asset.risk_level} />
            </div>

            {/* Risk Score Banner */}
            <div className="glass-card p-5 border flex items-center gap-6">
                <div className="flex flex-col items-center">
                    <div className={`text-5xl font-bold font-mono text-${riskColor}`}>
                        {asset.score ?? 0}
                    </div>
                    <div className="text-xs text-secondary mt-1 uppercase tracking-wider">Risk Score</div>
                    <div className="w-full bg-surface-card rounded-full h-2 mt-2 overflow-hidden" style={{ width: 80 }}>
                        <div className="h-full rounded-full"
                            style={{ width: `${asset.score ?? 0}%`, backgroundColor: `var(--${riskColor})` }} />
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-2 md-grid-cols-4 gap-4">
                    {[
                        { label: 'TLS Version', value: asset.tls_version, icon: Lock },
                        { label: 'Key Exchange', value: asset.key_exchange, icon: Key },
                        { label: 'Cert Algorithm', value: asset.cert_algorithm, icon: FileText },
                        { label: 'PQC Status', value: asset.pqc_status, icon: Shield },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-surface-card border rounded p-3 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-secondary">
                                <Icon size={12} /> {label}
                            </div>
                            <div className="text-sm font-mono text-primary">{value ?? '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-2 gap-6">

                {/* Cryptographic Details */}
                <Section title="Cryptographic Details">
                    <Row label="Cipher Suite" value={asset.cipher_suite} mono />
                    <Row label="Key Exchange" value={asset.key_exchange} mono />
                    <Row label="Cert Algorithm" value={asset.cert_algorithm} mono />
                    <Row label="Cert Expiry" value={asset.cert_expiry} mono />
                    <Row label="Cert Issuer" value={asset.cert_issuer} />
                    <Row label="Cert Subject" value={asset.cert_subject} />
                </Section>

                {/* Quantum Risk Assessment */}
                <Section title="Quantum Risk Assessment">
                    <Row label="PQC Status" value={asset.pqc_status} />
                    <Row label="HNDL Window"
                        value={asset.hndl_window_days != null ? `${asset.hndl_window_days} days` : null} />
                    <Row label="Risk Level" value={asset.risk_level} />
                    <Row label="Risk Score" value={asset.score != null ? `${asset.score} / 100` : null} mono />
                    <Row label="Discovery" value={asset.discovery} />
                    <Row label="Scan ID" value={asset.scan_id} mono />
                </Section>

                {/* Vulnerabilities */}
                {(asset.vulnerabilities?.length > 0) && (
                    <Section title={`Vulnerabilities (${asset.vulnerabilities.length})`}>
                        <ul className="space-y-2">
                            {asset.vulnerabilities.map((v, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <AlertTriangle size={14} className="text-status-critical mt-0.5 flex-shrink-0" />
                                    <span className="text-secondary">{v}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* Recommendations */}
                {(asset.recommendations?.length > 0) && (
                    <Section title={`Recommendations (${asset.recommendations.length})`}>
                        <ul className="space-y-2">
                            {asset.recommendations.map((r, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 size={14} className="text-status-safe mt-0.5 flex-shrink-0" />
                                    <span className="text-secondary">{r}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </div>

            <style>{`
        .bg-surface-card { background-color: var(--surface-card); }
        @media (min-width: 768px) {
          .md-grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .lg-grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
        </div>
    );
};

export default AssetDetailPage;
