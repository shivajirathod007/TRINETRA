import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, Shield, AlertTriangle, CheckCircle2, RefreshCw,
    Server, Key, FileText, Lock, ExternalLink, Code2, ChevronDown, ChevronUp, Copy, Check, Globe
} from 'lucide-react';
import { assetsApi } from '../api/index';
import ThreatBadge from '../components/ThreatBadge';
import { SensitivityBadge } from '../components/shared/SensitivityBadge';
import { ScoreBreakdownTooltip } from '../components/shared/ScoreBreakdownTooltip';

// ─── Shared sub-components ────────────────────────────────────────────────────

const Section = ({ title, icon, children, accentColor }) => (
    <div className="glass-card border rounded-xl overflow-hidden"
        style={{ borderColor: accentColor ? `${accentColor}22` : 'var(--glass-border)' }}>
        <div className="px-5 py-3 border-b flex items-center gap-2.5"
            style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
            {icon && (
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: accentColor ? `${accentColor}18` : 'rgba(99,102,241,0.15)', color: accentColor ?? 'var(--primary-indigo)' }}>
                    {icon}
                </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{title}</span>
        </div>
        <div className="px-5 py-4">{children}</div>
    </div>
);

const Row = ({ label, value, mono = false, accent }) => (
    <div className="flex justify-between items-start py-2.5 border-b last:border-0 last:pb-0 gap-4"
        style={{ borderColor: 'var(--border-divider)' }}>
        <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)', minWidth: 110 }}>{label}</span>
        <span className={`text-xs text-right break-all ${mono ? 'font-mono' : ''}`}
            style={{ color: accent ? `var(--${accent})` : 'var(--text-primary)', maxWidth: '60%' }}>
            {value ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </span>
    </div>
);

const JsonViewer = ({ data, title = 'Raw Scan Result (JSON)' }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    if (!data) return null;
    const json = JSON.stringify(data, null, 2);
    const handleCopy = () => {
        navigator.clipboard.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="glass-card border rounded-xl overflow-hidden" style={{ borderColor: 'var(--glass-border)' }}>
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 transition-colors"
                style={{ background: 'var(--surface-card)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-card)')}>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    <Code2 size={13} style={{ color: 'var(--primary-indigo)' }} />
                    {title}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{Object.keys(data).length} fields</span>
                    {open ? <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
                </div>
            </button>
            {open && (
                <div className="border-t" style={{ borderColor: 'var(--border-divider)' }}>
                    <div className="flex justify-end px-4 py-2 border-b" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-divider)' }}>
                        <button type="button" onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                            {copied ? <Check size={12} style={{ color: 'var(--status-safe)' }} /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy JSON'}
                        </button>
                    </div>
                    <pre className="p-5 text-xs font-mono overflow-x-auto overflow-y-auto leading-relaxed"
                        style={{ maxHeight: 480, background: 'rgba(4,8,20,0.85)', color: '#a78bfa' }}>
                        {json}
                    </pre>
                </div>
            )}
        </div>
    );
};

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreHex(score) {
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#f97316';
    if (score >= 25) return '#eab308';
    return '#22c55e';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AssetDetailPage = () => {
    const { id: assetId } = useParams();
    const navigate = useNavigate();

    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset', assetId],
        queryFn: () => assetsApi.getDetail(assetId),
        enabled: !!assetId,
        staleTime: 30_000,
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--text-secondary)' }}>
                <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary-indigo)' }} />
                <p className="text-sm">Loading asset details…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--status-critical)' }}>
                <AlertTriangle size={28} />
                <p className="text-sm">Failed to load asset: {error.message}</p>
                <button onClick={() => navigate(-1)} className="action-btn mt-2 flex items-center gap-1.5"><ArrowLeft size={13} /> Go Back</button>
            </div>
        );
    }

    if (!asset || !asset.url) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: 'var(--text-secondary)' }}>
                <Server size={28} className="opacity-30" />
                <p className="text-sm">Asset not found or has no data yet.</p>
                <button onClick={() => navigate(-1)} className="action-btn mt-2 flex items-center gap-1.5"><ArrowLeft size={13} /> Go Back</button>
            </div>
        );
    }

    const score = asset.score ?? 0;
    const scoreColor = scoreHex(score);

    return (
        <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="glass-card border rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => navigate(-1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h1 className="text-base font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>{asset.url}</h1>
                            <a href={`https://${asset.url}`} target="_blank" rel="noreferrer"
                                className="transition-colors flex-shrink-0"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                                <ExternalLink size={13} />
                            </a>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-md font-mono"
                                style={{ background: 'var(--surface-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
                                {asset.type ?? 'Unknown'}
                            </span>
                            {asset.discovery === 'Shadow' ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
                                    style={{ color: '#fb923c', background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }}>
                                    <AlertTriangle size={10} /> Shadow Asset
                                </span>
                            ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full border"
                                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' }}>
                                    Known Asset
                                </span>
                            )}
                            <SensitivityBadge tier={asset.data_sensitivity_tier || 'static'} source={asset.data_sensitivity_tier_source} />
                        </div>
                    </div>
                </div>
                <ThreatBadge level={asset.risk_level} />
            </div>

            {/* ── Risk Score Banner ────────────────────────────────────── */}
            <div className="glass-card border rounded-xl p-5 flex items-center gap-6"
                style={{ borderColor: `${scoreColor}25`, background: `${scoreColor}05` }}>
                {/* Score circle */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <ScoreBreakdownTooltip score={score} breakdown={asset.score_breakdown}>
                        <div className="relative w-20 h-20 cursor-pointer">
                            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                                <circle cx="40" cy="40" r="32" fill="none"
                                    stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={`${(score / 100) * 201} 201`}
                                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor}88)`, transition: 'stroke-dasharray 1s ease' }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black font-mono leading-none" style={{ color: scoreColor }}>{score}</span>
                            </div>
                        </div>
                    </ScoreBreakdownTooltip>
                    <div className="text-[10px] uppercase tracking-widest mt-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Risk Score</div>
                </div>

                {/* Quick stats grid */}
                <div className="flex-1 grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    {[
                        { label: 'TLS Version',    value: asset.tls_version,    icon: <Lock size={13} />,     color: asset.tls_version?.includes('1_3') ? '#22c55e' : asset.tls_version?.includes('1_2') ? '#eab308' : '#ef4444' },
                        { label: 'Key Exchange',   value: asset.key_exchange,   icon: <Key size={13} />,      color: '#6366f1' },
                        { label: 'Cert Algorithm', value: asset.cert_algorithm, icon: <FileText size={13} />, color: '#8b5cf6' },
                        { label: 'PQC Status',     value: asset.pqc_status,     icon: <Shield size={13} />,   color: asset.pqc_status === 'QUANTUM_VULNERABLE' ? '#ef4444' : asset.pqc_status === 'PQC_READY' ? '#f59e0b' : '#22c55e' },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="rounded-xl p-3 flex flex-col gap-1.5"
                            style={{ background: `${color}0d`, border: `1px solid ${color}20` }}>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                                {icon} {label}
                            </div>
                            <div className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Data Sensitivity ─────────────────────────────────────── */}
            {(asset.data_sensitivity_tier || asset.data_shelf_life_years != null) && (
                <div className="glass-card border rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-5"
                    style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Data Sensitivity</span>
                        <SensitivityBadge tier={asset.data_sensitivity_tier || 'static'} source={asset.data_sensitivity_tier_source} />
                    </div>
                    {asset.data_shelf_life_years != null && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Shelf life: <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{asset.data_shelf_life_years} yr</span>
                        </div>
                    )}
                    {asset.sensitivity_tier_impact != null && asset.sensitivity_tier_impact > 0 && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            HNDL impact: <span className="font-mono font-bold text-amber-400">+{asset.sensitivity_tier_impact} pts</span>
                        </div>
                    )}
                    {asset.data_sensitivity_tier_source === 'manual_override' && (
                        <span className="text-xs font-semibold text-amber-400">✎ Manually overridden</span>
                    )}
                </div>
            )}

            {/* ── Detail Sections ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                <Section title="Cryptographic Details" icon={<Lock size={13} />} accentColor="#6366f1">
                    <Row label="Cipher Suite"   value={asset.cipher_suite}   mono />
                    <Row label="Key Exchange"   value={asset.key_exchange}   mono />
                    <Row label="Cert Algorithm" value={asset.cert_algorithm} mono />
                    <Row label="Cert Expiry"    value={asset.cert_expiry}    mono />
                    <Row label="Cert Issuer"    value={asset.cert_issuer} />
                    <Row label="Cert Subject"   value={asset.cert_subject} />
                </Section>

                <Section title="Quantum Risk Assessment" icon={<Shield size={13} />} accentColor="#ef4444">
                    <Row label="PQC Status"  value={asset.pqc_status} />
                    <Row label="HNDL Window" value={asset.hndl_window_days != null ? `${asset.hndl_window_days} days` : null} />
                    <Row label="Risk Level"  value={asset.risk_level} />
                    <Row label="Risk Score"  value={asset.score != null ? `${asset.score} / 100` : null} mono />
                    <Row label="Discovery"   value={asset.discovery} />
                    <Row label="Scan ID"     value={asset.scan_id} mono />
                </Section>

                {asset.vulnerabilities?.length > 0 && (
                    <Section title={`Vulnerabilities (${asset.vulnerabilities.length})`} icon={<AlertTriangle size={13} />} accentColor="#ef4444">
                        <ul className="space-y-3">
                            {asset.vulnerabilities.map((v, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {asset.recommendations?.length > 0 && (
                    <Section title={`Recommendations (${asset.recommendations.length})`} icon={<CheckCircle2 size={13} />} accentColor="#22c55e">
                        <ul className="space-y-3">
                            {asset.recommendations.map((r, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </div>

            {/* ── Raw JSON ─────────────────────────────────────────────── */}
            <JsonViewer data={asset} title="Raw Scan Result (JSON)" />
        </div>
    );
};

export default AssetDetailPage;
