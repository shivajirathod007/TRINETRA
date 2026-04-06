/**
 * CBOMPage — Operations Center & PQC Readiness Dashboard
 * Fully backend-driven. Features:
 *   - TRINETRA CERTIFIED PQC CBOM Certificate panel (per-scan + all-scans listing)
 *   - PQC Readiness Certificates (3 columns: Vulnerable, PQC Ready, Quantum Safe)
 *   - KPI Tiles (Org Risk Score, Total Assets, Critical, PQC Ready, Fully Safe)
 *   - Cryptographic Asset Map with TLS/cipher/cert context tooltips
 *   - Risk Distribution pie + Algorithm/TLS breakdown bars
 *   - Detail modal with impact explanations for each finding
 */
import { useMemo, useState, useEffect } from 'react';
import {
  Download, Shield, AlertTriangle, CheckCircle2, ChevronDown,
  RefreshCw, X, Globe, Lock, Key, Clock, TrendingUp, Award,
  Info, FileText, Wifi
} from 'lucide-react';
import { useScanStore } from '../store';
import { useCBOM, useScanHistory, useCertificates } from '../hooks';
import { RiskBadge } from '../components/shared';
import { certApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';

// ─── Constants: impact explanations ──────────────────────────────────────────

const TLS_IMPACT: Record<string, { label: string; color: string; impact: string }> = {
  'TLS_1_3': { label: 'TLS 1.3', color: '#22c55e', impact: 'Best available. Forward secrecy enforced. No legacy cipher fallback.' },
  'TLS_1_2': { label: 'TLS 1.2', color: '#eab308', impact: 'Acceptable but depends on cipher suite. Weak ciphers possible. Upgrade to 1.3 recommended.' },
  'TLS_1_1': { label: 'TLS 1.1', color: '#f97316', impact: 'Deprecated (RFC 8996). Vulnerable to BEAST/POODLE. Immediate upgrade required.' },
  'TLS_1_0': { label: 'TLS 1.0', color: '#ef4444', impact: 'Critically deprecated. Vulnerable to POODLE, BEAST. Banned by PCI-DSS. Disable immediately.' },
};

const KEX_IMPACT: Record<string, { color: string; impact: string }> = {
  'ECDHE':      { color: '#eab308', impact: 'Forward-secret but quantum-vulnerable. A CRQC can break ECDH. Score +85.' },
  'RSA_KEX':    { color: '#ef4444', impact: 'Static RSA key exchange. No forward secrecy. Data decryptable retroactively. Score +95.' },
  'DHE':        { color: '#f97316', impact: 'Forward-secret but quantum-vulnerable. Larger key than ECDHE. Score +80.' },
  'ML-KEM-768': { color: '#22c55e', impact: 'NIST FIPS 203 post-quantum KEM. Fully quantum-safe. Score +2.' },
  'KYBER':      { color: '#3b82f6', impact: 'Hybrid PQC mode. Partially protected. Transitional — not fully safe yet. Score +15.' },
};

const CERT_ALGO_IMPACT: Record<string, { color: string; impact: string }> = {
  'RSA-2048':                  { color: '#ef4444', impact: 'Quantum-vulnerable. Shor\'s algorithm breaks RSA in polynomial time on a CRQC.' },
  'RSA-4096':                  { color: '#f97316', impact: 'Larger key but still quantum-vulnerable. Provides no protection against CRQCs.' },
  'ECDSA-256':                 { color: '#ef4444', impact: 'Elliptic curve — quantum-vulnerable. CRQC breaks ECDSA via Shor\'s algorithm.' },
  'sha256WithRSAEncryption':   { color: '#ef4444', impact: 'RSA-based signature. Quantum-vulnerable. Migrate to ML-DSA (FIPS 204).' },
  'sha384WithRSAEncryption':   { color: '#f97316', impact: 'RSA-based signature. Quantum-vulnerable despite larger hash.' },
  'ML-DSA-65':                 { color: '#22c55e', impact: 'NIST FIPS 204 post-quantum signature. Fully quantum-safe.' },
  'ED25519':                   { color: '#3b82f6', impact: 'Classically safe but NOT quantum-safe. Migrate to ML-DSA for PQC readiness.' },
};

function toStr(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0] ? String(v[0]) : '';
  return String(v);
}

function getTlsInfo(tls?: any) {
  const s = toStr(tls);
  if (!s) return null;
  const key = s.replace('TLS ', 'TLS_').replace(/\./g, '_');
  return TLS_IMPACT[s] || TLS_IMPACT[key] || null;
}

function getKexInfo(kex?: any) {
  const s = toStr(kex);
  if (!s) return null;
  return KEX_IMPACT[s] || null;
}

function getCertInfo(cert?: any) {
  const s = toStr(cert);
  if (!s) return null;
  return CERT_ALGO_IMPACT[s] || null;
}

// ─── Tooltip helper ───────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-secondary/50 hover:text-primary-indigo cursor-help ml-1" />
      {show && (
        <span className="absolute z-50 bottom-5 left-0 w-64 text-xs text-secondary bg-surface-card border border-glass-border rounded-lg p-3 shadow-xl leading-relaxed pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── TRINETRA Certificate Card ────────────────────────────────────────────────

function TRINETRACertCard({ cert }: { cert: any }) {
  const statusMap: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
    QUANTUM_VULNERABLE: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'QUANTUM VULNERABLE', icon: <AlertTriangle size={14} /> },
    PQC_READY:          { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'PQC READY',          icon: <Shield size={14} /> },
    FULLY_QUANTUM_SAFE: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  label: 'QUANTUM SAFE',       icon: <CheckCircle2 size={14} /> },
  };
  const rawStatus = String(cert.pqc_status || cert.status || cert.certificate_json?.status || '').toUpperCase();
  const s = statusMap[rawStatus] || statusMap.QUANTUM_VULNERABLE;
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2 hover:scale-[1.01] transition-transform"
      style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: s.color }}>
          {s.icon}
          <span className="text-[10px] font-black tracking-widest uppercase">{s.label}</span>
        </div>
        <span className="text-[9px] font-mono text-secondary">{cert.certificate_id}</span>
      </div>
      <div className="font-mono text-xs text-primary truncate" title={cert.asset_url}>{cert.asset_url}</div>
      <div className="flex items-center gap-3 text-[10px] text-secondary flex-wrap">
        {(cert.cert_algorithm || cert.signature_algorithm) && <span className="font-mono">{cert.cert_algorithm || cert.signature_algorithm}</span>}
        {cert.nist_standard && <span className="text-primary-indigo font-bold">{cert.nist_standard}</span>}
        <span>Score: <span className="font-bold" style={{ color: s.color }}>{cert.score ?? cert.quantum_exposure_score ?? '—'}</span></span>
      </div>
      <div className="flex items-center justify-between text-[9px] text-secondary/60 font-mono mt-1">
        <span>Issued: {cert.issued_at || cert.issued_date || '—'}</span>
        <span>Valid until: {cert.valid_until || '—'}</span>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ComponentModal({ comp, onClose }: { comp: any; onClose: () => void }) {
  const tlsInfo  = getTlsInfo(comp.tls);
  const kexInfo  = getKexInfo(comp.kx || comp.key_exchange);
  const certInfo = getCertInfo(comp.cert || comp.cert_algorithm);

  const rows = [
    {
      label: 'TLS Version',
      value: comp.tls || '—',
      icon: <Wifi size={14} />,
      impact: tlsInfo?.impact,
      color: tlsInfo?.color,
    },
    {
      label: 'Key Exchange',
      value: comp.kx || comp.key_exchange || '—',
      icon: <Key size={14} />,
      impact: kexInfo?.impact,
      color: kexInfo?.color,
    },
    {
      label: 'Cipher Suite',
      value: comp.cipher || '—',
      icon: <Lock size={14} />,
      impact: 'The negotiated cipher suite determines encryption strength and forward secrecy. Weak ciphers (RC4, 3DES, CBC) are flagged.',
      color: undefined,
    },
    {
      label: 'Certificate Algorithm',
      value: comp.cert || comp.cert_algorithm || '—',
      icon: <Shield size={14} />,
      impact: certInfo?.impact,
      color: certInfo?.color,
    },
    {
      label: 'Certificate Issuer',
      value: comp.issuer || comp.cert_issuer || '—',
      icon: <Award size={14} />,
      impact: 'Certificate Authority that signed this certificate. Self-signed certs are flagged as higher risk.',
      color: undefined,
    },
    {
      label: 'Cert Expiry',
      value: comp.expiry || comp.cert_expiry || '—',
      icon: <Clock size={14} />,
      impact: 'Certificates expiring within 90 days increase HNDL urgency. Expired certs are critical.',
      color: undefined,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div className="glass-card border rounded-2xl w-full max-w-2xl overflow-hidden"
        style={{ borderColor: 'rgba(99,102,241,0.3)', boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border flex items-start justify-between gap-4"
          style={{ background: 'rgba(99,102,241,0.06)' }}>
          <div>
            <div className="font-bold text-primary font-mono text-sm max-w-[420px] truncate">{comp.url || comp.name}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <RiskBadge level={comp.status || comp.risk_level || 'UNKNOWN'} />
              {comp.is_shadow && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 px-2 py-0.5 rounded-full border border-orange-400/30 bg-orange-400/10">
                  <AlertTriangle size={10} /> SHADOW ASSET
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary mt-1"><X size={18} /></button>
        </div>

        {/* Risk Score Bar */}
        <div className="px-6 py-3 border-b border-glass-border/50 flex items-center gap-4">
          <span className="text-xs text-secondary font-semibold w-24">Quantum Risk</span>
          <div className="flex-1 h-2 rounded-full bg-surface-card overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${comp.score ?? 0}%`,
                background: (comp.score ?? 0) > 70 ? '#ef4444' : (comp.score ?? 0) > 40 ? '#f97316' : '#22c55e'
              }} />
          </div>
          <span className="font-black font-mono text-sm w-12 text-right"
            style={{ color: (comp.score ?? 0) > 70 ? '#ef4444' : '#94a3b8' }}>
            {comp.score ?? '—'}/100
          </span>
        </div>

        {/* Findings with impact explanations */}
        <div className="divide-y divide-glass-border/30 max-h-[400px] overflow-y-auto">
          {rows.map(r => (
            <div key={r.label} className="flex px-6 py-3.5 gap-3 items-start">
              <span className="text-primary-indigo/60 mt-0.5 shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">{r.label}</span>
                </div>
                <div className="font-mono text-sm text-primary truncate" style={r.color ? { color: r.color } : {}}>
                  {r.value}
                </div>
                {r.impact && (
                  <div className="text-[10px] text-secondary/70 mt-1 leading-relaxed">{r.impact}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-glass-border flex justify-end">
          <button onClick={onClose} className="text-xs text-secondary hover:text-primary px-4 py-2 rounded-lg border border-glass-border transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRINETRA Certificate Listing Panel ──────────────────────────────────────

function CertificatesPanel({ scanId, allScans }: { scanId: string; allScans: any[] }) {
  const [view, setView] = useState<'current' | 'all'>('current');
  const [allCerts, setAllCerts] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const { data: currentCerts = [], isLoading } = useCertificates(scanId || null);

  const loadAllCerts = async () => {
    if (allCerts.length > 0) { setView('all'); return; }
    setLoadingAll(true);
    try {
      const results = await Promise.all(
        allScans.slice(0, 10).map(s => certApi.byScan(s.scan_id || s.id).catch(() => []))
      );
      setAllCerts(results.flat());
    } catch { /* ignore */ }
    setLoadingAll(false);
    setView('all');
  };

  const certs = view === 'current' ? (currentCerts as any[]) : allCerts;

  // Normalize status — actual endpoint returns 'pqc_status', fallback to 'status'
  const normStatus = (c: any): string => {
    const s = c.pqc_status || c.status || c.certificate_json?.status || '';
    return String(s).toUpperCase();
  };

  const vulnCount  = certs.filter(c => normStatus(c) === 'QUANTUM_VULNERABLE').length;
  const readyCount = certs.filter(c => normStatus(c) === 'PQC_READY').length;
  const safeCount  = certs.filter(c => normStatus(c) === 'FULLY_QUANTUM_SAFE').length;

  return (
    <div className="glass-card border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between gap-4"
        style={{ background: 'rgba(99,102,241,0.04)' }}>
        <div className="flex items-center gap-3">
          <Award size={18} className="text-primary-indigo" />
          <div>
            <div className="font-bold text-primary text-sm">TRINETRA CERTIFIED PQC CBOM Certificates</div>
            <div className="text-[10px] text-secondary mt-0.5">Tamper-evident quantum readiness certificates issued per asset</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('current')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${view === 'current' ? 'bg-primary-indigo text-white border-primary-indigo' : 'border-glass-border text-secondary hover:text-primary'}`}>
            This Scan
          </button>
          <button
            onClick={loadAllCerts}
            disabled={loadingAll}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${view === 'all' ? 'bg-primary-indigo text-white border-primary-indigo' : 'border-glass-border text-secondary hover:text-primary'}`}>
            {loadingAll ? <RefreshCw size={11} className="animate-spin" /> : <FileText size={11} />}
            All Scans
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x divide-glass-border border-b border-glass-border">
        {[
          { label: 'Quantum Vulnerable', count: vulnCount, color: '#ef4444' },
          { label: 'PQC Ready',          count: readyCount, color: '#f97316' },
          { label: 'Quantum Safe',       count: safeCount,  color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="px-5 py-3 flex flex-col items-center">
            <span className="text-2xl font-black" style={{ color: s.color }}>{s.count}</span>
            <span className="text-[9px] font-bold text-secondary uppercase tracking-wider mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Certificate list */}
      <div className="p-5">
        {isLoading || loadingAll ? (
          <div className="flex items-center justify-center py-10 text-secondary text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading certificates…
          </div>
        ) : certs.length === 0 ? (
          <div className="text-center py-10 text-secondary text-sm">
            <Award size={32} className="mx-auto mb-3 opacity-20" />
            No certificates issued yet. Run a scan to generate PQC readiness certificates.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {certs.map((cert: any, i: number) => (
              <TRINETRACertCard key={cert.certificate_id || i} cert={cert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CBOMPage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain, setActiveScan } = useScanStore();
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [selectedComp, setSelectedComp] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'risk' | 'tls' | 'cert'>('risk');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: scansData } = useScanHistory(null);
  const scans: any[] = scansData || [];

  useEffect(() => {
    if (activeScanId && !selectedScanId) setSelectedScanId(activeScanId);
    else if (!selectedScanId && scans.length > 0) {
      const best = scans.find(s => s.status === 'completed') ?? scans[0];
      if (best) setSelectedScanId(best.scan_id || best.id);
    }
  }, [activeScanId, scans, selectedScanId]);

  const currentDomain = scans.find(s => (s.scan_id || s.id) === selectedScanId)?.domain || activeDomain || 'Unknown Target';

  const { data: cbomData, isLoading } = useCBOM(selectedScanId || null);

  // ── Map CBOM components from backend ──────────────────────────────────────
  const allComponents: any[] = useMemo(() => {
    if (!cbomData?.components?.length) return [];
    return cbomData.components.map((c: any) => ({
      url:          c.url ?? c.name ?? '—',
      type:         c.type ?? 'web_service',
      // status = PQC classification: QUANTUM_VULNERABLE / PQC_READY / FULLY_QUANTUM_SAFE / UNKNOWN
      status:       (c.status ?? 'UNKNOWN').toUpperCase(),
      // risk_level = CRITICAL / HIGH / MEDIUM / LOW / SAFE
      risk_level:   (c.risk_level ?? 'UNKNOWN').toUpperCase(),
      score:        c.score ?? c.quantum_exposure_score ?? 0,
      is_shadow:    !!c.is_shadow,
      tls:          toStr(c.tls ?? c.tls_version ?? null) || null,
      cipher:       toStr(c.cipher ?? c.cipher_suite ?? null) || null,
      kx:           toStr(c.kx ?? c.key_exchange ?? null) || null,
      cert:         toStr(c.cert ?? c.cert_algorithm ?? null) || null,
      issuer:       toStr(c.issuer ?? c.cert_issuer ?? null) || null,
      expiry:       toStr(c.expiry ?? c.cert_expiry ?? null) || null,
    }));
  }, [cbomData]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const RISK_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4, UNKNOWN: 5 };
  const PQC_ORDER: Record<string, number>  = { QUANTUM_VULNERABLE: 0, PQC_READY: 1, FULLY_QUANTUM_SAFE: 2, UNKNOWN: 3 };
  const TLS_ORDER: Record<string, number>  = { TLS_1_0: 0, TLS_1_1: 1, TLS_1_2: 2, TLS_1_3: 3 };

  const filteredComponents = useMemo(() => {
    let list = filterStatus === 'ALL'
      ? allComponents
      : allComponents.filter(c => c.status === filterStatus || c.risk_level === filterStatus);
    if (sortBy === 'risk')  list = [...list].sort((a, b) => (RISK_ORDER[a.risk_level] ?? 9) - (RISK_ORDER[b.risk_level] ?? 9));
    if (sortBy === 'tls')   list = [...list].sort((a, b) => (TLS_ORDER[a.tls] ?? 9) - (TLS_ORDER[b.tls] ?? 9));
    if (sortBy === 'cert')  list = [...list].sort((a, b) => (a.cert ?? '').localeCompare(b.cert ?? ''));
    return list;
  }, [allComponents, filterStatus, sortBy]);

  // ── Stats — use PQC status for PQC counts, risk_level for risk counts ──────
  const stats = useMemo(() => {
    const vulnCount  = allComponents.filter(c => c.status === 'QUANTUM_VULNERABLE').length;
    const readyCount = allComponents.filter(c => c.status === 'PQC_READY').length;
    const safeCount  = allComponents.filter(c => c.status === 'FULLY_QUANTUM_SAFE').length;
    const critCount  = allComponents.filter(c => c.risk_level === 'CRITICAL').length;
    const highCount  = allComponents.filter(c => c.risk_level === 'HIGH').length;
    const shadowCount = allComponents.filter(c => c.is_shadow).length;
    const orgScore = cbomData?.organization_summary?.organization_quantum_exposure_score
      ?? (allComponents.length ? Math.round(allComponents.reduce((s, c) => s + (c.score || 0), 0) / allComponents.length) : 0);
    return { vulnCount, readyCount, safeCount, critCount, highCount, shadowCount, total: allComponents.length, orgScore };
  }, [allComponents, cbomData]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const riskChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allComponents.forEach(c => { counts[c.risk_level] = (counts[c.risk_level] || 0) + 1; });
    const colorMap: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6', SAFE: '#22c55e', UNKNOWN: '#475569' };
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: colorMap[name] || '#475569' }));
  }, [allComponents]);

  const algoChartData: any[] = (cbomData as any)?.algorithm_distribution ?? [];
  const tlsChartData: any[]  = (cbomData as any)?.tls_distribution ?? [];

  const shadowAssets = allComponents.filter(c => c.is_shadow);

  const handleDownload = () => {
    if (!cbomData) return;
    const blob = new Blob([JSON.stringify(cbomData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cbom-${currentDomain}-${selectedScanId?.slice(0, 8)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const statusFilters = ['ALL', 'QUANTUM_VULNERABLE', 'PQC_READY', 'FULLY_QUANTUM_SAFE', 'UNKNOWN'];
  const statusFilterLabels: Record<string, string> = {
    'ALL': 'ALL',
    'QUANTUM_VULNERABLE': 'VULNERABLE',
    'PQC_READY': 'PQC READY',
    'FULLY_QUANTUM_SAFE': 'SAFE',
    'UNKNOWN': 'UNKNOWN',
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Operations Center</h1>
          <p className="text-xs text-secondary mt-1">Cryptographic Bill of Materials — PQC Readiness Intelligence</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-secondary text-xs uppercase tracking-widest font-bold">Target:</span>
          <div className="relative">
            <select
              value={selectedScanId}
              onChange={e => {
                const id = e.target.value;
                setSelectedScanId(id);
                const s = scans.find(x => (x.scan_id || x.id) === id);
                if (s) setActiveScan(id, s.domain);
              }}
              className="appearance-none bg-surface-card border border-glass-border text-primary font-mono text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer min-w-[200px]"
            >
              {scans.map(s => {
                const id = s.scan_id || s.id;
                return <option key={id} value={id}>{s.domain} ({s.status})</option>;
              })}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-2.5 text-secondary pointer-events-none" />
          </div>
          <button className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors">
            <RefreshCw size={12} /> Live Sync
          </button>
          {allComponents.length > 0 && (
            <button onClick={handleDownload} className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-glass-border text-secondary hover:text-primary hover:border-primary-indigo/50 transition-all">
              <Download size={14} /> Export JSON
            </button>
          )}
        </div>
      </div>

      {/* ── Shadow Alert ─────────────────────────────────────────────── */}
      {shadowAssets.length > 0 && (
        <div className="border rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-bold text-red-400 text-sm mb-1">SHADOW ASSETS DETECTED ({shadowAssets.length})</div>
            <div className="text-xs text-secondary leading-relaxed">
              Assets found via CT log mining that are NOT in the known inventory: {' '}
              <span className="font-mono text-primary">{shadowAssets.slice(0, 3).map(s => s.url).join(', ')}{shadowAssets.length > 3 ? ` +${shadowAssets.length - 3} more` : ''}</span>.
              {' '}These may be forgotten subdomains still running vulnerable cryptography.
            </div>
          </div>
        </div>
      )}

      {/* ── TRINETRA Certificates Panel ──────────────────────────────── */}
      <CertificatesPanel scanId={selectedScanId} allScans={scans} />

      {/* ── PQC Readiness Columns ────────────────────────────────────── */}
      <div className="glass-card border rounded-xl p-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
        <div className="mb-5 pb-4 border-b border-glass-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-primary">PQC Readiness Certificates</h2>
            <div className="text-xs text-secondary mt-1">Domain: <span className="font-mono text-primary">{currentDomain}</span></div>
          </div>
          <div className="text-xs text-secondary font-mono">{allComponents.length} assets classified</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              key: 'QUANTUM_VULNERABLE',
              label: 'Quantum Vulnerable',
              sublabel: 'RSA/ECDSA/ECDHE — broken by CRQC via Shor\'s algorithm',
              color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
              icon: <AlertTriangle size={20} className="text-red-400" />,
              count: stats.vulnCount,
            },
            {
              key: 'PQC_READY',
              label: 'PQC Ready',
              sublabel: 'Hybrid or transitional mode — partially protected',
              color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)',
              icon: <Shield size={20} className="text-orange-400" />,
              count: stats.readyCount,
            },
            {
              key: 'FULLY_QUANTUM_SAFE',
              label: 'Quantum Safe',
              sublabel: 'NIST FIPS 203/204/205 — fully post-quantum protected',
              color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',
              icon: <CheckCircle2 size={20} className="text-green-400" />,
              count: stats.safeCount,
            },
          ].map(col => (
            <div key={col.key} className="rounded-xl border p-5 flex flex-col" style={{ background: col.bg, borderColor: col.border }}>
              <div className="flex flex-col items-center text-center mb-5 pb-5 border-b" style={{ borderColor: col.border }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 mb-3" style={{ borderColor: col.color }}>
                  {col.icon}
                </div>
                <div className="text-[11px] font-black tracking-widest uppercase mb-1" style={{ color: col.color }}>{col.label}</div>
                <div className="text-[9px] text-secondary/70 leading-relaxed mb-2">{col.sublabel}</div>
                <div><span className="text-2xl font-black" style={{ color: col.color }}>{col.count}</span> <span className="text-xs text-secondary">assets</span></div>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 240 }}>
                {allComponents.filter(c => c.status === col.key).map((c, i) => (
                  <button key={i} onClick={() => setSelectedComp(c)}
                    className="flex items-center justify-between text-xs font-mono text-secondary hover:text-primary text-left group transition-colors">
                    <span className="truncate pr-2">{c.url}</span>
                    <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 -rotate-90 shrink-0 transition-opacity" />
                  </button>
                ))}
                {col.count === 0 && (
                  <div className="text-xs text-center text-secondary/40 italic py-8">No assets in this category yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Tiles ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'ORG RISK SCORE', value: stats.orgScore, unit: '/100', color: stats.orgScore > 70 ? '#ef4444' : stats.orgScore > 40 ? '#f97316' : '#22c55e', icon: <TrendingUp size={40} className="absolute right-0 bottom-0 opacity-10" /> },
          { label: 'TOTAL ASSETS',   value: stats.total,    unit: '',     color: '#e2e8f0', icon: <Globe size={40} className="absolute right-0 bottom-0 opacity-10" /> },
          { label: 'VULNERABLE',     value: stats.vulnCount, unit: '',   color: '#ef4444', icon: <AlertTriangle size={40} className="absolute right-0 bottom-0 opacity-10 text-red-400" /> },
          { label: 'PQC READY',      value: stats.readyCount, unit: '',  color: '#8b5cf6', icon: <Shield size={40} className="absolute right-0 bottom-0 opacity-10 text-purple-400" /> },
          { label: 'FULLY SAFE',     value: stats.safeCount, unit: '',   color: '#22c55e', icon: <CheckCircle2 size={40} className="absolute right-0 bottom-0 opacity-10 text-green-400" /> },
        ].map(t => (
          <div key={t.label} className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
            <div className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-1">{t.label}</div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black" style={{ color: t.color }}>{t.value}</span>
              {t.unit && <span className="text-xs text-secondary mb-0.5">{t.unit}</span>}
            </div>
            {t.icon}
          </div>
        ))}
      </div>

      {/* ── Asset Map + Charts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Asset Table */}
        <div className="lg:col-span-2 glass-card border rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-bold text-primary">Cryptographic Asset Map</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <div className="flex items-center gap-1">
                {statusFilters.map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all ${filterStatus === f ? 'bg-primary-indigo text-white border-primary-indigo' : 'border-glass-border text-secondary hover:text-primary'}`}>
                    {statusFilterLabels[f] ?? f}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="text-xs bg-surface-card border border-glass-border rounded-lg px-3 py-1.5 text-secondary focus:outline-none cursor-pointer">
                <option value="risk">Sort: Risk</option>
                <option value="tls">Sort: TLS</option>
                <option value="cert">Sort: Cert Algo</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-secondary gap-2 text-sm">
              <RefreshCw size={16} className="animate-spin" /> Loading CBOM…
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-secondary text-sm">No assets found for this scan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border">
                    {['URL', 'TYPE', 'TLS', 'CERT ALGO', 'STATUS', 'SCORE', 'DISCOVERY'].map(h => (
                      <th key={h} className="text-left py-3 px-2 text-[9px] font-bold text-secondary uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredComponents.map((row, i) => {
                    const tlsInfo = getTlsInfo(row.tls);
                    return (
                      <tr key={i} onClick={() => setSelectedComp(row)}
                        className="border-b border-glass-border/30 hover:bg-surface-card-hover/40 transition-colors cursor-pointer group">
                        <td className="py-3 px-2 font-mono text-primary text-xs max-w-[180px] truncate" title={row.url}>{row.url}</td>
                        <td className="py-3 px-2 text-xs text-secondary capitalize">{row.type?.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-2">
                          {row.tls ? (
                            <span className="text-[10px] font-mono font-bold" style={{ color: tlsInfo?.color || '#94a3b8' }}>
                              {row.tls}
                            </span>
                          ) : <span className="text-secondary text-xs">—</span>}
                        </td>
                        <td className="py-3 px-2 text-[10px] font-mono text-secondary max-w-[120px] truncate" title={row.cert}>{row.cert || '—'}</td>
                        <td className="py-3 px-2"><RiskBadge level={row.risk_level} size="sm" /></td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black font-mono text-xs w-6">{row.score}</span>
                            <div className="w-12 h-1.5 bg-surface-card rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: row.score > 70 ? '#ef4444' : row.score > 40 ? '#f97316' : '#22c55e' }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {row.is_shadow
                            ? <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">SHADOW</span>
                            : <span className="text-[9px] text-secondary">KNOWN</span>}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <ChevronDown size={14} className="text-secondary opacity-0 group-hover:opacity-100 -rotate-90 transition-opacity" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="flex flex-col gap-5">
          {/* Risk Distribution Pie */}
          <div className="glass-card border rounded-xl p-5">
            <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">Risk Distribution</div>
            {riskChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={riskChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                      {riskChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {riskChartData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[9px] text-secondary font-bold">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="text-xs text-secondary/50 text-center py-8">No data yet</div>}
          </div>

          {/* Algorithm Breakdown */}
          <div className="glass-card border rounded-xl p-5">
            <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
              Algorithm Breakdown <InfoTooltip text="Certificate signature algorithms detected across all assets. RSA/ECDSA variants are quantum-vulnerable. ML-DSA/ML-KEM are NIST PQC standards." />
            </div>
            {algoChartData.length > 0 ? (
              <div className="flex flex-col gap-2 mt-3">
                {algoChartData.slice(0, 6).map((d: any) => {
                  const info = getCertInfo(d.name);
                  const pct = Math.round((d.count / allComponents.length) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="font-mono text-secondary truncate max-w-[140px]" title={d.name}>{d.name}</span>
                        <span className="font-bold" style={{ color: info?.color || '#94a3b8' }}>{d.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-card rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: info?.color || '#6366f1' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-xs text-secondary/50 text-center py-6">No data yet</div>}
          </div>

          {/* TLS Distribution */}
          <div className="glass-card border rounded-xl p-5">
            <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
              TLS Version Distribution <InfoTooltip text="TLS 1.0/1.1 are deprecated (RFC 8996) and critically flagged. TLS 1.2 is acceptable. TLS 1.3 is the target." />
            </div>
            {tlsChartData.length > 0 ? (
              <div className="flex flex-col gap-2 mt-3">
                {tlsChartData.map((d: any) => {
                  const info = getTlsInfo(d.name);
                  const total = tlsChartData.reduce((s: number, x: any) => s + x.value, 0);
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="font-mono font-bold" style={{ color: info?.color || '#94a3b8' }}>{d.name}</span>
                        <span className="text-secondary">{d.value} assets</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-card rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: info?.color || d.color || '#6366f1' }} />
                      </div>
                      {info && <div className="text-[8px] text-secondary/50 mt-0.5 leading-tight">{info.impact.slice(0, 60)}…</div>}
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-xs text-secondary/50 text-center py-6">No data yet</div>}
          </div>
        </div>
      </div>

      {selectedComp && <ComponentModal comp={selectedComp} onClose={() => setSelectedComp(null)} />}
    </div>
  );
}
