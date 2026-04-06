import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, Shield, ExternalLink } from 'lucide-react';
import { PQCCertificate } from '@/types';
import { ScoreBadge } from '@/components/shared';

interface CertCardProps {
  cert: PQCCertificate;
  onClick?: (cert: PQCCertificate) => void;
}

const STATUS_COLOR: Record<string, string> = {
  FULLY_QUANTUM_SAFE: 'text-emerald-400',
  PQC_READY: 'text-orange-400',
  QUANTUM_VULNERABLE: 'text-red-400',
};

const BORDER_COLOR: Record<string, string> = {
  FULLY_QUANTUM_SAFE: 'border-emerald-500/30',
  PQC_READY: 'border-orange-500/30',
  QUANTUM_VULNERABLE: 'border-red-500/30',
};

const BG_COLOR: Record<string, string> = {
  FULLY_QUANTUM_SAFE: 'bg-emerald-500/5',
  PQC_READY: 'bg-orange-500/5',
  QUANTUM_VULNERABLE: 'bg-red-500/5',
};

export function CertCard({ cert, onClick }: CertCardProps) {
  const status = cert.status as keyof typeof STATUS_COLOR;
  
  return (
    <div 
      onClick={() => onClick?.(cert)}
      className={clsx(
        "group p-4 rounded-xl border bg-surface-card transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]",
        BORDER_COLOR[status] || "border-glass-border",
        "hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/20"
      )}
    >
      {/* Background Accent */}
      <div className={clsx(
        "absolute top-0 right-0 w-16 h-16 blur-2xl opacity-10 transition-opacity group-hover:opacity-20",
        BG_COLOR[status] || "bg-white/5"
      )} />

      <div className="flex justify-between items-start mb-3">
        <div className="font-mono text-[10px] text-secondary tracking-widest uppercase">
          {cert.certificate_id}
        </div>
        <ScoreBadge score={cert.quantum_exposure_score} size="sm" />
      </div>

      <div className="text-sm font-bold text-primary truncate mb-1">
        {cert.asset_url}
      </div>

      <div className="flex items-center justify-between mt-3">
         <div className="flex items-center gap-1.5">
            {cert.status === 'FULLY_QUANTUM_SAFE' && <ShieldCheck size={12} className="text-emerald-400" />}
            {cert.status === 'PQC_READY' && <Shield size={12} className="text-orange-400" />}
            {cert.status === 'QUANTUM_VULNERABLE' && <ShieldAlert size={12} className="text-red-400" />}
            <span className="text-[10px] text-secondary font-medium uppercase font-outfit">Audit Proof Issued</span>
         </div>
         <div className="text-primary-indigo opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
            <ExternalLink size={12} />
         </div>
      </div>
    </div>
  );
}
