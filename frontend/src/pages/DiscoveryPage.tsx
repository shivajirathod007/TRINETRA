/**
 * DiscoveryPage — Asset Discovery & Scan Initiation
 * Enhanced with live topology visualization and improved UI.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Globe, Shield, Network, Code2, ChevronRight,
  RefreshCw, AlertTriangle, Wifi, Lock, Activity
} from 'lucide-react';
import { useScanStore } from '../store';
import { useAssets, useScanStatus } from '../hooks';
import { SectionHeader, LoadingSpinner } from '../components/shared';
import { scanApi } from '../api/client';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';

type Category = 'Domains' | 'SSL' | 'IP Address/Subnets' | 'Software';
type StatusFilter = 'All' | 'Shadow' | 'Known';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  'Domains':            <Globe size={14} />,
  'SSL':                <Shield size={14} />,
  'IP Address/Subnets': <Network size={14} />,
  'Software':           <Code2 size={14} />,
};

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-blue-400',
  SAFE:     'text-green-400',
  UNKNOWN:  'text-secondary',
};

function nodeColor(risk: string): string {
  if (risk === 'CRITICAL') return '#ef4444';
  if (risk === 'HIGH')     return '#f97316';
  if (risk === 'MEDIUM')   return '#eab308';
  if (risk === 'LOW')      return '#3b82f6';
  if (risk === 'SAFE')     return '#22c55e';
  return '#6366f1';
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-secondary text-sm">
        No data available for this scan yet.
      </td>
    </tr>
  );
}

// ─── Table components ─────────────────────────────────────────────────────────

function DomainsTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr style={{ background: 'var(--surface-card)' }}>
        {['Detection Date', 'Domain Name', 'Asset Type', 'Risk Level', 'Discovery', 'Company Name'].map(h => (
          <th key={h} className="text-left text-[10px] text-secondary uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap" style={{ borderColor: 'var(--border-divider)' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b transition-colors cursor-pointer group" style={{ borderColor: 'var(--border-divider)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#818cf8' }}>{row.domain}</td>
            <td className="px-4 py-3 text-secondary text-xs capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className={`px-4 py-3 text-xs font-bold ${RISK_COLORS[row.risk] ?? 'text-secondary'}`}>{row.risk}</td>
            <td className="px-4 py-3 text-xs">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.discovery === 'Shadow' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25' : 'bg-green-500/15 text-green-400 border border-green-500/25'}`}>
                {row.discovery}
              </span>
            </td>
            <td className="px-4 py-3 font-bold text-primary tracking-wide">
              <div className="flex items-center justify-between">
                {company}
                <ChevronRight size={13} className="text-secondary opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SSLTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'SSL SHA256 Fingerprint', 'Expires', 'Common Name', 'Certificate Authority', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-4 py-3 font-mono text-indigo-400 text-xs truncate max-w-xs" title={row.fingerprint}>{row.fingerprint}</td>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.expiry}</td>
            <td className="px-4 py-3 text-secondary text-xs">{row.commonName}</td>
            <td className="px-4 py-3 text-secondary text-xs">{row.ca}</td>
            <td className="px-4 py-3 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'IP Address', 'Port', 'TLS Version', 'Asset Type', 'Company'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-4 py-3 font-mono text-indigo-400 font-medium">{row.ip}</td>
            <td className="px-4 py-3 font-mono text-primary">{row.port ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.tlsVersion ?? '—'}</td>
            <td className="px-4 py-3 text-secondary text-xs capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-3 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable({ company, data }: { company: string; data: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-surface-card-hover">
        {['Detection Date', 'Asset Type', 'TLS Version', 'Cipher Suite', 'Port', 'Host', 'Company Name'].map(h => (
          <th key={h} className="text-left text-xs text-secondary uppercase tracking-wider px-4 py-3 font-semibold border-b border-glass-border whitespace-nowrap">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={7} /> : data.map((row, i) => (
          <tr key={i} className="border-b border-glass-border/40 hover:bg-surface-card-hover/60 transition-colors">
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-4 py-3 text-primary font-semibold capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.tlsVersion ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-secondary text-xs truncate max-w-xs" title={row.cipherSuite}>{row.cipherSuite ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-primary font-medium">{row.port ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.host ?? '—'}</td>
            <td className="px-4 py-3 font-bold text-primary">{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Live Topology Graph ──────────────────────────────────────────────────────

interface TopoNode {
  id: string;
  label: string;
  risk: string;
  url: string;
  type: string;
  isShadow: boolean;
  x: number;
  y: number;
}

function LiveTopologyGraph({ assets, domain }: { assets: any[]; domain: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<TopoNode | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  // Animate pulse every 3s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const W = 900, H = 280;
  const cx = W / 2, cy = H / 2;

  const nodes: TopoNode[] = useMemo(() => {
    const seen = new Set<string>();
    const result: TopoNode[] = [];
    const unique = assets.filter(a => {
      const key = (a.url || a.fqdn || '').replace(/^https?:\/\//, '').split('/')[0];
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);

    unique.forEach((a, i) => {
      const angle = (2 * Math.PI * i) / Math.max(unique.length, 1) - Math.PI / 2;
      // Vary radius slightly by risk to create depth
      const riskOffset = a.risk_level === 'CRITICAL' ? 20 : a.risk_level === 'HIGH' ? 10 : 0;
      const r = 110 + riskOffset;
      const label = (a.url || a.fqdn || '')
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .slice(0, 14);
      result.push({
        id: a.id || String(i),
        label,
        risk: a.risk_level || 'UNKNOWN',
        url: a.url || a.fqdn || '',
        type: a.type || 'web_portal',
        isShadow: !!a.is_shadow_asset || a.discovery === 'Shadow',
        x: Math.round(cx + r * Math.cos(angle)),
        y: Math.round(cy + r * Math.sin(angle)),
      });
    });
    return result;
  }, [assets]);

  const rootLabel = domain ? domain.split('.')[0].toUpperCase().slice(0, 6) : 'ROOT';
  const critCount = nodes.filter(n => n.risk === 'CRITICAL').length;
  const shadowCount = nodes.filter(n => n.isShadow).length;

  return (
    <div className="glass-card border rounded-xl overflow-hidden"
      style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(6,10,24,0.75)' }}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Domain Relationship Map</span>
          </div>
          {assets.length > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-secondary">{nodes.length} nodes</span>
              {critCount > 0 && <span className="text-red-400 font-bold">{critCount} critical</span>}
              {shadowCount > 0 && <span className="text-orange-400 font-bold">{shadowCount} shadow</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {/* Legend */}
          <div className="flex items-center gap-2">
            {[['#ef4444','Critical'],['#f97316','High'],['#eab308','Medium'],['#22c55e','Safe'],['#6366f1','Unknown']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                <span className="text-secondary">{l}</span>
              </span>
            ))}
          </div>
          <span className="text-indigo-400 font-mono font-bold">Live Topology</span>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="relative" style={{ height: 280 }}>
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary gap-2">
            <Activity size={28} className="opacity-20" />
            <p className="text-sm">No scan data — run a scan to populate the topology</p>
          </div>
        ) : (
          <>
            <svg ref={svgRef} width="100%" height="280" viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setHovered(null)}>
              <defs>
                <radialGradient id="rootGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.7"/>
                </radialGradient>
                <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.08)" stopOpacity="1"/>
                  <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                </radialGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Background radial glow */}
              <ellipse cx={cx} cy={cy} rx="180" ry="120" fill="url(#bgGrad)" />

              {/* Connection lines */}
              {nodes.map((node, i) => {
                const col = nodeColor(node.risk);
                const isHov = hovered?.id === node.id;
                return (
                  <line key={`line-${i}`}
                    x1={cx} y1={cy} x2={node.x} y2={node.y}
                    stroke={isHov ? col : 'rgba(99,102,241,0.25)'}
                    strokeWidth={isHov ? 1.5 : 0.8}
                    strokeDasharray={node.isShadow ? '5 4' : '3 3'}
                    opacity={isHov ? 0.9 : 0.5}>
                    {!isHov && (
                      <animate attributeName="stroke-opacity"
                        values="0.2;0.55;0.2"
                        dur={`${2.5 + i * 0.25}s`}
                        repeatCount="indefinite"/>
                    )}
                  </line>
                );
              })}

              {/* Satellite nodes */}
              {nodes.map((node, i) => {
                const col = nodeColor(node.risk);
                const isHov = hovered?.id === node.id;
                const r = isHov ? 14 : node.risk === 'CRITICAL' ? 12 : 10;
                return (
                  <g key={`node-${i}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => {
                      setHovered(node);
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={e => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}>
                    {/* Outer ring for shadow assets */}
                    {node.isShadow && (
                      <circle cx={node.x} cy={node.y} r={r + 5}
                        fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" opacity="0.6">
                        <animateTransform attributeName="transform" type="rotate"
                          from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                          dur="8s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    {/* Pulse ring for critical */}
                    {node.risk === 'CRITICAL' && (
                      <circle cx={node.x} cy={node.y} r={r + 4}
                        fill="none" stroke={col} strokeWidth="1" opacity="0">
                        <animate attributeName="r" values={`${r};${r + 12};${r}`} dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    {/* Main node */}
                    <circle cx={node.x} cy={node.y} r={r}
                      fill={col} filter={isHov ? 'url(#glowStrong)' : 'url(#glow)'}
                      opacity={isHov ? 1 : 0.88}
                      style={{ transition: 'r 0.2s ease' }}>
                      {!isHov && (
                        <animate attributeName="r"
                          values={`${r - 1};${r + 1};${r - 1}`}
                          dur={`${3 + i * 0.35}s`}
                          repeatCount="indefinite"/>
                      )}
                    </circle>
                    {/* Label */}
                    <text x={node.x} y={node.y + r + 13}
                      textAnchor="middle" fontSize="8"
                      fill={isHov ? '#f8fafc' : 'rgba(148,163,184,0.75)'}
                      fontFamily="monospace" fontWeight={isHov ? 'bold' : 'normal'}>
                      {node.label}
                    </text>
                  </g>
                );
              })}

              {/* Root node */}
              <circle cx={cx} cy={cy} r="28" fill="url(#rootGrad)" filter="url(#glowStrong)">
                <animate attributeName="r" values="26;30;26" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx={cx} cy={cy} r="36" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1" strokeDasharray="4 3">
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur="20s" repeatCount="indefinite"/>
              </circle>
              <text x={cx} y={cy - 5} textAnchor="middle" fontSize="10"
                fill="white" fontWeight="bold" fontFamily="monospace">{rootLabel}</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7.5"
                fill="rgba(255,255,255,0.65)" fontFamily="monospace">ROOT</text>
            </svg>

            {/* Hover tooltip */}
            {hovered && (
              <div className="absolute pointer-events-none z-20 px-3 py-2.5 rounded-xl border text-xs"
                style={{
                  left: Math.min(tooltip.x + 12, W - 200),
                  top: Math.max(tooltip.y - 60, 4),
                  background: 'rgba(10,16,36,0.97)',
                  borderColor: `${nodeColor(hovered.risk)}50`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${nodeColor(hovered.risk)}30`,
                  minWidth: 180,
                }}>
                <div className="font-mono font-bold text-primary mb-1.5 truncate max-w-[200px]">{hovered.url}</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: nodeColor(hovered.risk) }} />
                  <span className="font-bold" style={{ color: nodeColor(hovered.risk) }}>{hovered.risk}</span>
                </div>
                <div className="text-secondary capitalize">{hovered.type?.replace(/_/g, ' ')}</div>
                {hovered.isShadow && (
                  <div className="mt-1 text-orange-400 font-bold flex items-center gap-1">
                    <AlertTriangle size={10} /> Shadow Asset
                  </div>
                )}
              </div>
            )}

            {/* Node count badge */}
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-secondary/50">
              {assets.length} nodes discovered
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanDomain(input: string): string {
  let d = input.trim().toLowerCase();
  if (d.startsWith('https://')) d = d.slice(8);
  if (d.startsWith('http://'))  d = d.slice(7);
  d = d.split('/')[0].split(':')[0];
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscoveryPage() {
  useAutoLoadScan();
  const { activeScanId, activeDomain, setActiveScan } = useScanStore();
  const { data: assets = [], isLoading } = useAssets(activeScanId);
  const { data: scanStatus } = useScanStatus(activeScanId);

  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [category, setCategory] = useState<Category>('Domains');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const navigate = useNavigate();

  const company = activeDomain ? activeDomain.split('.')[0].toUpperCase() : '—';

  const filteredAssets = useMemo(() => {
    if (statusFilter === 'All') return assets;
    return assets.filter((a: any) =>
      statusFilter === 'Shadow' ? a.discovery === 'Shadow' : a.discovery === 'Known'
    );
  }, [assets, statusFilter]);

  const domainsData = useMemo(() =>
    filteredAssets.map((a: any) => ({
      date: a.scan_timestamp ?? '—',
      domain: a.url ?? '—',
      type: a.type ?? '—',
      risk: a.risk_level ?? 'UNKNOWN',
      discovery: a.discovery ?? 'Known',
    })), [filteredAssets]);

  const sslData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.cert_issuer || a.cert_sha256 || a.cert_subject)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        fingerprint: a.cert_sha256 ?? '—',
        expiry: a.cert_expiry ?? '—',
        commonName: a.cert_subject ?? '—',
        ca: a.cert_issuer ?? '—',
      })), [filteredAssets]);

  const ipData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.ip_address)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        ip: a.ip_address,
        port: a.port ?? '—',
        tlsVersion: a.tls_version ?? '—',
        type: a.type ?? '—',
      })), [filteredAssets]);

  const softwareData = useMemo(() =>
    filteredAssets.map((a: any) => ({
      date: a.scan_timestamp ?? '—',
      type: a.type ?? '—',
      tlsVersion: a.tls_version ?? '—',
      cipherSuite: a.cipher_suite ?? '—',
      port: a.port ?? '—',
      host: a.ip_address ?? '—',
    })), [filteredAssets]);

  const CATEGORY_COUNTS: Record<Category, number> = {
    'Domains':            domainsData.length,
    'SSL':                sslData.length,
    'IP Address/Subnets': ipData.length,
    'Software':           softwareData.length,
  };

  const STATUS_COUNTS: Record<StatusFilter, number> = {
    'All':    assets.length,
    'Shadow': assets.filter((a: any) => a.discovery === 'Shadow').length,
    'Known':  assets.filter((a: any) => a.discovery === 'Known').length,
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim() || isScanning) return;
    const domain = cleanDomain(search);
    if (!domain) return;
    setIsScanning(true);
    try {
      const result = await scanApi.initiate(domain);
      setActiveScan(result.scan_id, domain);
      navigate(`/scan/${encodeURIComponent(domain)}`, { state: { scanId: result.scan_id } });
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  const isRunning = scanStatus?.status?.toLowerCase() === 'running' || scanStatus?.status?.toLowerCase() === 'pending';
  const critCount  = assets.filter((a: any) => a.risk_level === 'CRITICAL').length;
  const shadowCount = assets.filter((a: any) => a.discovery === 'Shadow' || a.is_shadow_asset).length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
      <SectionHeader
        title="Asset Discovery"
        subtitle="Deep network exposure intelligence & CT log mining"
      />

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Assets',   value: assets.length,  color: '#6366f1', icon: <Globe size={18} />, sub: 'discovered' },
            { label: 'SSL / TLS',      value: sslData.length, color: '#06b6d4', icon: <Lock size={18} />, sub: 'certificates' },
            { label: 'Critical Risk',  value: critCount,      color: '#ef4444', icon: <AlertTriangle size={18} />, sub: 'assets' },
            { label: 'Shadow Assets',  value: shadowCount,    color: '#f97316', icon: <Wifi size={18} />, sub: 'unmanaged' },
          ].map(k => (
            <div key={k.label} className="glass-card border rounded-xl px-5 py-4 flex items-center gap-4"
              style={{ borderColor: `${k.color}25`, background: `${k.color}08` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${k.color}15`, color: k.color }}>
                {k.icon}
              </div>
              <div>
                <div className="text-2xl font-black font-mono leading-none" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[10px] text-secondary uppercase tracking-wider font-semibold mt-0.5">{k.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: `${k.color}80` }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Live Topology ─────────────────────────────────────────── */}
      <LiveTopologyGraph assets={assets} domain={activeDomain ?? ''} />

      {/* ── Scan input ────────────────────────────────────────────── */}
      <form onSubmit={handleInitiate} className="w-full">
        <div className="glass-card border rounded-xl overflow-hidden"
          style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
          <div className="flex items-center px-2 py-1">
            <Search size={18} className="ml-3 mr-2 shrink-0" style={{ color: '#818cf8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent placeholder-secondary focus:outline-none py-3 text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search domain, URL, contact, IoC or other..."
            />
            <button
              type="submit"
              disabled={isScanning || !search.trim()}
              className="px-5 py-2 font-bold uppercase tracking-widest text-xs rounded-lg transition-all whitespace-nowrap ml-2 mr-1 disabled:opacity-40 flex items-center gap-2"
              style={{ background: '#6366f1', color: 'white' }}
            >
              {isScanning ? <RefreshCw size={12} className="animate-spin" /> : null}
              {isScanning ? 'Scanning…' : 'Scan Now'}
            </button>
          </div>
          {activeDomain && (
            <div className="px-5 py-2 flex items-center gap-4 text-xs flex-wrap" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--border-divider)' }}>
              <span className="text-secondary font-mono">Active domain:</span>
              <span className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{activeDomain}</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <RefreshCw size={11} className="animate-spin" />
                  Scanning… {(scanStatus as any)?.progress ?? 0}%
                </span>
              )}
              {scanStatus?.status?.toLowerCase() === 'completed' && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Scan complete — {(scanStatus as any)?.assets_found ?? assets.length} assets found
                </span>
              )}
            </div>
          )}
        </div>
      </form>

      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_COUNTS) as Category[]).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all border"
            style={category === cat ? {
              background: '#6366f1',
              borderColor: '#6366f1',
              color: 'white',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            } : {
              background: 'var(--surface-card)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
            }}>
            {CATEGORY_ICONS[cat]}
            <span>{cat}</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded-md"
              style={category === cat ? { background: 'rgba(255,255,255,0.2)' } : { background: 'var(--surface-card-hover)' }}>
              {CATEGORY_COUNTS[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Status filter ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Status:</span>
        {(Object.keys(STATUS_COUNTS) as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-3 py-1 rounded-full font-semibold text-xs transition-all border"
            style={statusFilter === s ? {
              background: '#f59e0b',
              borderColor: '#f59e0b',
              color: 'black',
              boxShadow: '0 0 10px rgba(245,158,11,0.3)',
            } : {
              background: 'var(--surface-card)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
            }}>
            {s} <span className="opacity-70">({STATUS_COUNTS[s]})</span>
          </button>
        ))}
      </div>

      {/* ── Data table ────────────────────────────────────────────── */}
      <div className="glass-card border rounded-xl overflow-hidden" style={{ borderColor: 'var(--glass-border)' }}>
        {/* Table toolbar */}
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {category}
            <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-card-hover)', color: 'var(--text-secondary)' }}>
              {CATEGORY_COUNTS[category]}
            </span>
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {activeDomain || 'No domain selected'}
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'var(--text-secondary)' }}>
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : (
          <div className="overflow-x-auto">
            {category === 'Domains'            && <DomainsTable  company={company} data={domainsData} />}
            {category === 'SSL'                && <SSLTable      company={company} data={sslData} />}
            {category === 'IP Address/Subnets' && <IPTable       company={company} data={ipData} />}
            {category === 'Software'           && <SoftwareTable company={company} data={softwareData} />}
          </div>
        )}
        {!isLoading && (
          <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-divider)', color: 'var(--text-secondary)' }}>
            <span>Showing {
              category === 'Domains' ? domainsData.length :
              category === 'SSL' ? sslData.length :
              category === 'IP Address/Subnets' ? ipData.length :
              softwareData.length
            } records</span>
            <span className="font-mono opacity-50">TRINETRA — Quantum Exposure Intelligence</span>
          </div>
        )}
      </div>
    </div>
  );
}
