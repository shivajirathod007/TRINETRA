/**
 * ScanHistoryPage — Enhanced scan history with rich analytics and visualization.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, AlertCircle, XCircle, TrendingUp, BarChart2,
  RefreshCw, StopCircle, Play, Eye, Shield, Activity, Target,
  AlertTriangle, Download, ChevronRight
} from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useScanStore } from '../store';
import { useScanHistory } from '../hooks';
import { scanApi } from '../api/index';
import { useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, ReferenceLine, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRecord {
  scan_id:         string;
  id?:             string;
  domain:          string;
  status:          'completed' | 'failed' | 'running' | 'pending' | string;
  started_at?:     string;
  completed_at?:   string;
  assets_found?:   number;
  assets_scanned?: number;
  critical_count?: number;
  high_count?:     number;
  medium_count?:   number;
  low_count?:      number;
  safe_count?:     number;
  exposure_score?: number;
  organization_score?: number;
  error_message?:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function scoreColor(score: number) {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 25) return '#eab308';
  return '#22c55e';
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(10,16,36,0.97)',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  itemStyle: { color: '#f8fafc', fontSize: 12 },
};

function StatusChip({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    COMPLETED: { icon: <CheckCircle size={11} />, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Completed' },
    FAILED:    { icon: <XCircle size={11} />,     cls: 'bg-red-500/15 text-red-400 border-red-500/30',           label: 'Failed' },
    RUNNING:   { icon: <RefreshCw size={11} className="animate-spin" />, cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', label: 'Running' },
    PENDING:   { icon: <Clock size={11} className="animate-pulse" />,    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   label: 'Queued' },
  };
  const cfg = map[s] ?? { icon: <AlertCircle size={11} />, cls: 'bg-surface-card text-secondary border-glass-border', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value ?? 0;
  return (
    <div style={TOOLTIP_STYLE.contentStyle} className="px-4 py-3">
      <p className="text-secondary text-xs mb-2 font-mono">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: scoreColor(score) }} />
        <span className="font-bold text-sm" style={{ color: scoreColor(score) }}>{score}</span>
        <span className="text-secondary text-xs">/ 100 risk score</span>
      </div>
      {payload[0]?.payload?.assets != null && (
        <p className="text-xs text-secondary mt-1.5">Assets: <span className="text-primary font-medium">{payload[0].payload.assets}</span></p>
      )}
    </div>
  );
}

// ─── Analytics Section ────────────────────────────────────────────────────────

function AnalyticsSection({ scans }: { scans: ScanRecord[] }) {
  const completed = scans.filter(s => s.status?.toUpperCase() === 'COMPLETED');
  const sorted = [...completed].sort((a, b) =>
    (a.started_at ?? '').localeCompare(b.started_at ?? ''),
  );

  const chartData = sorted.map(s => ({
    name: fmtShort(s.started_at),
    domain: s.domain.split('.')[0].substring(0, 10),
    score: s.exposure_score ?? s.organization_score ?? 0,
    assets: s.assets_found ?? s.assets_scanned ?? 0,
    critical: s.critical_count ?? 0,
    high: s.high_count ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="glass-card border rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-secondary">
        <Activity size={32} className="opacity-20" />
        <p className="text-sm">No completed scans yet — run a scan to see analytics.</p>
      </div>
    );
  }

  const latestScore = chartData[chartData.length - 1]?.score ?? 0;
  const prevScore   = chartData[chartData.length - 2]?.score ?? latestScore;
  const scoreDelta  = latestScore - prevScore;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Score trend — spans 2 cols */}
      <div className="lg:col-span-2 glass-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary">Risk Score Trend</div>
              <div className="text-xs text-secondary">Quantum exposure over time</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black font-mono" style={{ color: scoreColor(latestScore) }}>
              {latestScore}
            </div>
            <div className={`text-xs font-bold flex items-center justify-end gap-1 ${scoreDelta > 0 ? 'text-red-400' : scoreDelta < 0 ? 'text-emerald-400' : 'text-secondary'}`}>
              {scoreDelta > 0 ? '↑' : scoreDelta < 0 ? '↓' : '→'}
              {Math.abs(scoreDelta)} pts vs prev
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ScoreTooltip />} />
            <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.4}
              label={{ value: 'Critical', fill: '#ef4444', fontSize: 10, position: 'right' }} />
            <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.4}
              label={{ value: 'Safe', fill: '#22c55e', fontSize: 10, position: 'right' }} />
            <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
              fill="url(#scoreGrad)"
              dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: 'rgba(10,16,36,0.8)' }}
              activeDot={{ r: 6, fill: '#6366f1', stroke: 'rgba(99,102,241,0.4)', strokeWidth: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Assets discovered */}
      <div className="glass-card border rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <BarChart2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-primary">Assets Discovered</div>
            <div className="text-xs text-secondary">Per completed scan</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={20} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="assets" name="Assets" radius={[5, 5, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i}
                  fill={i === chartData.length - 1 ? '#22c55e' : 'rgba(34,197,94,0.4)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Critical & High findings */}
      <div className="lg:col-span-3 glass-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary">Critical &amp; High Findings per Scan</div>
              <div className="text-xs text-secondary">Stacked risk breakdown across scan history</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> High</span>
          </div>
        </div>

        {/* If all counts are 0 AND no scan has risk data at all, show a note */}
        {chartData.every(d => d.critical === 0 && d.high === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-secondary">
            <CheckCircle size={28} className="text-emerald-400 opacity-60" />
            <p className="text-sm font-medium text-emerald-400">No critical or high findings recorded</p>
            <p className="text-xs text-secondary">
              {completed.length === 0
                ? 'No completed scans yet.'
                : 'All scans returned low/medium risk — or risk counts were not captured in older scans.'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
                tickCount={5}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                labelStyle={TOOLTIP_STYLE.labelStyle}
                itemStyle={TOOLTIP_STYLE.itemStyle}
                formatter={(value: any, name: string) => [
                  <span style={{ color: name === 'Critical' ? '#ef4444' : '#f97316', fontWeight: 700 }}>{value}</span>,
                  name,
                ]}
              />
              <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" fillOpacity={0.9} radius={[0, 0, 0, 0]} />
              <Bar dataKey="high"     name="High"     stackId="a" fill="#f97316" fillOpacity={0.85} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ScanHistoryPage() {
  const { data: scansData, refetch } = useScanHistory(null);
  const scans: ScanRecord[] = (scansData as any[]) || [];
  const { setActiveScan } = useScanStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'RUNNING'>('ALL');
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  const norm = (s: string) => s?.toUpperCase();

  const filtered = scans.filter(s =>
    filter === 'ALL' ? true : norm(s.status) === filter,
  );

  const handleRowClick = (scan: ScanRecord) => {
    const st = norm(scan.status);
    const sid = scan.scan_id ?? scan.id ?? '';
    if (st === 'RUNNING' || st === 'PENDING') {
      navigate(`/scan/${encodeURIComponent(scan.domain)}`, { state: { scanId: sid } });
    } else if (st === 'COMPLETED') {
      setActiveScan(sid, scan.domain);
      navigate('/dashboard');
    }
  };

  const handleCancel = async (e: React.MouseEvent, scan: ScanRecord) => {
    e.stopPropagation();
    const sid = scan.scan_id ?? scan.id ?? '';
    setCancelling(prev => ({ ...prev, [sid]: true }));
    try {
      await scanApi.cancel(sid);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['scan-history'] });
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setCancelling(prev => ({ ...prev, [sid]: false }));
    }
  };

  const completedScans = scans.filter(s => norm(s.status) === 'COMPLETED');
  const failedScans    = scans.filter(s => norm(s.status) === 'FAILED');
  const runningScans   = scans.filter(s => norm(s.status) === 'RUNNING' || norm(s.status) === 'PENDING');
  const avgScore = completedScans.length
    ? Math.round(completedScans.reduce((a, s) => a + (s.exposure_score ?? s.organization_score ?? 0), 0) / completedScans.length)
    : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader
          title="Scan History"
          subtitle={`${scans.length} scans stored • click a row to open it`}
        />
        <button className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-glass-border text-secondary hover:text-primary hover:border-primary-indigo/50 transition-all">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Active scan banner ─────────────────────────────────────── */}
      {runningScans.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-4 border"
          style={{ borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.07)' }}>
          <RefreshCw size={18} className="text-indigo-400 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-indigo-400">
              {runningScans.length} scan{runningScans.length > 1 ? 's' : ''} in progress
            </span>
            <span className="text-xs text-secondary ml-2 truncate">
              {runningScans.map(s => s.domain).join(', ')}
            </span>
          </div>
          <button
            onClick={() => navigate(`/scan/${encodeURIComponent(runningScans[0].domain)}`, {
              state: { scanId: runningScans[0].scan_id ?? runningScans[0].id },
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors whitespace-nowrap"
          >
            <Eye size={12} /> Watch Live
          </button>
        </div>
      )}

      {/* ── KPI tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans',    value: scans.length,          color: '#6366f1', icon: <Activity size={20} /> },
          { label: 'Completed',      value: completedScans.length, color: '#22c55e', icon: <CheckCircle size={20} /> },
          { label: 'Failed',         value: failedScans.length,    color: '#ef4444', icon: <XCircle size={20} /> },
          { label: 'Avg Risk Score', value: avgScore,              color: '#f59e0b', icon: <Target size={20} /> },
        ].map(k => (
          <div key={k.label} className="glass-card border rounded-xl p-5 relative overflow-hidden"
            style={{ borderColor: `${k.color}30`, background: `${k.color}0a` }}>
            <div className="absolute top-3 right-3 opacity-15" style={{ color: k.color }}>{k.icon}</div>
            <div className="text-3xl font-black font-mono mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-secondary font-semibold uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Analytics charts ───────────────────────────────────────── */}
      <AnalyticsSection scans={scans} />

      {/* ── Filter + Table ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            <span className="font-bold text-primary">History ({filtered.length})</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'COMPLETED', 'RUNNING', 'FAILED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === f
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'border-glass-border text-secondary hover:text-primary hover:border-indigo-500/40'
                }`}>
                {f}
                {f === 'RUNNING' && runningScans.length > 0 && (
                  <span className="ml-1.5 bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">
                    {runningScans.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-card-hover">
                {['Date', 'Domain', 'Assets', 'Risk Score', 'Critical', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(scan => {
                const sid = scan.scan_id ?? scan.id ?? '';
                const st = norm(scan.status);
                const isActive    = st === 'RUNNING' || st === 'PENDING';
                const isCompleted = st === 'COMPLETED';
                const isCancelling = cancelling[sid];
                const score = scan.exposure_score ?? scan.organization_score ?? 0;

                return (
                  <tr key={sid}
                    onClick={() => handleRowClick(scan)}
                    className={`border-b border-glass-border/30 transition-colors group ${
                      isActive    ? 'cursor-pointer hover:bg-indigo-500/5' :
                      isCompleted ? 'cursor-pointer hover:bg-surface-card-hover/60' :
                      'cursor-default'
                    }`}>

                    <td className="px-4 py-3 font-mono text-secondary text-xs whitespace-nowrap">
                      {fmtDate(scan.started_at)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                        )}
                        <span className="font-mono text-primary font-semibold">{scan.domain}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-primary">
                      {scan.assets_found ?? scan.assets_scanned ?? '—'}
                    </td>

                    <td className="px-4 py-3">
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm" style={{ color: scoreColor(score) }}>
                            {score}
                          </span>
                          <div className="w-14 h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${score}%`, backgroundColor: scoreColor(score) }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-secondary text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isCompleted ? (
                        (scan.critical_count ?? 0) > 0 || (scan.high_count ?? 0) > 0 ? (
                          <div className="flex items-center gap-2">
                            {(scan.critical_count ?? 0) > 0 && (
                              <span className="font-bold font-mono text-red-400">{scan.critical_count}</span>
                            )}
                            {(scan.high_count ?? 0) > 0 && (
                              <span className="font-bold font-mono text-orange-400 text-xs">+{scan.high_count}H</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-400 text-xs font-bold">0</span>
                        )
                      ) : (
                        <span className="text-secondary text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusChip status={scan.status} />
                    </td>

                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/scan/${encodeURIComponent(scan.domain)}`, { state: { scanId: sid } }); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold hover:bg-indigo-500 hover:text-white transition-colors"
                            >
                              <Play size={10} /> Live
                            </button>
                            <button
                              onClick={e => handleCancel(e, scan)}
                              disabled={isCancelling}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                              {isCancelling ? <RefreshCw size={10} className="animate-spin" /> : <StopCircle size={10} />}
                              {isCancelling ? '…' : 'Cancel'}
                            </button>
                          </>
                        )}
                        {isCompleted && (
                          <button
                            onClick={e => { e.stopPropagation(); setActiveScan(sid, scan.domain); navigate('/dashboard'); }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-black transition-colors"
                          >
                            <Eye size={10} /> Results
                          </button>
                        )}
                        {st === 'FAILED' && scan.error_message && (
                          <span className="text-[10px] text-secondary truncate max-w-[120px]" title={scan.error_message}>
                            {scan.error_message.substring(0, 28)}…
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-secondary">
                    <Clock size={28} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No scans match this filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between text-xs text-secondary">
            <span>Showing {filtered.length} of {scans.length} scans</span>
            <span>TRINETRA — Quantum Exposure Intelligence Platform</span>
          </div>
        )}
      </div>
    </div>
  );
}
