import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronRight, AlertTriangle, ShieldAlert, FileJson } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ThreatBadge from '../components/ThreatBadge';
import ScoreGauge from '../components/ScoreGauge';

const mockAssets = [
    { id: '1', url: 'netbanking.pnb.in', type: 'WEB PORTAL', tls: '1.2', algo: 'RSA-2048', score: 88, hndl: 'Q2 2027', status: 'CRITICAL', shadow: false },
    { id: '2', url: 'api-legacy.pnb.in', type: 'API', tls: '1.0', algo: 'RSA-1024', score: 95, hndl: 'IMMEDIATE', status: 'CRITICAL', shadow: true },
    { id: '3', url: 'vpn.pnb.in', type: 'VPN', tls: '1.2', algo: 'ECDSA-256', score: 72, hndl: 'Q4 2028', status: 'HIGH', shadow: false },
    { id: '4', url: 'test-payments.pnb.in', type: 'API', tls: '1.1', algo: 'RSA-2048', score: 90, hndl: 'Q1 2027', status: 'CRITICAL', shadow: true },
    { id: '5', url: 'public-site.pnb.in', type: 'WEB PORTAL', tls: '1.3', algo: 'ECDSA-256', score: 45, hndl: '2030+', status: 'MEDIUM', shadow: false },
    { id: '6', url: 'secure-portal.pnb.in', type: 'WEB PORTAL', tls: '1.3', algo: 'Hybrid (Kyber)', score: 30, hndl: 'None', status: 'PQC READY', shadow: false },
    { id: '7', url: 'quantum.pnb.in', type: 'WEB PORTAL', tls: '1.3', algo: 'ML-KEM-768', score: 8, hndl: 'None', status: 'QUANTUM SAFE', shadow: false },
];

const riskData = [
    { name: 'Critical', value: 8, color: '#EF4444' },
    { name: 'High', value: 12, color: '#F97316' },
    { name: 'Medium', value: 12, color: '#EAB308' },
    { name: 'PQC Ready', value: 3, color: '#3B82F6' },
    { name: 'Safe', value: 3, color: '#22C55E' },
];

const algoData = [
    { name: 'RSA-2048', count: 18 },
    { name: 'ECDSA-256', count: 12 },
    { name: 'TLS 1.0/1.1', count: 4 },
    { name: 'PQC/Hybrid', count: 4 },
];

const DashboardPage = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');

    const filteredAssets = filter === 'All'
        ? mockAssets
        : filter === 'Shadow Assets'
            ? mockAssets.filter(a => a.shadow)
            : mockAssets.filter(a => a.status === filter || a.type === filter);

    const getBorderColor = (status) => {
        switch (status) {
            case 'CRITICAL': return 'border-l-[#EF4444]';
            case 'HIGH': return 'border-l-[#F97316]';
            case 'MEDIUM': return 'border-l-[#EAB308]';
            case 'PQC READY': return 'border-l-[#3B82F6]';
            case 'QUANTUM SAFE': return 'border-l-[#22C55E]';
            default: return 'border-l-transparent';
        }
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827] p-4 rounded-lg border border-[#1F2937]">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                    <h1 className="text-xl font-bold font-mono">pnb.in</h1>
                    <div className="text-sm text-[#9CA3AF]">
                        Scan completed: <span className="text-[#F9FAFB]">14:34:22 IST</span>
                    </div>
                    <div className="text-sm text-[#9CA3AF]">
                        Assets: <span className="text-[#F9FAFB]">38</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><FileJson size={14} /> JSON</button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><Download size={14} /> PDF</button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><Download size={14} /> CSV</button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="glass-card p-4 border-[#1F2937] flex flex-col justify-center relative overflow-hidden">
                    <div className="text-xs text-[#9CA3AF] uppercase mb-1">Organization Risk Score</div>
                    <div className="text-3xl font-bold text-[#F97316] drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">74 <span className="text-sm text-[#9CA3AF]">/ 100</span></div>
                </div>

                <div className="glass-card p-4 border-[#1F2937] relative overflow-hidden bg-[#EF4444]/5">
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></div>
                    <div className="text-xs text-[#9CA3AF] uppercase mb-1">Critical Assets</div>
                    <div className="text-3xl font-bold text-[#EF4444] font-mono">8</div>
                </div>

                <div className="glass-card p-4 border-[#1F2937]">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs text-[#9CA3AF] uppercase mb-1">Shadow Assets</div>
                            <div className="text-3xl font-bold text-[#F97316] font-mono">9</div>
                        </div>
                        <ThreatBadge level="SHADOW ASSET" />
                    </div>
                </div>

                <div className="glass-card p-4 border-[#1F2937] flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full border-4 border-[#1F2937] border-t-[#3B82F6] flex items-center justify-center font-bold text-xs text-[#3B82F6]">3/38</div>
                    <div>
                        <div className="text-xs text-[#9CA3AF] uppercase mb-1">PQC Ready</div>
                        <div className="text-sm font-bold text-[#F9FAFB]">In Progress</div>
                    </div>
                </div>

                <div className="glass-card p-4 border-[#1F2937] flex gap-3 items-center">
                    <div className="bg-[#1F2937] p-3 rounded-full"><Clock size={20} className="text-[#F9FAFB]" /></div>
                    <div>
                        <div className="text-xs text-[#9CA3AF] uppercase mb-1">Avg HNDL Deadline</div>
                        <div className="text-xl font-bold text-[#F9FAFB]">Q3 2027</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col xl:flex-row gap-6">

                {/* Left: Asset Table */}
                <div className="flex-1 glass-card border-[#1F2937] overflow-hidden flex flex-col">
                    {/* Table Header / Filters */}
                    <div className="p-4 border-b border-[#1F2937] flex flex-wrap gap-2 items-center">
                        {['All', 'CRITICAL', 'HIGH', 'VPN', 'Shadow Assets', 'API'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${filter === f ? 'bg-[#374151] border-[#4B5563] text-white' : 'bg-transparent border-[#1F2937] text-[#9CA3AF] hover:bg-[#1F2937] hover:border-[#374151]'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1e293b] text-[#9CA3AF] text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Asset URL</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">TLS</th>
                                    <th className="px-6 py-3">Algorithm</th>
                                    <th className="px-6 py-3">Score</th>
                                    <th className="px-6 py-3">HNDL Deadline</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {filteredAssets.map(asset => (
                                    <tr
                                        key={asset.id}
                                        className={`hover:bg-[#1e293b] transition-colors cursor-pointer border-l-4 ${getBorderColor(asset.status)}`}
                                        onClick={() => navigate(`/asset/${asset.id}`)}
                                    >
                                        <td className="px-6 py-4 font-mono font-medium flex items-center gap-2">
                                            {asset.url} {asset.shadow && <ThreatBadge level="SHADOW ASSET" />}
                                        </td>
                                        <td className="px-6 py-4 text-[#9CA3AF] text-xs font-bold">{asset.type}</td>
                                        <td className="px-6 py-4 font-mono">{asset.tls}</td>
                                        <td className="px-6 py-4 font-mono">{asset.algo}</td>
                                        <td className={`px-6 py-4 font-bold font-mono ${asset.score > 75 ? 'text-[#EF4444]' : asset.score > 50 ? 'text-[#F97316]' : 'text-[#22C55E]'}`}>
                                            {asset.score}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[#9CA3AF]">{asset.hndl}</td>
                                        <td className="px-6 py-4">
                                            <ThreatBadge level={asset.status} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <ChevronRight size={18} className="inline text-[#6B7280] hover:text-[#F9FAFB]" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Charts Column */}
                <div className="w-full xl:w-96 flex flex-col gap-6">

                    <div className="glass-card p-4 border-[#1F2937]">
                        <h3 className="text-sm font-bold mb-4 uppercase text-[#9CA3AF] tracking-wider">Risk Distribution</h3>
                        <div className="h-48 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={riskData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB' }}
                                        itemStyle={{ color: '#F9FAFB' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Central text logic */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold font-mono">38</span>
                                <span className="text-[10px] uppercase text-[#9CA3AF]">Assets</span>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                            {riskData.map(d => (
                                <div key={d.name} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                                    <span className="text-[#9CA3AF]">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-4 border-[#1F2937]">
                        <h3 className="text-sm font-bold mb-4 uppercase text-[#9CA3AF] tracking-wider">Algorithm Breakdown</h3>
                        <div className="h-40 w-full font-mono text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={algoData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: '#1e293b' }}
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB' }}
                                    />
                                    <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-[#1F2937] flex flex-col items-center justify-center">
                        <h3 className="text-sm font-bold mb-2 uppercase text-[#9CA3AF] tracking-wider text-center">Quantum Readiness</h3>
                        <ScoreGauge score={74} size={150} />
                    </div>

                </div>
            </div>

            {/* Bottom Alert Banner */}
            <div className="bg-gradient-to-r from-[#EF4444]/20 to-[#F97316]/20 border border-[#EF4444]/50 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 p-0 h-full bg-[#EF4444]"></div>
                <div className="flex gap-4 items-start sm:items-center pl-2">
                    <ShieldAlert className="text-[#EF4444] shrink-0" size={32} />
                    <div>
                        <h3 className="font-bold text-[#F9FAFB] tracking-wide">⚠ 9 SHADOW ASSETS DISCOVERED</h3>
                        <p className="text-sm text-[#F9FAFB]/80 font-mono mt-1">
                            api-legacy.pnb.in | test-payments.pnb.in | mobile-v1.pnb.in | uat-portal.pnb.in ...
                        </p>
                    </div>
                </div>
                <button className="whitespace-nowrap uppercase text-xs font-bold bg-[#EF4444] text-[#F9FAFB] px-4 py-2 rounded hover:bg-[#DC2626] transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    View All Shadow Assets →
                </button>
            </div>

        </div>
    );
};

export default DashboardPage;
