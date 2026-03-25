import React from 'react';
import { X, ShieldCheck, Download, Printer, Share2, Copy, ExternalLink, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { PQCCertificate } from '@/types';
import { ScoreBadge, AlgorithmTag } from '@/components/shared';
import { clsx } from 'clsx';

interface CertDetailModalProps {
  cert: PQCCertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

const TIER_THEME = {
  FULLY_QUANTUM_SAFE: {
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    icon: CheckCircle,
    label: 'Fully Quantum Safe',
  },
  PQC_READY: {
    color: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-500/10',
    icon: Shield,
    label: 'PQC Ready (Hybrid)',
  },
  QUANTUM_VULNERABLE: {
    color: 'text-red-400',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    icon: AlertTriangle,
    label: 'Quantum Vulnerable',
  },
};

export function CertDetailModal({ cert, isOpen, onClose }: CertDetailModalProps) {
  if (!isOpen || !cert) return null;

  const theme = TIER_THEME[cert.status as keyof typeof TIER_THEME] || TIER_THEME.QUANTUM_VULNERABLE;
  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface-card border border-glass-border rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Background Glow */}
        <div className={clsx("absolute top-0 left-0 right-0 h-32 opacity-20 blur-3xl -z-10", theme.bgColor)} />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className={clsx("p-2 rounded-lg border", theme.borderColor, theme.bgColor)}>
                <Icon size={24} className={theme.color} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-primary">Certificate Audit Proof</h2>
                <p className="text-xs font-mono text-secondary">{cert.certificate_id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-card-hover text-secondary hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Main Badge Area */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className={clsx("px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border", theme.borderColor, theme.bgColor, theme.color)}>
                {theme.label} ✓
            </div>
            <div className="text-2xl font-bold font-outfit text-primary mb-2">
                {cert.asset_url || 'Unknown Asset'}
            </div>
            <div className="flex items-center gap-6 mt-4">
                <div className="text-center">
                    <div className="text-[10px] text-secondary uppercase tracking-widest mb-1">Exposure Score</div>
                    <ScoreBadge score={cert.quantum_exposure_score} size="lg" />
                </div>
                <div className="h-12 w-px bg-glass-border" />
                <div className="text-left">
                    <div className="text-[10px] text-secondary uppercase tracking-widest mb-1">Validity</div>
                    <div className="text-xs text-primary font-medium">Issued: {cert.issued_date}</div>
                    <div className="text-xs text-primary font-medium">Expires: {cert.valid_until}</div>
                </div>
            </div>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
                <label className="text-[10px] text-secondary uppercase tracking-widest block mb-1.5 font-bold">Key Exchange (KEX)</label>
                <div className="flex items-center gap-2">
                    <AlgorithmTag algorithm={cert.key_exchange} />
                    {cert.status === 'FULLY_QUANTUM_SAFE' && <ShieldCheck size={14} className="text-emerald-400" />}
                </div>
            </div>
            <div>
                <label className="text-[10px] text-secondary uppercase tracking-widest block mb-1.5 font-bold">Signature Algorithm</label>
                <div className="flex items-center gap-2">
                    <AlgorithmTag algorithm={cert.signature_algorithm} />
                </div>
            </div>
            <div>
                <label className="text-[10px] text-secondary uppercase tracking-widest block mb-1.5 font-bold">NIST Compliance</label>
                <div className="text-xs text-primary font-mono">{cert.nist_standard || '—'}</div>
            </div>
            <div>
                <label className="text-[10px] text-secondary uppercase tracking-widest block mb-1.5 font-bold">Issuing Authority</label>
                <div className="text-xs text-primary font-medium flex items-center gap-1.5">
                    {cert.issuing_platform} <span className="text-[10px] text-secondary font-normal">(Automated)</span>
                </div>
            </div>
          </div>

          {/* Raw Signature section */}
          <div className="mt-10 p-4 bg-surface-card-hover rounded-xl border border-glass-border group relative">
             <label className="text-[10px] text-secondary uppercase tracking-widest block mb-2 font-bold flex justify-between">
                Cryptographic Proof Signature
                <button className="text-primary-indigo hover:text-primary-indigo-hover opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Copy size={10} /> Copy Hash
                </button>
             </label>
             <div className="text-[10px] font-mono text-secondary break-all leading-relaxed">
                {cert.certificate_json?.signature_hash || 'SHA256:d8a9e1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0'}
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-surface-card-hover border-t border-glass-border flex justify-between items-center">
            <button 
                onClick={onClose}
                className="btn-ghost text-xs"
            >
                Close Audit
            </button>
            <div className="flex gap-2">
                <button className="p-2 text-secondary hover:text-primary transition-colors border border-glass-border rounded-lg" title="Share">
                    <Share2 size={16} />
                </button>
                <button className="p-2 text-secondary hover:text-primary transition-colors border border-glass-border rounded-lg" title="Print">
                    <Printer size={16} />
                </button>
                <button className="bg-primary-indigo hover:bg-primary-indigo-hover text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-indigo/20">
                    <Download size={14} /> Download PDF
                </button>
            </div>
        </div>
      </div>
      
      {/* Overlay click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
