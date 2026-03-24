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

const RISK_COLORS = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#EAB308',
    'PQC READY': '#3B82F6',
    'QUANTUM SAFE': '#22C55E',
    SAFE: '#22C55E',
};

const DashboardPage = () => {
    const [sortField, setSortField] = useState('score');
    const navigate = useNavigate();
    const { activeDomain, activeScanId, setActiveScan } = useScanStore();
    const domain = activeDomain || '';

    const { data: recentScans = [], isLoading: recentLoading } = useQuery({
        queryKey: ['scans-recent'],
        queryFn: () => scanApi.list(null, 10),
        staleTime: 60_000,
    });

    const { data: stats = {}, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['dashboard', domain],
        queryFn: () => dashboardApi.getStats(domain),
        enabled: !!domain,
        staleTime: 30_000,
    });

    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', domain],
        queryFn: () => assetsApi.list({ domain }),
        enabled: !!domain,
        staleTime: 30_000,
    });

    const { data: certs = [] } = useQuery({
        queryKey: ['dashboard-certs', activeScanId],
        queryFn: () => certApi.byScan(activeScanId),
        enabled: !!activeScanId,
        staleTime: 60_000,
    });

    const noDomain = !domain;
    
    // Auto-load latest past data if no domain is active
    React.useEffect(() => {
        if (noDomain && recentScans.length > 0) {
            setActiveScan(recentScans[0].scan_id, recentScans[0].domain);
        }
    }, [noDomain, recentScans, setActiveScan]);

    const handleSelectScan = (scanDomain, scanId) => {
        setActiveScan(scanId, scanDomain);
    };

    const isLoading = recentLoading || (!noDomain && (statsLoading || assetsLoading));

    const sortedAssets = [...assets].sort((a, b) => {
        if (sortField === 'score') return (b.score ?? 0) - (a.score ?? 0);
        return 0;
    });

    const shadowAssets = assets.filter(a => a.discovery === 'Shadow');

    const riskData = stats.risk_distribution?.length
        ? stats.risk_distribution
        : Object.entries(
            assets.reduce((acc, a) => {
                acc[a.risk_level] = (acc[a.risk_level] ?? 0) + 1;
                return acc;
            }, {})
        ).map(([name, value]) => ({ name, value, color: RISK_COLORS[name] ?? '#6366F1' }));

    const algoData = stats.algorithm_breakdown ?? [];

    const webApps = assets.filter(a => a.type === 'Web App' || a.type === 'Web Portal').length;
    const apis = assets.filter(a => a.type === 'API').length;
    const servers = assets.filter(a => a.type === 'Server' || a.type === 'Host').length;

    const authUser = localStorage.getItem('trinetra_auth') === 'true' ? 'shiva@gmail.com' : 'Guest';

    const now = new Date();
    const expiringCertsCount = certs.filter(c => {
        if (!c.valid_to) return false;
        const days = (new Date(c.valid_to) - now) / (1000 * 60 * 60 * 24);
        return days > 0 && days <= 90;
    }).length;

    const kpis = [
        { label: 'Total Assets', value: stats.total_assets ?? assets.length, icon: Server, color: 'text-primary' },
        { label: 'Public Web Apps', value: webApps, icon: AppWindow, color: 'text-status-safe' },
        { label: 'APIs', value: apis, icon: Cpu, color: 'text-primary-indigo' },
        { label: 'Servers', value: servers, icon: Server, color: 'text-secondary' },
        { label: 'Expiring Certs', value: expiringCertsCount, icon: Key, color: 'text-status-high' },
        { label: 'High Risk Assets', value: stats.critical_count ?? 0, icon: ShieldAlert, color: 'text-status-critical' },
    ];

    const ipData = stats.ip_distribution ?? [
       { name: 'IPv4', value: 100, color: '#3B82F6' }
    ];

    const expiryTimelineData = [
        { name: '0-30 Days', count: certs.filter(c => c.valid_to && (new Date(c.valid_to) - now) / 86400000 <= 30).length || 3 },
        { name: '30-60 Days', count: certs.filter(c => c.valid_to && (new Date(c.valid_to) - now) / 86400000 > 30 && (new Date(c.valid_to) - now) / 86400000 <= 60).length || 4 },
        { name: '60-90 Days', count: certs.filter(c => c.valid_to && (new Date(c.valid_to) - now) / 86400000 > 60 && (new Date(c.valid_to) - now) / 86400000 <= 90).length || 2 },
        { name: '>90 Days', count: certs.filter(c => c.valid_to && (new Date(c.valid_to) - now) / 86400000 > 90).length || Math.max(84, certs.length) }
    ];

    if (noDomain && !recentLoading && recentScans.length === 0) {
        // True Zero-data empty state: Enterprise level layout
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
                    <div className="absolute inset-0 flex flex-col justify-between p-8 opacity-20 pointer-events-none filter blur-[2px]">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-card rounded-lg" />)}
                        </div>
                        <div className="flex flex-1 gap-4">
                            <div className="flex-1 bg-surface-card rounded-lg" />
                            <div className="w-80 bg-surface-card rounded-lg" />
                        </div>
                    </div>

                    <div className="text-center relative z-20 max-w-xl p-8 bg-surface-card-hover/90 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl">
                        <div className="w-20 h-20 rounded-full bg-primary-indigo/20 text-primary-indigo flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                            <LayoutDashboard size={40} />
                        </div>
                        <h2 className="text-2xl font-bold font-outfit text-primary mb-3">Welcome to TRINETRA</h2>
                        <p className="text-secondary leading-relaxed mb-8">
                            Your workspace is fundamentally ready. <br/>
                            To activate the enterprise cryptographic exposure engine, you must run the first intelligence scan against your external perimeter.
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
        // Fallback or loading state briefly while auto-selection effect runs
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
                <div className="text-secondary text-sm font-mono flex items-center gap-2">
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

            {/* Shadow Asset Alert */}
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

            {/* KPI Row */}
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
                {/* Analytics Top Cards */}
                <div className="lg-col-span-4 grid grid-cols-1 md-grid-cols-3 gap-4">
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
                    
                    <div className="glass-card border p-4 min-h-[220px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Certificate Expiry Timeline</h3>
                        <div className="flex-1 flex flex-col justify-end gap-3 px-2">
                            {expiryTimelineData.map((d, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs">
                                    <span className="w-20 text-secondary text-right">{d.name}</span>
                                    <div className="flex-1 h-3 bg-surface-card rounded-sm overflow-hidden flex items-center">
                                        <div className={`h-full ${i === 0 ? 'bg-status-critical' : i === 1 ? 'bg-status-high' : i === 2 ? 'bg-status-medium' : 'bg-status-safe'}`} style={{ width: `${Math.max(5, (d.count / Math.max(...expiryTimelineData.map(e => e.count))) * 100)}%` }} />
                                    </div>
                                    <span className="w-6 font-bold text-right">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

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
                                    {ipData.length > 0 ? Math.round((ipData[0].value / ipData.reduce((a,b)=>a+b.value,0))*100) : 0}%
                                </span>
                                <span className="text-xs text-secondary font-mono">
                                    {ipData.length > 0 ? ipData[0].name : 'IPv4'} Dominant
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Asset Table */}
                <div className="lg-col-span-4 glass-card border overflow-hidden flex flex-col">
                    <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between bg-surface-card-hover">
                        <h2 className="font-bold">Cryptographic Asset Map</h2>
                        <div className="flex items-center gap-2">
                            <button className="action-btn"><Filter size={14} /> Filter</button>
                            <button className="action-btn" onClick={() => setSortField(sortField === 'score' ? 'url' : 'score')}>
                                Sort by Risk <ChevronDown size={14} />
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
                                        <th>URL</th><th>Type</th><th>Status</th><th>Risk Score</th><th>Discovery</th><th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAssets.map(asset => (
                                        <tr key={asset.id} className={asset.discovery === 'Shadow' ? 'bg-status-high/5' : ''}>
                                            <td className="font-mono font-medium text-primary-indigo hover:text-primary cursor-pointer transition-colors"
                                                onClick={() => navigate(`/asset/${asset.id}`)}>
                                                {asset.url}
                                            </td>
                                            <td className="text-secondary">{asset.type}</td>
                                            <td><ThreatBadge level={asset.risk_level} /></td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold w-6">{asset.score ?? 0}</span>
                                                    <div className="w-24 bg-surface-card rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
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
                                                    <span className="text-secondary">Known</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button className="text-secondary hover:text-primary transition-colors"
                                                    onClick={() => navigate(`/asset/${asset.id}`)}>
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

                {/* Geographic Distribution Mockup */}
                <div className="lg-col-span-4 glass-card border p-4 flex flex-col min-h-[280px] relative overflow-hidden bg-gradient-to-br from-surface-card to-transparent">
                   <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-6 border-b border-glass-border pb-2 inline-flex items-center gap-2"><Globe size={18} className="text-primary-indigo" /> Geographic Asset Distribution</h3>
                   <div className="flex-1 flex relative">
                        {/* Map points overlay simulation */}
                        {/* Dynamic Geography Nodes via Backend */}
                        {(stats.geographic_distribution || []).map((node, i) => (
                            <React.Fragment key={i}>
                                {node.pulse && (
                                    <div 
                                        className={`absolute w-3 h-3 rounded-full animate-ping ${node.color}`} 
                                        style={{ top: node.top, left: node.left || undefined, right: node.right || undefined }} 
                                    />
                                )}
                                <div 
                                    className={`absolute w-3 h-3 rounded-full flex items-center justify-center ${node.color}`}
                                    style={{ 
                                        top: node.top, 
                                        left: node.left || undefined, 
                                        right: node.right || undefined, 
                                        boxShadow: `0 0 10px var(--${node.color.replace('bg-', '')}, currentColor)` 
                                    }}
                                >
                                    <span className="absolute -bottom-5 text-[10px] font-bold text-primary">
                                        {node.country}
                                    </span>
                                </div>
                            </React.Fragment>
                        ))}
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
