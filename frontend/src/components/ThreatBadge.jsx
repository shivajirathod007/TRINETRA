import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

// ─── Level → style config ────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  CRITICAL:          { bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)',  Icon: ShieldX,       pulse: true },
  HIGH:              { bg: 'rgba(249,115,22,0.13)', color: 'var(--status-high)',     border: 'rgba(249,115,22,0.30)', Icon: AlertTriangle },
  MEDIUM:            { bg: 'rgba(234,179,8,0.13)',  color: 'var(--status-medium)',   border: 'rgba(234,179,8,0.30)',  Icon: AlertCircle },
  LOW:               { bg: 'rgba(59,130,246,0.13)', color: 'var(--status-low)',      border: 'rgba(59,130,246,0.30)', Icon: Info },
  SAFE:              { bg: 'rgba(34,197,94,0.13)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.30)',  Icon: ShieldCheck },
  PQC_READY:         { bg: 'rgba(249,115,22,0.13)', color: 'var(--status-high)',     border: 'rgba(249,115,22,0.30)', Icon: ShieldAlert },
  QUANTUM_VULNERABLE:{ bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)',  Icon: ShieldX },
  VULNERABLE:        { bg: 'rgba(239,68,68,0.13)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.30)',  Icon: ShieldX },
  FULLY_QUANTUM_SAFE:{ bg: 'rgba(34,197,94,0.13)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.30)',  Icon: ShieldCheck },
  SHADOW:            { bg: 'rgba(245,158,11,0.13)', color: 'var(--accent-amber)',    border: 'rgba(245,158,11,0.30)', Icon: AlertTriangle },
};

const DEFAULT_CONFIG = {
  bg: 'var(--surface-card)',
  color: 'var(--text-secondary)',
  border: 'var(--glass-border)',
  Icon: Info,
};

const ThreatBadge = ({ level, className = '' }) => {
  if (!level) return null;

  const key = level.toUpperCase().replace(/\s+/g, '_');
  const config = LEVEL_CONFIG[key] ?? DEFAULT_CONFIG;
  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.pulse ? 'animate-pulse-subtle' : ''} ${className}`}
      style={{
        background: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      <Icon size={12} aria-hidden="true" />
      {level}
    </span>
  );
};

export default ThreatBadge;
