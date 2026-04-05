import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Settings, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

const RulesPage = () => {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [matchType, setMatchType] = useState('HOSTNAME');
    const [pattern, setPattern] = useState('');
    const [overrideStatus, setOverrideStatus] = useState('PQC_READY');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset or set default pattern when matchType changes
    useEffect(() => {
        if (matchType === 'PROTOCOL') {
            setPattern('TLSv1.2');
        } else {
            setPattern('');
        }
    }, [matchType]);

    const getPlaceholder = () => {
        switch (matchType) {
            case 'CIPHER_SUITE': return "E.g. TLS_AES_256_GCM_SHA384";
            case 'IP_ADDRESS': return "E.g. 192.168.1.*";
            case 'PORT': return "E.g. 443";
            case 'ALGORITHM': return "E.g. RSA-2048";
            case 'VPN_PROTOCOL': return "E.g. OpenVPN";
            case 'SSH_PROTOCOL': return "E.g. SSH-2.0-OpenSSH_*";
            default: return "E.g. *.internal.bank.com";
        }
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

    useEffect(() => {
        fetchRules();
    }, []);

    const handleAddRule = async (e) => {
        e.preventDefault();
        if (!pattern) return;
        
        setIsSubmitting(true);
        try {
            await apiClient.post('/rules/', {
                match_type: matchType,
                pattern: pattern,
                override_status: overrideStatus,
                is_active: true
            });
            setPattern('');
            await fetchRules();
        } catch (err) {
            setError(err.message || 'Failed to add rule');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm("Are you sure you want to delete this rule?")) return;
        try {
            await apiClient.delete(`/rules/${id}`);
            await fetchRules();
        } catch (err) {
            setError(err.message || 'Failed to delete rule');
        }
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                    <Settings className="text-secondary" />
                    Manual Rules & Protocols Override
                </h1>
                <p className="text-secondary mt-2 opacity-80">
                    Define custom rules to override PQC readiness classifications during scans.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 mb-6">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form to add rule */}
                <div className="surface-card p-6 rounded-xl h-fit border border-glass-border">
                    <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <Plus size={18} /> Add New Rule
                    </h2>
                    <form onSubmit={handleAddRule} className="space-y-4">
                        <div>
                            <label className="block text-secondary text-sm mb-1">Match Type</label>
                            <select 
                                value={matchType} 
                                onChange={(e) => setMatchType(e.target.value)}
                                className="w-full bg-surface-card border border-glass-border rounded-lg p-2.5 text-primary outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all"
                            >
                                <option value="HOSTNAME">Hostname (e.g. *.example.com)</option>
                                <option value="CIPHER_SUITE">Cipher Suite (e.g. TLS_AES_*)</option>
                                <option value="PROTOCOL">TLS Protocol Version</option>
                                <option value="IP_ADDRESS">IP Address (e.g. 192.168.1.*)</option>
                                <option value="PORT">Port Number</option>
                                <option value="ALGORITHM">Crypto Algorithm (e.g. RSA-2048)</option>
                                <option value="VPN_PROTOCOL">VPN Protocol</option>
                                <option value="SSH_PROTOCOL">SSH Protocol</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-secondary text-sm mb-1">Pattern</label>
                            {matchType === 'PROTOCOL' ? (
                                <select 
                                    value={pattern || 'TLSv1.2'} 
                                    onChange={(e) => setPattern(e.target.value)}
                                    className="w-full bg-[var(--surface-bg)] border border-glass-border rounded-lg p-2.5 text-primary outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all"
                                >
                                    <option value="SSLv2">SSLv2</option>
                                    <option value="SSLv3">SSLv3</option>
                                    <option value="TLSv1.0">TLSv1.0</option>
                                    <option value="TLSv1.1">TLSv1.1</option>
                                    <option value="TLSv1.2">TLSv1.2</option>
                                    <option value="TLSv1.3">TLSv1.3</option>
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    value={pattern} 
                                    onChange={(e) => setPattern(e.target.value)}
                                    placeholder={getPlaceholder()}
                                    className="w-full bg-[var(--surface-bg)] border border-glass-border rounded-lg p-2.5 text-primary outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all"
                                    required={matchType !== 'PROTOCOL'} 
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-secondary text-sm mb-1">Override Status</label>
                            <select 
                                value={overrideStatus} 
                                onChange={(e) => setOverrideStatus(e.target.value)}
                                className="w-full bg-surface-card border border-glass-border rounded-lg p-2.5 text-primary outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all"
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
                            className="w-full bg-[#6366f1] text-white font-bold p-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Rule'}
                        </button>
                    </form>
                </div>

                {/* Rules List */}
                <div className="lg:col-span-2 surface-card rounded-xl border border-glass-border overflow-hidden">
                    <div className="p-4 border-b border-glass-border bg-surface-card/50">
                        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                            <Shield size={18} /> Active Rules
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-glass-border/50 bg-[var(--surface-bg)]/50 text-secondary text-xs uppercase tracking-wider">
                                    <th className="p-4 font-medium min-w-[120px]">Match Type</th>
                                    <th className="p-4 font-medium min-w-[200px]">Pattern</th>
                                    <th className="p-4 font-medium min-w-[150px]">Status Override</th>
                                    <th className="p-4 font-medium text-right w-[80px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-secondary">
                                            Loading rules...
                                        </td>
                                    </tr>
                                ) : rules.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-secondary">
                                            <div className="flex flex-col items-center gap-2 opacity-50">
                                                <Settings size={24} />
                                                <p>No custom rules defined yet.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rules.map((rule) => (
                                        <tr key={rule.id} className="border-b border-glass-border/30 hover:bg-white/5 transition-colors group">
                                            <td className="p-4 text-secondary text-sm font-medium">
                                                {rule.match_type.replace('_', ' ')}
                                            </td>
                                            <td className="p-4 text-primary font-mono text-sm">
                                                {rule.pattern}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase
                                                    ${rule.override_status.includes('SAFE') || rule.override_status.includes('READY') 
                                                        ? 'bg-status-safe/10 text-status-safe border border-status-safe/20' 
                                                        : 'bg-status-critical/10 text-status-critical border border-status-critical/20'}`}
                                                >
                                                    {rule.override_status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteRule(rule.id)}
                                                    className="p-1.5 text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete Rule"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
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
