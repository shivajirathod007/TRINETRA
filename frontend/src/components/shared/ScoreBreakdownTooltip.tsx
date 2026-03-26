/**
 * ScoreBreakdownTooltip — hover/expand tooltip showing sensitivity-adjusted
 * score breakdown for an asset.
 *
 * Displays:
 *   - data_shelf_life_years
 *   - sensitivity_tier_impact (points added to HNDL component by tier)
 *   - Updated formula annotation
 *
 * Requirements: 8.2
 */

import React, { useState } from "react";

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
  "Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)";

export const ScoreBreakdownTooltip: React.FC<ScoreBreakdownTooltipProps> = ({
  score,
  breakdown,
  children,
}) => {
  const [open, setOpen] = useState(false);

  const shelfLife = breakdown?.data_shelf_life_years ?? 0;
  const tierImpact = breakdown?.sensitivity_tier_impact ?? 0;
  const formula = breakdown?.formula ?? FORMULA;

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        className="focus:outline-none"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Show score breakdown"
      >
        {children ?? (
          <span className="font-bold tabular-nums">{Math.round(score)}</span>
        )}
      </button>

      {/* Tooltip panel */}
      {open && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg shadow-xl border border-gray-700 bg-gray-900 text-white text-xs p-3"
          role="tooltip"
        >
          <p className="font-semibold text-sm mb-2">Score Breakdown</p>

          <div className="space-y-1">
            <Row
              label="Algorithm Risk"
              value={`${breakdown?.algorithm_risk ?? "—"} × 40%`}
            />
            <Row
              label="HNDL Timeline"
              value={`${breakdown?.hndl_timeline ?? "—"} × 40%`}
            />
            <Row
              label="Public Exposure"
              value={`${breakdown?.public_exposure ?? "—"} × 20%`}
            />
          </div>

          <hr className="my-2 border-gray-700" />

          <div className="space-y-1">
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

          <hr className="my-2 border-gray-700" />

          <p className="text-gray-400 leading-snug">{formula}</p>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}</span>
    <span className={highlight ? "text-amber-400 font-semibold" : "text-white"}>
      {value}
    </span>
  </div>
);

export default ScoreBreakdownTooltip;
