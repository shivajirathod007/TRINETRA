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
  const map: Record<ScheduledScanRecord['status'], string> = {
    active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    paused:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
    completed: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    failed:    'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${map[status] ?? 'bg-surface-card text-secondary border-glass-border'}`}>
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
    <div className="glass-card border rounded-xl overflow-hidden" style={{ borderColor: 'var(--glass-border)' }}>
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
                        className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {s.status === 'paused' && (
                      <button
                        onClick={() => handleResume(s.id)}
                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-black transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
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
