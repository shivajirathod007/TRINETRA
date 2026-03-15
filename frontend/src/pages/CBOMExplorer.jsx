import React, { useState } from 'react';
import { Download, Copy, Table, FileJson, BarChart2, RefreshCw, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import ThreatBadge from '../components/ThreatBadge';
import { cbomApi, getActiveDomain, getActiveScanId } from '../api/index';

const CBOMExplorer = () => {
    const [view, setView] = useState('table');
    const domain = getActiveDomain();
    const scanId = getActiveScanId();

    const { data: cbom = {}, isLoading } = useQuery({
        queryKey: ['cbom', scanId || domain],
        queryFn: () => scanId ? cbomApi.getByScan(scanId) : cbomApi.get({ domain }),
        staleTime: 60_000,
    });

    const components = cbom.components ?? [];
    const algoData = cbom.algorithm_distribution ?? [];
    const tlsData = cbom.tls_distribution ?? [];
    const issuerBreakdown = cbom.issuer_breakdown ?? {};

    const rawJson = JSON.stringify({
        bomFormat: cbom.bomFormat ?? 'CycloneDX',
        specVersion: cbom.specVersion ?? '1.5',
        serialNumber: cbom.serialNumber ?? '',
        metadata: cbom.metadata ?? {},
        components,
    }, null, 2);

    const handleDownload = () => {
        const blob = new Blob([rawJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cbom-${domain || scanId || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => navigator.clipboard.writeText(rawJson);

    return (
        <div className="flex flex-col gap-6 h-full min-h-[calc(100vh-6rem)]">

            {/* Header Bar */}
            <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 bg-surface-card p-4 rounded-lg border">
                <div className="flex flex-col md-flex-row md-items-center gap-2 md-gap-4">
                    <h1 className="text-xl font-bold">Cryptographic Bill of Materials</h1>
                    <div className="hidden md-block text-border-highlight">|</div>
                    <span className="text-secondary font-mono text-sm">
                        Target: <span className="text-primary">{domain || 'No scan active'}</span>
                    </span>
                    <span className="text-secondary font-mono text-sm">
                        Standard: <span className="text-primary">CycloneDX {cbom.specVersion ?? '1.5'}</span>
                    </span>
                    {isLoading && <RefreshCw size={14} className="animate-spin text-secondary" />}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button className="action-btn" onClick={handleDownload}><FileJson size={14} /> Export JSON</button>
                    <button className="action-btn" onClick={handleCopy}><Copy size={14} /> Copy</button>
                </div>
            </div>

            {/* View Toggles */}
            <div className="flex gap-2 border-b">
                {[
                    { key: 'table', icon: <Table size={16} />, label: 'Table View' },
                    { key: 'json', icon: <FileJson size={16} />, label: 'JSON View' },
                    { key: 'summary', icon: <BarChart2 size={16} />, label: 'Summary View' },
                ].map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setView(key)} className={`tab-btn ${view === key ? 'active' : ''}`}>
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 glass-card border flex flex-col overflow-hidden w-full">

                {isLoading ? (
                    <div className="flex items-center justify-center flex-1 text-secondary gap-2">
                        <RefreshCw size={18} className="animate-spin" /> Loading CBOM...
                    </div>
                ) : !domain && !scanId ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-secondary gap-3">
                        <Database size={36} className="opacity-30" />
                        <p className="text-sm">No active scan. Run a scan from the home page first.</p>
                    </div>
                ) : (
                    <>
                        {view === 'table' && (
                            components.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-secondary gap-2">
                                    <Database size={32} className="opacity-30" />
                                    <p className="text-sm">No CBOM components yet — scan is still processing or no assets found.</p>
                                </div>
                            ) : (
                                <div className="table-container flex-1">
                                    <table className="data-table">
                                        <thead className="sticky top-0">
                                            <tr>
                                                <th>Asset URL</th><th>TLS</th><th>Cipher Suite</th>
                                                <th>Key Exchange</th><th>Cert Algo</th>
                                                <th>Expiry</th><th>Issuer</th><th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {components.map((c, i) => (
                                                <tr key={i}>
                                                    <td className="font-mono font-medium">{c.url ?? c.name ?? '—'}</td>
                                                    <td className="font-mono">{c.tls ?? '—'}</td>
                                                    <td className="font-mono text-xs max-w-xs overflow-hidden text-ellipsis">{c.cipher ?? '—'}</td>
                                                    <td className="font-mono">{c.kx ?? c.key_exchange ?? '—'}</td>
                                                    <td className="font-mono">{c.cert ?? c.cert_algorithm ?? '—'}</td>
                                                    <td className="font-mono text-secondary">{c.expiry ?? c.cert_expiry ?? '—'}</td>
                                                    <td className="text-secondary">{c.issuer ?? c.cert_issuer ?? '—'}</td>
                                                    <td><ThreatBadge level={c.status ?? c.risk_level ?? 'UNKNOWN'} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}

                        {view === 'json' && (
                            <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--bg-navy-black, #090c10)' }}>
                                <pre className="font-mono text-xs md:text-sm text-secondary leading-relaxed whitespace-pre-wrap break-all">
                                    <code>{rawJson}</code>
                                </pre>
                            </div>
                        )}

                        {view === 'summary' && (
                            <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg-grid-cols-2 gap-8 w-full">

                                {algoData.length > 0 ? (
                                    <div className="bg-surface-card border rounded-lg p-6">
                                        <h3 className="text-sm font-bold mb-6 text-secondary uppercase">Certificate Algorithm Distribution</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={algoData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'var(--surface-card-hover)' }} contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
                                                    <Bar dataKey="count" fill="var(--primary-indigo)" radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surface-card border rounded-lg p-6 flex items-center justify-center text-secondary text-sm">No algorithm data yet</div>
                                )}

                                {tlsData.length > 0 ? (
                                    <div className="bg-surface-card border rounded-lg p-6">
                                        <h3 className="text-sm font-bold mb-6 text-secondary uppercase">TLS Version Distribution</h3>
                                        <div className="h-64 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={tlsData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                                        {tlsData.map((e, i) => <Cell key={i} fill={e.color ?? '#6366F1'} />)}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                                                {tlsData.map(d => (
                                                    <div key={d.name} className="flex items-center gap-2 text-sm font-mono">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                                        <span className="text-primary">{d.name}</span>
                                                        <span className="text-secondary ml-2">({d.value})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surface-card border rounded-lg p-6 flex items-center justify-center text-secondary text-sm">No TLS data yet</div>
                                )}

                                {Object.keys(issuerBreakdown).length > 0 && (
                                    <div className="bg-surface-card border rounded-lg p-6 lg-col-span-2">
                                        <h3 className="text-sm font-bold mb-6 text-secondary uppercase">Issuer Breakdown</h3>
                                        <div className="flex flex-wrap gap-4">
                                            {Object.entries(issuerBreakdown).map(([issuer, count]) => (
                                                <div key={issuer} className="flex-1 min-w-[120px] border rounded p-4 text-center" style={{ background: 'var(--bg-navy-black, #090c10)' }}>
                                                    <div className="text-3xl font-bold font-mono text-primary mb-1">{count}</div>
                                                    <div className="text-xs text-secondary uppercase">{issuer}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
        .tab-btn { display:flex; align-items:center; gap:0.5rem; padding:0.75rem 1rem; font-weight:500; font-size:0.875rem; border-bottom:2px solid transparent; color:var(--text-secondary); transition:all 0.2s; }
        .tab-btn:hover { color:var(--text-primary); }
        .tab-btn.active { border-bottom-color:var(--primary-indigo); color:var(--primary-indigo); }
        @media(min-width:768px) { .md-flex-row{flex-direction:row!important;} .md-items-center{align-items:center!important;} .md-gap-4{gap:1rem!important;} .md-block{display:block!important;} .md-text-sm{font-size:0.875rem!important;} }
        @media(min-width:1024px) { .lg-grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))!important;} .lg-col-span-2{grid-column:span 2/span 2!important;} }
      `}</style>
        </div>
    );
};

export default CBOMExplorer;
