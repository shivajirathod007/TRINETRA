/**
 * SensitivityBadge — colour-coded pill showing data_sensitivity_tier.
 *
 * transaction    → red   (#E24B4A)
 * authentication → amber (#EF9F27)
 * static         → grey  (theme-aware)
 */

import React from "react";

type Tier = "transaction" | "authentication" | "static";

interface SensitivityBadgeProps {
  tier: Tier | string;
  source?: string;
  className?: string;
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string }> = {
  transaction: {
    label: "Transaction",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
  },
  authentication: {
    label: "Auth",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
  },
  static: {
    label: "Static",
    color: "var(--text-secondary)",
    bg: "var(--surface-card-hover)",
    border: "var(--glass-border)",
  },
};

const DEFAULT_CONFIG = TIER_CONFIG.static;

export const SensitivityBadge: React.FC<SensitivityBadgeProps> = ({
  tier,
  source,
  className = "",
}) => {
  const config = TIER_CONFIG[tier as Tier] ?? DEFAULT_CONFIG;
  const isManualOverride = source === "manual_override";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
      title={
        isManualOverride
          ? `${config.label} (manually overridden)`
          : `${config.label} (auto-detected)`
      }
    >
      {config.label}
      {isManualOverride && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3 h-3 opacity-90"
          aria-label="Manually overridden"
        >
          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L2.317 11.21a1.75 1.75 0 0 0-.467.861l-.438 2.185a.75.75 0 0 0 .882.882l2.185-.438a1.75 1.75 0 0 0 .861-.467l8.698-8.696a1.75 1.75 0 0 0 0-2.474Z" />
        </svg>
      )}
    </span>
  );
};

export default SensitivityBadge;
