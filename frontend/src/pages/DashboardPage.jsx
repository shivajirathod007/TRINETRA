import React, { useState } from 'react';
import {
    ShieldAlert, Activity, Server, FileLock2, LayoutDashboard,
    ChevronDown, Filter, ChevronRight, AlertTriangle, RefreshCw, Search, ArrowRight, Globe, Key, AppWindow, Cpu
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import ThreatBadge from '../components/ThreatBadge';
import AnimatedCounters from '../components/AnimatedCounters';
import { dashboardApi, assetsApi, scanApi, certApi } from '../api/index';
import { useScanStore } from '../store';
import { SensitivityBadge } from '../components/shared/SensitivityBadge';

const RISK_COLORS = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#EAB308',
    'PQC READY': '#3B82F6',
    'QUANTUM SAFE': '#22C55E',
    SAFE: '#22C55E',
    LOW: '#3B82F6',
};

// Backend asset_type enum → human label mappings
const ASSET_TYPE_LABELS = {
    web_portal: 'Web Portal',
    web_application: 'Web App',
    api_public: 'API',
    api_authenticated: 'API (Auth)',
    mobile_backend: 'Mobile',
    vpn_gateway: 'VPN',
    ssh_endpoint: 'SSH',
    smtp_mta: 'SMTP',
    staging: 'Staging',
    shadow_asset: 'Shadow',
    server: 'Server',
};

// Asset type categories for KPI counting
const WEB_APP_TYPES = new Set(['web_portal', 'web_application', 'staging']);
const API_TYPES = new Set(['api_public', 'api_authenticated', 'mobile_backend']);
const SERVER_TYPES = new Set(['server', 'ssh_endpoint', 'smtp_mta', 'vpn_gateway']);

const DashboardPage = () => {
    const [sortField, setSortField] = useState('score');
    const navigate = useNavigate();
    const { activeDomain, activeScanId, setActiveScan } = useScanStore();
    const domain = activeDomain || '';

    // ── Recent scans for domain selector & auto-load ────────────────────────
    const { data: recentScans = [], isLoading: recentLoading } = useQuery({
        queryKey: ['scans-recent'],
        queryFn: () => scanApi.list(null, 10),
        staleTime: 120_000,          // 2 min — don't hammer the scans list
        refetchOnWindowFocus: false,
    });

    // ── Dashboard aggregate stats for active domain ─────────────────────────
    const { data: stats = {}, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['dashboard', domain],
        queryFn: () => dashboardApi.getStats(domain),
        enabled: !!domain,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    // ── All scanned assets for the active scan ──────────────────────────────
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', activeScanId],
        queryFn: () => assetsApi.list({ scan_id: activeScanId }),
        enabled: !!activeScanId,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    // ── PQC Certificates for the active scan ────────────────────────────────
    const { data: certs = [] } = useQuery({
        queryKey: ['dashboard-certs', activeScanId],
        queryFn: () => certApi.getByScan(activeScanId),
        enabled: !!activeScanId,
        staleTime: 120_000,
        refetchOnWindowFocus: false,
    });

    const noDomain = !domain;

    // Auto-load the most recent completed scan if no domain is selected
    // Use a ref to prevent this from running more than once
    const autoLoadedRef = React.useRef(false);
    React.useEffect(() => {
        if (autoLoadedRef.current) return;
        if (noDomain && recentScans.length > 0) {
            autoLoadedRef.current = true;
            const latest = recentScans.find(s => s.status === 'completed') || recentScans[0];
            if (latest) setActiveScan(latest.scan_id, latest.domain);
        }
    }, [noDomain, recentScans]); // eslint-disable-line react-hooks/exhaustive-deps

    const isLoading = recentLoading || (!noDomain && (statsLoading || assetsLoading));

    // ── Derived KPI counts from actual backend asset_type values ────────────
    const webApps   = assets.filter(a => WEB_APP_TYPES.has(a.type)).length;
    const apis      = assets.filter(a => API_TYPES.has(a.type)).length;
    const servers   = assets.filter(a => SERVER_TYPES.has(a.type)).length;
    const shadowAssets = assets.filter(a => a.discovery === 'Shadow');

    // ── Cert expiry timeline from real cert data (no fallbacks) ─────────────
    const now = new Date();
    const expiringCertsCount = certs.filter(c => {
        if (!c.valid_to) return false;
        const days = (new Date(c.valid_to) - now) / 86400000;
        return days > 0 && days <= 90;
    }).length;

    const expiryBuckets = [
        { name: '0–30 Days', max: 30,  color: 'bg-status-critical' },
        { name: '30–60 Days', min: 30, max: 60, color: 'bg-status-high' },
        { name: '60–90 Days', min: 60, max: 90, color: 'bg-status-medium' },
        { name: '>90 Days',  min: 90, color: 'bg-status-safe' },
    ];

    const expiryTimelineData = expiryBuckets.map(bucket => ({
        name: bucket.name,
        color: bucket.color,
        count: certs.filter(c => {
            if (!c.valid_to) return false;
            const days = (new Date(c.valid_to) - now) / 86400000;
            const absDays = Math.abs(days);
            if (bucket.min !== undefined && bucket.max !== undefined) return absDays > bucket.min && absDays <= bucket.max;
            if (bucket.max !== undefined) return absDays <= bucket.max;
            return absDays > bucket.min;
        }).length,
    }));

    // Total assets = from stats (accurate after backfill) or fallback to asset list length
    const totalAssets = (stats.total_assets !== undefined && stats.total_assets !== null)
        ? stats.total_assets
        : assets.length;

    const highRiskAssets = (stats.critical_count ?? 0) + (stats.high_count ?? 0);

    const kpis = [
        { label: 'Total Assets',    value: totalAssets,        icon: Server,     color: 'text-primary' },
        { label: 'Public Web Apps', value: webApps,            icon: AppWindow,  color: 'text-status-safe' },
        { label: 'APIs',            value: apis,               icon: Cpu,        color: 'text-primary-indigo' },
        { label: 'Servers',         value: servers,            icon: Server,     color: 'text-secondary' },
        { label: 'Expiring Certs',  value: expiringCertsCount, icon: Key,        color: 'text-status-high' },
        { label: 'High Risk Assets',value: highRiskAssets,     icon: ShieldAlert,color: 'text-status-critical' },
    ];

    // ── Risk distribution from backend stats (preferred) or from asset list ─
    const riskData = stats.risk_distribution?.length
        ? stats.risk_distribution
        : Object.entries(
            assets.reduce((acc, a) => {
                if (!a.risk_level) return acc;
                acc[a.risk_level] = (acc[a.risk_level] ?? 0) + 1;
                return acc;
            }, {})
        ).map(([name, value]) => ({ name, value, color: RISK_COLORS[name] ?? '#6366F1' }));

    const algoData = stats.algorithm_breakdown ?? [];

    const ipData = stats.ip_distribution ?? [{ name: 'IPv4', value: 100, color: '#3B82F6' }];

    // ── Asset table sort ────────────────────────────────────────────────────
    const sortedAssets = [...assets].sort((a, b) =>
        sortField === 'score' ? (b.score ?? 0) - (a.score ?? 0) : 0
    );

    const authUser = localStorage.getItem('trinetra_auth') === 'true' ? 'shiva@gmail.com' : 'Guest';

    // ── Empty state (no scans at all) ───────────────────────────────────────
    if (noDomain && !recentLoading && recentScans.length === 0) {
        return (
            <div className="flex flex-col h-full relative overflow-hidden animate-fadeIn">
                <div className="absolute inset-0 pointer-events-none grid-bg opacity-10" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-indigo/10 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h1 className="text-3xl font-bold font-outfit tracking-tight">Operations Center</h1>
                    <div className="flex items-center gap-2 text-status-critical font-mono font-bold uppercase tracking-wider text-xs bg-status-critical/10 border border-status-critical/20 px-3 py-1.5 rounded-md">
                        <AlertTriangle size={14} /> Offline Mode — No Telemetry Detected
                    </div>
                </div>

                <div className="glass-panel p-1 border-t-4 border-t-primary-indigo mt-8 flex-1 relative flex flex-col items-center justify-center min-h-[500px] z-10 shadow-2xl">
                    <div className="text-center relative z-20 max-w-xl p-8 bg-surface-card-hover/90 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl">
                        <div className="w-20 h-20 rounded-full bg-primary-indigo/20 text-primary-indigo flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                            <LayoutDashboard size={40} />
                        </div>
                        <h2 className="text-2xl font-bold font-outfit text-primary mb-3">Welcome to TRINETRA</h2>
                        <p className="text-secondary leading-relaxed mb-8">
                            Your workspace is ready. <br/>
                            Initiate the first intelligence scan against your external perimeter to activate the enterprise cryptographic exposure engine.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary-indigo text-white font-bold font-outfit text-lg hover:bg-primary-indigo-hover hover:scale-105 transition-all shadow-[0_0_20px_rgba(99,102,241,0.5)] w-full"
                        >
                            <Search size={22} /> INITIATE FIRST SCAN <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (noDomain) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-secondary">
                <RefreshCw size={24} className="animate-spin mr-3 text-primary-indigo" />
                <span className="font-mono text-sm tracking-widest uppercase">Initializing Interface...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold font-mono">Operations Center</h1>
                    <div className="text-sm font-outfit text-primary-indigo font-bold mt-1">Welcome User: {authUser}..!</div>
                </div>
                <div className="text-secondary text-sm font-mono flex items-center gap-2 flex-wrap">
                    {/* Scan selector — lets users switch between historical scans */}
                    {recentScans.length > 1 && (
                        <select
                            className="bg-surface-card border border-glass-border text-primary text-xs font-mono rounded px-2 py-1 focus:outline-none focus:border-primary-indigo cursor-pointer"
                            value={activeScanId || ''}
                            onChange={e => {
                                const scan = recentScans.find(s => s.scan_id === e.target.value);
                                if (scan) setActiveScan(scan.scan_id, scan.domain);
                            }}
                        >
                            {recentScans.map(s => (
                                <option key={s.scan_id} value={s.scan_id}>
                                    {s.domain} — {s.started_at ? new Date(s.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'pending'} ({s.status})
                                </option>
                            ))}
                        </select>
                    )}
                    <span>Target: <span className="text-primary font-bold">{domain}</span></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-status-safe animate-pulse" /> Live Sync
                    </span>
                    <button onClick={() => refetchStats()} className="ml-2 text-secondary hover:text-primary transition-colors" title="Refresh">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Shadow Asset Alert Banner */}
            {shadowAssets.length > 0 && (
                <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-4 flex items-start gap-4 animate-pulse-subtle">
                    <AlertTriangle size={24} className="text-status-critical flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <h3 className="text-status-critical font-bold uppercase tracking-wider text-sm mb-1">
                            Shadow Assets Detected ({shadowAssets.length})
                        </h3>
                        <p className="text-sm text-secondary">
                            CRQC vulnerability scanner found{' '}
                            {shadowAssets.slice(0, 3).map((a, i) => (
                                <span key={a.id}>
                                    <span className="text-primary font-mono">{a.url}</span>
                                    {i < Math.min(shadowAssets.length, 3) - 1 ? ' and ' : ''}
                                </span>
                            ))}
                            {shadowAssets.length > 3 && ` and ${shadowAssets.length - 3} more`} operating outside known inventory. Immediate investigation required.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md-grid-cols-3 lg-grid-cols-6 gap-3">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={i} className="glass-card p-4 border flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-5 text-current"><Icon size={80} /></div>
                            <div className="text-xs text-secondary uppercase mb-1 z-10">{kpi.label}</div>
                            <div className={`text-3xl font-bold font-mono z-10 ${kpi.color}`}>
                                {isLoading ? '—' : <AnimatedCounters value={kpi.value} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-4 gap-4 flex-1 min-h-[400px]">
                {/* Analytics Top Row */}
                <div className="lg-col-span-4 grid grid-cols-1 md-grid-cols-3 gap-4">
                    {/* Risk Distribution */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Risk Distribution</h3>
                        {riskData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-secondary text-sm">No data yet</div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center gap-4">
                                <div className="w-[120px] h-[120px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={riskData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                                                {riskData.map((entry, i) => <Cell key={i} fill={entry.color ?? '#6366F1'} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-divider)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    {riskData.map(d => (
                                        <div key={d.name} className="flex items-center gap-2 text-xs w-full justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color ?? '#6366F1' }} />
                                                <span className="text-secondary">{d.name}</span>
                                            </div>
                                            <span className="font-bold">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Certificate Expiry Timeline */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Certificate Expiry Timeline</h3>
                        {certs.length === 0 && !isLoading ? (
                            <div className="flex-1 flex items-center justify-center text-secondary text-sm">No certificates scanned</div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-end gap-3 px-2">
                                {expiryTimelineData.map((d, i) => {
                                    const maxCount = Math.max(...expiryTimelineData.map(e => e.count), 1);
                                    return (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                            <span className="w-20 text-secondary text-right">{d.name}</span>
                                            <div className="flex-1 h-3 bg-surface-card rounded-sm overflow-hidden">
                                                <div
                                                    className={`h-full ${d.color} transition-all duration-700`}
                                                    style={{ width: d.count > 0 ? `${Math.max(5, (d.count / maxCount) * 100)}%` : '0%' }}
                                                />
                                            </div>
                                            <span className="w-6 font-bold text-right">{d.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* IP Version Breakdown */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">IP Version Breakdown</h3>
                        <div className="flex-1 relative flex items-center justify-center">
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie data={ipData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" dataKey="value">
                                        {ipData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-primary">
                                    {ipData.length > 0 ? Math.round((ipData[0].value / ipData.reduce((a, b) => a + b.value, 0)) * 100) : 0}%
                                </span>
                                <span className="text-xs text-secondary font-mono">
                                    {ipData.length > 0 ? ipData[0].name : 'IPv4'} Dominant
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cryptographic Asset Map Table */}
                <div className="lg-col-span-4 glass-card border overflow-hidden flex flex-col">
                    <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between bg-surface-card-hover">
                        <h2 className="font-bold">Cryptographic Asset Map</h2>
                        <div className="flex items-center gap-2">
                            <button className="action-btn"><Filter size={14} /> Filter</button>
                            <button className="action-btn" onClick={() => setSortField(sortField === 'score' ? 'url' : 'score')}>
                                Sort by {sortField === 'score' ? 'Risk' : 'URL'} <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="table-container flex-1">
                        {assetsLoading ? (
                            <div className="flex items-center justify-center h-full text-secondary">
                                <RefreshCw size={18} className="animate-spin mr-2" /> Loading assets...
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary gap-2">
                                <Server size={32} className="opacity-30" />
                                <p className="text-sm">No assets yet. Run a scan from the home page.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead className="sticky top-0 bg-surface-card-hover">
                                    <tr>
                                        <th>URL</th><th>Type</th><th>Tier</th><th>Status</th><th>Risk Score</th><th>Discovery</th><th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAssets.map(asset => (
                                        <tr key={asset.id} className={asset.discovery === 'Shadow' ? 'bg-status-high/5' : ''}>
                                            <td
                                                className="font-mono font-medium text-primary-indigo hover:text-primary cursor-pointer transition-colors"
                                                onClick={() => navigate(`/asset/${asset.id}`)}
                                            >
                                                {asset.url}
                                            </td>
                                            <td className="text-secondary">
                                                {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
                                            </td>
                                            <td>
                                                <SensitivityBadge
                                                    tier={asset.data_sensitivity_tier || 'static'}
                                                    source={asset.data_sensitivity_tier_source}
                                                />
                                            </td>
                                            <td><ThreatBadge level={asset.risk_level} /></td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold w-8">{asset.score ?? 0}</span>
                                                    <div className="w-24 bg-surface-card rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{
                                                                width: `${asset.score ?? 0}%`,
                                                                backgroundColor: (asset.score ?? 0) >= 75 ? 'var(--status-critical)'
                                                                    : (asset.score ?? 0) >= 50 ? 'var(--status-high)'
                                                                    : (asset.score ?? 0) >= 25 ? 'var(--status-medium)' : 'var(--status-safe)'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {asset.discovery === 'Shadow' ? (
                                                    <span className="text-xs font-bold text-status-high uppercase tracking-wide flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Shadow
                                                    </span>
                                                ) : (
                                                    <span className="text-secondary text-xs">Known</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    className="text-secondary hover:text-primary transition-colors"
                                                    onClick={() => navigate(`/asset/${asset.id}`)}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Algorithm Breakdown (live from backend) */}
                {algoData.length > 0 && (
                    <div className="lg-col-span-4 glass-card border p-4 flex flex-col min-h-[200px]">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Algorithm Inventory</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height={140}>
                                <BarChart data={algoData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-divider)', fontSize: 12 }}
                                    />
                                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Geographic Distribution */}
                <div className="lg-col-span-4 glass-card border p-4 flex flex-col min-h-[220px] relative overflow-hidden bg-gradient-to-br from-surface-card to-transparent">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6 border-b border-glass-border pb-2 inline-flex items-center gap-2">
                        <Globe size={18} className="text-primary-indigo" /> Geographic Asset Distribution
                    </h3>
                    <div className="flex-1 flex relative">
                        {(stats.geographic_distribution || []).map((node, i) => (
                            <React.Fragment key={i}>
                                {node.pulse && (
                                    <div
                                        className={`absolute w-3 h-3 rounded-full animate-ping ${node.color}`}
                                        style={{ top: node.top, left: node.left || undefined, right: node.right || undefined }}
                                    />
                                )}
                                <div
                                    className={`absolute w-3 h-3 rounded-full ${node.color}`}
                                    style={{ top: node.top, left: node.left || undefined, right: node.right || undefined }}
                                >
                                    <span className="absolute -bottom-5 text-[10px] font-bold text-primary whitespace-nowrap">
                                        {node.country}
                                    </span>
                                </div>
                            </React.Fragment>
                        ))}
                        {(!stats.geographic_distribution || stats.geographic_distribution.length === 0) && (
                            <div className="flex-1 flex items-center justify-center text-secondary text-sm">
                                Geographic data available after scan completes
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .bg-status-critical\\/10 { background-color: rgba(239,68,68,0.1); }
        .border-status-critical\\/30 { border-color: rgba(239,68,68,0.3); }
        .bg-status-high\\/5 { background-color: rgba(249,115,22,0.05); }
        @media (min-width: 1024px) {
          .lg-grid-cols-6 { grid-template-columns: repeat(6, minmax(0,1fr)) !important; }
          .lg-grid-cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
          .lg-col-span-4 { grid-column: span 4 / span 4 !important; }
        }
        @media (min-width: 768px) {
          .md-grid-cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
        }
      `}</style>
        </div>
    );
};

export default DashboardPage;
