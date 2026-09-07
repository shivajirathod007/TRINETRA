/**
 * ScheduledScanList — Displays a table of scheduled scans with pause/resume/delete actions.
 */
import { scheduledScanApi } from '../api/index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledScanRecord {
  id: string;
  domain: string;
  frequency: string;
  scheduled_time: string;
  scan_scope: string;
  crqc_scenario: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
}

interface Props {
  schedules: ScheduledScanRecord[];
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduledScanRecord['status'] }) {
  const map: Record<ScheduledScanRecord['status'], { bg: string; color: string; border: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.28)' },
    paused:    { bg: 'rgba(245,158,11,0.12)', color: 'var(--status-medium)',   border: 'rgba(245,158,11,0.28)' },
    completed: { bg: 'rgba(99,102,241,0.12)', color: 'var(--primary-indigo)',  border: 'rgba(99,102,241,0.28)' },
    failed:    { bg: 'rgba(239,68,68,0.12)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.28)' },
  };
  const s = map[status] ?? { bg: 'var(--surface-card)', color: 'var(--text-secondary)', border: 'var(--glass-border)' };
  return (
    <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduledScanList({ schedules, onRefresh }: Props) {
  if (schedules.length === 0) {
    return (
      <div className="glass-card border rounded-xl p-12 flex items-center justify-center text-center text-secondary text-sm">
        No scheduled scans yet. Create one above to get started.
      </div>
    );
  }

  const handlePause = async (id: string) => {
    await scheduledScanApi.patch(id, { status: 'paused' });
    onRefresh();
  };

  const handleResume = async (id: string) => {
    await scheduledScanApi.patch(id, { status: 'active' });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this scheduled scan?')) return;
    await scheduledScanApi.delete(id);
    onRefresh();
  };

  return (
    <div className="eterna-phase-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-card)' }}>
              {['Domain', 'Frequency', 'Next Run', 'Last Run', 'Scan Scope', 'Status', 'Actions'].map(h => (
                <th
                  key={h}
                  className="text-left text-[10px] text-secondary uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap"
                  style={{ borderColor: 'var(--border-divider)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map(s => (
              <tr
                key={s.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-divider)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {s.domain}
                </td>
                <td className="px-4 py-3 text-secondary capitalize">{s.frequency}</td>
                <td className="px-4 py-3 font-mono text-secondary text-xs whitespace-nowrap">{fmtDate(s.next_run_at)}</td>
                <td className="px-4 py-3 font-mono text-secondary text-xs whitespace-nowrap">{fmtDate(s.last_run_at)}</td>
                <td className="px-4 py-3 text-secondary capitalize">{s.scan_scope}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {s.status === 'active' && (
                      <button
                        onClick={() => handlePause(s.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: 'rgba(245,158,11,0.10)', color: 'var(--status-medium)', border: '1px solid rgba(245,158,11,0.28)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--status-medium)'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.10)'; e.currentTarget.style.color = 'var(--status-medium)'; }}
                      >
                        Pause
                      </button>
                    )}
                    {s.status === 'paused' && (
                      <button
                        onClick={() => handleResume(s.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--status-safe)', border: '1px solid rgba(34,197,94,0.28)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--status-safe)'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.10)'; e.currentTarget.style.color = 'var(--status-safe)'; }}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                      style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--status-critical)', border: '1px solid rgba(239,68,68,0.28)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--status-critical)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = 'var(--status-critical)'; }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
