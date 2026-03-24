/**
 * ReportingPage — Full enterprise reporting suite
 * Tabs: Overview | Schedule | On-Demand
 * Matches the uploaded prototype screenshots exactly.
 */
import { useState } from 'react';
import {
  Download, Calendar, FileText, BarChart2, Mail, HardDrive,
  Link2, Bell, ChevronDown, ToggleLeft, ToggleRight,
  Globe, Shield, Cpu, ShieldCheck, Star, CheckSquare, Square
} from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

// ─── shared primitives ────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex-shrink-0">
      {on
        ? <ToggleRight size={28} className="text-primary-indigo" />
        : <ToggleLeft  size={28} className="text-secondary opacity-50" />}
    </button>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  const [val, setVal] = useState(options[0]);
  return (
    <div className="relative w-full">
      <select value={val} onChange={e => setVal(e.target.value)}
        className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-3.5 text-secondary pointer-events-none" />
    </div>
  );
}

function CheckItem({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
      style={{ color: checked ? 'var(--primary-indigo-hover)' : 'var(--text-secondary)' }}>
      {checked
        ? <CheckSquare size={15} className="text-primary-indigo flex-shrink-0" />
        : <Square size={15} className="flex-shrink-0" />}
      {icon}{label}
    </button>
  );
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [activeCard, setActiveCard] = useState<null | 'schedule' | 'ondemand'>(null);

  const CARDS = [
    {
      key: 'executive',
      icon: <FileText size={32} className="text-primary-indigo" />,
      label: 'Executive\nReporting',
      desc: 'High-level CISO briefing with full exposure overview',
      color: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.3)',
    },
    {
      key: 'schedule',
      icon: <Calendar size={32} className="text-status-safe" />,
      label: 'Scheduled\nReporting',
      desc: 'Automated weekly and monthly scan cadence',
      color: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.3)',
    },
    {
      key: 'ondemand',
      icon: <BarChart2 size={32} className="text-brand-gold" />,
      label: 'On-Demand\nReporting',
      desc: 'Generate CBOM + risk report on demand',
      color: 'rgba(234,179,8,0.1)',
      border: 'rgba(234,179,8,0.3)',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Three card row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <div key={c.key}
            onClick={() => c.key !== 'executive' && setActiveCard(c.key as any)}
            className={`glass-card border rounded-2xl p-6 flex flex-col items-center gap-3 text-center transition-all duration-200 ${c.key !== 'executive' ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            style={{ background: c.color, borderColor: c.border, boxShadow: `0 0 20px ${c.color}` }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{ background: c.color, borderColor: c.border }}>
              {c.icon}
            </div>
            <div className="font-black text-primary whitespace-pre-line leading-tight">{c.label}</div>
            <div className="text-xs text-secondary">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Summary dashboard — 5 module tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assets Discovery */}
        <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-primary-indigo" />
            <span className="text-sm font-bold text-primary">Assets Discovery</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-secondary">
            <div className="flex justify-between"><span>Domains</span><span className="font-mono text-primary font-bold">213,450</span></div>
            <div className="flex justify-between"><span>Pick subdomain</span><span className="font-mono text-primary font-bold">—</span></div>
            <div className="flex justify-between"><span>Cloud Assets</span><span className="font-mono text-primary font-bold">13,372</span></div>
          </div>
        </div>

        {/* Cyber Rating */}
        <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(234,179,8,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-brand-gold" />
            <span className="text-sm font-bold text-primary">Cyber Rating</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-secondary">
            {[['Tier 1', 'Excellent', '#22c55e'],['Tier 2', 'Good', '#3b82f6'],['Tier 3', 'Satisfactory', '#f59e0b'],['Tier 4', 'Needs Work', '#ef4444']].map(([t, l, c]) => (
              <div key={t} className="flex justify-between items-center">
                <span>{t}</span>
                <span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{ color: c, background: `${c}18` }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assets Inventory */}
        <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} style={{ color: '#a78bfa' }} />
            <span className="text-sm font-bold text-primary">Assets Inventory</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-secondary">
            {[['SSL Certificates', '8761'],['Software', '13,211'],['IoT Devices', '3854'],['Login Forms', '1168']].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><span className="font-mono text-primary font-bold">{v}</span></div>
            ))}
          </div>
        </div>

        {/* Posture of PQC */}
        <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-status-safe" />
            <span className="text-sm font-bold text-primary">Posture of PQC</span>
          </div>
          {[['Progress on goal aspects of cryptography adoption', 33],['', 22]].map(([label, pct], i) => (
            <div key={i} className="mb-2">
              {label && <div className="text-[10px] text-secondary mb-1 leading-tight">{label}</div>}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-card-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#22c55e' }} />
                </div>
                <span className="text-xs font-mono text-secondary w-8 text-right">{pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* CBOM */}
        <div className="glass-card border rounded-xl p-4 md:col-span-2" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: '#a78bfa' }} />
            <span className="text-sm font-bold text-primary">CBOM</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-secondary">
            <div className="flex justify-between"><span>Cryptographic Bill of Material</span><span className="font-mono text-primary font-bold">CycloneDX 1.6</span></div>
            <div className="flex justify-between"><span>6248 vulnerable components found</span><span className="font-mono text-status-critical font-bold">6,248</span></div>
          </div>
        </div>
      </div>

      {/* Shortcut to history */}
      <Link to="/history"
        className="glass-card border rounded-xl p-4 flex items-center gap-4 no-underline hover:border-primary-indigo/40 transition-all group"
        style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' }}>
        <Clock size={18} className="text-primary-indigo" />
        <div className="flex-1 text-sm font-bold text-primary group-hover:text-primary-indigo transition-colors">View Scan History</div>
        <span className="text-primary-indigo opacity-60 group-hover:opacity-100">→</span>
      </Link>
    </div>
  );
}

// ─── Tab: Schedule Reporting ───────────────────────────────────────────────────

function ScheduleTab() {
  const [enabled, setEnabled] = useState(true);
  const [sections, setSections] = useState({ discovery: true, inventory: true, cbom: true, pqc: true, rating: true });

  const toggle = (k: keyof typeof sections) => setSections(s => ({ ...s, [k]: !s[k] }));

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border flex items-center justify-between"
          style={{ background: 'rgba(99,102,241,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Calendar size={20} className="text-primary-indigo" />
            </div>
            <div>
              <div className="font-black text-primary">Schedule Reporting</div>
              <div className="text-xs text-secondary mt-0.5">Automate periodic report generation</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary">Enable Schedule</span>
            <Toggle on={enabled} onChange={() => setEnabled(e => !e)} />
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: config */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Report Type</label>
              <Select label="" options={['Executive Summary Report', 'Technical Risk Report', 'CBOM Export', 'Compliance Report']} />
            </div>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Frequency</label>
              <Select label="" options={['Weekly', 'Daily', 'Monthly', 'Bi-Weekly']} />
            </div>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Select Assets</label>
              <Select label="" options={['All Assets', 'Critical Only', 'Specific Domain']} />
            </div>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-3">Include Sections</label>
              <div className="grid grid-cols-2 gap-2">
                <CheckItem label="Discovery"   icon={<Globe size={13} />}       checked={sections.discovery} onChange={() => toggle('discovery')} />
                <CheckItem label="Inventory"   icon={<Cpu size={13} />}         checked={sections.inventory} onChange={() => toggle('inventory')} />
                <CheckItem label="CBOM"        icon={<Shield size={13} />}      checked={sections.cbom}      onChange={() => toggle('cbom')} />
                <CheckItem label="PQC Posture" icon={<ShieldCheck size={13} />} checked={sections.pqc}       onChange={() => toggle('pqc')} />
                <CheckItem label="Cyber Rating" icon={<Star size={13} />}       checked={sections.rating}    onChange={() => toggle('rating')} />
              </div>
            </div>
          </div>

          {/* Right: schedule details + delivery */}
          <div className="flex flex-col gap-4">
            <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Schedule Details</div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1.5">Date</label>
                  <input type="date" defaultValue="2026-04-25"
                    className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary-indigo/50" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1.5">Time</label>
                  <div className="flex items-center gap-2 bg-surface-card border border-glass-border rounded-lg px-3 py-2">
                    <span className="text-sm text-primary font-mono">09:00 AM (IST)</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1.5">Time Zone</label>
                  <Select label="" options={['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London']} />
                </div>
              </div>
            </div>

            <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Delivery Options</div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Email', icon: <Mail size={14} />, sub: 'executive@org.com' },
                  { label: 'Save to Location', icon: <HardDrive size={14} />, sub: '/Reports/Quarterly' },
                  { label: 'Download Link', icon: <Link2 size={14} />, sub: '' },
                ].map(d => (
                  <div key={d.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      {d.icon} <span>{d.label}</span>
                      {d.sub && <span className="text-[10px] font-mono text-secondary/60 ml-1">{d.sub}</span>}
                    </div>
                    <div className="w-3 h-3 rounded-full bg-primary-indigo/70" style={{ boxShadow: '0 0 6px rgba(99,102,241,0.6)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button className="w-full md:w-auto px-8 py-3 bg-primary-indigo text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
            <Calendar size={16} /> Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: On-Demand Reporting ──────────────────────────────────────────────────

function OnDemandTab() {
  const [types, setTypes] = useState({
    executive: true, discovery: true, inventory: false, cbom: true, pqc: false, rating: true
  });
  const [delivery, setDelivery] = useState({
    email: true, save: true, download: false, slack: false
  });
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');

  const toggle = (k: string, obj: any, setter: any) => setter((s: any) => ({ ...s, [k]: !s[k] }));

  const TYPES = [
    { key: 'executive', label: 'Executive Reporting', icon: <FileText size={14} /> },
    { key: 'discovery', label: 'Assets Discovery',   icon: <Globe size={14} /> },
    { key: 'inventory', label: 'Assets Inventory',   icon: <Cpu size={14} /> },
    { key: 'cbom',      label: 'CBOM',               icon: <Shield size={14} /> },
    { key: 'pqc',       label: 'Posture of PQC',     icon: <ShieldCheck size={14} /> },
    { key: 'rating',    label: 'Cyber Rating (Tier 1-4)', icon: <Star size={14} /> },
  ];

  const DELIVERY = [
    { key: 'email',    label: 'Send via Email',    icon: <Mail size={14} /> },
    { key: 'save',     label: 'Save to Location',  icon: <HardDrive size={14} /> },
    { key: 'download', label: 'Download Link',     icon: <Link2 size={14} /> },
    { key: 'slack',    label: 'Slack Notification',icon: <Bell size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(234,179,8,0.2)' }}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3"
          style={{ background: 'rgba(234,179,8,0.06)' }}>
          <div className="p-2 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)' }}>
            <BarChart2 size={20} className="text-brand-gold" />
          </div>
          <div>
            <div className="font-black text-primary">On-Demand Reporting</div>
            <div className="text-xs text-secondary mt-0.5">Generate reports on demand</div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: report types */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-3">Report Type</label>
              <div className="flex flex-col gap-2">
                {TYPES.map(t => (
                  <CheckItem key={t.key} label={t.label} icon={t.icon}
                    checked={(types as any)[t.key]}
                    onChange={() => toggle(t.key, types, setTypes)} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: delivery + advanced */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-3">Delivery Options</label>
              <div className="flex flex-col gap-3">
                {DELIVERY.map(d => (
                  <div key={d.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-secondary">{d.icon} {d.label}</div>
                    <Toggle on={(delivery as any)[d.key]} onChange={() => toggle(d.key, delivery, setDelivery)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(234,179,8,0.15)' }}>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Advanced Settings</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(['PDF','CSV','JSON'] as const).map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      format === f
                        ? 'bg-brand-gold text-black border-brand-gold'
                        : 'border-glass-border text-secondary hover:text-primary'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-secondary">Include Charts</span>
                <div className="w-3 h-3 rounded-full bg-status-safe" style={{ boxShadow: '0 0 6px #22c55e' }} />
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1.5">Report Period</label>
                <Select label="" options={['Last 30 Days', 'Last 7 Days', 'Last 90 Days', 'All Time', 'Custom Range']} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button className="w-full md:w-auto px-8 py-3 font-bold text-black rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Download size={16} /> Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'schedule' | 'ondemand';

export default function ReportingPage() {
  useAutoLoadScan();
  const [tab, setTab] = useState<Tab>('overview');

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',  label: 'Overview',    icon: <BarChart2 size={14} /> },
    { key: 'schedule',  label: 'Schedule',    icon: <Calendar size={14} /> },
    { key: 'ondemand',  label: 'On-Demand',   icon: <Download size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Reporting Center"
        subtitle="Executive reporting, scheduling & compliance exports"
        action={
          <button className="action-btn flex items-center gap-2 text-sm">
            <Download size={14} /> Export All
          </button>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 rounded-xl w-fit"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-primary-indigo text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]'
                : 'text-secondary hover:text-primary'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab />}
      {tab === 'schedule'  && <ScheduleTab />}
      {tab === 'ondemand'  && <OnDemandTab />}
    </div>
  );
}
