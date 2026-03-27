/**
 * ScanHistoryPage — Dedicated scan history with:
 *   • localStorage persistence (reads trinetra_scan_history)
 *   • clickable rows → drill-down modal with full scan details
 *   • bar + line analysis charts (risk score over time, assets trend)
 */
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, XCircle, TrendingUp, BarChart2, X, ExternalLink, RefreshCw } from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useScanStore } from '../store';
import { useScanHistory } from '../hooks';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRecord {
  id:    string;
  domain:     string;
  status:     'COMPLETED' | 'FAILED' | 'RUNNING' | string;
  created_at?: string;
  completed_at?: string;
  assets_scanned?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  organization_score?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function statusChip(status: string) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    COMPLETED: { icon: <CheckCircle size={12} />, cls: 'bg-status-safe/10 text-status-safe border-status-safe/30' },
    FAILED:    { icon: <XCircle size={12} />,     cls: 'bg-status-critical/10 text-status-critical border-status-critical/30' },
    RUNNING:   { icon: <RefreshCw size={12} className="animate-spin" />, cls: 'bg-primary-indigo/10 text-primary-indigo border-primary-indigo/30' },
  };
  const s = map[status] ?? { icon: <AlertCircle size={12} />, cls: 'bg-surface-card text-secondary border-glass-border' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
}

// ─── Drill-down Modal ─────────────────────────────────────────────────────────

function ScanDetailModal({ scan, onClose, onLoad }: { scan: ScanRecord; onClose: () => void; onLoad: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card border rounded-2xl w-full max-w-2xl overflow-hidden"
        style={{ borderColor: 'rgba(99,102,241,0.3)', boxShadow: '0 0 60px rgba(99,102,241,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between"
          style={{ background: 'rgba(99,102,241,0.08)' }}>
          <div>
            <div className="font-black text-primary text-lg font-mono">{scan.domain}</div>
            <div className="text-xs text-secondary font-mono mt-0.5">{scan.id}</div>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--glass-border)' }}>
          {[
            { label: 'Status',       value: statusChip(scan.status) },
            { label: 'Assets Found', value: <span className="text-2xl font-black font-mono text-primary">{scan.assets_scanned ?? '—'}</span> },
            { label: 'Risk Score',   value: <span className="text-2xl font-black font-mono" style={{ color: (scan.organization_score ?? 0) > 70 ? '#ef4444' : (scan.organization_score ?? 0) > 40 ? '#f59e0b' : '#22c55e' }}>{scan.organization_score ?? '—'}</span> },
            { label: 'Critical',     value: <span className="text-2xl font-black font-mono text-status-critical">{scan.critical_count ?? '—'}</span> },
          ].map(k => (
            <div key={k.label} className="p-4 text-center" style={{ background: 'var(--surface-card)' }}>
              <div className="text-xs text-secondary uppercase tracking-wider font-semibold mb-2">{k.label}</div>
              {k.value}
            </div>
          ))}
        </div>

        {/* Risk breakdown */}
        <div className="px-6 py-4">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Risk Breakdown</div>
          {[
            { label: 'Critical', count: scan.critical_count ?? 0, color: '#ef4444', total: 10 },
            { label: 'High',     count: scan.high_count ?? 0,     color: '#f97316', total: 10 },
            { label: 'Medium',   count: scan.medium_count ?? 0,   color: '#eab308', total: 10 },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3 mb-2">
              <div className="w-16 text-xs font-bold" style={{ color: r.color }}>{r.label}</div>
              <div className="flex-1 bg-surface-card-hover rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (r.count / Math.max(1, r.total)) * 100)}%`, background: r.color }} />
              </div>
              <div className="w-6 text-xs font-mono text-secondary text-right">{r.count}</div>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="px-6 pb-4 flex flex-wrap gap-4 text-xs text-secondary">
          <span>Started: <span className="text-primary font-mono">{fmtDate(scan.created_at)}</span></span>
          <span>Completed: <span className="text-primary font-mono">{fmtDate(scan.completed_at)}</span></span>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-glass-border flex gap-3">
          <button
            onClick={() => { onLoad(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-indigo text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={14} /> Load this Scan
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-glass-border text-secondary rounded-lg font-bold text-sm hover:text-primary transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
  itemStyle: { color: '#f8fafc', fontSize: 11 },
};

function AnalyticsSection({ scans }: { scans: ScanRecord[] }) {
  // Build time-series data (most recent last)
  const sorted = [...scans].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
  const chartData = sorted.map((s, i) => ({
    name: s.domain.split('.')[0].substring(0, 8),
    idx: i + 1,
    score: s.organization_score ?? 0,
    assets: s.assets_scanned ?? 0,
    critical: s.critical_count ?? 0,
    date: fmtDate(s.created_at),
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Risk score trend */}
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

      {/* Assets per scan bar */}
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

      {/* Critical findings bar */}
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
  const { data: scansData } = useScanHistory(null);
  const scans: any[] = scansData || [];
  const { setActiveScan } = useScanStore();
  const [selected, setSelected] = useState<ScanRecord | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED'>('ALL');

  const filtered = scans.filter(s => filter === 'ALL' || s.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Scan History"
        subtitle={`${scans.length} scans stored • click any row to view full details`}
      />

      {/* ── Summary KPI bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans',    value: scans.length,                                                      color: '#6366f1' },
          { label: 'Completed',      value: scans.filter(s => s.status === 'COMPLETED').length,                color: '#22c55e' },
          { label: 'Failed',         value: scans.filter(s => s.status === 'FAILED').length,                   color: '#ef4444' },
          { label: 'Avg Risk Score', value: Math.round(scans.reduce((a, s) => a + (s.organization_score ?? 0), 0) / Math.max(1, scans.filter(s => s.organization_score).length)), color: '#f59e0b' },
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
            {(['ALL', 'COMPLETED', 'FAILED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === f
                    ? 'bg-primary-indigo text-white border-primary-indigo'
                    : 'border-glass-border text-secondary hover:text-primary'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-card-hover">
                {['Date', 'Domain', 'Assets', 'Risk Score', 'Critical', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(scan => (
                <tr key={scan.id}
                  onClick={() => setSelected(scan)}
                  className="border-b border-glass-border/30 hover:bg-surface-card-hover/60 transition-colors cursor-pointer group">
                  <td className="px-5 py-3.5 font-mono text-secondary text-xs">{fmtDate(scan.created_at)}</td>
                  <td className="px-5 py-3.5 font-mono text-primary font-semibold">{scan.domain}</td>
                  <td className="px-5 py-3.5 font-mono text-primary">{scan.assets_scanned ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold font-mono text-sm" style={{
                      color: (scan.organization_score ?? 0) > 70 ? '#ef4444' : (scan.organization_score ?? 0) > 40 ? '#f59e0b' : '#22c55e'
                    }}>
                      {scan.organization_score ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-status-critical font-mono">{scan.critical_count ?? '—'}</td>
                  <td className="px-5 py-3.5">{statusChip(scan.status)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-primary-indigo text-xs opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      View →
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-14 text-secondary">No scans match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drill-down Modal ─────────────────────────────────────────── */}
      {selected && (
        <ScanDetailModal
          scan={selected}
          onClose={() => setSelected(null)}
          onLoad={() => setActiveScan(selected.scan_id ?? selected.id, selected.domain)}
        />
      )}
    </div>
  );
}
