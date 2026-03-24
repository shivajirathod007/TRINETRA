/**
 * ReportingPage — Automated Reporting Engine
 * CISO-grade executive reporting, scan history, and compliance exports.
 */
import { BarChart2, Calendar, Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useScanStore } from '../store';
import { useScanHistory } from '../hooks';
import { SectionHeader, ScoreBadge } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

const REPORT_TYPES = [
  {
    label: 'Executive Summary',
    icon: <FileText size={22} className="text-primary-indigo" />,
    desc: 'High-level CISO briefing with exposure overview',
    badge: 'PDF',
  },
  {
    label: 'Scheduled Scanning',
    icon: <Calendar size={22} className="text-status-safe" />,
    desc: 'Automated weekly and monthly scan cadence',
    badge: 'AUTO',
  },
  {
    label: 'On-Demand Export',
    icon: <Download size={22} className="text-brand-gold" />,
    desc: 'Generate CBOM + risk report for any scan',
    badge: 'NOW',
  },
];

export default function ReportingPage() {
  useAutoLoadScan();
  const { activeDomain } = useScanStore();
  const { data: scans = [], isLoading } = useScanHistory(activeDomain);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Reporting Center"
        subtitle="Executive reporting, compliance exports & scan history"
        action={
          <button className="action-btn flex items-center gap-2 text-sm">
            <Download size={14} /> Export All
          </button>
        }
      />

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map(r => (
          <div
            key={r.label}
            className="glass-card border rounded-xl p-6 flex flex-col gap-3 cursor-pointer hover:border-primary-indigo/40 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="bg-surface-card p-3 rounded-xl">{r.icon}</div>
              <span className="text-[10px] font-black tracking-widest px-2 py-1 rounded-full bg-surface-card text-secondary border border-glass-border">{r.badge}</span>
            </div>
            <div>
              <div className="font-bold text-primary group-hover:text-primary-indigo transition-colors">{r.label}</div>
              <div className="text-xs text-secondary mt-1">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Scan History Table */}
      <div className="glass-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-primary-indigo" />
            <span className="font-bold text-primary">Scan History ({scans.length})</span>
          </div>
          {isLoading && <span className="text-xs text-secondary animate-pulse">Loading…</span>}
        </div>

        {!activeDomain ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
            <BarChart2 size={36} className="opacity-25" />
            <p className="text-sm text-center max-w-xs">No domain selected. Initiate a scan from Asset Discovery to populate history.</p>
          </div>
        ) : scans.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
            <Clock size={36} className="opacity-25" />
            <p className="text-sm">No scan history yet for <span className="font-mono text-primary">{activeDomain}</span>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-surface-card-hover">
                  {['Date', 'Domain', 'Assets', 'Risk Score', 'Critical', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-5 py-4 font-semibold border-b border-glass-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.scan_id} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
                    <td className="px-5 py-3.5 text-secondary text-xs font-mono">
                      {(scan.completed_at ?? (scan as any).created_at ?? '').slice(0, 10)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-primary">{scan.domain}</td>
                    <td className="px-5 py-3.5 text-primary">{scan.assets_scanned}</td>
                    <td className="px-5 py-3.5"><ScoreBadge score={scan.organization_score} size="sm" /></td>
                    <td className="px-5 py-3.5 text-status-critical font-bold">{scan.critical_count}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${scan.status === 'COMPLETED' ? 'bg-status-safe/10 text-status-safe' : 'bg-surface-card text-secondary border border-glass-border'}`}>
                        {scan.status === 'COMPLETED' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {scan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coming Soon module */}
      <div
        className="glass-card border rounded-xl p-6 flex items-center gap-4"
        style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}
      >
        <BarChart2 size={32} className="text-primary-indigo opacity-60 shrink-0" />
        <div>
          <div className="font-bold text-primary mb-1">Compliance Automation — Coming Soon</div>
          <div className="text-sm text-secondary">Auto-generate ISO 27001, NIST SP 800-131A, and FIPS 140-3 compliance reports directly from CBOM inventory data.</div>
        </div>
      </div>
      <style>{`.shrink-0 { flex-shrink: 0; }`}</style>
    </div>
  );
}
