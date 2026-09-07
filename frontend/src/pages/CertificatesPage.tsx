import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Shield, 
  ChevronRight, Download, FileJson, 
  AlertTriangle, CheckCircle, Clock 
} from 'lucide-react';
import { useScanStore } from '@/store';
import { useCertificates } from '@/hooks';
import { PQCCertificate } from '@/types';
import { CertCard, CertDetailModal } from '@/components/certificate';
import { LoadingSpinner, EmptyState, SectionHeader } from '@/components/shared';

const TIER_MAPPING = {
  FULLY_QUANTUM_SAFE: {
    label: 'Quantum Safe',
    icon: CheckCircle,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
  },
  PQC_READY: {
    label: 'Post Quantum Cryptography (PQC) Ready',
    icon: Shield,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/5',
  },
  QUANTUM_VULNERABLE: {
    label: 'Vulnerable',
    icon: AlertTriangle,
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/5',
  },
};

export default function CertificatesPage() {
  const { activeScanId, activeDomain } = useScanStore();
  const { data: certs = [], isLoading } = useCertificates(activeScanId);
  const [selectedCert, setSelectedCert] = useState<PQCCertificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCertClick = (cert: PQCCertificate) => {
    setSelectedCert(cert);
    setIsModalOpen(true);
  };

  if (!activeScanId) return <EmptyState message="No active scan selected. Please initiate a scan first." />;
  if (isLoading) return <div className="flex justify-center pt-20"><LoadingSpinner size={32} /></div>;

  const tiers = {
    FULLY_QUANTUM_SAFE: certs.filter(c => c.status === 'FULLY_QUANTUM_SAFE'),
    PQC_READY: certs.filter(c => c.status === 'PQC_READY'),
    QUANTUM_VULNERABLE: certs.filter(c => c.status === 'QUANTUM_VULNERABLE'),
  };

  return (
    <div className="animate-fadeIn pb-12">
      <SectionHeader 
        title="PQC Readiness Certificates" 
        subtitle={`Audit proof for ${activeDomain}`}
        action={
            <div className="flex gap-2">
                <button className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 opacity-50 cursor-not-allowed">
                    <Download size={14} /> Batch Export (PDF)
                </button>
            </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.keys(TIER_MAPPING) as Array<keyof typeof TIER_MAPPING>).map((tierKey) => {
          const config = TIER_MAPPING[tierKey];
          const tierCerts = tiers[tierKey];

          return (
            <div 
              key={tierKey} 
              className="eterna-phase-card flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                border: `1px solid`,
                borderColor: config.borderColor.includes('emerald') ? 'rgba(34,197,94,0.25)' : config.borderColor.includes('orange') ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)',
                background: config.bgColor.includes('emerald') ? 'rgba(34,197,94,0.04)' : config.bgColor.includes('orange') ? 'rgba(249,115,22,0.04)' : 'rgba(239,68,68,0.04)',
              }}
            >
              <div className="p-5 text-center"
                style={{ borderBottom: '1px solid var(--border-divider)' }}>
                <div className="flex justify-center mb-3">
                    <div className="p-3.5 rounded-2xl" 
                      style={{
                        background: 'var(--surface-card)',
                        border: `1px solid`,
                        borderColor: config.borderColor.includes('emerald') ? 'rgba(34,197,94,0.25)' : config.borderColor.includes('orange') ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}>
                        <config.icon size={26} className={config.color} />
                    </div>
                </div>
                <h2 className={`font-bold tracking-widest uppercase text-xs font-outfit ${config.color}`}>
                  {config.label}
                </h2>
                <div className="text-2xl font-mono font-black mt-1" style={{ color: 'var(--text-primary)' }}>
                  {tierCerts.length} <span className="text-xs font-sans font-normal" style={{ color: 'var(--text-secondary)' }}>entities</span>
                </div>
              </div>

              {/* Asset List */}
              <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {tierCerts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 opacity-40 italic text-xs text-secondary font-mono">
                    No certificates in this tier
                  </div>
                ) : (
                  tierCerts.map((cert) => (
                    <CertCard key={cert.id} cert={cert} onClick={handleCertClick} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Info */}
      <div className="mt-6 p-5 eterna-phase-card rounded-2xl flex items-start gap-4">
        <div className="p-3 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', color: '#a78bfa' }}>
            <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <div>
            <h4 className="font-bold mb-1 font-outfit" style={{ color: 'var(--text-primary)' }}>About PQC Readiness Certificates</h4>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                These certificates are cryptographic attestations generated by the TRINETRA engine. 
                They categorize infrastructure assets based on their resistance to Quantum Computing attacks (Mosca's Theorem).
                Assets marked as <span className="font-bold" style={{ color: 'var(--status-safe)' }}>Quantum Safe</span> utilize PQC algorithms (e.g. ML-KEM, ML-DSA) 
                or utilize quantum-resistant key lengths and forward secrecy mechanisms validated for the CRQC target year.
            </p>
        </div>
      </div>

      <CertDetailModal 
        cert={selectedCert} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
