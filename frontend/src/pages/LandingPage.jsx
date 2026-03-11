import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Search, Shield, Zap, FileJson, Clock } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import AnimatedCounters from '../components/AnimatedCounters';

const LandingPage = () => {
    const navigate = useNavigate();
    const [domain, setDomain] = useState('');
    const [toggles, setToggles] = useState({
        web: true,
        api: true,
        vpn: true,
        shadow: true
    });

    const handleScan = (e) => {
        e.preventDefault();
        if (domain) {
            navigate(`/scan/${domain}`);
        }
    };

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'CBOM Explorer', path: '/explorer' },
        { name: 'Certificates', path: '/certificates' },
        { name: 'History', path: '/history' },
        { name: 'Docs', path: '/' }
    ];

    return (
        <div className="min-h-screen bg-[#0A0D14] text-[#F9FAFB] font-sans selection:bg-[#6366F1]/30">

            {/* Top Navbar */}
            <nav className="h-20 border-b border-[#1F2937] flex items-center justify-between px-6 md:px-12 bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Activity className="text-[#6366F1]" size={36} />
                        <div>
                            <div className="font-bold text-xl tracking-widest text-[#F9FAFB]">TRINETRA</div>
                            <div className="text-[10px] text-[#9CA3AF] tracking-wide uppercase">Seeing Tomorrow's Cryptographic Threats Today</div>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link key={link.name} to={link.path} className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
                            {link.name}
                        </Link>
                    ))}
                    <GlowButton className="py-2 px-4 shadow-[0_0_15px_rgba(99,102,241,0.2)]">New Scan</GlowButton>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
                {/* Background ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6366F1]/10 rounded-full blur-[100px] pointer-events-none"></div>

                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 relative z-10">
                    Quantum Exposure <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#3B82F6]">Intelligence Platform</span>
                </h1>
                <p className="text-xl text-[#9CA3AF] max-w-3xl mb-12 relative z-10">
                    Discover every cryptographic vulnerability across your bank's public-facing infrastructure — before quantum computers do.
                </p>

                {/* Scan Input Area */}
                <form onSubmit={handleScan} className="w-full max-w-3xl relative z-10">
                    <div className="glass-card p-2 md:p-3 flex flex-col sm:flex-row items-center gap-2 mb-6">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={24} />
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="Enter domain — e.g. pnb.in"
                                className="w-full bg-transparent border-none outline-none text-xl md:text-2xl py-4 pl-14 pr-4 text-[#F9FAFB] placeholder-[#9CA3AF]/50 font-mono"
                                required
                            />
                        </div>
                        <GlowButton active={true} onClick={handleScan} className="w-full sm:w-auto h-16 px-8 text-lg shrink-0">
                            <div className="flex items-center gap-2">
                                <Zap size={20} className={domain ? 'animate-pulse' : ''} />
                                INITIATE SCAN
                            </div>
                        </GlowButton>
                    </div>

                    {/* Toggle Chips */}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {Object.entries(toggles).map(([key, value]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setToggles({ ...toggles, [key]: !value })}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${value ? 'bg-[#6366F1]/20 border-[#6366F1]/50 text-[#F9FAFB]' : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF]'
                                    }`}
                            >
                                {value ? '✓ ' : '+ '}
                                {key === 'web' && 'Web Portals'}
                                {key === 'api' && 'APIs'}
                                {key === 'vpn' && 'VPN Endpoints'}
                                {key === 'shadow' && 'Shadow Assets'}
                            </button>
                        ))}
                    </div>

                    <p className="text-sm text-[#9CA3AF] flex items-center justify-center gap-2 mt-4">
                        <Shield size={16} /> Non-invasive. Read-only TLS probing. No credentials required.
                    </p>
                </form>
            </section>

            {/* Stats Bar */}
            <section className="border-y border-[#1F2937] bg-[#111827]/50 relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-[#1F2937]/50">
                        <div className="text-center px-4">
                            <div className="text-4xl font-bold text-[#F9FAFB] mb-1">
                                <AnimatedCounters value={4847} />
                            </div>
                            <div className="text-xs uppercase tracking-widest text-[#9CA3AF]">Assets Scanned</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-4xl font-bold text-[#F97316] mb-1">
                                <AnimatedCounters value={312} />
                            </div>
                            <div className="text-xs uppercase tracking-widest text-[#F97316]/80">Shadow Assets</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-4xl font-bold text-[#F9FAFB] mb-1">
                                <AnimatedCounters value={1204} />
                            </div>
                            <div className="text-xs uppercase tracking-widest text-[#9CA3AF]">CBOMs Generated</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-4xl font-bold text-[#22C55E] mb-1">
                                <AnimatedCounters value={100} suffix="%" />
                            </div>
                            <div className="text-xs uppercase tracking-widest text-[#22C55E]/80">NIST FIPS Compliant</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Strip */}
            <section className="py-20 px-6 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6 border-t-2 border-t-[#F97316] hover:-translate-y-1 transition-transform">
                        <Search className="text-[#F97316] mb-4" size={28} />
                        <h3 className="font-bold text-lg mb-2">Shadow Asset Discovery</h3>
                        <p className="text-sm text-[#9CA3AF]">Continuous CT Log mining via crt.sh to map undocumented external perimeter exposure.</p>
                    </div>

                    <div className="glass-card p-6 border-t-2 border-t-[#EF4444] hover:-translate-y-1 transition-transform">
                        <Clock className="text-[#EF4444] mb-4" size={28} />
                        <h3 className="font-bold text-lg mb-2">HNDL Risk Engine</h3>
                        <p className="text-sm text-[#9CA3AF]">Calculate Harvest Now, Decrypt Later (HNDL) exposure windows for concrete migration deadlines.</p>
                    </div>

                    <div className="glass-card p-6 border-t-2 border-t-[#6366F1] hover:-translate-y-1 transition-transform">
                        <Activity className="text-[#6366F1] mb-4" size={28} />
                        <h3 className="font-bold text-lg mb-2">AI Crypto Classifier</h3>
                        <p className="text-sm text-[#9CA3AF]">NLP-powered algorithm identification and custom JWT algorithm defect scanning.</p>
                    </div>

                    <div className="glass-card p-6 border-t-2 border-t-[#22C55E] hover:-translate-y-1 transition-transform">
                        <FileJson className="text-[#22C55E] mb-4" size={28} />
                        <h3 className="font-bold text-lg mb-2">PQC Readiness Certs</h3>
                        <p className="text-sm text-[#9CA3AF]">Generate verifiable Cryptographic Bill of Materials (CBOMs) and 3-tier readiness certificates.</p>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
