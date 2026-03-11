import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, ShieldCheck, Download, ChevronRight } from 'lucide-react';

const trendData = [
    { date: '2025-01', score: 22, pnb_assets: 31 },
    { date: '2025-04', score: 25, pnb_assets: 34 },
    { date: '2025-07', score: 24, pnb_assets: 34 },
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
            <div className="bg-surface-card border p-3 rounded shadow-lg">
                <p className="text-secondary text-xs font-mono mb-2">{label}</p>
                <p className="font-bold text-primary">
                    Score: <span className="text-status-pqc">{payload[0].value}</span> / 100
                </p>
                <p className="text-xs text-secondary mt-1">
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
            <div className="flex justify-between items-center bg-surface-card p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                    <HistoryIcon />
                    <h1 className="text-xl font-bold">Scan History & Trends</h1>
                </div>
                <button className="action-btn">
                    <Download size={14} /> Export Report
                </button>
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-3 gap-6">

                {/* Left: Trend Chart */}
                <div className="lg-col-span-2 glass-card p-6 border flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-lg">Quantum Exposure Trend</h2>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-secondary">
                                <span className="w-2 h-2 rounded-full bg-status-pqc"></span> Organization Score
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-divider)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={80} stroke="var(--status-safe)" strokeDasharray="3 3" opacity={0.5} />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="var(--status-pqc)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--bg-navy-black)', stroke: 'var(--status-pqc)', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: 'var(--status-pqc)', stroke: 'var(--bg-navy-black)', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Quick Stats */}
                <div className="glass-card p-6 border flex flex-col gap-6">
                    <h2 className="font-bold text-lg mb-2">Trend Analysis</h2>

                    <div className="bg-surface-card border p-4 rounded flex items-start gap-4">
                        <TrendingUp size={24} className="text-status-safe shrink-0" />
                        <div>
                            <div className="font-bold text-primary text-sm mb-1">Score +19 points (Q1 2026)</div>
                            <p className="text-xs text-secondary leading-relaxed">
                                Significant improvement driven by Kyber-768 hybrid key exchange deployment on partner APIs.
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-card border p-4 rounded flex items-start gap-4">
                        <AlertTriangle size={24} className="text-status-high shrink-0" />
                        <div>
                            <div className="font-bold text-primary text-sm mb-1">Shadow Asset Persistence</div>
                            <p className="text-xs text-secondary leading-relaxed">
                                Team is mitigating found assets, but new undocumented endpoints continue to appear (+1 this scan).
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto bg-pqc-10 border-pqc-30 p-4 rounded relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <ShieldCheck size={64} className="text-primary-indigo" />
                        </div>
                        <div className="text-xl font-bold font-mono text-status-pqc mb-1">74 <span className="text-sm font-sans text-secondary">/ 100</span></div>
                        <div className="text-xs font-bold text-secondary uppercase tracking-wider">Current Score</div>
                        <div className="text-[10px] text-primary mt-2 bg-pqc-20 inline-block px-2 py-1 rounded">Target: 80 by EOY</div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-card border overflow-hidden mt-2 flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-bold text-lg">Previous Scans</h2>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead className="sticky top-0 bg-surface-card-hover">
                            <tr>
                                <th>Scan ID</th>
                                <th>Timestamp</th>
                                <th>Assets</th>
                                <th>Score</th>
                                <th>Key Changes Detected</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {scanHistory.map((scan) => (
                                <tr key={scan.id} className="group cursor-pointer">
                                    <td className="font-mono font-medium text-primary-indigo">{scan.id}</td>
                                    <td className="font-mono text-secondary">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} /> {scan.date}
                                        </div>
                                    </td>
                                    <td className="font-mono">{scan.assets}</td>
                                    <td>
                                        <span className={`font-mono font-bold ${scan.score >= 70 ? 'text-status-pqc' : scan.score >= 40 ? 'text-status-medium' : 'text-status-critical'}`}>
                                            {scan.score}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1 min-w-[280px]">
                                            {scan.changes.map((change, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs" style={{ marginTop: i > 0 ? '4px' : '0' }}>
                                                    {change.type === 'improved' && <span className="w-1.5 h-1.5 rounded-full bg-status-safe"></span>}
                                                    {change.type === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-status-high"></span>}
                                                    {change.type === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-status-critical"></span>}
                                                    <span className={change.type === 'critical' ? 'text-status-critical font-medium' : 'text-[#D1D5DB]'}>
                                                        {change.text}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-card border text-secondary group-hover-btn transition-colors">
                                            <ChevronRight size={16} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .bg-surface-card { background-color: var(--surface-card); }
        .bg-pqc-10 { background-color: rgba(59, 130, 246, 0.1); }
        .bg-pqc-20 { background-color: rgba(59, 130, 246, 0.2); }
        .border-pqc-30 { border: 1px solid rgba(59, 130, 246, 0.3); }
        .bg-status-safe { background-color: var(--status-safe); }
        .bg-status-high { background-color: var(--status-high); }
        .bg-status-critical { background-color: var(--status-critical); }
        .bg-status-pqc { background-color: var(--status-pqc); }
        .shrink-0 { flex-shrink: 0; }
        
        .group:hover .group-hover-btn {
          background-color: var(--primary-indigo);
          color: white;
          border-color: var(--primary-indigo);
        }
        
        @media (min-width: 1024px) {
          .lg-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .lg-col-span-2 { grid-column: span 2 / span 2 !important; }
        }
      `}</style>
        </div>
    );
};

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

export default HistoryPage;
