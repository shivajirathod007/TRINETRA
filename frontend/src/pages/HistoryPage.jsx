import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, ShieldCheck, Download, ChevronRight, RefreshCw, Clock, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { scanApi, setActiveScan } from '../api/index';

const BASE = '/api/v1';
async function fetchQueueHealth() {
    const r = await fetch(`${BASE}/health/queue`);
    return r.json();
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-card border p-3 rounded shadow-lg">
                <p className="text-secondary text-xs font-mono mb-2">{label}</p>
                <p className="font-bold text-primary">
                    Score: <span className="text-status-pqc">{payload[0]?.value ?? '—'}</span> / 100
                </p>
                {payload[0]?.payload?.assets_found != null && (
                    <p className="text-xs text-secondary mt-1">Assets: {payload[0].payload.assets_found}</p>
                )}
            </div>
        );
    }
    return null;
};

const POLL_INTERVAL_ACTIVE = 4_000;  // when there are pending/running scans
const POLL_INTERVAL_IDLE = 60_000;   // when all scans are completed/failed
const STALE_MINUTES = 30;            // scans stuck longer than this are highlighted

/** Returns true if a running/pending scan has been stuck beyond STALE_MINUTES */
function isStale(scan) {
    if (scan.status !== 'running' && scan.status !== 'pending') return false;
    const ref = scan.started_at || null;
    if (!ref) return scan.status === 'pending'; // pending with no start → assume stale
    return (Date.now() - new Date(ref).getTime()) > STALE_MINUTES * 60 * 1000;
}

const HistoryPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cancelling, setCancelling] = useState({});

    const { data: scans = [], isLoading } = useQuery({
        queryKey: ['scan-history'],
        queryFn: () => scanApi.list(null, 50),
        staleTime: 10_000,
        refetchInterval: (query) => {
            const data = query.state.data ?? [];
            const hasActive = data.some(s => (s.status === 'pending' || s.status === 'running'));
            return hasActive ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
        },
    });

    const allQueued = scans.length > 0 && scans.every(s => s.status === 'pending');
    const { data: queueHealth } = useQuery({
        queryKey: ['queue-health'],
        queryFn: fetchQueueHealth,
        enabled: allQueued,
        staleTime: 30_000,
    });

    // Build trend data from completed scans only (exposure_score over time)
    const trendData = scans
        .filter(s => s.status === 'completed' && s.started_at != null)
        .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
        .map(s => ({
            date: new Date(s.started_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            score: s.exposure_score ?? 0,
            assets_found: s.assets_found ?? 0,
        }));

    const completedScans = scans.filter(s => s.status === 'completed');
    const latestScore = completedScans[0]?.exposure_score ?? scans[0]?.exposure_score;

    const handleReviewScan = (scan) => {
        if (scan.status === 'completed') {
            setActiveScan(scan.domain, scan.scan_id);
            navigate('/dashboard');
        }
    };

    const handleCancel = async (e, scan) => {
        e.stopPropagation(); // don't trigger row click
        setCancelling(prev => ({ ...prev, [scan.scan_id]: true }));
        try {
            await scanApi.cancel(scan.scan_id);
            queryClient.invalidateQueries({ queryKey: ['scan-history'] });
        } catch (err) {
            console.error('Cancel failed:', err);
        } finally {
            setCancelling(prev => ({ ...prev, [scan.scan_id]: false }));
        }
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex justify-between items-center bg-surface-card p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                    <Clock size={24} className="text-primary-indigo" />
                    <h1 className="text-xl font-bold">Scan History &amp; Trends</h1>
                    {isLoading && <RefreshCw size={14} className="animate-spin text-secondary" />}
                </div>
                <button className="action-btn">
                    <Download size={14} /> Export Report
                </button>
            </div>

            <div className="grid grid-cols-1 lg-grid-cols-3 gap-6">

                {/* Trend Chart */}
                <div className="lg-col-span-2 glass-card p-6 border flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-lg">Quantum Exposure Trend</h2>
                        <span className="flex items-center gap-1.5 text-xs text-secondary">
                            <span className="w-2 h-2 rounded-full bg-status-pqc" /> Organization Score
                        </span>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full mt-4">
                        {trendData.length < 2 ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary gap-2">
                                <TrendingUp size={28} className="opacity-30" />
                                <p className="text-sm">Need at least 2 completed scans to show trend. Run scans and wait for them to finish.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-divider)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)"
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-secondary)"
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <ReferenceLine y={80} stroke="var(--status-safe)" strokeDasharray="3 3" opacity={0.5} />
                                    <Line type="monotone" dataKey="score" stroke="var(--status-pqc)" strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--glass-bg)', stroke: 'var(--status-pqc)', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: 'var(--status-pqc)', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="glass-card p-6 border flex flex-col gap-6">
                    <h2 className="font-bold text-lg mb-2">Trend Analysis</h2>

                    {completedScans.length >= 2 ? (
                        <div className="bg-surface-card border p-4 rounded flex items-start gap-4">
                            <TrendingUp size={24} className="text-status-safe shrink-0" />
                            <div>
                                <div className="font-bold text-primary text-sm mb-1">
                                    Score change: {((completedScans[0]?.exposure_score ?? 0) - (completedScans[completedScans.length - 1]?.exposure_score ?? 0)) > 0 ? '+' : ''}
                                    {(completedScans[0]?.exposure_score ?? 0) - (completedScans[completedScans.length - 1]?.exposure_score ?? 0)} points
                                </div>
                                <p className="text-xs text-secondary leading-relaxed">
                                    Across {completedScans.length} completed scans.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-surface-card border p-4 rounded flex items-start gap-4">
                            <AlertTriangle size={24} className="text-status-high shrink-0" />
                            <div>
                                <div className="font-bold text-primary text-sm mb-1">Not enough data</div>
                                <p className="text-xs text-secondary leading-relaxed">
                                    Run at least 2 scans to see trend analytics.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto p-4 rounded relative overflow-hidden"
                        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <ShieldCheck size={64} className="text-primary-indigo" />
                        </div>
                        <div className="text-xl font-bold font-mono text-status-pqc mb-1">
                            {latestScore != null ? latestScore : '—'} <span className="text-sm font-sans text-secondary">/ 100</span>
                        </div>
                        <div className="text-xs font-bold text-secondary uppercase tracking-wider">Current Score</div>
                        <div className="text-[10px] text-primary mt-2 px-2 py-1 rounded inline-block"
                            style={{ background: 'rgba(99,102,241,0.15)' }}>
                            Target: 80 by EOY
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-card border overflow-hidden mt-2 flex flex-col">
                <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-lg">Previous Scans</h2>
                    {allQueued && (
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            {queueHealth?.redis === 'connected' ? (
                                <span className="text-status-safe font-medium">Queue connected — start the Celery worker so scans run.</span>
                            ) : queueHealth?.redis === 'disconnected' ? (
                                <span className="text-status-high font-medium">Queue unreachable — start Redis and the Celery worker.</span>
                            ) : (
                                <span className="text-secondary">Scans are queued. Ensure Redis and the Celery worker are running.</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="table-container">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-secondary gap-2">
                            <RefreshCw size={18} className="animate-spin" /> Loading scan history...
                        </div>
                    ) : scans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-secondary gap-2">
                            <Clock size={28} className="opacity-30" />
                            <p className="text-sm">No scans yet. Start your first scan from the home page.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead className="sticky top-0 bg-surface-card-hover">
                                <tr>
                                    <th>Scan ID</th>
                                    <th>Domain</th>
                                    <th>Timestamp</th>
                                    <th>Assets</th>
                                    <th>Score</th>
                                    <th>Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {scans.map((scan) => {
                                    const stale = isStale(scan);
                                    const isCancellable = scan.status === 'running' || scan.status === 'pending';
                                    const isCancelling = cancelling[scan.scan_id];
                                    return (
                                        <tr
                                            key={scan.scan_id}
                                            className={`group ${scan.status === 'completed' ? 'cursor-pointer' : ''} ${stale ? 'stale-row' : ''}`}
                                            onClick={() => handleReviewScan(scan)}
                                        >
                                            <td className="font-mono font-medium text-primary-indigo">
                                                {scan.scan_id?.slice(0, 8) ?? '—'}...
                                            </td>
                                            <td className="font-mono text-primary">{scan.domain ?? '—'}</td>
                                            <td className="font-mono text-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    {scan.started_at
                                                        ? new Date(scan.started_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                                        : '—'}
                                                </div>
                                            </td>
                                            <td className="font-mono">{scan.assets_found ?? 0}</td>
                                            <td>
                                                {scan.status === 'completed' && scan.exposure_score != null ? (
                                                    <span className={`font-mono font-bold ${scan.exposure_score >= 70 ? 'text-status-pqc'
                                                            : scan.exposure_score >= 40 ? 'text-status-medium'
                                                                : 'text-status-critical'
                                                        }`}>
                                                        {scan.exposure_score}
                                                    </span>
                                                ) : (
                                                    <span className="text-secondary font-mono">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${scan.status === 'completed' ? 'text-status-safe'
                                                            : scan.status === 'failed' ? 'text-status-critical'
                                                                : scan.status === 'running' ? 'text-primary-indigo'
                                                                    : 'text-status-high'
                                                        }`}>
                                                        {scan.status === 'running' && !stale && (
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-indigo animate-pulse" />
                                                        )}
                                                        {stale && isCancellable && (
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-high" title="Scan may be stuck" />
                                                        )}
                                                        {scan.status === 'pending' ? 'Queued'
                                                            : scan.status === 'running' ? 'Running'
                                                                : scan.status === 'completed' ? 'Completed'
                                                                    : scan.status === 'failed' ? 'Failed'
                                                                        : (scan.status ?? 'Unknown')}
                                                    </span>
                                                    {stale && isCancellable && (
                                                        <span className="text-[10px] text-status-high font-semibold flex items-center gap-1">
                                                            <AlertTriangle size={10} /> May be stuck
                                                        </span>
                                                    )}
                                                    {scan.status === 'failed' && scan.error_message && (
                                                        <span className="text-[10px] text-secondary truncate max-w-[160px]" title={scan.error_message}>
                                                            {scan.error_message}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                {isCancellable ? (
                                                    <button
                                                        onClick={(e) => handleCancel(e, scan)}
                                                        disabled={isCancelling}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-card border border-status-critical/30 text-status-critical hover:bg-status-critical hover:text-white transition-colors disabled:opacity-50"
                                                        title="Cancel scan"
                                                    >
                                                        {isCancelling
                                                            ? <RefreshCw size={14} className="animate-spin" />
                                                            : <XCircle size={16} />}
                                                    </button>
                                                ) : (
                                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-card border text-secondary ${scan.status === 'completed' ? 'group-hover:bg-primary-indigo group-hover:text-white group-hover:border-primary-indigo' : ''} transition-colors`}>
                                                        <ChevronRight size={16} />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style>{`
        .bg-surface-card { background-color: var(--surface-card); }
        .shrink-0 { flex-shrink: 0; }
        .group:hover .group-hover\\:bg-primary-indigo { background-color: var(--primary-indigo); }
        .group:hover .group-hover\\:text-white { color: white; }
        .group:hover .group-hover\\:border-primary-indigo { border-color: var(--primary-indigo); }
        .stale-row { background: rgba(249,115,22,0.04); }
        .stale-row:hover { background: rgba(249,115,22,0.08) !important; }
        @media (min-width: 1024px) {
          .lg-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .lg-col-span-2 { grid-column: span 2 / span 2 !important; }
        }
      `}</style>
        </div>
    );
};

export default HistoryPage;
