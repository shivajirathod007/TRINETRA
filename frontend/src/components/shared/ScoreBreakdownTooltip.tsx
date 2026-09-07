/**
 * ScoreBreakdownTooltip — hover/expand tooltip showing sensitivity-adjusted
 * score breakdown for an asset. Fully theme-aware (light + dark).
 */
import React, { useState } from 'react';

interface ScoreBreakdown {
  algorithm_risk?: number;
  hndl_timeline?: number;
  public_exposure?: number;
  data_sensitivity_tier?: string;
  data_shelf_life_years?: number;
  sensitivity_tier_impact?: number;
  formula?: string;
}

interface ScoreBreakdownTooltipProps {
  score: number;
  breakdown?: ScoreBreakdown | null;
  children?: React.ReactNode;
}

const FORMULA =
  'Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)';

export const ScoreBreakdownTooltip: React.FC<ScoreBreakdownTooltipProps> = ({
  score,
  breakdown,
  children,
}) => {
  const [open, setOpen] = useState(false);

  const shelfLife  = breakdown?.data_shelf_life_years   ?? 0;
  const tierImpact = breakdown?.sensitivity_tier_impact ?? 0;
  const formula    = breakdown?.formula ?? FORMULA;

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        className="focus:outline-none"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Show score breakdown"
      >
        {children ?? (
          <span className="font-bold tabular-nums font-mono">{Math.round(score)}</span>
        )}
      </button>

      {/* Tooltip panel */}
      {open && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl text-xs p-4 animate-scaleIn"
          role="tooltip"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
            color: 'var(--text-primary)',
          }}
        >
          <p className="font-semibold text-sm mb-3 font-outfit" style={{ color: 'var(--text-primary)' }}>
            Score Breakdown
          </p>

          <div className="space-y-1.5">
            <Row label="Algorithm Risk"  value={`${breakdown?.algorithm_risk ?? '—'} × 40%`} />
            <Row label="HNDL Timeline"   value={`${breakdown?.hndl_timeline ?? '—'} × 40%`} />
            <Row label="Public Exposure" value={`${breakdown?.public_exposure ?? '—'} × 20%`} />
          </div>

          <div className="my-3 h-px" style={{ background: 'var(--border-divider)' }} />

          <div className="space-y-1.5">
            <Row
              label="Data shelf life"
              value={`${shelfLife} yr`}
              highlight={shelfLife > 0}
            />
            <Row
              label="Tier impact on HNDL"
              value={tierImpact > 0 ? `+${tierImpact} pts` : `${tierImpact} pts`}
              highlight={tierImpact > 0}
            />
          </div>

          <div className="my-3 h-px" style={{ background: 'var(--border-divider)' }} />

          <p className="leading-snug text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {formula}
          </p>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex justify-between items-center">
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span
      className="font-mono font-semibold"
      style={{ color: highlight ? 'var(--accent-amber)' : 'var(--text-primary)' }}
    >
      {value}
    </span>
  </div>
);

export default ScoreBreakdownTooltip;
