import React, { useState } from 'react';
import {
    ShieldAlert, Activity, Server, FileLock2,
    ChevronDown, Filter, ChevronRight, AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ThreatBadge from '../components/ThreatBadge';
import AnimatedCounters from '../components/AnimatedCounters';

const riskData = [
    { name: 'Critical', value: 12, color: '#EF4444' },
    { name: 'High', value: 8, color: '#F97316' },
    { name: 'Medium', value: 14, color: '#EAB308' },
    { name: 'PQC Ready', value: 3, color: '#3B82F6' },
    { name: 'Safe', value: 1, color: '#22C55E' },
];

const algoData = [
    { name: 'RSA-2048', count: 18 },
    { name: 'ECDSA-256', count: 12 },
    { name: 'ML-KEM-768', count: 4 },
    { name: 'Dilithium-3', count: 4 },
];

const mockAssets = [
    { id: 1, url: 'netbanking.pnb.in', type: 'Web Portal', risk: 'CRITICAL', score: 88, discovery: 'Known' },
    { id: 2, url: 'api-legacy.pnb.in', type: 'API Endpoint', risk: 'CRITICAL', score: 92, discovery: 'Shadow' },
    { id: 3, url: 'vpn.pnb.in', type: 'VPN Gateway', risk: 'HIGH', score: 65, discovery: 'Known' },
    { id: 4, url: 'test-payments.pnb.in', type: 'Web Portal', risk: 'CRITICAL', score: 85, discovery: 'Shadow' },
    { id: 5, url: 'mobile-api-v1.pnb.in', type: 'API Endpoint', risk: 'MEDIUM', score: 45, discovery: 'Known' },
    { id: 6, url: 'quantum.pnb.in', type: 'Web Portal', risk: 'QUANTUM SAFE', score: 8, discovery: 'Known' },
];

const DashboardPage = () => {
    const [sortField, setSortField] = useState('score');

    const sortedAssets = [...mockAssets].sort((a, b) => b[sortField] - a[sortField]);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold font-mono">Operations Center</h1>
                <div className="text-secondary text-sm font-mono flex items-center gap-2">
                    <span>Target: <span className="text-primary font-bold">pnb.in</span></span>
                    <span>|</span>
                    <span className="flex items-center gap-1"><span className="badge-dot badge-dot-safe"></span> Live Sync</span>
                </div>
            </div>

            {/* Shadow Asset Alert */}
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-4 flex items-start gap-4 animate-pulse-subtle">
                <AlertTriangle size={24} className="text-status-critical flex-shrink-0 mt-1" />
                <div className="flex-1">
                    <h3 className="text-status-critical font-bold uppercase tracking-wider text-sm mb-1">Shadow Assets Detected (2)</h3>
                    <p className="text-sm text-secondary">
                        CRQC vulnerability scanner found <span className="text-primary font-mono">api-legacy.pnb.in</span> and <span className="text-primary font-mono">test-payments.pnb.in</span> operating outside known inventory. Immediate investigation required.
                    </p>
                </div>
                <button className="badge-critical px-4 py-1.5 rounded font-bold uppercase tracking-wider text-xs hover:scale-105 transition-transform" style={{ cursor: 'pointer' }}>Review</button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg-grid-cols-5 gap-4">
                {/* Risk Score Card */}
                <div className="glass-card p-4 border flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <Activity size={80} />
                    </div>
                    <div className="text-xs text-secondary uppercase mb-1">Organization Risk Score</div>
                    <div className="text-3xl font-bold text-status-high glow-high-text">
                        74 <span className="text-sm text-secondary">/ 100</span>
                    </div>
                </div>

                {/* Counter Cards */}
                {[
                    { label: 'Total Assets', value: 38, icon: Server, color: 'text-primary' },
                    { label: 'Critical Exposure', value: 12, icon: ShieldAlert, color: 'text-status-critical' },
                    { label: 'PQC Ready', value: 4, icon: FileLock2, color: 'text-status-pqc' },
                    { label: 'Fully Safe', value: 1, icon: FileLock2, color: 'text-status-safe' },
                ].map((kpi, i) => (
                    <div key={i} className="glass-card p-4 border flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-current">
                            <kpi.icon size={80} />
                        </div>
                        <div className="text-xs text-secondary uppercase mb-1 z-10">{kpi.label}</div>
                        <div className={`text-3xl font-bold font-mono z-10 ${kpi.color}`}>
                            <AnimatedCounters value={kpi.value} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg-flex-row gap-4 flex-1 min-h-[400px]">
                {/* Risk Map Table */}
                <div className="flex-1 glass-card border overflow-hidden flex flex-col">
                    <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between bg-surface-card-hover">
                        <h2 className="font-bold">Cryptographic Asset Map</h2>
                        <div className="flex items-center gap-2">
                            <button className="action-btn">
                                <Filter size={14} /> Filter
                            </button>
                            <button className="action-btn" onClick={() => setSortField(sortField === 'score' ? 'id' : 'score')}>
                                Sort by Risk <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="table-container flex-1">
                        <table className="data-table">
                            <thead className="sticky top-0 bg-surface-card-hover">
                                <tr>
                                    <th>URL</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Risk Score</th>
                                    <th>Discovery</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAssets.map(asset => (
                                    <tr key={asset.id} className={asset.discovery === 'Shadow' ? 'bg-status-high/5' : ''}>
                                        <td className="font-mono font-medium text-primary-indigo hover:text-primary cursor-pointer transition-colors">
                                            {asset.url}
                                        </td>
                                        <td className="text-secondary">{asset.type}</td>
                                        <td>
                                            <ThreatBadge level={asset.risk} />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold w-6">{asset.score}</span>
                                                <div className="w-24 bg-surface-card rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${asset.score}%`,
                                                            backgroundColor: asset.score >= 75 ? 'var(--status-critical)' : asset.score >= 50 ? 'var(--status-high)' : asset.score >= 25 ? 'var(--status-medium)' : 'var(--status-safe)'
                                                        }}
                                                    ></div>
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
                                            <button className="text-secondary hover:text-primary transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Analytics Sidebar */}
                <div className="w-full lg-w-80 flex flex-col gap-4">

                    <div className="glass-card border p-4 flex-1 min-h-[200px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Risk Distribution</h3>
                        <div className="flex-1 relative min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={riskData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-navy-black)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend Map */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {riskData.map(d => (
                                <div key={d.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                    <span className="text-secondary">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card border p-4 flex-1 min-h-[200px] flex flex-col">
                        <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Algorithmic Breakdown</h3>
                        <div className="flex-1 min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={algoData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'var(--surface-card-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-navy-black)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
                                    <Bar dataKey="count" fill="var(--primary-indigo)" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
        .glow-high-text { text-shadow: 0 0 15px rgba(249, 115, 22, 0.4); }
        .bg-status-critical\\/10 { background-color: rgba(239, 68, 68, 0.1); }
        .border-status-critical\\/30 { border-color: rgba(239, 68, 68, 0.3); }
        .bg-status-high\\/5 { background-color: rgba(249, 115, 22, 0.05); }
        @media (min-width: 1024px) {
          .lg-grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
          .lg-flex-row { flex-direction: row !important; }
          .lg-w-80 { width: 20rem !important; }
        }
      `}</style>
        </div>
    );
};

export default DashboardPage;
