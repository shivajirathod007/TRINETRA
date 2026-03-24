/**
 * CBOMPage — Operations Center & PQC Readiness Dashboard
 * Matches the uploaded dark-mode prototype screenshots exactly.
 * Features:
 *   - PQC Readiness Certificates (3 columns: Vulnerable, Ready, Safe)
 *   - KPI Tiles (Organization Risk Score, Total Assets, Critical Exposure, PQC Ready, Fully Safe)
 *   - Cryptographic Asset Map (Table with Risk Score bars and Status chips)
 *   - Risk Distribution & Algorithmic Breakdown charts
 *   - Scan selector dropdown dynamically loads data
 */
import { useMemo, useState, useEffect } from 'react';
import {
  Download, Shield, AlertTriangle, Eye, CheckCircle2,
  ExternalLink, ChevronDown, RefreshCw, X, Globe, Lock, Key, Clock, TrendingUp
} from 'lucide-react';
import { useScanStore } from '../store';
import { useCBOM, useScanHistory } from '../hooks';
import { SectionHeader, ScoreBadge, AlgorithmTag } from '../components/shared';
import { cbomApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';

// ─── Types & Mock Data ────────────────────────────────────────────────────────

interface ScanRecord {
  scan_id: string;
  domain:  string;
  status?: string;
  created_at?: string;
  completed_at?: string;
}

interface CBOMComponent {
  url: string;
  type: string;
  status: string;
  score: number;
  discovery: string;
  is_shadow: boolean;
  tls?: string;
  cipher?: string;
  key_exchange?: string;
  cert?: string;
  cert_issuer?: string;
  cert_expiry?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function StatusChip({ status, isShadow }: { status: string; isShadow?: boolean }) {
  if (isShadow) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#f59e0b] px-2 py-0.5 mt-0.5">
        <AlertTriangle size={10} /> SHADOW
      </span>
    );
  }
  const isCrit = status === 'CRITICAL';
  return (
    <span className="inline-flex items-center text-[10px] font-black tracking-wider px-3 py-1 rounded-full border"
      style={{
        background: isCrit ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
        color: isCrit ? '#ef4444' : '#94a3b8',
        borderColor: isCrit ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.2)'
      }}>
      {status}
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function ComponentModal({ comp, onClose }: { comp: CBOMComponent; onClose: () => void }) {
  const rows = [
    { label: 'URL / Host',   value: comp.url,               icon: <Globe size={14} /> },
    { label: 'Type',         value: comp.type,              icon: <Key size={14} /> },
    { label: 'TLS Version',  value: comp.tls ?? '—',       icon: <Shield size={14} /> },
    { label: 'Cipher Suite', value: comp.cipher ?? '—',    icon: <Lock size={14} /> },
    { label: 'Certificate',  value: comp.cert ?? '—',      icon: <Shield size={14} /> },
    { label: 'Shadow Asset', value: comp.is_shadow ? 'Yes ⚠️' : 'No', icon: <Eye size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="glass-card border rounded-2xl w-full max-w-xl overflow-hidden"
        style={{ borderColor: 'rgba(99,102,241,0.3)', boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}
        onClick={e => e.stopPropagation()}>
        
        <div className="px-6 py-4 border-b border-glass-border flex items-start justify-between gap-4"
          style={{ background: 'rgba(99,102,241,0.06)' }}>
          <div>
            <div className="font-bold text-primary font-mono text-sm max-w-[320px] truncate">{comp.url}</div>
            <div className="mt-2 flex gap-2">
              <StatusChip status={comp.status} />
              {comp.is_shadow && <StatusChip status="SHADOW" isShadow />}
            </div>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary"><X size={18} /></button>
        </div>

        <div className="divide-y divide-glass-border/40">
          {rows.map(r => (
            <div key={r.label} className="flex px-6 py-3 gap-3">
              <span className="text-primary-indigo opacity-60 mt-0.5">{r.icon}</span>
              <span className="text-xs text-secondary font-semibold w-32">{r.label}</span>
              <span className="text-sm text-primary font-mono">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-glass-border">
          <div className="flex justify-between text-xs text-secondary mb-1.5">
            <span>Risk Score</span>
            <span className="font-mono text-status-critical">{comp.score}/100</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
            <div className="h-full rounded-full bg-status-critical" style={{ width: `${comp.score}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CBOMPage() {
  useAutoLoadScan();
  const { activeScanId, setActiveScan } = useScanStore();
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [selectedComp, setSelectedComp] = useState<CBOMComponent | null>(null);

  // Load scans + active sync
  const { data: scansData } = useScanHistory(null);
  const scans: any[] = scansData || [];

  useEffect(() => {
    if (activeScanId) setSelectedScanId(activeScanId);
    else if (scans.length > 0) setSelectedScanId(scans[0].id);
  }, [activeScanId, scans]);

  const activeDomain = scans.find(s => s.id === selectedScanId)?.domain || 'Unknown Target';
  
  // Get data (fallback to demo if API empty)
  const { data: cbomData } = useCBOM(selectedScanId || null);
  const data: CBOMComponent[] = useMemo(() => {
    if (cbomData?.components && cbomData.components.length > 0) {
      // Map API to new format
      return cbomData.components.map((c: any) => ({
        url: c.url ?? c.name ?? 'Unknown',
        type: 'web_service',
        status: (c.status ?? c.risk_level ?? 'CRITICAL').toUpperCase(),
        score: c.score ?? c.quantum_risk?.quantum_exposure_score ?? 90,
        discovery: c.is_shadow ? 'SHADOW' : 'KNOWN',
        is_shadow: !!c.is_shadow,
        tls: c.tls ?? c.tls_version,
        cipher: c.cipher ?? c.cipher_suite,
        cert: c.cert ?? c.cert_algorithm,
      }));
    }
    return [];
  }, [cbomData, selectedScanId]);

  const stats = useMemo(() => {
    const shadowCount = data.filter(c => c.is_shadow).length;
    const critCount = data.filter(c => c.status === 'CRITICAL').length;
    const readyCount = data.filter(c => c.status === 'PQC_READY').length;
    const safeCount = data.filter(c => c.status === 'SAFE').length;
    return { shadowCount, critCount, readyCount, safeCount, total: data.length };
  }, [data]);

  const chartData = [
    { name: 'CRITICAL', value: stats.critCount, color: '#ef4444' },
    { name: 'SAFE', value: stats.safeCount, color: '#22c55e' },
    { name: 'OTHER', value: Math.max(0, stats.total - stats.critCount - stats.safeCount), color: '#334155' },
  ].filter(d => d.value > 0);

  const shadowData = data.filter(c => c.is_shadow);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      
      {/* ── Top Header & Selector ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Operations Center</h1>
          <p className="text-xs text-secondary mt-1">Select a scan to view cryptographic bill of materials</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-secondary text-xs uppercase tracking-widest font-bold">Target:</span>
          <div className="relative w-64">
            <select
              value={selectedScanId}
              onChange={e => {
                const id = e.target.value;
                setSelectedScanId(id);
                const s = scans.find(x => x.id === id);
                if (s) setActiveScan(id, s.domain);
              }}
              className="w-full appearance-none bg-surface-card border border-glass-border text-primary font-mono text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer"
            >
              {scans.map(s => <option key={s.id} value={s.id}>{s.domain}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-2.5 text-secondary pointer-events-none" />
          </div>
          <button className="flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors pr-2">
            Live Sync <RefreshCw size={12} />
          </button>
          {data.length > 0 && (
            <button className="action-btn flex items-center gap-2 text-xs py-2 px-4 ml-2">
              <Download size={14} /> JSON
            </button>
          )}
        </div>
      </div>

      {/* ── Shadow Alert Banner ──────────────────────────────────────── */}
      {shadowData.length > 0 && (
        <div className="border rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-status-critical mt-0.5" />
            <div>
              <h3 className="font-bold text-status-critical mb-1">SHADOW ASSETS DETECTED ({shadowData.length})</h3>
              <p className="text-sm text-secondary leading-relaxed">
                CRQC vulnerability scanner found <span className="font-mono text-primary bg-status-critical/10 px-1 py-0.5 rounded">{shadowData.map((s, i) => s.url + (i === shadowData.length - 1 ? '' : ' and ')).join('')}</span> operating outside known inventory. Immediate investigation required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PQC Readiness Certificates (3 Columns) ───────────────────── */}
      <div className="glass-card border rounded-xl p-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
        <div className="mb-4 pb-4 border-b border-glass-border">
          <h2 className="font-bold text-primary">PQC Readiness Certificates</h2>
          <div className="text-xs text-secondary mt-1">Domain: <span className="font-mono text-primary">{activeDomain}</span></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vulnerable */}
          <div className="rounded-xl border p-5 min-h-[400px]" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex flex-col items-center mb-6 pb-6 border-b border-status-critical/20">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-status-critical mb-3">
                <AlertTriangle size={20} className="text-status-critical" />
              </div>
              <h3 className="text-[11px] font-black tracking-widest text-status-critical uppercase mb-2">Quantum Vulnerable</h3>
              <div className="text-lg"><span className="text-2xl font-black">{stats.critCount}</span> <span className="text-xs text-secondary">assets</span></div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: '280px' }}>
              {data.filter(c => c.status === 'CRITICAL').map((c, i) => (
                <div key={i} onClick={() => setSelectedComp(c)} className="flex items-center justify-between text-xs font-mono text-secondary hover:text-primary cursor-pointer group">
                  <span className="truncate pr-2">{c.url}</span>
                  <ChevronDown size={14} className="opacity-0 group-hover:opacity-100 -rotate-90 flex-shrink-0 transition-opacity" />
                </div>
              ))}
              {stats.critCount === 0 && <div className="text-xs text-center text-secondary/50 italic mt-10">No assets in this category yet.</div>}
            </div>
          </div>

          {/* Ready */}
          <div className="rounded-xl border p-5 min-h-[400px]" style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.02) 100%)', borderColor: 'rgba(249,115,22,0.2)' }}>
            <div className="flex flex-col items-center mb-6 pb-6 border-b border-orange-500/20">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-orange-500 mb-3">
                <Shield size={20} className="text-orange-500" />
              </div>
              <h3 className="text-[11px] font-black tracking-widest text-orange-500 uppercase mb-2">PQC Ready</h3>
              <div className="text-lg"><span className="text-2xl font-black">{stats.readyCount}</span> <span className="text-xs text-secondary">assets</span></div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: '280px' }}>
              {data.filter(c => c.status === 'PQC_READY').map((c, i) => (
                <div key={i} onClick={() => setSelectedComp(c)} className="flex items-center justify-between text-xs font-mono text-secondary hover:text-primary cursor-pointer group">
                  <span className="truncate pr-2">{c.url}</span>
                  <ChevronDown size={14} className="opacity-0 group-hover:opacity-100 -rotate-90 flex-shrink-0 transition-opacity" />
                </div>
              ))}
              {stats.readyCount === 0 && <div className="text-xs text-center text-secondary/50 italic mt-10">No assets in this category yet.</div>}
            </div>
          </div>

          {/* Safe */}
          <div className="rounded-xl border p-5 min-h-[400px]" style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <div className="flex flex-col items-center mb-6 pb-6 border-b border-status-safe/20">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-status-safe mb-3">
                <CheckCircle2 size={20} className="text-status-safe" />
              </div>
              <h3 className="text-[11px] font-black tracking-widest text-status-safe uppercase mb-2">Quantum Safe</h3>
              <div className="text-lg"><span className="text-2xl font-black">{stats.safeCount}</span> <span className="text-xs text-secondary">assets</span></div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: '280px' }}>
              {data.filter(c => c.status === 'SAFE').map((c, i) => (
                <div key={i} onClick={() => setSelectedComp(c)} className="flex items-center justify-between text-xs font-mono text-secondary hover:text-primary cursor-pointer group">
                  <span className="truncate pr-2">{c.url}</span>
                  <ChevronDown size={14} className="opacity-0 group-hover:opacity-100 -rotate-90 flex-shrink-0 transition-opacity" />
                </div>
              ))}
              {stats.safeCount === 0 && <div className="text-xs text-center text-secondary/50 italic mt-10">No assets in this category yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Tiles Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 shadow-sm">ORGANIZATION RISK SCORE</div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-black text-orange-500">90</span>
            <span className="text-xs text-secondary mb-1">/ 100</span>
          </div>
          <TrendingUp size={60} className="absolute right-[-10px] bottom-[-10px] text-surface-card-hover opacity-50" />
        </div>
        <div className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 shadow-sm">TOTAL ASSETS</div>
          <div className="text-2xl font-black text-primary">{stats.total}</div>
        </div>
        <div className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 shadow-sm">CRITICAL EXPOSURE</div>
          <div className="text-2xl font-black text-status-critical">{stats.critCount}</div>
          <AlertTriangle size={50} className="absolute right-0 bottom-[-5px] text-status-critical/10" />
        </div>
        <div className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 shadow-sm">PQC READY</div>
          <div className="text-2xl font-black text-[#8b5cf6]">{stats.readyCount}</div>
        </div>
        <div className="glass-card border rounded-xl p-5 relative overflow-hidden flex flex-col justify-center">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 shadow-sm">FULLY SAFE</div>
          <div className="text-2xl font-black text-status-safe">{stats.safeCount}</div>
          <Shield size={50} className="absolute right-0 bottom-[-5px] text-status-safe/10" />
        </div>
      </div>

      {/* ── Cryptographic Asset Map + Charts ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Area */}
        <div className="lg:col-span-2 glass-card border rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-primary">Cryptographic Asset Map</h2>
            <div className="flex items-center gap-2">
              <button className="px-4 py-1.5 text-xs font-bold border border-glass-border rounded-lg text-secondary hover:text-primary transition-colors flex items-center gap-2">
                Filter
              </button>
              <button className="px-4 py-1.5 text-xs font-bold border border-glass-border rounded-lg text-secondary hover:text-primary transition-colors flex items-center gap-2">
                Sort by Risk <ChevronDown size={14} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="text-left py-3 text-[10px] font-bold text-secondary uppercase tracking-wider">URL</th>
                  <th className="text-left py-3 text-[10px] font-bold text-secondary uppercase tracking-wider">TYPE</th>
                  <th className="text-left py-3 text-[10px] font-bold text-secondary uppercase tracking-wider">STATUS</th>
                  <th className="text-left py-3 text-[10px] font-bold text-secondary uppercase tracking-wider">RISK SCORE</th>
                  <th className="text-left py-3 text-[10px] font-bold text-secondary uppercase tracking-wider">DISCOVERY</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} onClick={() => setSelectedComp(row)} className="border-b border-glass-border/30 hover:bg-surface-card-hover/40 transition-colors cursor-pointer group">
                    <td className="py-4 font-mono text-primary text-xs pr-4">{row.url}</td>
                    <td className="py-4 text-xs font-mono text-secondary">{row.type}</td>
                    <td className="py-4"><StatusChip status={row.status} /></td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-black font-mono text-xs">{row.score}</span>
                        <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: row.score > 70 ? '#ef4444' : '#22c55e' }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      {row.is_shadow ? <StatusChip status={row.status} isShadow /> : <span className="text-xs text-secondary">KNOWN</span>}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <ChevronDown size={16} className="text-secondary opacity-0 group-hover:opacity-100 -rotate-90 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Area */}
        <div className="flex flex-col gap-6">
          {/* Donut Chart */}
          <div className="glass-card border rounded-xl p-5 flex flex-col h-full min-h-[220px]">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">RISK DISTRIBUTION</h3>
            <div className="flex-1 w-full relative -mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute left-0 bottom-0 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-status-critical" />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">CRITICAL</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="glass-card border rounded-xl p-5 flex flex-col h-full min-h-[160px]">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-4">ALGORITHMIC BREAKDOWN</h3>
            <div className="flex-1 w-full flex flex-col justify-center">
              <div className="flex items-center gap-4 w-full">
                <span className="text-[10px] font-mono text-secondary w-16">CDSA-SHA384</span>
                <div className="flex-1 h-2.5 bg-surface-card rounded-sm overflow-hidden border border-glass-border">
                  <div className="h-full bg-primary-indigo" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {selectedComp && <ComponentModal comp={selectedComp} onClose={() => setSelectedComp(null)} />}
    </div>
  );
}
