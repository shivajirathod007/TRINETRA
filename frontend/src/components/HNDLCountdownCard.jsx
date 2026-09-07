import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

const URGENCY_CONFIG = {
  IMMEDIATE: {
    color:  'var(--status-critical)',
    border: 'rgba(239,68,68,0.30)',
    bg:     'rgba(239,68,68,0.07)',
    shadow: '0 0 20px rgba(239,68,68,0.20)',
    pulse:  true,
  },
  HIGH: {
    color:  'var(--status-high)',
    border: 'rgba(249,115,22,0.30)',
    bg:     'rgba(249,115,22,0.07)',
    shadow: '0 0 12px rgba(249,115,22,0.15)',
    pulse:  false,
  },
  MEDIUM: {
    color:  'var(--status-medium)',
    border: 'rgba(234,179,8,0.30)',
    bg:     'rgba(234,179,8,0.07)',
    shadow: 'none',
    pulse:  false,
  },
};

const HNDLCountdownCard = ({ deadline, urgency }) => {
  const key     = (urgency ?? '').toUpperCase();
  const config  = URGENCY_CONFIG[key] ?? URGENCY_CONFIG.MEDIUM;

  return (
    <div
      className={`eterna-phase-card h-full flex flex-col justify-between p-6 relative overflow-hidden ${config.pulse ? 'animate-pulse-subtle' : ''}`}
      style={{
        borderColor: config.border,
        background:  config.bg,
        boxShadow:   config.shadow,
      }}
    >
      {/* Background icon */}
      <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none" aria-hidden="true">
        <Clock size={120} />
      </div>

      <div className="relative z-10 w-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} style={{ color: config.color }} aria-hidden="true" />
            <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
              HNDL RISK
            </span>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
            style={{ color: config.color, borderColor: config.border, background: config.bg }}
          >
            {urgency} ATTENTION
          </span>
        </div>

        <h3 className="text-xl font-bold font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
          Harvest Now, Decrypt Later
        </h3>
        <p className="text-xs leading-relaxed mb-6 max-w-[90%]" style={{ color: 'var(--text-secondary)' }}>
          Communications secured by vulnerable key exchanges (e.g., ECDHE) are subject to retroactive
          decryption by future CRQCs.
        </p>
      </div>

      <div
        className="relative z-10 rounded-xl p-4 mt-auto"
        style={{
          background: 'var(--surface-card)',
          border: `1px solid var(--border-divider)`,
        }}
      >
        <div className="text-xs uppercase tracking-widest mb-1 flex items-center justify-between"
          style={{ color: 'var(--text-secondary)' }}>
          <span>Migration Deadline</span>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>NIST FIPS 203/204</span>
        </div>
        <div className="text-3xl font-mono font-bold mb-2" style={{ color: config.color }}>
          {deadline}
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-card-hover)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: '85%', background: config.color }}
          />
        </div>
      </div>
    </div>
  );
};

export default HNDLCountdownCard;
