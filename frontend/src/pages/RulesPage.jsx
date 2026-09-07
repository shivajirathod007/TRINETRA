import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import apiClient from '../api/client';

const STATUS_STYLE = {
  PQC_READY:          { bg: 'rgba(34,197,94,0.10)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.25)' },
  FULLY_QUANTUM_SAFE: { bg: 'rgba(34,197,94,0.10)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.25)' },
  VULNERABLE:         { bg: 'rgba(239,68,68,0.10)',  color: 'var(--status-critical)', border: 'rgba(239,68,68,0.25)' },
  SAFE:               { bg: 'rgba(34,197,94,0.10)',  color: 'var(--status-safe)',     border: 'rgba(34,197,94,0.25)' },
};

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const RulesPage = () => {
  const [rules, setRules]             = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [matchType, setMatchType]     = useState('HOSTNAME');
  const [pattern, setPattern]         = useState('');
  const [overrideStatus, setOverrideStatus] = useState('PQC_READY');
  const [isSubmitting, setIsSubmitting]     = useState(false);

  useEffect(() => {
    if (matchType === 'PROTOCOL') setPattern('TLSv1.2');
    else setPattern('');
  }, [matchType]);

  const getPlaceholder = () => {
    const map = {
      CIPHER_SUITE: 'e.g. TLS_AES_256_GCM_SHA384',
      IP_ADDRESS:   'e.g. 192.168.1.*',
      PORT:         'e.g. 443',
      ALGORITHM:    'e.g. RSA-2048',
      VPN_PROTOCOL: 'e.g. OpenVPN',
      SSH_PROTOCOL: 'e.g. SSH-2.0-OpenSSH_*',
    };
    return map[matchType] || 'e.g. *.internal.bank.com';
  };

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/rules/');
      setRules(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!pattern) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/rules/', { match_type: matchType, pattern, override_status: overrideStatus, is_active: true });
      setPattern('');
      await fetchRules();
    } catch (err) {
      setError(err.message || 'Failed to add rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await apiClient.delete(`/rules/${id}`);
      await fetchRules();
    } catch (err) {
      setError(err.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-outfit" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Manual Rules &amp; Override
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Define custom rules to override PQC readiness classifications during scans.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)', color: 'var(--status-critical)' }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Add Rule form ── */}
        <div className="eterna-phase-card p-5 rounded-2xl h-fit">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary-indigo)' }}>
              <Plus size={16} aria-hidden="true" />
            </div>
            <h2 className="text-sm font-bold font-outfit" style={{ color: 'var(--text-primary)' }}>Add New Rule</h2>
          </div>

          <form onSubmit={handleAddRule} className="space-y-4">
            {/* Match Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Match Type
              </label>
              <select
                value={matchType}
                onChange={e => setMatchType(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-indigo-glow)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="HOSTNAME">Hostname (*.example.com)</option>
                <option value="CIPHER_SUITE">Cipher Suite</option>
                <option value="PROTOCOL">TLS Protocol Version</option>
                <option value="IP_ADDRESS">IP Address</option>
                <option value="PORT">Port Number</option>
                <option value="ALGORITHM">Crypto Algorithm</option>
                <option value="VPN_PROTOCOL">VPN Protocol</option>
                <option value="SSH_PROTOCOL">SSH Protocol</option>
              </select>
            </div>

            {/* Pattern */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Pattern
              </label>
              {matchType === 'PROTOCOL' ? (
                <select
                  value={pattern || 'TLSv1.2'}
                  onChange={e => setPattern(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-indigo-glow)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {['SSLv2','SSLv3','TLSv1.0','TLSv1.1','TLSv1.2','TLSv1.3'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  placeholder={getPlaceholder()}
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-indigo-glow)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  required={matchType !== 'PROTOCOL'}
                />
              )}
            </div>

            {/* Override Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                Override Status
              </label>
              <select
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-indigo-glow)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="PQC_READY">PQC Ready</option>
                <option value="FULLY_QUANTUM_SAFE">Fully Quantum Safe</option>
                <option value="VULNERABLE">Vulnerable</option>
                <option value="SAFE">Safe</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !pattern}
              className="eterna-btn-primary w-full py-2.5 text-sm font-bold"
            >
              {isSubmitting ? (
                <><RefreshCw size={13} className="animate-spin" aria-hidden="true" /> Adding…</>
              ) : (
                <><Plus size={13} aria-hidden="true" /> Add Rule</>
              )}
            </button>
          </form>
        </div>

        {/* ── Rules table ── */}
        <div className="lg:col-span-2 eterna-phase-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-divider)', background: 'var(--surface-card)' }}>
            <div className="flex items-center gap-2">
              <Shield size={15} style={{ color: 'var(--primary-indigo)' }} aria-hidden="true" />
              <h2 className="text-sm font-bold font-outfit" style={{ color: 'var(--text-primary)' }}>
                Active Rules
              </h2>
              {!isLoading && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary-indigo)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  {rules.length}
                </span>
              )}
            </div>
            <button onClick={fetchRules} className="action-btn text-xs" title="Refresh">
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-card)' }}>
                  {['Match Type', 'Pattern', 'Status Override', 'Actions'].map(h => (
                    <th key={h}
                      className="text-left text-[10px] uppercase tracking-widest px-4 py-3 font-bold border-b whitespace-nowrap"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm"
                      style={{ color: 'var(--text-secondary)' }}>
                      <RefreshCw size={18} className="animate-spin inline mr-2" aria-hidden="true" />
                      Loading rules…
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-14 text-center"
                      style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Settings size={28} aria-hidden="true" />
                        <p className="text-sm">No custom rules defined yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rules.map(rule => {
                    const s = STATUS_STYLE[rule.override_status] ?? STATUS_STYLE.PQC_READY;
                    return (
                      <tr key={rule.id}
                        className="border-b group"
                        style={{ borderColor: 'var(--border-divider)', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-4 py-3 text-sm"
                          style={{ color: 'var(--text-secondary)' }}>
                          {rule.match_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm"
                          style={{ color: 'var(--text-primary)' }}>
                          {rule.pattern}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border"
                            style={{ background: s.bg, borderColor: s.border, color: s.color }}>
                            {rule.override_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-critical)'; e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                            title="Delete rule"
                            aria-label={`Delete rule for ${rule.pattern}`}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
