/**
 * SensitivityBadge — colour-coded pill showing data_sensitivity_tier.
 *
 * transaction    → red   (#E24B4A)
 * authentication → amber (#EF9F27)
 * static         → grey  (#6B7280)
 *
 * Shows a pencil icon overlay when source === "manual_override".
 *
 * Requirements: 8.1, 8.4
 */

import React from "react";

type Tier = "transaction" | "authentication" | "static";

interface SensitivityBadgeProps {
  tier: Tier | string;
  source?: string;
  className?: string;
}

const TIER_CONFIG: Record<Tier, { label: string; bg: string; text: string }> = {
  transaction: {
    label: "Transaction",
    bg: "#E24B4A",
    text: "#ffffff",
  },
  authentication: {
    label: "Auth",
    bg: "#EF9F27",
    text: "#ffffff",
  },
  static: {
    label: "Static",
    bg: "#6B7280",
    text: "#ffffff",
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
      style={{ backgroundColor: config.bg, color: config.text }}
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
