import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, ShieldCheck, Download, ChevronRight } from 'lucide-react';
import ThreatBadge from '../components/ThreatBadge';

const trendData = [
    { date: '2025-01', score: 22, pnb_assets: 31 },
    { date: '2025-04', score: 25, pnb_assets: 34 },
    { date: '2025-07', score: 24, pnb_assets: 34 }, // Dip from new shadow assets
    { date: '2025-10', score: 38, pnb_assets: 35 },
    { date: '2026-01', score: 55, pnb_assets: 38 },
    { date: '2026-03', score: 74, pnb_assets: 38 },
];

const scanHistory = [
    {
        id: 'TRN-2026-0847',
        date: '2026-03-11 14:32 IST',
        assets: 38,
        score: 74,
        changes: [
            { type: 'improved', text: '3 assets upgraded to TLS 1.3' },
            { type: 'warning', text: 'New shadow asset appeared (api-test.pnb.in)' }
        ]
    },
    {
        id: 'TRN-2026-0105',
        date: '2026-01-05 09:15 IST',
        assets: 38,
        score: 55,
        changes: [
            { type: 'improved', text: 'partner-api.pnb.in migrated to Kyber-768' },
            { type: 'improved', text: 'TLS 1.0 disabled on 4 endpoints' }
        ]
    },
    {
        id: 'TRN-2025-1012',
        date: '2025-10-12 11:45 IST',
        assets: 35,
        score: 38,
        changes: [
            { type: 'critical', text: 'cert renewed but still RSA-2048 (auth.pnb.in)' },
            { type: 'improved', text: 'HSTS enabled on 12 domains' }
        ]
    },
    {
        id: 'TRN-2025-0722',
        date: '2025-07-22 16:30 IST',
        assets: 34,
        score: 24,
        changes: [
            { type: 'warning', text: 'TLS version downgraded on billing.pnb.in' },
            { type: 'critical', text: '3 shadow assets discovered' }
        ]
    }
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#111827] border border-[#1F2937] p-3 rounded shadow-lg">
                <p className="text-[#9CA3AF] text-xs font-mono mb-2">{label}</p>
                <p className="font-bold text-[#F9FAFB]">
                    Score: <span className="text-[#3B82F6]">{payload[0].value}</span> / 100
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                    Assets scanned: {payload[0].payload.pnb_assets}
                </p>
            </div>
        );
    }
    return null;
};

const HistoryPage = () => {
    return (
        <div className="flex flex-col gap-6">

            {/* Header Bar */}
            <div className="flex justify-between items-center bg-[#111827] p-4 rounded-lg border border-[#1F2937]">
                <div className="flex items-center gap-4">
                    <HistoryIcon />
                    <h1 className="text-xl font-bold">Scan History & Trends</h1>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors">
                    <Download size={14} /> Export Report
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Trend Chart */}
                <div className="lg:col-span-2 glass-card p-6 border-[#1F2937] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-lg">Quantum Exposure Trend</h2>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                                <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> Organization Score
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={80} stroke="#22C55E" strokeDasharray="3 3" opacity={0.5} />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#0A0D14', stroke: '#3B82F6', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#0A0D14', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Quick Stats */}
                <div className="glass-card p-6 border-[#1F2937] flex flex-col gap-6">
                    <h2 className="font-bold text-lg mb-2">Trend Analysis</h2>

                    <div className="bg-[#111827] border border-[#1F2937] p-4 rounded flex items-start gap-4">
                        <TrendingUp size={24} className="text-[#22C55E] shrink-0" />
                        <div>
                            <div className="font-bold text-[#F9FAFB] text-sm mb-1">Score +19 points (Q1 2026)</div>
                            <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                Significant improvement driven by Kyber-768 hybrid key exchange deployment on partner APIs.
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-[#1F2937] p-4 rounded flex items-start gap-4">
                        <AlertTriangle size={24} className="text-[#F97316] shrink-0" />
                        <div>
                            <div className="font-bold text-[#F9FAFB] text-sm mb-1">Shadow Asset Persistence</div>
                            <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                Team is mitigating found assets, but new undocumented endpoints continue to appear (+1 this scan).
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-4 rounded relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <ShieldCheck size={64} />
                        </div>
                        <div className="text-xl font-bold font-mono text-[#3B82F6] mb-1">74 <span className="text-sm font-sans text-[#9CA3AF]">/ 100</span></div>
                        <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Current Score</div>
                        <div className="text-[10px] text-[#F9FAFB] mt-2 bg-[#3B82F6]/20 inline-block px-2 py-1 rounded">Target: 80 by EOY</div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-card border-[#1F2937] overflow-hidden mt-2 flex flex-col">
                <div className="p-4 border-b border-[#1F2937]">
                    <h2 className="font-bold text-lg">Previous Scans</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#1e293b] text-[#9CA3AF] text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Scan ID</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Assets</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Key Changes Detected</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F2937]">
                            {scanHistory.map((scan) => (
                                <tr key={scan.id} className="hover:bg-[#1e293b] transition-colors group cursor-pointer">
                                    <td className="px-6 py-4 font-mono font-medium text-[#6366F1]">{scan.id}</td>
                                    <td className="px-6 py-4 font-mono text-[#9CA3AF]">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} /> {scan.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{scan.assets}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-mono font-bold ${scan.score >= 70 ? 'text-[#3B82F6]' : scan.score >= 40 ? 'text-[#EAB308]' : 'text-[#EF4444]'}`}>
                                            {scan.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5 min-w-[280px]">
                                            {scan.changes.map((change, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    {change.type === 'improved' && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>}
                                                    {change.type === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span>}
                                                    {change.type === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>}
                                                    <span className={change.type === 'critical' ? 'text-[#EF4444] font-medium' : 'text-[#D1D5DB]'}>
                                                        {change.text}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1F2937] text-[#9CA3AF] group-hover:bg-[#6366F1] group-hover:text-white transition-colors">
                                            <ChevronRight size={16} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6366F1]">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

export default HistoryPage;
