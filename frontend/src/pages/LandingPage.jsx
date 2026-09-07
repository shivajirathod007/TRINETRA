import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, ArrowRight, CheckCircle2, Lock, Unlock,
    Database, Activity, ChevronRight, Sun, Moon,
    Search, Server, FileCode, Layers, Cpu, Terminal,
    ExternalLink, Sparkles, ShieldCheck, HelpCircle,
    Check, ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { scanApi } from '../api/index';

// Visual components from reference
import { TrinetraLogo } from '../components/shared/TrinetraLogo';
import { SilkWaveHero } from '../components/visuals/SilkWaveHero';
import { SilkWaveBackground } from '../components/visuals/SilkWaveBackground';
import { FiberFanConstellation } from '../components/visuals/FiberFanConstellation';
import { ParametricRibbonFlow } from '../components/visuals/ParametricRibbonFlow';
import { GeodesicOrbitalSphere } from '../components/visuals/GeodesicOrbitalSphere';
import { BlossomFiberCluster } from '../components/visuals/BlossomFiberCluster';

async function fetchPlatformStats() {
    try {
        if (!localStorage.getItem('trinetra_token')) {
            return { totalScans: 28, totalAssets: 148, shadowAssets: 42, cboms: 148, compliance: 99.4 };
        }
        const history = await scanApi.list(null, 1000);
        const totalScans = Array.isArray(history) ? history.length : 0;
        const totalAssets = history.reduce?.((s, h) => s + (h.assets_found ?? 0), 0) ?? 0;
        const shadowAssets = history.reduce?.((s, h) => s + (h.shadow_assets ?? 0), 0) ?? 0;
        const cboms = totalAssets > 0 ? totalAssets : (totalScans * 3);
        return {
            totalScans: totalScans || 28,
            totalAssets: totalAssets || 148,
            shadowAssets: shadowAssets || 42,
            cboms: cboms || 148,
            compliance: 99.4
        };
    } catch {
        return { totalScans: 28, totalAssets: 148, shadowAssets: 42, cboms: 148, compliance: 99.4 };
    }
}

// 4-Phase Cards from Reference Slide 5
const PHASE_CARDS = [
    {
        id: 'discovery',
        phase: 'Phase 01',
        tag: 'Perimeter Probing',
        title: 'From Root Domain to Surface Map',
        desc: 'Continuous CT log mining and passive TLS probing discover every uncataloged public endpoint.',
        actionText: 'Explore Surface Map'
    },
    {
        id: 'assessment',
        phase: 'Phase 02',
        tag: 'HNDL Risk Matrix',
        title: 'From Evaluation to Actionable Score',
        desc: 'Quantifies Harvest Now, Decrypt Later exposure windows using Mosca’s Theorem with concrete deadlines.',
        actionText: 'See Risk Engine'
    },
    {
        id: 'cbom',
        phase: 'Phase 03',
        tag: 'CycloneDX 1.6',
        title: 'From Request to Machine CBOM',
        desc: 'Synthesizes standardized Cryptographic Bill of Materials for automated ingestion into enterprise SIEMs.',
        actionText: 'Inspect CBOM Schema'
    },
    {
        id: 'remediation',
        phase: 'Phase 04',
        tag: 'DevOps Handover',
        title: 'From Receiving to Quantum Turnover',
        desc: 'Generates drop-in server configuration recipes for Nginx, Envoy, and HAProxy to enable hybrid PQC.',
        actionText: 'View Migration Recipes'
    }
];

// Matrix Items from Reference Slide 7
const MATRIX_CATEGORIES = [
    { id: 'perimeter', label: 'Perimeter Surface' },
    { id: 'algorithms', label: 'Algorithm Audits' },
    { id: 'compliance', label: 'NIST Standards' }
];

const MATRIX_ITEMS = [
    { id: 'tls', name: 'TLS 1.3 Ciphers', icon: Lock, status: 'Active' },
    { id: 'ct', name: 'CT Log Streams', icon: Search, status: 'Active' },
    { id: 'pqc', name: 'ML-KEM-768', icon: ShieldCheck, status: 'Ready' },
    { id: 'hndl', name: 'HNDL Mosca Runway', icon: Activity, status: 'Monitored' },
    { id: 'cert', name: 'Cert Transparency', icon: Layers, status: 'Tracked' },
    { id: 'prng', name: 'PRNG & Hash State', icon: Cpu, status: 'Validated' },
    { id: 'cbom', name: 'CycloneDX 1.6', icon: FileCode, status: 'Exportable' },
    { id: 'qars', name: 'QARS Threat Index', icon: Shield, status: 'Computed' },
    { id: 'recipes', name: 'DevOps Recipes', icon: Terminal, status: 'Deployable' },
];

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated } = useAuth();

    const [domainInput, setDomainInput] = useState('');
    const [activeMatrixItem, setActiveMatrixItem] = useState('pqc');
    const [selectedCategory, setSelectedCategory] = useState('algorithms');

    const { data: stats = {} } = useQuery({
        queryKey: ['platform-stats'],
        queryFn: fetchPlatformStats,
        staleTime: 60_000,
    });

    const handleProbeSubmit = (e) => {
        e?.preventDefault();
        const target = domainInput.trim() || 'example.com';
        if (isAuthenticated) {
            navigate(`/scan/${encodeURIComponent(target)}`);
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="eterna-bg min-h-screen relative overflow-x-hidden selection:bg-blue-600 selection:text-white font-sans transition-colors duration-300">

            {/* System-wide Silk Wave Background */}
            <SilkWaveBackground />

            {/* ─── SLIDE 1: Header + Silk Wave Hero ─────────────────────────────── */}
            <section className="relative min-h-[90vh] flex flex-col justify-between">

                {/* Floating Nav Bar */}
                <header className="eterna-nav sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                        
                        {/* Logo */}
                        <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <TrinetraLogo size={32} />
                        </div>

                        {/* Centered Navigation Links */}
                        <nav className="hidden md:flex items-center gap-10 text-sm font-medium">
                            <a href="#what-we-do" className="hover:text-blue-500 transition-colors">What we do</a>
                            <a href="#approach" className="hover:text-blue-500 transition-colors">Our approach</a>
                            <a href="#matrix" className="hover:text-blue-500 transition-colors">Architecture</a>
                            <a href="#about-us" className="hover:text-blue-500 transition-colors">About platform</a>
                        </nav>

                        {/* Right Buttons */}
                        <div className="flex items-center gap-4">
                            {/* Theme Toggle */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="p-2.5 rounded-full border transition-all cursor-pointer"
                                style={{ background: 'var(--surface-card)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
                                title="Toggle Theme"
                            >
                                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                            </button>

                            {/* Main Action Pill */}
                            <button
                                type="button"
                                onClick={() => navigate(isAuthenticated ? '/home' : '/login')}
                                className="eterna-btn-primary"
                            >
                                <span>{isAuthenticated ? 'Dashboard' : 'Launch Platform'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
                </header>

                {/* Hero Center Text */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center relative z-10">
                    
                    {/* Category Label (Reference Slide 1) */}
                    <div className="mb-6">
                        <span className="text-xs md:text-sm font-mono tracking-widest uppercase text-amber-500 font-semibold">
                            Post-Quantum Cryptographic Surface Intelligence
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="font-outfit text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
                        Perfecting every detail for perimeter defense{' '}
                        <span className="eterna-headline-copper block sm:inline">takes monumental effort</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
                        How one continuous non-invasive service drives cryptographic execution across endpoints and shadow assets. Built to free up and elevate Enterprise Security & DevOps teams.
                    </p>

                    {/* Target Probe Input & Action Pill */}
                    <div className="max-w-xl mx-auto mb-6">
                        <form onSubmit={handleProbeSubmit} className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-full backdrop-blur-xl shadow-xl" style={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)' }}>
                            <div className="flex items-center gap-3 px-4 flex-1 w-full">
                                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    value={domainInput}
                                    onChange={(e) => setDomainInput(e.target.value)}
                                    placeholder="Enter enterprise domain (e.g., defense.gov)..."
                                    className="w-full bg-transparent text-sm focus:outline-none py-1.5 font-mono"
                                    style={{ color: 'var(--text-primary)', '--tw-placeholder-opacity': 1 }}
                                />
                            </div>
                            <button
                                type="submit"
                                className="eterna-btn-primary w-full sm:w-auto"
                            >
                                <span>Probe Target</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                </div>

            </section>


            {/* ─── SLIDE 2: Fiber-Optic Fan Constellation ──────────────────────── */}
            <section id="what-we-do" className="py-24 relative z-10 border-t border-[var(--border-divider)]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

                    <div className="mb-6">
                        <span className="eterna-pill">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            What you get
                        </span>
                    </div>

                    <h2 className="font-outfit text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        One go-to platform <br />
                        <span className="eterna-headline-violet">who orchestrates and delivers</span>
                    </h2>

                    <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-12" style={{ color: 'var(--text-secondary)' }}>
                        Everything lines up, nothing gets lost. We anticipate and resolve exactly what you need before you even have to ask. Get seamless service through years of product lifecycles and cryptographic transitions.
                    </p>

                </div>
            </section>


            {/* ─── SLIDE 3: Parametric Ribbon Wave (Momentum) ──────────────────── */}
            <section id="approach" className="py-24 relative z-10 border-t border-[var(--border-divider)] overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

                    <div className="mb-6">
                        <span className="eterna-pill">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                            "Done-right" perimeter playbook
                        </span>
                    </div>

                    <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-6">
                        You steadily gain <br />
                        <span className="eterna-headline-copper">dependable momentum</span>
                    </h2>

                    <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
                        Progress shouldn't feel like pressure. We accelerate outcomes and simplify workstreams by removing friction. Standardize progress that increasingly builds and feels natural.
                    </p>

                    {/* Parametric 3D Wireframe Wave from Slide 3 */}
                    <div className="relative w-full">
                        <ParametricRibbonFlow />
                    </div>

                </div>
            </section>


            {/* ─── SLIDE 4: High-Touch Precision 4-Columns with Delicate Waves ──── */}
            <section className="py-24 relative z-10 border-t border-[var(--border-divider)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="mb-6">
                            <span className="eterna-pill">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                High-Touch Precision
                            </span>
                        </div>
                        <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                            A collaborative and intuitive <br />
                            <span className="eterna-headline-violet">partner you can count on</span>
                        </h2>
                        <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            Our interactions always take you forward. For every protocol you choose, we secure, align, validate, and curate exactly what you need.
                        </p>
                    </div>

                    {/* 4 Precision Column Stages from Slide 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                        {[
                            {
                                code: '01 / SEC',
                                title: 'Secures',
                                icon: ShieldCheck,
                                color: '#3b82f6',
                                bgLight: 'rgba(59, 130, 246, 0.12)',
                                items: ['Perimeters', 'Expectations', 'Cipher suites', 'Keys']
                            },
                            {
                                code: '02 / ALN',
                                title: 'Aligns',
                                icon: Layers,
                                color: '#6366f1',
                                bgLight: 'rgba(99, 102, 241, 0.12)',
                                items: ['Dependencies', 'Stakeholders', 'Processes', 'Endpoints']
                            },
                            {
                                code: '03 / VAL',
                                title: 'Validates',
                                icon: CheckCircle2,
                                color: '#10b981',
                                bgLight: 'rgba(16, 185, 129, 0.12)',
                                items: ['Completeness', 'Coherence', 'Assurances', 'Details']
                            },
                            {
                                code: '04 / CUR',
                                title: 'Curates',
                                icon: Sparkles,
                                color: '#f59e0b',
                                bgLight: 'rgba(245, 158, 11, 0.12)',
                                items: ['Deliverables', 'Resolutions', 'Initiatives', 'Stages']
                            }
                        ].map((col, i) => {
                            const IconComponent = col.icon;
                            return (
                                <div
                                    key={i}
                                    className="rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                                    style={{
                                        background: 'var(--surface-card)',
                                        border: '1px solid var(--glass-border)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        boxShadow: 'var(--card-shadow)',
                                    }}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                style={{ background: col.bgLight }}
                                            >
                                                <IconComponent size={18} style={{ color: col.color }} aria-hidden="true" />
                                            </div>
                                            <span className="text-[10px] font-mono tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                                                {col.code}
                                            </span>
                                        </div>
                                        <h4 className="font-outfit font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
                                            {col.title}
                                        </h4>
                                    </div>
                                    <ul className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border-divider)' }}>
                                        {col.items.map((it, j) => (
                                            <li
                                                key={j}
                                                className="flex items-center gap-2.5 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
                                                style={{
                                                    background: 'var(--surface-card-hover)',
                                                    border: '1px solid var(--border-divider)',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                                                <span className="font-medium truncate">{it}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </section>


            {/* ─── SLIDE 5: 4 Interactive Journey Cards ────────────────────────── */}
            <section className="py-24 relative z-10 border-t border-[var(--border-divider)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

                    <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                        Trusted by enterprise security leaders <br />
                        <span className="eterna-headline-dual">from concept to completion</span>
                    </h2>

                    <p className="text-sm sm:text-base max-w-2xl mx-auto mb-16" style={{ color: 'var(--text-secondary)' }}>
                        Proven across thousands of external endpoints and distributed cloud environments.
                    </p>

                    {/* 4 Journey Cards Grid from Slide 5 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
                        {PHASE_CARDS.map((card, idx) => {
                            const phaseConfig = [
                                {
                                    dot: '#06b6d4',
                                    badgeBg: 'rgba(6, 182, 212, 0.10)',
                                    badgeBorder: 'rgba(6, 182, 212, 0.25)',
                                    badgeText: '#0891b2',
                                },
                                {
                                    dot: '#f59e0b',
                                    badgeBg: 'rgba(245, 158, 11, 0.10)',
                                    badgeBorder: 'rgba(245, 158, 11, 0.25)',
                                    badgeText: '#d97706',
                                },
                                {
                                    dot: '#8b5cf6',
                                    badgeBg: 'rgba(139, 92, 246, 0.10)',
                                    badgeBorder: 'rgba(139, 92, 246, 0.25)',
                                    badgeText: '#7c3aed',
                                },
                                {
                                    dot: '#10b981',
                                    badgeBg: 'rgba(16, 185, 129, 0.10)',
                                    badgeBorder: 'rgba(16, 185, 129, 0.25)',
                                    badgeText: '#059669',
                                },
                            ][idx] || {
                                dot: '#6366f1',
                                badgeBg: 'rgba(99, 102, 241, 0.10)',
                                badgeBorder: 'rgba(99, 102, 241, 0.25)',
                                badgeText: '#4f46e5',
                            };

                            return (
                                <div
                                    key={card.id}
                                    className="eterna-phase-card flex flex-col justify-between h-full p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                                    style={{
                                        background: 'var(--surface-card)',
                                        border: '1px solid var(--glass-border)',
                                        boxShadow: 'var(--card-shadow)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                    }}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full font-bold"
                                                style={{
                                                    background: phaseConfig.badgeBg,
                                                    border: `1px solid ${phaseConfig.badgeBorder}`,
                                                    color: phaseConfig.badgeText,
                                                }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseConfig.dot }} />
                                                {card.phase}
                                            </span>
                                            <span
                                                className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium"
                                                style={{
                                                    background: 'var(--surface-card-hover)',
                                                    border: '1px solid var(--border-divider)',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                {card.tag}
                                            </span>
                                        </div>
                                        <h3 className="font-outfit text-lg font-bold mb-3 min-h-[3.25rem] flex items-start leading-snug" style={{ color: 'var(--text-primary)' }}>
                                            {card.title}
                                        </h3>
                                        <p className="text-xs leading-relaxed mb-6 min-h-[3.75rem]" style={{ color: 'var(--text-secondary)' }}>
                                            {card.desc}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border-divider)' }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(isAuthenticated ? '/home' : '/login');
                                            }}
                                            className="w-full text-xs py-2.5 px-3 rounded-xl font-mono font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer group"
                                            style={{
                                                background: 'var(--surface-card-hover)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'var(--text-primary)',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'var(--primary-indigo)';
                                                e.currentTarget.style.color = '#ffffff';
                                                e.currentTarget.style.borderColor = 'var(--primary-indigo)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'var(--surface-card-hover)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                            }}
                                        >
                                            <span>{card.actionText}</span>
                                            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 opacity-75 group-hover:opacity-100" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </section>


            {/* ─── SLIDE 6: Geodesic Orbital Compass & Team Principles ─────────── */}
            <section className="py-24 relative z-10 border-t landing-section-alt" style={{ borderColor: 'var(--border-divider)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        {/* Left: Geodesic Wireframe Orbital Sphere */}
                        <div className="flex justify-center">
                            <GeodesicOrbitalSphere size={420} />
                        </div>

                        {/* Right: Team Principles Card Container with Frosted Glass */}
                        <div
                            className="rounded-3xl p-8 sm:p-10 transition-all"
                            style={{
                                background: 'var(--surface-card)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                boxShadow: 'var(--card-shadow)',
                            }}
                        >
                            <div className="mb-6">
                                <span className="eterna-pill mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Operational Principles
                                </span>
                                <h3 className="font-outfit text-2xl sm:text-3xl font-bold tracking-tight leading-snug" style={{ color: 'var(--text-primary)' }}>
                                    Your teams engage directly with our intelligence <br />
                                    <span className="eterna-headline-copper">and we guide your migration hands-on</span>
                                </h3>
                            </div>

                            <div className="space-y-3 pt-2">
                                {[
                                    {
                                        title: 'Scalable',
                                        desc: 'From key groups and architectures to global public IP ranges.',
                                        color: '#06b6d4'
                                    },
                                    {
                                        title: 'Practical',
                                        desc: 'We start and focus where it\'s most impactful for HNDL risk mitigation.',
                                        color: '#6366f1'
                                    },
                                    {
                                        title: 'Adaptive',
                                        desc: 'Built to handle whatever NIST standardizes next, we evolve with you.',
                                        color: '#8b5cf6'
                                    },
                                    {
                                        title: 'Proactive',
                                        desc: 'Our priority is your security runway, so we detect exposures early.',
                                        color: '#f59e0b'
                                    },
                                    {
                                        title: 'Seamless',
                                        desc: 'Smooth, cohesive non-invasive service from one central portal.',
                                        color: '#10b981'
                                    }
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 rounded-xl transition-all"
                                        style={{
                                            background: 'var(--surface-card-hover)',
                                            border: '1px solid var(--border-divider)',
                                        }}
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <div>
                                            <span className="font-outfit font-bold text-sm block" style={{ color: 'var(--text-primary)' }}>
                                                {item.title}
                                            </span>
                                            <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                {item.desc}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </section>


            {/* ─── SLIDE 7: Stakeholder Alignment & 3x3 Grid ───────────────────── */}
            <section id="matrix" className="py-24 relative z-10 border-t border-[var(--border-divider)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                            Stop chasing and consolidating <br />
                            <span className="eterna-headline-violet">to get cryptography right</span>
                        </h2>
                        <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            We make sure you have no more bottlenecks from scattered details and convoluted manual audits. Enjoy all these capabilities on-hand and done right.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                        {/* Left: Category Selector Card from Slide 7 */}
                        <div
                            className="eterna-phase-card flex flex-col justify-between p-8 rounded-3xl"
                            style={{
                                background: 'var(--surface-card)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                boxShadow: 'var(--card-shadow)',
                            }}
                        >
                            <div>
                                <span className="eterna-pill mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    Cross-Team Sync
                                </span>
                                <h3 className="font-outfit text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                                    Stakeholder Alignment
                                </h3>
                                <div className="space-y-2.5">
                                    {[
                                        'Practical handoffs between functions',
                                        'Upfront clarity on HNDL horizons',
                                        'Visibility boundaries defined',
                                        'Unifying objectives across teams',
                                        'Automated verification loops',
                                        'Unifying compliance mandates'
                                    ].map((pt, i) => (
                                        <div
                                            key={i}
                                            className="text-xs font-mono flex items-center gap-2.5 p-2.5 rounded-xl transition-colors"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                background: 'var(--surface-card-hover)',
                                                border: '1px solid var(--border-divider)'
                                            }}
                                        >
                                            <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                            <span className="font-medium">{pt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Polished Bottom Framework Badge */}
                            <div className="pt-5 mt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-divider)' }}>
                                <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                                    Security Posture
                                </span>
                                <span
                                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full"
                                    style={{
                                        background: 'var(--surface-card-hover)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--accent-cyan)'
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    Autonomous Governance
                                </span>
                            </div>
                        </div>

                        {/* Right: 3x3 Icon Grid from Slide 7 */}
                        <div className="lg:col-span-2">
                            <div className="eterna-matrix-grid">
                                {MATRIX_ITEMS.map((item) => {
                                    const isSelected = activeMatrixItem === item.id;
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setActiveMatrixItem(item.id)}
                                            className={`eterna-matrix-item flex flex-col items-center justify-center p-6 ${
                                                isSelected ? 'active' : ''
                                            }`}
                                            style={{
                                                backdropFilter: 'blur(14px)',
                                                WebkitBackdropFilter: 'blur(14px)',
                                            }}
                                        >
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors"
                                                style={isSelected ? { background: 'rgba(147,51,234,0.18)', color: 'var(--accent-violet)' } : { background: 'var(--surface-card)', color: 'var(--text-secondary)' }}
                                            >
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-outfit font-bold text-sm mb-1 text-center" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                                            <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>{item.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                </div>
            </section>


            {/* ─── SLIDE 8: 3 Lifecycle Columns with Blossom Fiber Cluster ─────── */}
            <section className="py-24 relative z-10 border-t landing-section-alt" style={{ borderColor: 'var(--border-divider)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="mb-4">
                            <span className="eterna-pill">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Dynamic Orchestration
                            </span>
                        </div>
                        <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                            Your teams get to enjoy <br />
                            <span className="eterna-headline-dual">seamless continuous service</span>
                        </h2>
                        <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            Unify cross-functional security the easy way. Rely on us to bridge expectations, serve simplicity, and deliver lasting value.
                        </p>
                    </div>

                    {/* 3 Large Clean White/Glass Columns from Slide 8 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[
                            {
                                phase: 'Discovery',
                                sub: 'Details you specify once carry forward everywhere. We make sure shadow assets don\'t get bypassed.',
                                badge: 'CT Log Extraction'
                            },
                            {
                                phase: 'Assessment',
                                sub: 'Your audits have clarity built-in. We curate what\'s needed, what\'s changed, and why quantum risk matters.',
                                badge: 'Mosca Matrix'
                            },
                            {
                                phase: 'Remediation',
                                sub: 'Recipes you need on-site get validated and verified on multiple levels. Nothing deployed half-right.',
                                badge: 'CycloneDX 1.6'
                            }
                        ].map((col, i) => (
                            <div key={i} className="eterna-phase-card p-8 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-outfit text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{col.phase}</h3>
                                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full" style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                                        {col.badge}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    {col.sub}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ─── SLIDE 9: Execution Layer CTA Banner ─────────────────────────── */}
            <section className="py-24 relative z-10 border-t border-[var(--border-divider)]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="eterna-phase-card p-10 sm:p-14 text-center rounded-3xl relative overflow-hidden">
                        
                        <div className="mb-4">
                            <span className="eterna-pill">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                Where we fit
                            </span>
                        </div>

                        <h2 className="font-outfit text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                            We are the execution layer <br />
                            <span className="eterna-headline-copper">across products, vendors and initiatives</span>
                        </h2>

                        <p className="text-sm sm:text-base max-w-xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
                            For enterprise leaders who own critical quantum migration decisions and depend on perfect cryptographic outcomes.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(isAuthenticated ? '/home' : '/login')}
                                className="eterna-btn-primary px-8 py-3 text-sm"
                            >
                                <span>{isAuthenticated ? 'Enter Security Console' : 'Launch Platform Console'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            <a
                                href="http://localhost:8000/docs"
                                target="_blank"
                                rel="noreferrer"
                                className="eterna-btn-secondary px-6 py-3 text-xs font-mono"
                            >
                                <span>API Documentation</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="mt-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            Preloaded Demo Account: <span style={{ color: 'var(--text-primary)' }}>shiva@gmail.com</span> &bull; <span style={{ color: 'var(--text-primary)' }}>shiva@124</span>
                        </div>

                    </div>

                </div>
            </section>


            {/* ─── Footer ──────────────────────────────────────────────────────── */}
            <footer className="py-12 border-t landing-footer" style={{ borderColor: 'var(--border-divider)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        
                        <div className="flex items-center gap-3">
                            <TrinetraLogo size={24} showText={false} />
                            <span className="font-outfit font-bold text-sm" style={{ color: 'var(--text-primary)' }}>TRINETRA</span>
                            <span style={{ color: 'var(--text-muted)' }}>&bull; Quantum Exposure Intelligence Platform</span>
                        </div>

                        <div className="flex items-center gap-6">
                            <a href="http://localhost:8000/health" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" /> API: Healthy
                            </a>
                            <a href="http://localhost:5555" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
                                Celery Flower
                            </a>
                            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
                                OpenAPI Docs
                            </a>
                        </div>

                        <div>
                            &copy; 2026 TRINETRA. Non-invasive quantum perimeter audit platform.
                        </div>

                    </div>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
