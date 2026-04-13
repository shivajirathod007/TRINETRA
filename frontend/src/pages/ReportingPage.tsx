/**
 * ReportingPage — Full enterprise reporting suite
 * Tabs: Overview | Schedule | On-Demand
 * Matches the uploaded prototype screenshots exactly.
 */
import { useState } from 'react';
import {
  Download, Calendar, FileText, BarChart2, Mail, HardDrive,
  Link2, Bell, ChevronDown, ToggleLeft, ToggleRight,
  Globe, Shield, Cpu, ShieldCheck, Star, CheckSquare, Square, CheckCircle, RefreshCw
} from 'lucide-react';
import { SectionHeader } from '../components/shared';
import { useAutoLoadScan } from '../hooks/useAutoLoadScan';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useScanStore } from '../store';
import { useDashboard } from '../hooks';
import { reportsApi, type ReportRequest, type ScheduleReportRequest } from '../api/client';

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

function OverviewTab({ activeDomain, stats }: { activeDomain: string | null; stats: any }) {
  const [activeCard, setActiveCard] = useState<null | 'schedule' | 'ondemand'>(null);

  const CARDS = [
    {
      key: 'executive',
      icon: <FileText size={28} className="text-primary-indigo" />,
      label: 'Executive\nReporting',
      desc: 'High-level CISO briefing with full exposure overview',
      color: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.25)',
      accent: '#6366f1',
      badge: 'CISO Ready',
    },
    {
      key: 'schedule',
      icon: <Calendar size={28} className="text-status-safe" />,
      label: 'Scheduled\nReporting',
      desc: 'Automated weekly and monthly scan cadence',
      color: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.25)',
      accent: '#22c55e',
      badge: 'Automated',
    },
    {
      key: 'ondemand',
      icon: <BarChart2 size={28} className="text-brand-gold" />,
      label: 'On-Demand\nReporting',
      desc: 'Generate CBOM + risk report on demand',
      color: 'rgba(234,179,8,0.08)',
      border: 'rgba(234,179,8,0.25)',
      accent: '#f59e0b',
      badge: 'Instant',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Three card row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <div key={c.key}
            onClick={() => c.key !== 'executive' && setActiveCard(c.key as any)}
            className={`glass-card border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${c.key !== 'executive' ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            style={{ background: c.color, borderColor: c.border }}>
            {/* Top row: icon + badge */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: c.color, border: `1px solid ${c.border}` }}>
                {c.icon}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: c.accent, background: `${c.accent}18`, border: `1px solid ${c.accent}30` }}>
                {c.badge}
              </span>
            </div>
            {/* Label + desc */}
            <div>
              <div className="font-black text-primary whitespace-pre-line leading-tight text-sm mb-1">{c.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.desc}</div>
            </div>
            {/* Bottom accent line */}
            <div className="h-0.5 rounded-full mt-auto" style={{ background: `linear-gradient(90deg, ${c.accent}60, transparent)` }} />
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
            <div className="flex justify-between"><span>Domains Scanned</span><span className="font-mono text-primary font-bold">{activeDomain ? '1' : '0'}</span></div>
            <div className="flex justify-between"><span>Current Target</span><span className="font-mono text-primary font-bold truncate max-w-[120px] text-right" title={activeDomain || ''}>{activeDomain || '—'}</span></div>
            <div className="flex justify-between"><span>Total Assets</span><span className="font-mono text-primary font-bold">{stats?.total_assets ?? 0}</span></div>
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
            {[['Total Discovered', stats?.total_assets ?? 0],['Shadow Assets', stats?.shadow_count ?? 0],['Known Managed', Math.max(0, (stats?.total_assets ?? 0) - (stats?.shadow_count ?? 0))]].map(([k, v]) => (
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
          {[['Quantum Safe Progress', Math.round(((stats?.safe ?? 0) / Math.max(1, stats?.total_assets ?? 1)) * 100)],['Organization Risk Score', stats?.exposure_score ?? 0]].map(([label, pct], i) => (
            <div key={i} className="mb-2">
              {label && <div className="text-[10px] text-secondary mb-1 leading-tight">{label}</div>}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-card-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#22c55e' : (pct > 70 ? '#ef4444' : '#f59e0b') }} />
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
            <span className="text-sm font-bold text-primary">CBOM Target Findings</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-secondary">
            <div className="flex justify-between"><span>Cryptographic Bill of Material</span><span className="font-mono text-primary font-bold">TRINETRA</span></div>
            <div className="flex justify-between"><span>Vulnerable components found</span><span className="font-mono text-status-critical font-bold">{(stats?.critical_count ?? 0) + (stats?.high_count ?? 0)}</span></div>
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
  const { activeScanId } = useScanStore();
  const [enabled, setEnabled] = useState(true);
  const [sections, setSections] = useState({ discovery: true, inventory: true, cbom: true, pqc: true, rating: true });
  const [reportType, setReportType] = useState('Executive Summary Report');
  const [frequency, setFrequency] = useState('Weekly');
  const [assetFilter, setAssetFilter] = useState('All Assets');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'save' | 'download'>('email');
  const [email, setEmail] = useState('executive@org.com');
  const [savePath, setSavePath] = useState('/Reports/Quarterly');
  const [scheduleDate, setScheduleDate] = useState('2026-04-25');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | React.ReactNode | null>(null);

  const toggle = (k: keyof typeof sections) => setSections(s => ({ ...s, [k]: !s[k] }));

  const handleScheduleReport = async () => {
    setLoading(true);
    setSuccessMessage(null);
    
    try {
      const selectedSections = Object.entries(sections)
        .filter(([_, checked]) => checked)
        .map(([key, _]) => key);

      if (selectedSections.length === 0) {
        setSuccessMessage('❌ Please select at least one section to include');
        setLoading(false);
        return;
      }

      // If download link is selected, generate report immediately instead of scheduling
      if (deliveryMethod === 'download') {
        setSuccessMessage('📥 Generating report for download...');
        
        const reportRequest: ReportRequest = {
          report_type: reportType.toLowerCase().replace(/ /g, '_'),
          scan_id: activeScanId || null,
          asset_filter: assetFilter.toLowerCase().replace(/ /g, '_'),
          sections: selectedSections,
          delivery_method: 'download',
          format: 'PDF',  // Default to PDF for downloads
          include_charts: true,
          period: 'last_30_days',
        };

        const response = await reportsApi.generate(reportRequest);
        
        if (response.success && response.download_url) {
          // Construct full download URL
          const baseUrl = window.location.origin;
          const fullDownloadUrl = response.download_url.startsWith('http') 
            ? response.download_url 
            : `${baseUrl}${response.download_url}`;
          
          // Determine file extension
          const fileExt = 'pdf';
          
          // Show download link in success message with clickable link
          const downloadLink = (
            <div className="flex flex-col gap-2">
              <span>✅ Report generated successfully!</span>
              <a 
                href={fullDownloadUrl} 
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-indigo hover:underline font-semibold flex items-center gap-2"
                style={{ color: '#6366f1' }}
              >
                <Link2 size={16} /> Click here to download: trinetra_report_{response.report_id}.{fileExt}
              </a>
            </div>
          );
          
          setSuccessMessage(downloadLink);
          
          // Also auto-trigger download
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = fullDownloadUrl;
            link.download = `trinetra_report_${response.report_id}.${fileExt}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, 500);
        } else {
          setSuccessMessage(response.message);
        }
        
        setTimeout(() => setSuccessMessage(null), 7000);
        setLoading(false);
        return;
      }

      // For email and save, schedule the report
      setSuccessMessage('⏳ Scheduling report...');

      const request: ScheduleReportRequest = {
        report_type: reportType.toLowerCase().replace(/ /g, '_'),
        frequency: frequency.toLowerCase(),
        asset_filter: assetFilter.toLowerCase().replace(/ /g, '_'),
        sections: selectedSections,
        delivery_method: deliveryMethod,
        email: deliveryMethod === 'email' ? email : null,
        save_path: deliveryMethod === 'save' ? savePath : null,
        schedule_date: scheduleDate,
        schedule_time: scheduleTime,
        timezone: timezone,
        enabled: enabled,
      };

      const response = await reportsApi.schedule(request);
      
      if (response.success) {
        setSuccessMessage(response.message);
        // Auto-hide success message after 7 seconds
        setTimeout(() => setSuccessMessage(null), 7000);
      }
    } catch (error: any) {
      console.error('Failed to schedule report:', error);
      setSuccessMessage(`❌ Failed to schedule report: ${error.response?.data?.detail || error.message}`);
      // Keep error message visible longer
      setTimeout(() => setSuccessMessage(null), 10000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Success/Progress Message Banner */}
      {successMessage && (
        <div className={`rounded-xl p-4 flex items-center gap-3 animate-fadeIn ${
          typeof successMessage === 'string' && successMessage.startsWith('✅') 
            ? 'bg-status-safe/10 border border-status-safe/30' 
            : typeof successMessage === 'string' && successMessage.startsWith('❌')
            ? 'bg-status-critical/10 border border-status-critical/30'
            : 'bg-primary-indigo/10 border border-primary-indigo/30'
        }`}>
          {typeof successMessage === 'string' && successMessage.startsWith('✅') ? (
            <CheckCircle size={20} className="text-status-safe flex-shrink-0" />
          ) : typeof successMessage === 'string' && successMessage.startsWith('❌') ? (
            <Shield size={20} className="text-status-critical flex-shrink-0" />
          ) : typeof successMessage === 'string' ? (
            <RefreshCw size={20} className="text-primary-indigo flex-shrink-0 animate-spin" />
          ) : (
            <CheckCircle size={20} className="text-status-safe flex-shrink-0" />
          )}
          <div className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
            {successMessage}
          </div>
        </div>
      )}

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
              <div className="relative w-full">
                <select value={reportType} onChange={e => setReportType(e.target.value)}
                  className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer">
                  {['Executive Summary Report', 'Technical Risk Report', 'CBOM Export', 'Compliance Report'].map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-secondary pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Frequency</label>
              <div className="relative w-full">
                <select value={frequency} onChange={e => setFrequency(e.target.value)}
                  className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer">
                  {['Weekly', 'Daily', 'Monthly', 'Bi-Weekly'].map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-secondary pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Select Assets</label>
              <div className="relative w-full">
                <select value={assetFilter} onChange={e => setAssetFilter(e.target.value)}
                  className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer">
                  {['All Assets', 'Critical Only', 'Specific Domain'].map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-secondary pointer-events-none" />
              </div>
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
                  <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary-indigo/50" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1.5">Time</label>
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary-indigo/50" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1.5">Time Zone</label>
                  <div className="relative w-full">
                    <select value={timezone} onChange={e => setTimezone(e.target.value)}
                      className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-primary-indigo/50 cursor-pointer">
                      {['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'].map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-secondary pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Delivery Options</div>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'email' as const, label: 'Email', icon: <Mail size={14} />, sub: email, editable: true },
                  { key: 'save' as const, label: 'Save to Location', icon: <HardDrive size={14} />, sub: savePath, editable: true },
                  { key: 'download' as const, label: 'Download Link', icon: <Link2 size={14} />, sub: '', editable: false },
                ].map(d => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod(d.key)}
                      className={`flex-1 flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${
                        deliveryMethod === d.key
                          ? 'border-primary-indigo bg-primary-indigo/10 text-primary'
                          : 'border-glass-border text-secondary hover:border-primary-indigo/30'
                      }`}>
                      {d.icon} <span>{d.label}</span>
                      {d.editable && d.sub && (
                        <span className="text-[10px] font-mono text-secondary/60 ml-auto truncate max-w-[120px]">{d.sub}</span>
                      )}
                    </button>
                    {deliveryMethod === d.key && (
                      <div className="w-3 h-3 rounded-full bg-primary-indigo flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(99,102,241,0.6)' }} />
                    )}
                  </div>
                ))}
                
                {/* Editable fields */}
                {deliveryMethod === 'email' && (
                  <div className="mt-2">
                    <label className="text-xs text-secondary block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="executive@org.com"
                      className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary-indigo/50"
                    />
                  </div>
                )}
                {deliveryMethod === 'save' && (
                  <div className="mt-2">
                    <label className="text-xs text-secondary block mb-1.5">Save Path</label>
                    <input
                      type="text"
                      value={savePath}
                      onChange={e => setSavePath(e.target.value)}
                      placeholder="/Reports/Quarterly"
                      className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary-indigo/50"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-center">
          <button
            type="button"
            onClick={handleScheduleReport}
            disabled={loading}
            className="w-full px-8 py-3.5 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            {deliveryMethod === 'download' ? (
              <>
                <Download size={18} /> {loading ? 'Generating...' : 'Generate & Download Report'}
              </>
            ) : (
              <>
                <Calendar size={18} /> {loading ? 'Scheduling...' : 'Schedule Report'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: On-Demand Reporting ──────────────────────────────────────────────────

function OnDemandTab() {
  const { activeScanId } = useScanStore();
  const [types, setTypes] = useState({
    executive: true, discovery: true, inventory: false, cbom: true, pqc: false, rating: true
  });
  const [delivery, setDelivery] = useState({
    email: true, save: false, download: false, slack: false
  });
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [period, setPeriod] = useState('Last 30 Days');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [email, setEmail] = useState('analyst@org.com');
  const [savePath, setSavePath] = useState('/Reports/OnDemand');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleGenerateReport = async () => {
    setLoading(true);
    setSuccessMessage(null);
    
    try {
      const selectedSections = Object.entries(types)
        .filter(([_, checked]) => checked)
        .map(([key, _]) => key);

      const selectedDelivery = Object.entries(delivery)
        .filter(([_, checked]) => checked)
        .map(([key, _]) => key);

      if (selectedDelivery.length === 0) {
        setSuccessMessage('❌ Please select at least one delivery method');
        setLoading(false);
        return;
      }

      if (selectedSections.length === 0) {
        setSuccessMessage('❌ Please select at least one report type');
        setLoading(false);
        return;
      }

      // Show progress message
      setSuccessMessage('⏳ Generating report from database...');

      // Generate report for each selected delivery method
      const results: string[] = [];
      let downloadTriggered = false;
      
      for (const method of selectedDelivery) {
        // Update progress
        if (method === 'email') {
          setSuccessMessage('📧 Sending email...');
        } else if (method === 'save') {
          setSuccessMessage('💾 Saving to file system...');
        } else if (method === 'download') {
          setSuccessMessage('📥 Preparing download...');
        }

        const request: ReportRequest = {
          report_type: 'on_demand',
          scan_id: activeScanId || null,
          asset_filter: 'all',
          sections: selectedSections,
          delivery_method: method,
          email: method === 'email' ? email : null,
          save_path: method === 'save' ? savePath : null,
          format: format,
          include_charts: includeCharts,
          period: period.toLowerCase().replace(/ /g, '_'),
        };

        const response = await reportsApi.generate(request);
        
        if (response.success) {
          results.push(response.message);
          
          // Handle download link - trigger immediately
          if (method === 'download' && response.download_url) {
            downloadTriggered = true;
            // Create a temporary link and click it to trigger download
            const link = document.createElement('a');
            link.href = response.download_url;
            link.download = `trinetra_report_${response.report_id}.${format.toLowerCase()}`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show download started message
            setSuccessMessage('📥 Download started! Check your downloads folder...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Show final combined success message
      const finalMessage = results.join(' | ');
      setSuccessMessage(finalMessage);
      
      // Auto-hide success message after 7 seconds
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      setSuccessMessage(`❌ Failed to generate report: ${error.response?.data?.detail || error.message}`);
      // Keep error message visible longer
      setTimeout(() => setSuccessMessage(null), 10000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Success Message Banner */}
      {successMessage && (
        <div className={`rounded-xl p-4 flex items-center gap-3 animate-fadeIn ${
          successMessage.startsWith('✅') 
            ? 'bg-status-safe/10 border border-status-safe/30' 
            : 'bg-status-critical/10 border border-status-critical/30'
        }`}>
          {successMessage.startsWith('✅') ? (
            <CheckCircle size={20} className="text-status-safe flex-shrink-0" />
          ) : (
            <Shield size={20} className="text-status-critical flex-shrink-0" />
          )}
          <div className="flex-1">
            <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>
              {successMessage}
            </span>
            {successMessage.includes('download') && (
              <span className="text-xs mt-1 block" style={{ color: 'var(--text-secondary)' }}>
                Check your downloads folder or browser's download manager
              </span>
            )}
          </div>
        </div>
      )}

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
              
              {/* Editable fields for selected delivery methods */}
              {delivery.email && (
                <div className="mt-3">
                  <label className="text-xs text-secondary block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="analyst@org.com"
                    className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-brand-gold/50"
                  />
                </div>
              )}
              {delivery.save && (
                <div className="mt-3">
                  <label className="text-xs text-secondary block mb-1.5">Save Path</label>
                  <input
                    type="text"
                    value={savePath}
                    onChange={e => setSavePath(e.target.value)}
                    placeholder="/Reports/OnDemand"
                    className="w-full bg-surface-card border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-brand-gold/50"
                  />
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="glass-card border rounded-xl p-4" style={{ borderColor: 'rgba(234,179,8,0.15)' }}>
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Advanced Settings</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(['PDF','CSV','JSON'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setFormat(f)}
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
                <Toggle on={includeCharts} onChange={() => setIncludeCharts(!includeCharts)} />
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1.5">Report Period</label>
                <div className="relative w-full">
                  <select value={period} onChange={e => setPeriod(e.target.value)}
                    className="w-full appearance-none bg-surface-card border border-glass-border text-primary text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-brand-gold/50 cursor-pointer">
                    {['Last 30 Days', 'Last 7 Days', 'Last 90 Days', 'All Time', 'Custom Range'].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-2.5 text-secondary pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-center">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full px-8 py-3.5 font-bold text-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Download size={18} /> {loading ? 'Generating...' : 'Generate Report'}
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
  const { activeScanId, activeDomain } = useScanStore();
  const { data: stats } = useDashboard(activeDomain || null, activeScanId);
  
  const [tab, setTab] = useState<Tab>('overview');
  const [exportingAll, setExportingAll] = useState(false);

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      // Generate comprehensive report with all sections
      const request: ReportRequest = {
        report_type: 'comprehensive',
        scan_id: activeScanId || null,
        asset_filter: 'all',
        sections: ['discovery', 'inventory', 'cbom', 'pqc', 'rating'],
        delivery_method: 'download',
        format: 'JSON',
        include_charts: true,
        period: 'all_time',
      };

      const response = await reportsApi.generate(request);
      
      if (response.success && response.download_url) {
        // Trigger download
        window.open(response.download_url, '_blank');
      }
    } catch (error: any) {
      console.error('Failed to export all:', error);
      alert(`Failed to export: ${error.response?.data?.detail || error.message}`);
    } finally {
      setExportingAll(false);
    }
  };

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
          <button 
            onClick={handleExportAll}
            disabled={exportingAll}
            className="action-btn flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} /> {exportingAll ? 'Exporting...' : 'Export All'}
          </button>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'text-white'
                : 'hover:text-primary'
            }`}
            style={tab === t.key ? {
              background: 'var(--primary-indigo)',
              boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
              color: 'white',
            } : { color: 'var(--text-secondary)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab activeDomain={activeDomain} stats={stats} />}
      {tab === 'schedule'  && <ScheduleTab />}
      {tab === 'ondemand'  && <OnDemandTab />}
    </div>
  );
}
