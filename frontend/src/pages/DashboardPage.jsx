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

// Backend asset_type enum → human label mappings (must match AssetClassifier output)
const ASSET_TYPE_LABELS = {
    web_portal:     '🌐 Web Portal',
    api_endpoint:   '⚡ API Endpoint',
    vpn_gateway:    '🔒 VPN Gateway',
    ssh_endpoint:   '💻 SSH',
    smtp_mta:       '📧 Email (SMTP)',
    staging:        '🧪 Staging',
    shadow_asset:   '👻 Shadow',
    mobile_backend: '📱 Mobile',
    // legacy aliases (kept for backward compat)
    web_application:    '🌐 Web App',
    api_public:         '⚡ API',
    api_authenticated:  '⚡ API (Auth)',
    server:             '🖥 Server',
};

// Asset type categories for KPI counting — uses actual backend constants
const WEB_APP_TYPES = new Set(['web_portal', 'web_application', 'staging']);
const API_TYPES     = new Set(['api_endpoint', 'api_public', 'api_authenticated', 'mobile_backend']);
const SERVER_TYPES  = new Set(['server', 'ssh_endpoint', 'smtp_mta', 'vpn_gateway']);

const DashboardPage = () => {
    const [sortField, setSortField] = useState('score');
    const [viewMode, setViewMode] = useState('scan'); // 'scan' | 'all'
    const navigate = useNavigate();
    const { activeDomain, activeScanId, setActiveScan } = useScanStore();
    const domain = activeDomain || '';

    // ── Recent scans for domain selector & auto-load ────────────────────────
    const { data: recentScans = [], isLoading: recentLoading } = useQuery({
        queryKey: ['scans-recent'],
        queryFn: () => scanApi.list(null, 10),
        staleTime: 120_000,
        refetchOnWindowFocus: false,
    });

    // ── Aggregate stats across ALL scans ────────────────────────────────────
    const { data: aggregateStats = {}, isLoading: aggregateLoading } = useQuery({
        queryKey: ['dashboard-aggregate'],
        queryFn: () => dashboardApi.getAggregate(),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        enabled: viewMode === 'all',
    });

    // ── Dashboard aggregate stats for active domain ─────────────────────────
    const { data: stats = {}, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['dashboard', domain],
        queryFn: () => dashboardApi.getStats(domain),
        enabled: !!domain && viewMode === 'scan',
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    // ── All scanned assets for the active scan ──────────────────────────────
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', activeScanId],
        queryFn: () => assetsApi.list({ scan_id: activeScanId }),
        enabled: !!activeScanId && viewMode === 'scan',
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    // ── PQC Certificates for the active scan ────────────────────────────────
    const { data: certs = [] } = useQuery({
        queryKey: ['dashboard-certs', activeScanId],
        queryFn: () => certApi.getByScan(activeScanId),
        enabled: !!activeScanId && viewMode === 'scan',
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

    const isLoading = recentLoading || (viewMode === 'all' ? aggregateLoading : (!noDomain && (statsLoading || assetsLoading)));

    // In "all" mode, use aggregate stats; otherwise use per-scan stats
    const activeStats = viewMode === 'all' ? aggregateStats : stats;
    const activeAssets = viewMode === 'all' ? [] : assets;
    const activeCerts = viewMode === 'all' ? [] : certs;

    // ── Derived KPI counts from actual backend asset_type values ────────────
    const webApps   = activeAssets.filter(a => WEB_APP_TYPES.has(a.type)).length;
    const apis      = activeAssets.filter(a => API_TYPES.has(a.type)).length;
    const servers   = activeAssets.filter(a => SERVER_TYPES.has(a.type)).length;
    const shadowAssets = activeAssets.filter(a => a.discovery === 'Shadow');

    // ── Cert expiry timeline from actual scanned asset cert data ────────────
    // Uses cert_expiry_days from ScannedAsset (real TLS cert expiry, not PQC certs)
    const assetsWithCerts = activeAssets.filter(a => a.cert_expiry_days != null);
    const expiringCertsCount = assetsWithCerts.filter(a => {
        const d = a.cert_expiry_days ?? 0;
        return d > 0 && d <= 90;
    }).length;

    const expiryBuckets = [
        { name: '0–30 Days',  min: 0,  max: 30,  color: 'bg-status-critical', hex: '#EF4444' },
        { name: '30–60 Days', min: 30, max: 60,  color: 'bg-status-high',     hex: '#F97316' },
        { name: '60–90 Days', min: 60, max: 90,  color: 'bg-status-medium',   hex: '#EAB308' },
        { name: '>90 Days',   min: 90, max: null, color: 'bg-status-safe',    hex: '#22C55E' },
    ];

    const expiryTimelineData = expiryBuckets.map(bucket => ({
        name: bucket.name,
        color: bucket.color,
        hex: bucket.hex,
        count: assetsWithCerts.filter(a => {
            const d = a.cert_expiry_days ?? 0;
            if (bucket.max === null) return d > bucket.min;
            return d > bucket.min && d <= bucket.max;
        }).length,
    }));

    // Total assets
    const totalAssets = viewMode === 'all'
        ? (activeStats.total_assets ?? 0)
        : ((activeStats.total_assets !== undefined && activeStats.total_assets !== null)
            ? activeStats.total_assets
            : activeAssets.length);

    const highRiskAssets = (activeStats.critical_count ?? 0) + (activeStats.high_count ?? 0);

    const kpis = viewMode === 'all'
        ? [
            { label: 'Total Scans',     value: activeStats.total_scans ?? 0,    icon: Activity,   color: 'text-primary-indigo' },
            { label: 'Total Assets',    value: totalAssets,                      icon: Server,     color: 'text-primary', note: 'across all scans' },
            { label: 'Critical',        value: activeStats.critical_count ?? 0,  icon: ShieldAlert,color: 'text-status-critical' },
            { label: 'High Risk',       value: activeStats.high_count ?? 0,      icon: ShieldAlert,color: 'text-status-high' },
            { label: 'Shadow Assets',   value: activeStats.shadow_count ?? 0,    icon: Server,     color: 'text-status-medium' },
            { label: 'Avg Risk Score',  value: activeStats.exposure_score ?? 0,  icon: Activity,   color: 'text-status-safe' },
        ]
        : [
            { label: 'Total Assets',    value: totalAssets,        icon: Server,     color: 'text-primary' },
            { label: 'Public Web Apps', value: webApps,            icon: AppWindow,  color: 'text-status-safe' },
            { label: 'APIs',            value: apis,               icon: Cpu,        color: 'text-primary-indigo' },
            { label: 'Servers',         value: servers,            icon: Server,     color: 'text-secondary' },
            { label: 'Expiring Certs',  value: expiringCertsCount, icon: Key,        color: 'text-status-high' },
            { label: 'High Risk Assets',value: highRiskAssets,     icon: ShieldAlert,color: 'text-status-critical' },
        ];

    // ── Risk distribution ─────────────────────────────────────────────────
    const riskData = activeStats.risk_distribution?.length
        ? activeStats.risk_distribution
        : Object.entries(
            activeAssets.reduce((acc, a) => {
                if (!a.risk_level) return acc;
                acc[a.risk_level] = (acc[a.risk_level] ?? 0) + 1;
                return acc;
            }, {})
        ).map(([name, value]) => ({ name, value, color: RISK_COLORS[name] ?? '#6366F1' }));

    const algoData = activeStats.algorithm_breakdown ?? [];
    const ipData = activeStats.ip_distribution ?? [{ name: 'IPv4', value: 100, color: '#3B82F6' }];
    const scansBreakdown = activeStats.scans_breakdown ?? [];

    // ── Asset table sort ────────────────────────────────────────────────────
    const sortedAssets = [...activeAssets].sort((a, b) =>
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
                    <div className="text-center relative z-20 max-w-xl p-8 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl"
                        style={{ background: 'var(--surface-card-hover)' }}>
                        <div className="w-20 h-20 rounded-full text-primary-indigo flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                            style={{ background: 'rgba(99,102,241,0.15)' }}>
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
                    <h1 className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>Operations Center</h1>
                    <div className="text-sm font-outfit font-bold mt-1" style={{ color: 'var(--primary-indigo)' }}>Welcome User: {authUser}..!</div>
                </div>
                <div className="text-sm font-mono flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {/* View mode toggle */}
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={() => setViewMode('scan')}
                            className="px-3 py-1.5 text-xs font-bold transition-colors"
                            style={viewMode === 'scan'
                                ? { background: 'var(--primary-indigo)', color: 'white' }
                                : { color: 'var(--text-secondary)' }}
                        >
                            Single Scan
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className="px-3 py-1.5 text-xs font-bold transition-colors"
                            style={viewMode === 'all'
                                ? { background: 'var(--primary-indigo)', color: 'white', borderLeft: '1px solid var(--glass-border)' }
                                : { color: 'var(--text-secondary)', borderLeft: '1px solid var(--glass-border)' }}
                        >
                            All Scans
                        </button>
                    </div>

                    {/* Scan selector — only shown in single scan mode */}
                    {viewMode === 'scan' && recentScans.length > 1 && (
                        <select
                            className="text-xs font-mono rounded px-2 py-1 focus:outline-none cursor-pointer"
                            style={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
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

                    <span>
                        Target: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                            {viewMode === 'all' ? `${aggregateStats.total_scans ?? 0} scans` : domain}
                        </span>
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-safe)' }} /> Live Sync
                    </span>
                    <button
                        onClick={() => viewMode === 'all' ? null : refetchStats()}
                        className="ml-2 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Shadow Asset Alert Banner — only in single scan mode */}
            {viewMode === 'scan' && shadowAssets.length > 0 && (
                <div className="rounded-lg p-4 flex items-start gap-4 animate-pulse-subtle"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle size={24} className="flex-shrink-0 mt-1" style={{ color: 'var(--status-critical)' }} />
                    <div className="flex-1">
                        <h3 className="font-bold uppercase tracking-wider text-sm mb-1" style={{ color: 'var(--status-critical)' }}>
                            Shadow Assets Detected ({shadowAssets.length})
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            CRQC vulnerability scanner found{' '}
                            {shadowAssets.slice(0, 3).map((a, i) => (
                                <span key={a.id}>
                                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{a.url}</span>
                                    {i < Math.min(shadowAssets.length, 3) - 1 ? ' and ' : ''}
                                </span>
                            ))}
                            {shadowAssets.length > 3 && ` and ${shadowAssets.length - 3} more`} operating outside known inventory. Immediate investigation required.
                        </p>
                    </div>
                </div>
            )}

            {/* All Scans summary banner */}
            {viewMode === 'all' && (aggregateStats.total_scans ?? 0) > 0 && (
                <div className="glass-card border p-4 flex flex-wrap gap-6 items-center"
                    style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
                    <div className="flex items-center gap-2">
                        <Activity size={16} style={{ color: 'var(--primary-indigo)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aggregate Intelligence</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>— across all {aggregateStats.total_scans} completed scans</span>
                    </div>
                    <div className="flex gap-4 text-xs flex-wrap">
                        <span style={{ color: 'var(--text-secondary)' }}>Avg Risk Score: <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{aggregateStats.exposure_score ?? 0}</span></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Assets: <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{aggregateStats.total_assets ?? 0}</span></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Critical: <span className="font-mono font-bold" style={{ color: 'var(--status-critical)' }}>{aggregateStats.critical_count ?? 0}</span></span>
                        <span style={{ color: 'var(--text-secondary)' }}>Shadow: <span className="font-mono font-bold" style={{ color: 'var(--status-high)' }}>{aggregateStats.shadow_count ?? 0}</span></span>
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md-grid-cols-3 lg-grid-cols-6 gap-3">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    const colorMap = {
                        'text-status-critical': '#ef4444',
                        'text-status-high': '#f97316',
                        'text-status-safe': '#22c55e',
                        'text-status-medium': '#eab308',
                        'text-primary-indigo': '#6366f1',
                        'text-primary': 'var(--text-primary)',
                        'text-secondary': 'var(--text-secondary)',
                    };
                    const hexColor = colorMap[kpi.color] ?? '#6366f1';
                    const isCritical = kpi.color === 'text-status-critical' && kpi.value > 0;
                    const isWarning = kpi.color === 'text-status-high' && kpi.value > 0;
                    return (
                        <div key={i} className="glass-card border rounded-xl px-4 py-3.5 flex items-center gap-3 relative overflow-hidden transition-all duration-200"
                            style={isCritical
                                ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }
                                : isWarning
                                ? { borderColor: 'rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.04)' }
                                : { borderColor: `${hexColor}20`, background: `${hexColor}06` }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: `${hexColor}18`, color: hexColor }}>
                                <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] text-secondary uppercase tracking-widest font-semibold truncate">{kpi.label}</div>
                                <div className="text-2xl font-black font-mono leading-tight" style={{ color: hexColor }}>
                                    {isLoading ? <span className="text-secondary text-lg">—</span> : <AnimatedCounters value={kpi.value} />}
                                </div>
                            </div>
                            {isCritical && <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'rgba(239,68,68,0.5)' }} />}
                            {isWarning && <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'rgba(249,115,22,0.4)' }} />}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-4 gap-4 flex-1 min-h-[400px]">
                {/* Analytics Top Row */}
                <div className="lg-col-span-4 grid grid-cols-1 md-grid-cols-3 gap-4">
                    {/* Risk Distribution */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>Risk Distribution</h3>
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
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    {riskData.map(d => (
                                        <div key={d.name} className="flex items-center gap-2 text-xs w-full justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color ?? '#6366F1' }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                                            </div>
                                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Certificate Expiry Timeline */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Certificate Expiry Timeline</h3>
                        <p className="text-[10px] mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Based on TLS cert expiry from scanned assets</p>
                        {assetsWithCerts.length === 0 && !isLoading ? (
                            <div className="flex-1 flex items-center justify-center text-secondary text-sm">No cert data in this scan</div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-center gap-2.5 px-1">
                                {expiryTimelineData.map((d, i) => {
                                    const maxCount = Math.max(...expiryTimelineData.map(e => e.count), 1);
                                    return (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.hex }} />
                                            <span className="w-20 text-secondary text-right text-[10px]">{d.name}</span>
                                            <div className="flex-1 h-2.5 bg-surface-card rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: d.count > 0 ? `${Math.max(6, (d.count / maxCount) * 100)}%` : '0%',
                                                        backgroundColor: d.hex,
                                                    }}
                                                />
                                            </div>
                                            <span className="w-6 font-bold font-mono text-right" style={{ color: d.count > 0 ? d.hex : 'var(--text-secondary)' }}>{d.count}</span>
                                        </div>
                                    );
                                })}
                                <div className="mt-2 pt-2 border-t border-glass-border text-[10px] text-secondary flex justify-between">
                                    <span>{assetsWithCerts.length} certs tracked</span>
                                    <span className={expiringCertsCount > 0 ? 'text-status-high font-bold' : 'text-status-safe'}>
                                        {expiringCertsCount > 0 ? `⚠ ${expiringCertsCount} expiring soon` : '✓ All certs healthy'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* IP Version Breakdown */}
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>IP Version Breakdown</h3>
                        <div className="flex-1 relative flex items-center justify-center">
                            <PieChart width={160} height={160}>
                                <Pie data={ipData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" dataKey="value">
                                    {ipData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {ipData.length > 0 ? Math.round((ipData[0].value / ipData.reduce((a, b) => a + b.value, 0)) * 100) : 0}%
                                </span>
                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    {ipData.length > 0 ? ipData[0].name : 'IPv4'} Dominant
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cryptographic Asset Map Table — single scan mode */}
                {viewMode === 'scan' && (
                <div className="lg-col-span-4 glass-card border overflow-hidden flex flex-col" style={{ borderColor: 'var(--glass-border)' }}>
                    <div className="px-5 py-3 border-b flex flex-wrap gap-2 items-center justify-between" style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cryptographic Asset Map</span>
                        <div className="flex items-center gap-2">
                            <button className="action-btn text-xs"><Filter size={13} /> Filter</button>
                            <button className="action-btn text-xs" onClick={() => setSortField(sortField === 'score' ? 'url' : 'score')}>
                                Sort by {sortField === 'score' ? 'Risk' : 'URL'} <ChevronDown size={13} />
                            </button>
                        </div>
                    </div>

                    <div className="table-container flex-1">
                        {assetsLoading ? (
                            <div className="flex items-center justify-center h-full text-secondary">
                                <RefreshCw size={18} className="animate-spin mr-2" /> Loading assets...
                            </div>
                        ) : activeAssets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary gap-2">
                                <Server size={32} className="opacity-30" />
                                <p className="text-sm">No assets yet. Run a scan from the home page.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr style={{ background: 'var(--surface-card)' }}>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>URL</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Type</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Tier</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Status</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Risk Score</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Discovery</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAssets.map(asset => (
                                        <tr key={asset.id}
                                            style={{ borderColor: 'var(--border-divider)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                            <td
                                                className="font-mono font-medium cursor-pointer transition-colors"
                                                style={{ color: '#818cf8', maxWidth: 260 }}
                                                onClick={() => navigate(`/asset/${asset.id}`)}
                                                title={asset.url}
                                            >
                                                <span className="block truncate">{asset.url}</span>
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
                )}

                {/* All Scans breakdown table */}
                {viewMode === 'all' && (
                <div className="lg-col-span-4 glass-card border overflow-hidden flex flex-col" style={{ borderColor: 'var(--glass-border)' }}>
                    <div className="p-4 border-b flex items-center justify-between" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-divider)' }}>
                        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Scan History — Risk Breakdown</h2>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{scansBreakdown.length} most recent scans</span>
                    </div>
                    <div className="table-container flex-1">
                        {aggregateLoading ? (
                            <div className="flex items-center justify-center h-full text-secondary">
                                <RefreshCw size={18} className="animate-spin mr-2" /> Loading...
                            </div>
                        ) : scansBreakdown.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary gap-2">
                                <Server size={32} className="opacity-30" />
                                <p className="text-sm">No completed scans yet.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr style={{ background: 'var(--surface-card)', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Domain</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Date</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Assets</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Critical</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>High</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }}>Risk Score</th>
                                        <th style={{ borderColor: 'var(--border-divider)' }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {scansBreakdown.map(scan => (
                                        <tr key={scan.scan_id}
                                            className="cursor-pointer"
                                            style={{ borderColor: 'var(--border-divider)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                                            onClick={() => {
                                                const found = recentScans.find(s => s.scan_id === scan.scan_id);
                                                if (found) { setActiveScan(found.scan_id, found.domain); setViewMode('scan'); }
                                            }}>
                                            <td className="font-mono font-medium text-primary-indigo">{scan.domain}</td>
                                            <td className="text-secondary text-xs font-mono">
                                                {scan.completed_at ? new Date(scan.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                            </td>
                                            <td className="font-mono">{scan.assets}</td>
                                            <td>
                                                <span className={`font-mono font-bold ${scan.critical > 0 ? 'text-status-critical' : 'text-status-safe'}`}>
                                                    {scan.critical}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`font-mono font-bold text-xs ${(scan.high ?? 0) > 0 ? 'text-status-high' : 'text-secondary'}`}>
                                                    {scan.high ?? 0}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold w-8"
                                                        style={{ color: scan.score >= 75 ? 'var(--status-critical)' : scan.score >= 50 ? 'var(--status-high)' : 'var(--status-safe)' }}>
                                                        {scan.score}
                                                    </span>
                                                    <div className="w-20 bg-surface-card rounded-full h-1.5 overflow-hidden">
                                                        <div className="h-full rounded-full"
                                                            style={{
                                                                width: `${scan.score}%`,
                                                                backgroundColor: scan.score >= 75 ? 'var(--status-critical)' : scan.score >= 50 ? 'var(--status-high)' : 'var(--status-safe)'
                                                            }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                <ChevronRight size={16} className="text-secondary" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                )}

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
                <div className="lg-col-span-4 glass-card border p-4 flex flex-col min-h-[220px]">
                    <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Globe size={14} className="text-primary-indigo" /> Geographic Asset Distribution
                    </h3>
                    {(!stats.geographic_distribution || stats.geographic_distribution.length === 0) ? (
                        <div className="flex-1 flex items-center justify-center text-secondary text-sm">
                            Geographic data available after scan completes
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-3 justify-center">
                            {stats.geographic_distribution.map((node, i) => {
                                const total = stats.geographic_distribution.reduce((s, n) => s + n.count, 0);
                                const pct = total > 0 ? Math.round((node.count / total) * 100) : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3 text-xs">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
                                        <span className="w-28 text-secondary font-medium">{node.country}</span>
                                        <div className="flex-1 h-2.5 bg-surface-card rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${Math.max(4, pct)}%`, backgroundColor: node.color }}
                                            />
                                        </div>
                                        <span className="w-8 text-right font-mono font-bold text-primary">{node.count}</span>
                                        <span className="w-8 text-right font-mono text-secondary">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
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
