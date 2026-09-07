import React from 'react';
import {
  X, ShieldCheck, Download, Printer, Share2, Copy,
  CheckCircle, AlertTriangle, Shield,
} from 'lucide-react';
import { PQCCertificate } from '@/types';
import { ScoreBadge, AlgorithmTag } from '@/components/shared';

interface CertDetailModalProps {
  cert: PQCCertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

// CSS-var based theme — both light and dark
const TIER_THEME: Record<string, {
  color: string; border: string; bg: string;
  icon: React.FC<{ size: number; style?: React.CSSProperties }>;
  label: string;
}> = {
  FULLY_QUANTUM_SAFE: {
    color:  'var(--status-safe)',
    border: 'rgba(34,197,94,0.35)',
    bg:     'rgba(34,197,94,0.09)',
    icon:   ({ size, style }) => <CheckCircle size={size} style={style} aria-hidden="true" />,
    label:  'Fully Quantum Safe',
  },
  PQC_READY: {
    color:  'var(--status-high)',
    border: 'rgba(249,115,22,0.35)',
    bg:     'rgba(249,115,22,0.09)',
    icon:   ({ size, style }) => <Shield size={size} style={style} aria-hidden="true" />,
    label:  'PQC Ready (Hybrid)',
  },
  QUANTUM_VULNERABLE: {
    color:  'var(--status-critical)',
    border: 'rgba(239,68,68,0.35)',
    bg:     'rgba(239,68,68,0.09)',
    icon:   ({ size, style }) => <AlertTriangle size={size} style={style} aria-hidden="true" />,
    label:  'Quantum Vulnerable',
  },
};

export function CertDetailModal({ cert, isOpen, onClose }: CertDetailModalProps) {
  if (!isOpen || !cert) return null;

  const theme = TIER_THEME[cert.status as keyof typeof TIER_THEME] ?? TIER_THEME.QUANTUM_VULNERABLE;
  const ThemeIcon = theme.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: 'var(--surface-card)',
          border: `1px solid ${theme.border}`,
          boxShadow: `0 32px 64px rgba(0,0,0,0.45), 0 0 0 1px ${theme.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b relative z-10"
          style={{ borderColor: 'var(--border-divider)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border"
              style={{ borderColor: theme.border, background: theme.bg }}>
              <ThemeIcon size={22} style={{ color: theme.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-outfit" style={{ color: 'var(--text-primary)' }}>
                Certificate Audit Proof
              </h2>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {cert.certificate_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-7 custom-scrollbar">

          {/* Tier badge + URL */}
          <div className="flex flex-col items-center text-center mb-8">
            <span
              className="px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border"
              style={{ borderColor: theme.border, background: theme.bg, color: theme.color }}
            >
              {theme.label} ✓
            </span>
            <div className="text-xl font-bold font-outfit mb-2" style={{ color: 'var(--text-primary)' }}>
              {cert.asset_url || 'Unknown Asset'}
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Exposure Score
                </div>
                <ScoreBadge score={cert.quantum_exposure_score} size="lg" />
              </div>
              <div className="h-12 w-px" style={{ background: 'var(--border-divider)' }} aria-hidden="true" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Validity
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Issued: {cert.issued_date ?? '—'}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Expires: {cert.valid_until ?? '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Key Exchange (KEX)
              </label>
              <div className="flex items-center gap-2">
                <AlgorithmTag algorithm={cert.key_exchange} />
                {cert.status === 'FULLY_QUANTUM_SAFE' && (
                  <ShieldCheck size={13} style={{ color: 'var(--status-safe)' }} aria-hidden="true" />
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Signature Algorithm
              </label>
              <AlgorithmTag algorithm={cert.signature_algorithm} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                NIST Compliance
              </label>
              <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                {cert.nist_standard || '—'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Issuing Authority
              </label>
              <div className="text-xs font-medium flex items-center gap-1.5"
                style={{ color: 'var(--text-primary)' }}>
                {cert.issuing_platform}
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-secondary)' }}>
                  (Automated)
                </span>
              </div>
            </div>
          </div>

          {/* Proof signature */}
          <div className="mt-8 p-4 rounded-xl border group relative"
            style={{ background: 'var(--surface-card-hover)', borderColor: 'var(--glass-border)' }}>
            <label className="text-[10px] font-bold uppercase tracking-widest block mb-2 flex justify-between"
              style={{ color: 'var(--text-secondary)' }}>
              Cryptographic Proof Signature
              <button
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                style={{ color: 'var(--primary-indigo)' }}
                onClick={() => navigator.clipboard.writeText(cert.certificate_json?.signature_hash ?? '')}
              >
                <Copy size={10} aria-hidden="true" /> Copy Hash
              </button>
            </label>
            <div className="text-[10px] font-mono break-all leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}>
              {cert.certificate_json?.signature_hash
                ?? 'SHA256:d8a9e1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0'}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="p-5 border-t flex justify-between items-center"
          style={{ background: 'var(--surface-card-hover)', borderColor: 'var(--border-divider)' }}>
          <button onClick={onClose} className="btn-ghost text-xs">
            Close Audit
          </button>
          <div className="flex gap-2">
            {[
              { icon: <Share2 size={15} aria-hidden="true" />, label: 'Share' },
              { icon: <Printer size={15} aria-hidden="true" />, label: 'Print' },
            ].map(({ icon, label }) => (
              <button key={label} title={label}
                className="p-2 rounded-lg border transition-colors"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
              >
                {icon}
              </button>
            ))}
            <button
              className="eterna-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 rounded-xl"
            >
              <Download size={13} aria-hidden="true" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
