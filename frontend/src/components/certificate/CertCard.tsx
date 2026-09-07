import { ShieldCheck, ShieldAlert, Shield, ExternalLink } from 'lucide-react';
import { PQCCertificate } from '@/types';
import { ScoreBadge } from '@/components/shared';

interface CertCardProps {
  cert: PQCCertificate;
  onClick?: (cert: PQCCertificate) => void;
}

// All CSS-var based — works in both light and dark
const STATUS_STYLE: Record<string, { border: string; bg: string; color: string }> = {
  FULLY_QUANTUM_SAFE: {
    border: 'rgba(34,197,94,0.28)',
    bg:     'rgba(34,197,94,0.05)',
    color:  'var(--status-safe)',
  },
  PQC_READY: {
    border: 'rgba(249,115,22,0.28)',
    bg:     'rgba(249,115,22,0.05)',
    color:  'var(--status-high)',
  },
  QUANTUM_VULNERABLE: {
    border: 'rgba(239,68,68,0.28)',
    bg:     'rgba(239,68,68,0.05)',
    color:  'var(--status-critical)',
  },
  VULNERABLE: {
    border: 'rgba(239,68,68,0.28)',
    bg:     'rgba(239,68,68,0.05)',
    color:  'var(--status-critical)',
  },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  FULLY_QUANTUM_SAFE: <ShieldCheck size={12} aria-hidden="true" />,
  PQC_READY:          <Shield size={12} aria-hidden="true" />,
  QUANTUM_VULNERABLE: <ShieldAlert size={12} aria-hidden="true" />,
  VULNERABLE:         <ShieldAlert size={12} aria-hidden="true" />,
};

export function CertCard({ cert, onClick }: CertCardProps) {
  const s = STATUS_STYLE[cert.status] ?? STATUS_STYLE.QUANTUM_VULNERABLE;

  return (
    <div
      onClick={() => onClick?.(cert)}
      className="group rounded-xl border cursor-pointer relative overflow-hidden transition-all duration-200"
      style={{
        padding: '1rem',
        background: 'var(--surface-card)',
        borderColor: s.border,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-card-hover)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--card-shadow-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-card)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Background accent blob */}
      <div
        className="absolute top-0 right-0 w-16 h-16 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ background: s.color }}
        aria-hidden="true"
      />

      {/* Top row: ID + score */}
      <div className="flex justify-between items-start mb-3">
        <div className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--text-secondary)' }}>
          {cert.certificate_id}
        </div>
        <ScoreBadge score={cert.quantum_exposure_score} size="sm" />
      </div>

      {/* Asset URL */}
      <div className="text-sm font-bold truncate mb-3" style={{ color: 'var(--text-primary)' }}>
        {cert.asset_url}
      </div>

      {/* Bottom row: status icon + arrow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase font-outfit"
          style={{ color: s.color }}>
          <span style={{ color: s.color }}>{STATUS_ICON[cert.status]}</span>
          Audit Proof Issued
        </div>
        <span
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--primary-indigo)' }}
          aria-hidden="true"
        >
          <ExternalLink size={12} />
        </span>
      </div>
    </div>
  );
}
