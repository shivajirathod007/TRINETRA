/**
 * ScheduledScanForm — Create a new scheduled scan.
 * Matches the glass-card / Tailwind dark styling used across the app.
 */
import { useState } from 'react';
import { Calendar, Clock, Globe, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { scheduledScanApi } from '../api/index';

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = 'once' | 'daily' | 'weekly' | 'monthly';
type ScanScope = 'full' | 'root_only';
type CrqcScenario = 'pessimistic' | 'moderate' | 'optimistic';

interface FormState {
  domain: string;
  frequency: Frequency;
  scheduled_time: string;
  day_of_week: string;
  day_of_month: string;
  one_time_date: string;
  scan_scope: ScanScope;
  crqc_scenario: CrqcScenario;
}

export interface ScheduledScanFormProps {
  onSuccess?: () => void;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateDomain(domain: string): string | null {
  if (!domain.trim()) return 'Domain is required.';
  if (/\s/.test(domain)) return 'Domain must not contain spaces.';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Domain must not start or end with a dot.';
  if (/\.\./.test(domain)) return 'Domain must not contain consecutive dots.';
  if (!domain.includes('.')) return 'Domain must contain at least one dot (e.g. example.com).';
  return null;
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  domain: '',
  frequency: 'daily',
  scheduled_time: '02:00',
  day_of_week: '0',
  day_of_month: '1',
  one_time_date: '',
  scan_scope: 'full',
  crqc_scenario: 'moderate',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduledScanForm({ onSuccess }: ScheduledScanFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'domain') setDomainError(null);
    setApiError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    const err = validateDomain(form.domain);
    if (err) {
      setDomainError(err);
      return;
    }

    // Build payload — only include conditional fields when relevant
    const payload: Record<string, unknown> = {
      domain: form.domain.trim(),
      frequency: form.frequency,
      scheduled_time: form.scheduled_time,
      scan_scope: form.scan_scope,
      crqc_scenario: form.crqc_scenario,
    };

    if (form.frequency === 'weekly') {
      payload.day_of_week = parseInt(form.day_of_week, 10);
    }
    if (form.frequency === 'monthly') {
      payload.day_of_month = parseInt(form.day_of_month, 10);
    }
    if (form.frequency === 'once') {
      payload.one_time_date = form.one_time_date;
    }

    setLoading(true);
    setApiError(null);
    setSuccess(false);

    try {
      await scheduledScanApi.create(payload);
      setSuccess(true);
      setForm(DEFAULT_FORM);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="glass-card border rounded-xl p-6"
      style={{ borderColor: 'var(--glass-border)', background: 'var(--surface-card)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-indigo-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-primary">New Scheduled Scan</div>
          <div className="text-xs text-secondary">Configure a recurring or one-time scan</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

        {/* Domain */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={12} /> Domain <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.domain}
            onChange={e => set('domain', e.target.value)}
            placeholder="example.com"
            className={`w-full px-3 py-2 rounded-lg text-sm font-mono bg-surface-card border transition-colors outline-none focus:ring-1 focus:ring-indigo-500/50 ${
              domainError
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-glass-border focus:border-indigo-500/60'
            }`}
            style={{ color: 'var(--text-primary)', background: 'var(--surface-card-hover)' }}
          />
          {domainError && (
            <p className="flex items-center gap-1.5 text-xs text-red-400 mt-0.5">
              <AlertCircle size={11} /> {domainError}
            </p>
          )}
        </div>

        {/* Frequency + Scheduled Time — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Frequency
            </label>
            <select
              value={form.frequency}
              onChange={e => set('frequency', e.target.value as Frequency)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={12} /> Scheduled Time (UTC) <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={e => set('scheduled_time', e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm font-mono border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Conditional: day_of_week (weekly) */}
        {form.frequency === 'weekly' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Day of Week
            </label>
            <select
              value={form.day_of_week}
              onChange={e => set('day_of_week', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                (day, i) => (
                  <option key={i} value={i}>{day}</option>
                ),
              )}
            </select>
          </div>
        )}

        {/* Conditional: day_of_month (monthly) */}
        {form.frequency === 'monthly' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Day of Month
            </label>
            <select
              value={form.day_of_month}
              onChange={e => set('day_of_month', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Conditional: one_time_date (once) */}
        {form.frequency === 'once' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} /> Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.one_time_date}
              onChange={e => set('one_time_date', e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm font-mono border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        )}

        {/* Scan Scope + CRQC Scenario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Scan Scope
            </label>
            <select
              value={form.scan_scope}
              onChange={e => set('scan_scope', e.target.value as ScanScope)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="full">Full</option>
              <option value="root_only">Root Only</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              CRQC Scenario
            </label>
            <select
              value={form.crqc_scenario}
              onChange={e => set('crqc_scenario', e.target.value as CrqcScenario)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-glass-border bg-surface-card-hover outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="pessimistic">Pessimistic</option>
              <option value="moderate">Moderate</option>
              <option value="optimistic">Optimistic</option>
            </select>
          </div>
        </div>

        {/* Feedback messages */}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            <CheckCircle size={15} />
            Scheduled scan created successfully.
          </div>
        )}
        {apiError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle size={15} />
            {apiError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Scheduling…
            </>
          ) : (
            'Schedule Scan'
          )}
        </button>
      </form>
    </div>
  );
}
