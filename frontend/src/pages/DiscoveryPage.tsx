/**
 * DiscoveryPage — Asset Discovery & Scan Initiation
 * Enhanced with live topology visualization and improved UI.
 */
import { useState, useMemo, useRef } from 'react';
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

const RISK_COLOR_MAP: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#3b82f6',
  SAFE:     '#22c55e',
  UNKNOWN:  'var(--text-secondary)',
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
      <td colSpan={cols} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        No data available for this scan yet.
      </td>
    </tr>
  );
}

// ─── Table components ─────────────────────────────────────────────────────────

function DomainsTable({ company, data, onRowClick }: { company: string; data: any[]; onRowClick?: (id: string) => void }) {
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
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            onClick={() => data[i].id && onRowClick?.(data[i].id)}>
            <td className="px-4 py-3 font-mono text-secondary text-xs">{row.date}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#818cf8' }}>{row.domain}</td>
            <td className="px-4 py-3 text-secondary text-xs capitalize">{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-3 text-xs font-bold" style={{ color: RISK_COLOR_MAP[row.risk] ?? 'var(--text-secondary)' }}>{row.risk}</td>
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

function SSLTable({ company, data, onRowClick }: { company: string; data: any[]; onRowClick?: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr style={{ background: 'var(--surface-card)' }}>
        {['Detection Date', 'TLS Version', 'Cert Algorithm', 'Expires', 'Certificate Authority', 'Company Name'].map(h => (
          <th key={h} className="text-left text-[10px] uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b transition-colors cursor-pointer group" style={{ borderColor: 'var(--border-divider)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            onClick={() => data[i].id && onRowClick?.(data[i].id)}>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#818cf8' }}>{row.tls_version}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{row.algorithm}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.expiry}</td>
            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{row.ca}</td>
            <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IPTable({ company, data, onRowClick }: { company: string; data: any[]; onRowClick?: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr style={{ background: 'var(--surface-card)' }}>
        {['Detection Date', 'IP Address', 'Port', 'TLS Version', 'Asset Type', 'Company'].map(h => (
          <th key={h} className="text-left text-[10px] uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={6} /> : data.map((row, i) => (
          <tr key={i} className="border-b transition-colors cursor-pointer group" style={{ borderColor: 'var(--border-divider)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            onClick={() => data[i].id && onRowClick?.(data[i].id)}>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
            <td className="px-4 py-3 font-mono font-medium" style={{ color: '#818cf8' }}>{row.ip}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{row.port ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.tlsVersion ?? '—'}</td>
            <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SoftwareTable({ company, data, onRowClick }: { company: string; data: any[]; onRowClick?: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr style={{ background: 'var(--surface-card)' }}>
        {['Detection Date', 'Asset Type', 'TLS Version', 'Cipher Suite', 'Port', 'Host', 'Company Name'].map(h => (
          <th key={h} className="text-left text-[10px] uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {data.length === 0 ? <EmptyRow cols={7} /> : data.map((row, i) => (
          <tr key={i} className="border-b transition-colors cursor-pointer group" style={{ borderColor: 'var(--border-divider)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            onClick={() => data[i].id && onRowClick?.(data[i].id)}>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
            <td className="px-4 py-3 font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{row.type?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.tlsVersion ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs truncate max-w-xs" style={{ color: 'var(--text-secondary)' }} title={row.cipherSuite}>{row.cipherSuite ?? '—'}</td>
            <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{row.port ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.host ?? '—'}</td>
            <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Live Topology Graph (force-directed) ────────────────────────────────────

interface FNode {
  id: string; label: string; risk: string; url: string;
  type: string; isShadow: boolean; isRoot?: boolean;
  x: number; y: number; vx: number; vy: number;
}
interface FEdge { source: string; target: string; }

function buildGraph(assets: any[], rootDomain: string): { nodes: FNode[]; edges: FEdge[] } {
  const root = rootDomain.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  const getFqdn = (a: any) =>
    (a.url || a.fqdn || '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
      .replace(/\.$/, '').replace(/^www\./, '');

  const seen = new Set<string>();
  const nodeMap = new Map<string, FNode>();
  const edges: FEdge[] = [];

  // root node
  nodeMap.set(root, {
    id: root, label: root.split('.')[0].toUpperCase().slice(0, 6),
    risk: 'SAFE', url: root, type: 'root', isShadow: false, isRoot: true,
    x: 0, y: 0, vx: 0, vy: 0,
  });

  const getOrCreate = (fqdn: string): FNode => {
    if (nodeMap.has(fqdn)) return nodeMap.get(fqdn)!;
    const lbl = fqdn.split('.')[0];
    const n: FNode = {
      id: fqdn, label: lbl.length > 12 ? lbl.slice(0, 10) + '…' : lbl,
      risk: 'UNKNOWN', url: fqdn, type: 'domain', isShadow: false,
      x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
    };
    nodeMap.set(fqdn, n);
    return n;
  };

  for (const a of assets) {
    const fqdn = getFqdn(a);
    if (!fqdn || fqdn === root) continue;
    if (!fqdn.endsWith('.' + root) && !fqdn.endsWith(root)) continue;
    if (seen.has(fqdn)) continue;
    seen.add(fqdn);

    const n = getOrCreate(fqdn);
    n.risk = a.risk_level || 'UNKNOWN';
    n.url = a.url || a.fqdn || fqdn;
    n.type = a.type || 'web_portal';
    n.isShadow = !!a.is_shadow_asset || a.discovery === 'Shadow';

    // recursively connect to parents up to root
    let curr = fqdn;
    while (curr && curr !== root) {
      if (!curr.endsWith('.' + root) && !curr.endsWith(root)) break;
      const parts = curr.split('.');
      const rootParts = root.split('.');
      
      let nextParentId = root;
      if (parts.length > rootParts.length + 1) {
        nextParentId = parts.slice(1).join('.');
        getOrCreate(nextParentId);
      }
      
      const edgeId = `${nextParentId}->${curr}`;
      if (!edges.find(e => e.source === nextParentId && e.target === curr)) {
        edges.push({ source: nextParentId, target: curr });
      }
      curr = nextParentId;
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

function runForce(nodes: FNode[], edges: FEdge[], W: number, H: number, iterations = 120): FNode[] {
  const ns = nodes.map(n => ({ ...n }));
  const byId = new Map(ns.map(n => [n.id, n]));

  // pin root to center
  const root = ns.find(n => n.isRoot);
  if (root) { root.x = W / 2; root.y = H / 2; }

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // repulsion between all pairs
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const dist2 = dx * dx + dy * dy;
        const force = (1800 / dist2) * alpha;
        const fx = (dx / Math.sqrt(dist2)) * force;
        const fy = (dy / Math.sqrt(dist2)) * force;
        if (!a.isRoot) { a.vx -= fx; a.vy -= fy; }
        if (!b.isRoot) { b.vx += fx; b.vy += fy; }
      }
    }

    // spring attraction along edges
    for (const e of edges) {
      const s = byId.get(e.source), t = byId.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = 60;
      const force = ((dist - ideal) / dist) * 0.3 * alpha;
      const fx = dx * force, fy = dy * force;
      if (!s.isRoot) { s.vx += fx; s.vy += fy; }
      if (!t.isRoot) { t.vx -= fx; t.vy -= fy; }
    }

    // gravity toward center
    for (const n of ns) {
      if (n.isRoot) continue;
      n.vx += (W / 2 - n.x) * 0.01 * alpha;
      n.vy += (H / 2 - n.y) * 0.01 * alpha;
    }

    // integrate + dampen + clamp
    const pad = 20;
    for (const n of ns) {
      if (n.isRoot) continue;
      n.vx *= 0.7; n.vy *= 0.7;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(pad, Math.min(W - pad, n.x));
      n.y = Math.max(pad, Math.min(H - pad, n.y));
    }
  }
  return ns;
}

function LiveTopologyGraph({ assets, domain }: { assets: any[]; domain: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<FNode | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const W = 900, H = 340;

  const { nodes, edges } = useMemo(() => {
    if (!assets.length || !domain) return { nodes: [] as FNode[], edges: [] as FEdge[] };
    const g = buildGraph(assets, domain);
    const settled = runForce(g.nodes, g.edges, W, H);
    return { nodes: settled, edges: g.edges };
  }, [assets, domain]);

  const rootNode = nodes.find(n => n.isRoot);
  const rootLabel = rootNode?.label ?? domain.split('.')[0].toUpperCase().slice(0, 6);
  const critCount = nodes.filter(n => n.risk === 'CRITICAL').length;
  const shadowCount = nodes.filter(n => n.isShadow).length;
  const nonRoot = nodes.filter(n => !n.isRoot);
  const byId = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="glass-card border rounded-xl overflow-hidden"
      style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(8,13,26,0.9)' }}>
      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2"
        style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.8)' }}>
            Domain Relationship Map
          </span>
          {assets.length > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span style={{ color: 'rgba(148,163,184,0.6)' }}>{nodes.length} nodes</span>
              {critCount > 0 && <span className="font-bold" style={{ color: '#ef4444' }}>{critCount} critical</span>}
              {shadowCount > 0 && <span className="font-bold" style={{ color: '#f97316' }}>{shadowCount} shadow</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-2 flex-wrap">
            {[['#ef4444','Critical'],['#f97316','High'],['#eab308','Medium'],['#22c55e','Safe'],['#6366f1','Unknown']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                <span style={{ color: 'rgba(148,163,184,0.6)' }}>{l}</span>
              </span>
            ))}
          </div>
          <span className="font-mono font-bold" style={{ color: '#818cf8' }}>Live Topology</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ height: H }}>
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: 'rgba(148,163,184,0.4)' }}>
            <Activity size={28} className="opacity-20" />
            <p className="text-sm">No scan data — run a scan to populate the topology</p>
          </div>
        ) : (
          <>
            <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setHovered(null)}>
              <defs>
                <radialGradient id="rootGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glowStrong">
                  <feGaussianBlur stdDeviation="5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {edges.map((e, i) => {
                const s = byId.get(e.source), t = byId.get(e.target);
                if (!s || !t) return null;
                const isHov = hovered?.id === t.id;
                const col = nodeColor(t.risk);
                return (
                  <line key={i}
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke={isHov ? col : 'rgba(99,102,241,0.25)'}
                    strokeWidth={isHov ? 1.5 : 0.6}
                    strokeDasharray={t.isShadow ? '4 3' : undefined}
                    opacity={isHov ? 1 : 0.5}
                  />
                );
              })}

              {/* Non-root nodes */}
              {nonRoot.map((node, i) => {
                const col = nodeColor(node.risk);
                const isHov = hovered?.id === node.id;
                const r = isHov ? 18 : node.risk === 'CRITICAL' ? 14 : 9;
                return (
                  <g key={node.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => {
                      setHovered(node);
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={e => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}>
                    {node.isShadow && (
                      <circle cx={node.x} cy={node.y} r={r + 5}
                        fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5">
                        <animateTransform attributeName="transform" type="rotate"
                          from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                          dur="8s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    {node.risk === 'CRITICAL' && !isHov && (
                      <circle cx={node.x} cy={node.y} r={r + 3}
                        fill="none" stroke={col} strokeWidth="0.8" opacity="0">
                        <animate attributeName="r" values={`${r};${r + 8};${r}`} dur="2.5s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite"/>
                      </circle>
                    )}
                    <circle cx={node.x} cy={node.y} r={r}
                      fill={col}
                      filter={isHov ? 'url(#glowStrong)' : 'url(#glow)'}
                      opacity={isHov ? 1 : 0.82}
                    />
                    {(isHov || node.risk === 'CRITICAL') && (
                      <text x={node.x} y={node.y - r - 4}
                        textAnchor="middle" fontSize="7"
                        fill={isHov ? '#f1f5f9' : 'rgba(148,163,184,0.7)'}
                        fontFamily="monospace">
                        {node.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Root node */}
              {rootNode && (
                <g>
                  <circle cx={rootNode.x} cy={rootNode.y} r="22" fill="url(#rootGrad)" filter="url(#glowStrong)">
                    <animate attributeName="r" values="20;24;20" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx={rootNode.x} cy={rootNode.y} r="30" fill="none"
                    stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="4 3">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${rootNode.x} ${rootNode.y}`} to={`360 ${rootNode.x} ${rootNode.y}`}
                      dur="20s" repeatCount="indefinite"/>
                  </circle>
                  <text x={rootNode.x} y={rootNode.y - 3} textAnchor="middle" fontSize="8"
                    fill="white" fontWeight="bold" fontFamily="monospace">{rootLabel}</text>
                  <text x={rootNode.x} y={rootNode.y + 8} textAnchor="middle" fontSize="6"
                    fill="rgba(255,255,255,0.55)" fontFamily="monospace">ROOT</text>
                </g>
              )}
            </svg>

            {/* Tooltip */}
            {hovered && (
              <div className="absolute pointer-events-none z-20 px-3 py-2.5 rounded-xl text-xs"
                style={{
                  left: Math.min(tooltip.x + 14, W - 210),
                  top: Math.max(tooltip.y - 70, 4),
                  background: 'rgba(8,13,26,0.97)',
                  border: `1px solid ${nodeColor(hovered.risk)}40`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                  minWidth: 190,
                }}>
                <div className="font-mono font-bold mb-1.5 break-all text-[10px]" style={{ color: '#f1f5f9' }}>
                  {hovered.url}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: nodeColor(hovered.risk) }} />
                  <span className="font-bold text-[10px]" style={{ color: nodeColor(hovered.risk) }}>{hovered.risk}</span>
                </div>
                <div className="text-[10px] capitalize" style={{ color: 'rgba(148,163,184,0.7)' }}>
                  {hovered.type?.replace(/_/g, ' ')}
                </div>
                {hovered.isShadow && (
                  <div className="mt-1 font-bold flex items-center gap-1 text-[10px]" style={{ color: '#f97316' }}>
                    <AlertTriangle size={9} /> Shadow Asset
                  </div>
                )}
              </div>
            )}

            <div className="absolute bottom-2 right-3 text-[10px] font-mono"
              style={{ color: 'rgba(148,163,184,0.35)' }}>
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
  
  // New state variables for the table
  const [tableSearch, setTableSearch] = useState('');
  const [rowLimit, setRowLimit] = useState(15);
  
  const navigate = useNavigate();

  const company = activeDomain ? activeDomain.split('.')[0].toUpperCase() : '—';
  const rootDomain = activeDomain ? activeDomain.toLowerCase() : '';

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (statusFilter !== 'All') {
      result = result.filter((a: any) =>
        statusFilter === 'Shadow' 
          ? (a.discovery === 'Shadow' || !!a.is_shadow_asset)
          : (a.discovery === 'Known' || !a.is_shadow_asset)
      );
    }
    // Safety check: ensure root domain itself is always Known
    return result.map((a: any) => {
        const isRoot = a.fqdn?.toLowerCase() === rootDomain || a.url?.includes(rootDomain) && a.url.split('//').pop().split('/')[0] === rootDomain;
        if (isRoot) return { ...a, discovery: 'Known', is_shadow_asset: false };
        return a;
    });
  }, [assets, statusFilter, rootDomain]);

  const domainsData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.type !== 'api_endpoint' && a.type !== 'api_route')
      .map((a: any) => ({
      id: a.id,
      date: a.scan_timestamp ?? '—',
      domain: a.url ?? '—',
      type: a.type ?? '—',
      risk: a.risk_level ?? 'UNKNOWN',
      discovery: a.discovery ?? 'Known',
    })), [filteredAssets]);

  const sslData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.type !== 'api_endpoint' && a.type !== 'api_route')
      .filter((a: any) => a.tls_version || a.cert_algorithm || a.cert_issuer || a.cert_sha256 || a.cert_expiry)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        fingerprint: a.cert_sha256 ?? '—',
        expiry: a.cert_expiry ?? '—',
        commonName: a.cert_subject ?? a.url ?? '—',
        ca: a.cert_issuer ?? '—',
        algorithm: a.cert_algorithm ?? '—',
        tls_version: a.tls_version ?? '—',
      })), [filteredAssets]);

  const ipData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.type !== 'api_endpoint' && a.type !== 'api_route')
      .filter((a: any) => a.ip_address)
      .map((a: any) => ({
        date: a.scan_timestamp ?? '—',
        ip: a.ip_address,
        port: a.port ?? '—',
        tlsVersion: a.tls_version ?? '—',
        type: a.type ?? '—',
      })), [filteredAssets]);

  const softwareData = useMemo(() =>
    filteredAssets
      .filter((a: any) => a.cipher_suite || a.type === 'web_portal' || a.type === 'api_endpoint')
      .map((a: any) => ({
      id: a.id,
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
    'Shadow': assets.filter((a: any) => {
        const isRoot = a.fqdn?.toLowerCase() === rootDomain || a.url?.includes(rootDomain) && a.url.split('//').pop().split('/')[0] === rootDomain;
        if (isRoot) return false;
        return a.discovery === 'Shadow' || a.is_shadow_asset;
    }).length,
    'Known':  assets.filter((a: any) => {
        const isRoot = a.fqdn?.toLowerCase() === rootDomain || a.url?.includes(rootDomain) && a.url.split('//').pop().split('/')[0] === rootDomain;
        if (isRoot) return true;
        return a.discovery === 'Known' && !a.is_shadow_asset;
    }).length,
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

  const currentTableData = useMemo(() => {
    let data: any[] = [];
    if (category === 'Domains') data = domainsData;
    else if (category === 'SSL') data = sslData;
    else if (category === 'IP Address/Subnets') data = ipData;
    else if (category === 'Software') data = softwareData;

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      data = data.filter((row: any) => 
        Object.values(row).some(val => val && String(val).toLowerCase().includes(q))
      );
    }
    return data;
  }, [category, domainsData, sslData, ipData, softwareData, tableSearch]);

  const pagedTableData = useMemo(() => {
    return currentTableData.slice(0, rowLimit);
  }, [currentTableData, rowLimit]);

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
                <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-secondary)' }}>{k.label}</div>
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
        {/* Toolbar */}
        <div className="px-5 py-3 border-b flex flex-wrap items-center gap-3"
          style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {category}
            <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-card-hover)', color: 'var(--text-secondary)' }}>
              {currentTableData.length}
            </span>
          </span>
          {/* Table search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" value={tableSearch} onChange={e => { setTableSearch(e.target.value); setRowLimit(15); }}
              placeholder="Search in table…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none"
              style={{ background: 'var(--surface-card-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-indigo)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')} />
          </div>
          <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-secondary)' }}>
            {activeDomain || 'No domain selected'}
          </span>
        </div>

        {/* Row slider */}
        <div className="px-5 py-2 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
            Show rows:
          </span>
          <input type="range" min={5} max={Math.max(5, currentTableData.length)} step={5}
            value={Math.min(rowLimit, Math.max(5, currentTableData.length))}
            onChange={e => setRowLimit(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--primary-indigo)' }} />
          <span className="text-[10px] font-mono font-bold w-16 text-right flex-shrink-0"
            style={{ color: 'var(--primary-indigo)' }}>
            {Math.min(rowLimit, currentTableData.length)} / {currentTableData.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'var(--text-secondary)' }}>
            <LoadingSpinner size={22} /> Loading assets…
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 420 }}>
            {category === 'Domains'            && <DomainsTable  company={company} data={pagedTableData} onRowClick={id => navigate('/asset/'+id)} />}
            {category === 'SSL'                && <SSLTable      company={company} data={pagedTableData} onRowClick={id => navigate('/asset/'+id)} />}
            {category === 'IP Address/Subnets' && <IPTable       company={company} data={pagedTableData} onRowClick={id => navigate('/asset/'+id)} />}
            {category === 'Software'           && <SoftwareTable company={company} data={pagedTableData} onRowClick={id => navigate('/asset/'+id)} />}
          </div>
        )}
        {!isLoading && (
          <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
            style={{ borderColor: 'var(--border-divider)', color: 'var(--text-secondary)' }}>
            <span>Showing {Math.min(rowLimit, currentTableData.length)} of {currentTableData.length} records</span>
            {currentTableData.length > rowLimit && (
              <button onClick={() => setRowLimit(r => Math.min(r + 15, currentTableData.length))}
                className="font-semibold" style={{ color: 'var(--primary-indigo)' }}>
                Show more ↓
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
