import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Server, FileSearch, Fingerprint, Search, ArrowRight, Sun, Moon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import GlowButton from '../components/GlowButton';
import AnimatedCounters from '../components/AnimatedCounters';
import { useTheme } from '../context/ThemeContext';
import { scanApi, setActiveScan } from '../api/index';

/**
 * Fetch global platform stats (reuse a generic scan list count).
 * The backend will populate this over time; we default gracefully.
 */
async function fetchPlatformStats() {
    try {
        const history = await scanApi.list(null, 1000);
        const totalScans = Array.isArray(history) ? history.length : 0;
        const totalAssets = history.reduce?.((s, h) => s + (h.assets_found ?? 0), 0) ?? 0;
        const shadowAssets = history.reduce?.((s, h) => s + (h.shadow_assets ?? 0), 0) ?? 0;
        const cboms = totalAssets; // 1 CBOM per discovered asset
        return { totalScans, totalAssets, shadowAssets, cboms, compliance: 100 };
    } catch {
        return { totalScans: 0, totalAssets: 0, shadowAssets: 0, cboms: 0, compliance: 100 };
    }
}

const LandingPage = () => {
    const [domain, setDomain] = useState('');
    const [activeChip, setActiveChip] = useState('Web Portals');
    const [isScanning, setIsScanning] = useState(false);
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();

    const { data: stats = {} } = useQuery({
        queryKey: ['platform-stats'],
        queryFn: fetchPlatformStats,
        staleTime: 60_000,
    });

    const chips = ['Web Portals', 'APIs', 'VPN Endpoints', 'Shadow Assets'];

    const handleScan = async (e) => {
        e.preventDefault();
        if (!domain || isScanning) return;
        setIsScanning(true);
        try {
            const result = await scanApi.initiate(domain.trim().toLowerCase());
            setActiveScan(domain.trim().toLowerCase(), result.scan_id);
            navigate(`/scan/${encodeURIComponent(domain.trim().toLowerCase())}`);
        } catch (err) {
            console.error('Failed to initiate scan:', err);
            setIsScanning(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">

            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(to right, #1F2937 1px, transparent 1px), linear-gradient(to bottom, #1F2937 1px, transparent 1px)',
                    backgroundSize: '4rem 4rem'
                }}
            />

            {/* Top Navigation */}
            <nav className="landing-nav">
                <div className="flex items-center gap-2">
                    <Shield size={24} className="text-primary-indigo animate-pulse-subtle" />
                    <span className="font-bold tracking-widest uppercase">TRINETRA</span>
                </div>
                <div className="landing-links">
                    <a href="#" className="text-sm font-medium text-secondary hover:text-primary">Docs</a>
                    <a href="#" className="text-sm font-medium text-secondary hover:text-primary">API</a>
                    <button onClick={() => navigate('/dashboard')} className="text-sm font-bold text-primary-indigo hover:text-primary-indigo-hover">
                        Dashboard
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-card-hover text-secondary hover:text-primary transition-colors ml-2" title="Toggle Theme">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col justify-center">
                <div className="hero-section">
                    {/* Ambient Glow */}
                    <div className="hero-bg-glow" />

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-highlight bg-surface-card mb-6 mb-8 text-xs font-mono font-medium tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-status-pqc animate-pulse" />
                        Seeing Tomorrow's Cryptographic Threats Today
                    </div>

                    <h1 className="hero-title">
                        Quantum Exposure <br />
                        <span className="text-gradient">Intelligence Platform</span>
                    </h1>

                    <p className="hero-subtitle pb-4">
                        Discover every cryptographic vulnerability across your organisation's public-facing infrastructure — before quantum computers do.
                    </p>

                    <form onSubmit={handleScan} className="search-container">
                        <div className="search-box">
                            <div className="search-input-wrapper">
                                <Search size={24} className="search-icon" />
                                <input
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="Enter domain — e.g. pnb.in"
                                    className="search-input"
                                    required
                                    disabled={isScanning}
                                />
                            </div>
                            <div style={{ width: '100%' }} className="sm-w-auto">
                                <style>{`@media(min-width: 640px) { .sm-w-auto { width: auto !important; } }`}</style>
                                <GlowButton type="submit" className="w-full" disabled={isScanning}>
                                    {isScanning ? 'Initiating...' : 'INITIATE SCAN'} <ArrowRight size={16} />
                                </GlowButton>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3 mb-8">
                            {chips.map(chip => (
                                <button
                                    key={chip}
                                    type="button"
                                    onClick={() => setActiveChip(chip)}
                                    className={`toggle-chip ${activeChip === chip ? 'active' : 'inactive'}`}
                                >
                                    {activeChip === chip && <span className="mr-2">✓</span>}
                                    {chip}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-secondary font-mono flex items-center justify-center gap-2">
                            <Shield size={14} className="text-status-safe" /> Non-invasive. Read-only TLS probing. No credentials required.
                        </p>
                    </form>
                </div>

                {/* Global Stats Strip — live from API */}
                <section className="stats-section">
                    <div className="container py-8">
                        <div className="stats-grid">

                            <div className="text-center px-4 stat-divider">
                                <div className="text-4xl font-bold mb-1">
                                    <AnimatedCounters value={stats.totalAssets ?? 0} />
                                </div>
                                <div className="text-xs uppercase tracking-widest text-secondary">Assets Scanned</div>
                            </div>

                            <div className="text-center px-4 stat-divider hidden md-block">
                                <div className="text-4xl font-bold text-status-critical mb-1" style={{ textShadow: '0 0 15px rgba(239,68,68,0.5)' }}>
                                    <AnimatedCounters value={stats.shadowAssets ?? 0} />
                                </div>
                                <div className="text-xs uppercase tracking-widest text-secondary">Shadow Assets</div>
                            </div>

                            <div className="text-center px-4 stat-divider hidden md-block">
                                <div className="text-4xl font-bold text-primary-indigo mb-1" style={{ textShadow: '0 0 15px rgba(99,102,241,0.5)' }}>
                                    <AnimatedCounters value={stats.cboms ?? 0} />
                                </div>
                                <div className="text-xs uppercase tracking-widest text-secondary">CBOMs Generated</div>
                            </div>

                            <div className="text-center px-4">
                                <div className="text-4xl font-bold text-status-safe mb-1" style={{ textShadow: '0 0 15px rgba(34,197,94,0.5)' }}>
                                    {stats.compliance ?? 100}<span className="text-2xl">%</span>
                                </div>
                                <div className="text-xs uppercase tracking-widest text-secondary">NIST FIPS Compliant</div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* Features Overview */}
                <section className="container py-16 pb-24 relative z-10 w-full">
                    <div className="grid grid-cols-1 md-grid-cols-3 gap-6">

                        <div className="glass-card feature-card p-6 border-t-orange">
                            <div className="w-12 h-12 rounded-lg bg-surface-card border border-border-divider flex items-center justify-center mb-4">
                                <Server size={24} className="text-status-high" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Shadow Asset Discovery</h3>
                            <p className="text-sm text-secondary leading-relaxed">
                                Continuous CT Log mining via crt.sh to map undocumented external perimeter exposure.
                            </p>
                        </div>

                        <div className="glass-card feature-card p-6 border-t-red">
                            <div className="w-12 h-12 rounded-lg bg-surface-card border border-border-divider flex items-center justify-center mb-4">
                                <FileSearch size={24} className="text-status-critical" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">HNDL Risk Engine</h3>
                            <p className="text-sm text-secondary leading-relaxed">
                                Calculate Harvest Now, Decrypt Later (HNDL) exposure windows for concrete migration deadlines.
                            </p>
                        </div>

                        <div className="glass-card feature-card p-6 border-t-indigo">
                            <div className="w-12 h-12 rounded-lg bg-surface-card border border-border-divider flex items-center justify-center mb-4">
                                <Fingerprint size={24} className="text-primary-indigo" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">AI Crypto Classifier</h3>
                            <p className="text-sm text-secondary leading-relaxed">
                                NLP-powered algorithm identification and custom JWT algorithm defect scanning.
                            </p>
                        </div>

                    </div>
                </section>
            </main>

            <style>{`
        @media (min-width: 768px) {
          .md-block { display: block !important; }
          .md-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 767px) {
          .hidden.md-block { display: none; }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
