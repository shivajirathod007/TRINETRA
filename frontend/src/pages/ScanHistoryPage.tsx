/**
 * ScanHistoryPage — Scan history with:
 *   • Clickable rows → live scan page (running) or dashboard (completed)
 *   • Cancel button for running/pending scans
 *   • Risk score trend + assets + critical findings charts
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, AlertCircle, XCircle, TrendingUp, BarChart2,
  X, ExternalLink, RefreshCw, StopCircle, Play, Eye
} from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useScanStore } from '../store';
import { useScanHistory } from '../hooks';
import { scanApi } from '../api/index';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRecord {
  scan_id:    string;
  id?:        string;
  domain:     string;
  status:     'completed' | 'failed' | 'running' | 'pending' | string;
  started_at?: string;
  completed_at?: string;
  assets_found?: number;
  assets_scanned?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  exposure_score?: number;
  organization_score?: number;
  error_message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusChip(status: string) {
  const s = status?.toUpperCase();
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    COMPLETED: { icon: <CheckCircle size={12} />, cls: 'bg-status-safe/10 text-status-safe border-status-safe/30', label: 'Completed' },
    FAILED:    { icon: <XCircle size={12} />,     cls: 'bg-status-critical/10 text-status-critical border-status-critical/30', label: 'Failed' },
    RUNNING:   { icon: <RefreshCw size={12} className="animate-spin" />, cls: 'bg-primary-indigo/10 text-primary-indigo border-primary-indigo/30', label: 'Running' },
    PENDING:   { icon: <Clock size={12} className="animate-pulse" />, cls: 'bg-status-medium/10 text-status-medium border-status-medium/30', label: 'Queued' },
  };
  const cfg = map[s] ?? { icon: <AlertCircle size={12} />, cls: 'bg-surface-card text-secondary border-glass-border', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#f8fafc', fontSize: 11 },
};

function AnalyticsSection({ scans }: { scans: ScanRecord[] }) {
  const completed = scans.filter(s => s.status === 'completed' || s.status === 'COMPLETED');
  const sorted = [...completed].sort((a, b) =>
    (a.started_at ?? '').localeCompare(b.started_at ?? ''),
  );
  const chartData = sorted.map(s => ({
    name: s.domain.split('.')[0].substring(0, 8),
    score: s.exposure_score ?? s.organization_score ?? 0,
    assets: s.assets_found ?? s.assets_scanned ?? 0,
    critical: s.critical_count ?? 0,
    date: fmtDate(s.started_at).split(',')[0],
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass-card border rounded-xl p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary-indigo" />
          <span className="text-sm font-bold text-primary">Risk Score Trend</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
              dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Risk Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card border rounded-xl p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-status-safe" />
          <span className="text-sm font-bold text-primary">Assets Discovered</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar dataKey="assets" name="Assets" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === chartData.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.45)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card border rounded-xl p-5 overflow-hidden md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-status-critical" />
          <span className="text-sm font-bold text-primary">Critical Findings per Scan</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar dataKey="critical" name="Critical" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.critical > 3 ? '#ef4444' : entry.critical > 0 ? '#f97316' : '#22c55e'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

  const statusNorm = (s: string) => s?.toUpperCase();

  const filtered = scans.filter(s => {
    if (filter === 'ALL') return true;
    return statusNorm(s.status) === filter;
  });

  const handleRowClick = (scan: ScanRecord) => {
    const st = statusNorm(scan.status);
    const sid = scan.scan_id ?? scan.id ?? '';

    if (st === 'RUNNING' || st === 'PENDING') {
      // Navigate to live scan page to watch progress
      navigate(`/scan/${encodeURIComponent(scan.domain)}`, { state: { scanId: sid } });
    } else if (st === 'COMPLETED') {
      // Load this scan into the store and go to dashboard
      setActiveScan(sid, scan.domain);
      navigate('/dashboard');
    }
    // FAILED — do nothing on row click (no useful page to show)
  };

  const handleCancel = async (e: React.MouseEvent, scan: ScanRecord) => {
    e.stopPropagation(); // don't trigger row click
    const sid = scan.scan_id ?? scan.id ?? '';
    setCancelling(prev => ({ ...prev, [sid]: true }));
    try {
      await scanApi.cancel(sid);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['scan-history'] });
      queryClient.invalidateQueries({ queryKey: ['scans-recent'] });
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setCancelling(prev => ({ ...prev, [sid]: false }));
    }
  };

  const completedScans = scans.filter(s => statusNorm(s.status) === 'COMPLETED');
  const runningScans   = scans.filter(s => statusNorm(s.status) === 'RUNNING' || statusNorm(s.status) === 'PENDING');
  const avgScore = completedScans.length
    ? Math.round(completedScans.reduce((a, s) => a + (s.exposure_score ?? s.organization_score ?? 0), 0) / completedScans.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Scan History"
        subtitle={`${scans.length} scans stored • click a row to open it`}
      />

      {/* ── Active scans banner ────────────────────────────────────── */}
      {runningScans.length > 0 && (
        <div className="glass-card border rounded-xl p-4 flex items-center gap-4"
          style={{ borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)' }}>
          <RefreshCw size={18} className="text-primary-indigo animate-spin flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-bold text-primary-indigo">
              {runningScans.length} scan{runningScans.length > 1 ? 's' : ''} in progress
            </span>
            <span className="text-xs text-secondary ml-2">
              {runningScans.map(s => s.domain).join(', ')}
            </span>
          </div>
          <button
            onClick={() => navigate(`/scan/${encodeURIComponent(runningScans[0].domain)}`, {
              state: { scanId: runningScans[0].scan_id ?? runningScans[0].id }
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-indigo text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Eye size={12} /> Watch Live
          </button>
        </div>
      )}

      {/* ── Summary KPI bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans',    value: scans.length,           color: '#6366f1' },
          { label: 'Completed',      value: completedScans.length,  color: '#22c55e' },
          { label: 'Failed',         value: scans.filter(s => statusNorm(s.status) === 'FAILED').length, color: '#ef4444' },
          { label: 'Avg Risk Score', value: avgScore,               color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="glass-card border rounded-xl p-4 text-center"
            style={{ borderColor: `${k.color}33`, background: `${k.color}0d` }}>
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-secondary font-semibold mt-1 uppercase tracking-wider">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Analysis Charts ────────────────────────────────────────── */}
      <AnalyticsSection scans={scans} />

      {/* ── Filter + Table ─────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary-indigo" />
            <span className="font-bold text-primary">History ({filtered.length})</span>
          </div>
          <div className="flex gap-2">
            {(['ALL', 'COMPLETED', 'RUNNING', 'FAILED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === f
                    ? 'bg-primary-indigo text-white border-primary-indigo'
                    : 'border-glass-border text-secondary hover:text-primary'
                }`}>
                {f}
                {f === 'RUNNING' && runningScans.length > 0 && (
                  <span className="ml-1.5 bg-primary-indigo text-white rounded-full px-1.5 py-0.5 text-[10px]">
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
                  <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(scan => {
                const sid = scan.scan_id ?? scan.id ?? '';
                const st = statusNorm(scan.status);
                const isActive = st === 'RUNNING' || st === 'PENDING';
                const isCompleted = st === 'COMPLETED';
                const isCancelling = cancelling[sid];

                return (
                  <tr key={sid}
                    onClick={() => handleRowClick(scan)}
                    className={`border-b border-glass-border/30 transition-colors group ${
                      isActive ? 'cursor-pointer hover:bg-primary-indigo/5' :
                      isCompleted ? 'cursor-pointer hover:bg-surface-card-hover/60' :
                      'cursor-default opacity-70'
                    }`}>
                    <td className="px-5 py-3.5 font-mono text-secondary text-xs whitespace-nowrap">
                      {fmtDate(scan.started_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-indigo animate-pulse flex-shrink-0" />}
                        <span className="font-mono text-primary font-semibold">{scan.domain}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-primary">
                      {scan.assets_found ?? scan.assets_scanned ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {isCompleted ? (
                        <span className="font-bold font-mono text-sm" style={{
                          color: (scan.exposure_score ?? scan.organization_score ?? 0) > 70 ? '#ef4444'
                            : (scan.exposure_score ?? scan.organization_score ?? 0) > 40 ? '#f59e0b' : '#22c55e'
                        }}>
                          {scan.exposure_score ?? scan.organization_score ?? '—'}
                        </span>
                      ) : (
                        <span className="text-secondary text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-status-critical font-mono">
                      {scan.critical_count ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">{statusChip(scan.status)}</td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/scan/${encodeURIComponent(scan.domain)}`, { state: { scanId: sid } }); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-primary-indigo/10 text-primary-indigo border border-primary-indigo/30 rounded text-xs font-bold hover:bg-primary-indigo hover:text-white transition-colors"
                              title="Watch live"
                            >
                              <Play size={10} /> Live
                            </button>
                            <button
                              onClick={e => handleCancel(e, scan)}
                              disabled={isCancelling}
                              className="flex items-center gap-1 px-2.5 py-1 bg-status-critical/10 text-status-critical border border-status-critical/30 rounded text-xs font-bold hover:bg-status-critical hover:text-white transition-colors disabled:opacity-50"
                              title="Cancel scan"
                            >
                              {isCancelling
                                ? <RefreshCw size={10} className="animate-spin" />
                                : <StopCircle size={10} />}
                              {isCancelling ? '…' : 'Cancel'}
                            </button>
                          </>
                        )}
                        {isCompleted && (
                          <button
                            onClick={e => { e.stopPropagation(); setActiveScan(sid, scan.domain); navigate('/dashboard'); }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-status-safe/10 text-status-safe border border-status-safe/30 rounded text-xs font-bold hover:bg-status-safe hover:text-black transition-colors"
                            title="View results"
                          >
                            <Eye size={10} /> Results
                          </button>
                        )}
                        {st === 'FAILED' && scan.error_message && (
                          <span className="text-[10px] text-secondary truncate max-w-[120px]" title={scan.error_message}>
                            {scan.error_message.substring(0, 30)}…
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-14 text-secondary">No scans match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
