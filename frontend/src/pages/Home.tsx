import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInitiateScan, useScanStatus } from '@/hooks'
import { useScanStore, useSettingsStore } from '@/store'
import { LoadingSpinner, ScoreBadge } from '@/components/shared'
import { clsx } from 'clsx'

const QUICK_DOMAINS = ['pnb.in', 'sbi.co.in', 'icicibank.com', 'hdfcbank.com']

const SCAN_STAGES: Record<string, string> = {
  ct_mining:      '1/4 Mining Certificate Transparency logs…',
  dns_resolution: '2/4 Resolving discovered subdomains…',
  port_scanning:  '3/4 Probing open ports and services…',
  scanning:       '4/4 Running quantum vulnerability scanners…',
  analysis:       '4/4 Computing exposure scores and CBOM…',
  complete:       'Scan complete',
}

export default function HomePage() {
  const [domain, setDomain] = useState('')
  const navigate = useNavigate()
  const { mutate: initiate, isPending } = useInitiateScan()
  const { activeScanId, activeDomain } = useScanStore()
  const { crqcScenario, setCrqcScenario } = useSettingsStore()

  const { data: scanStatus } = useScanStatus(activeScanId)

  const handleScan = () => {
    if (!domain.trim()) return
    initiate({ domain: domain.trim(), crqc_scenario: crqcScenario })
  }

  const isRunning = scanStatus?.status === 'PENDING' || scanStatus?.status === 'RUNNING'
  const isDone = scanStatus?.status === 'COMPLETED'

  return (
    <div className="max-w-2xl mx-auto pt-8">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-red to-brand-gold flex items-center justify-center text-xl font-bold">
            T3
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-white">TRINETRA</div>
            <div className="text-sm text-gray-400">Quantum Exposure Intelligence Platform</div>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Discover every public-facing cryptographic asset. Identify quantum vulnerabilities. Generate CBOM.
        </p>
      </div>

      {/* Scan Input Card */}
      <div className="card mb-6">
        <div className="section-title">Target Domain</div>
        <div className="flex gap-3 mb-4">
          <input
            className="input flex-1 font-mono"
            placeholder="pnb.in"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            disabled={isRunning}
          />
          <button
            className="btn-primary min-w-32 flex items-center justify-center gap-2"
            onClick={handleScan}
            disabled={isPending || isRunning || !domain.trim()}
          >
            {isRunning ? <><LoadingSpinner size={16} /> Scanning…</> : 'Initiate Scan'}
          </button>
        </div>

        {/* Quick domains */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Quick:</span>
          {QUICK_DOMAINS.map(d => (
            <button key={d} className="tag cursor-pointer hover:bg-surface-600 transition-colors"
              onClick={() => setDomain(d)}>
              {d}
            </button>
          ))}
        </div>

        {/* CRQC scenario */}
        <div className="mt-4 pt-4 border-t border-surface-600">
          <div className="section-title">CRQC Arrival Scenario</div>
          <div className="flex gap-2">
            {(['pessimistic', 'moderate', 'optimistic'] as const).map(s => (
              <button
                key={s}
                onClick={() => setCrqcScenario(s)}
                className={clsx(
                  'text-xs px-3 py-1.5 rounded-lg border capitalize transition-colors',
                  crqcScenario === s
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                    : 'border-surface-600 text-gray-400 hover:border-gray-500'
                )}
              >
                {s} {s === 'pessimistic' ? '(2028)' : s === 'moderate' ? '(2032)' : '(2037)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scan Progress */}
      {activeScanId && scanStatus && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-white">{activeDomain}</div>
              <div className="text-xs text-gray-500">
                {SCAN_STAGES[scanStatus.current_stage ?? ''] ?? scanStatus.current_stage ?? scanStatus.status}
              </div>
            </div>
            <span className={clsx('text-xs font-medium px-2 py-1 rounded',
              isRunning ? 'bg-blue-900/40 text-blue-400' :
              isDone    ? 'bg-emerald-900/40 text-emerald-400' :
                          'bg-red-900/40 text-red-400'
            )}>
              {scanStatus.status}
            </span>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-brand-red to-brand-gold rounded-full animate-scan w-1/2" />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card-sm py-2">
              <div className="text-lg font-bold text-white">{scanStatus.assets_discovered}</div>
              <div className="text-xs text-gray-500">Discovered</div>
            </div>
            <div className="card-sm py-2">
              <div className="text-lg font-bold text-white">{scanStatus.assets_scanned}</div>
              <div className="text-xs text-gray-500">Scanned</div>
            </div>
            <div className="card-sm py-2">
              <div className="text-lg font-bold text-yellow-400">{scanStatus.shadow_assets_found}</div>
              <div className="text-xs text-gray-500">Shadow</div>
            </div>
          </div>

          {/* Done CTA */}
          {isDone && (
            <button
              className="btn-primary w-full mt-4"
              onClick={() => navigate(`/dashboard`)}
            >
              View Results →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
