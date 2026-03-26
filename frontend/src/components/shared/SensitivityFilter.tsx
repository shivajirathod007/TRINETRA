/**
 * SensitivityFilter — multi-select filter control for data_sensitivity_tier.
 * Appends `data_sensitivity_tier` query param to the asset list request.
 *
 * Requirements: 8.3, 8.5
 */

import React from "react";

type Tier = "transaction" | "authentication" | "static";

interface SensitivityFilterProps {
  selected: Tier[];
  onChange: (tiers: Tier[]) => void;
  className?: string;
}

const TIERS: { value: Tier; label: string; color: string }[] = [
  { value: "transaction", label: "Transaction", color: "#E24B4A" },
  { value: "authentication", label: "Auth", color: "#EF9F27" },
  { value: "static", label: "Static", color: "#6B7280" },
];

export const SensitivityFilter: React.FC<SensitivityFilterProps> = ({
  selected,
  onChange,
  className = "",
}) => {
  const toggle = (tier: Tier) => {
    if (selected.includes(tier)) {
      onChange(selected.filter((t) => t !== tier));
    } else {
      onChange([...selected, tier]);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Filter by data sensitivity tier"
    >
      <span className="text-xs text-gray-400 mr-1">Tier:</span>
      {TIERS.map(({ value, label, color }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-opacity ${
              active ? "opacity-100" : "opacity-40"
            }`}
            style={{
              borderColor: color,
              backgroundColor: active ? color : "transparent",
              color: active ? "#ffffff" : color,
            }}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-gray-500 hover:text-gray-300 ml-1"
          aria-label="Clear tier filter"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
};

export default SensitivityFilter;
