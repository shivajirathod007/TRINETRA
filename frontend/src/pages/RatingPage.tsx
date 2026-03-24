/**
 * RatingPage — Cyber Rating
 * Enterprise threat intelligence scoring and exposure rating module.
 */
import { Star, Zap, Shield, TrendingUp, AlertTriangle, Lock } from 'lucide-react';

const RATING_CATEGORIES = [
  { label: 'Network Exposure',      score: 72, max: 100, icon: <Shield size={18} />,       color: '#6366f1' },
  { label: 'Cryptographic Posture', score: 58, max: 100, icon: <Lock size={18} />,         color: '#f59e0b' },
  { label: 'Attack Surface',        score: 41, max: 100, icon: <AlertTriangle size={18} />, color: '#ef4444' },
  { label: 'Vulnerability Trend',   score: 84, max: 100, icon: <TrendingUp size={18} />,    color: '#22c55e' },
  { label: 'PQC Readiness',         score: 63, max: 100, icon: <Zap size={18} />,           color: '#8b5cf6' },
];

function CircleScore({ score }: { score: number }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  const gradeColor = score >= 80 ? '#22c55e' : score >= 65 ? '#6366f1' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r} fill="none"
          stroke={gradeColor} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${gradeColor})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black font-mono" style={{ color: gradeColor }}>{grade}</span>
        <span className="text-xs text-secondary font-mono">{score}/100</span>
      </div>
    </div>
  );
}

export default function RatingPage() {
  const overall = Math.round(RATING_CATEGORIES.reduce((s, c) => s + c.score, 0) / RATING_CATEGORIES.length);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface-card p-5 rounded-xl border border-glass-border">
        <div className="flex items-center gap-4">
          <div className="bg-brand-gold/10 p-3 rounded-xl">
            <Star size={28} className="text-brand-gold" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Cyber Rating</h1>
            <p className="text-secondary text-sm">Enterprise-grade exposure scoring across all attack surfaces</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-status-medium" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
          <Zap size={14} /> BETA — Live Data Pending
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 border rounded-xl flex flex-col items-center gap-3 col-span-1">
          <div className="text-xs text-secondary uppercase tracking-widest font-semibold mb-2">Overall Rating</div>
          <CircleScore score={overall} />
          <div className="text-center">
            <div className="text-sm font-bold text-primary mt-2">TRINETRA Risk Score</div>
            <div className="text-xs text-secondary">Composite across 5 domains</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card p-6 border rounded-xl flex flex-col gap-4 col-span-2">
          <h2 className="font-bold text-primary border-b border-glass-border pb-3">Domain Breakdown</h2>
          {RATING_CATEGORIES.map(cat => (
            <div key={cat.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-primary font-medium" style={{ color: cat.color }}>
                  {cat.icon} {cat.label}
                </span>
                <span className="font-mono font-bold" style={{ color: cat.color }}>{cat.score}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${cat.score}%`, background: cat.color, boxShadow: `0 0 6px ${cat.color}55` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div
        className="glass-card border rounded-xl p-6 flex items-center gap-4"
        style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}
      >
        <Zap size={32} className="text-primary-indigo opacity-60 shrink-0" />
        <div>
          <div className="font-bold text-primary mb-1">Live Intelligence Integration — Coming Soon</div>
          <div className="text-sm text-secondary">The TRINETRA rating engine will pull real-time threat feeds, CVE databases, and cryptographic inventory data to compute live scores replacing these illustrative benchmarks.</div>
        </div>
      </div>

      <style>{`.shrink-0 { flex-shrink: 0; }`}</style>
    </div>
  );
}
