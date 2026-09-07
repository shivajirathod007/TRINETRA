import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TrinetraLogo } from '../components/shared/TrinetraLogo';
import { SilkWaveBackground } from '../components/visuals/SilkWaveBackground';
import axios from 'axios';

const LoginPage = () => {
    const [email, setEmail]               = useState('shiva@gmail.com');
    const [password, setPassword]         = useState('shiva@124');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError]               = useState('');
    const navigate   = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const { isAuthenticated, login }  = useAuth();

    useEffect(() => {
        if (isAuthenticated) navigate('/home');
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');
        try {
            const response = await axios.post('/api/v1/auth/login', { email, password });
            const { access_token, user, role } = response.data;
            login(access_token, user, role);
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please verify your credentials.');
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="eterna-bg min-h-screen flex items-center justify-center relative overflow-hidden p-4 select-none">
            {/* Full-viewport Silk Wave background */}
            <SilkWaveBackground />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 text-xs font-mono transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Back to Overview
                </button>
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full transition-all cursor-pointer"
                    style={{
                        background: 'var(--surface-card)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDarkMode
                        ? <Sun size={15} style={{ color: 'var(--accent-amber)' }} aria-hidden="true" />
                        : <Moon size={15} style={{ color: '#8b5cf6' }} aria-hidden="true" />}
                </button>
            </div>

            {/* Login card */}
            <div
                className="eterna-phase-card animate-scaleIn w-full max-w-md p-8 sm:p-10 relative z-10 rounded-3xl"
                style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px var(--glass-border)' }}
            >
                {/* Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="mb-4">
                        <TrinetraLogo size={40} showText={false} />
                    </div>
                    <span className="eterna-pill mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" aria-hidden="true" />
                        Platform Console
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold font-outfit tracking-tight mb-2"
                        style={{ color: 'var(--text-primary)' }}>
                        Welcome Back
                    </h1>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Sign in to access real-time cryptographic exposure telemetry.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-5 px-4 py-3 rounded-xl text-xs font-mono"
                        style={{
                            background: 'rgba(239,68,68,0.09)',
                            border: '1px solid rgba(239,68,68,0.30)',
                            color: 'var(--status-critical)',
                        }}
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="email"
                            className="block text-xs font-mono uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true"
                                style={{ color: 'var(--text-secondary)' }} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={isAuthenticating}
                                className="input pl-11"
                                placeholder="analyst@domain.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="password"
                                className="block text-xs font-mono uppercase tracking-wider"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Password
                            </label>
                            <span className="text-[11px] font-mono cursor-not-allowed"
                                style={{ color: 'var(--text-muted)' }}>
                                Reset
                            </span>
                        </div>
                        <div className="relative">
                            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true"
                                style={{ color: 'var(--text-secondary)' }} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={isAuthenticating}
                                className="input pl-11 pr-11"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                disabled={isAuthenticating}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isAuthenticating}
                        className="eterna-btn-primary w-full py-3 text-sm mt-2"
                    >
                        {isAuthenticating ? (
                            <span>Authenticating…</span>
                        ) : (
                            <>
                                <span>Sign In to Console</span>
                                <ArrowRight size={15} aria-hidden="true" />
                            </>
                        )}
                    </button>

                    {/* Demo credentials */}
                    <div className="px-4 py-3 rounded-xl text-center"
                        style={{
                            background: 'var(--surface-card-hover)',
                            border: '1px solid var(--glass-border)',
                        }}
                    >
                        <div className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                            Demo:{' '}
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>shiva@gmail.com</span>
                            {' / '}
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>shiva@124</span>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono"
                        style={{ color: 'var(--text-muted)' }}>
                        <ShieldCheck size={12} style={{ color: 'var(--status-safe)' }} aria-hidden="true" />
                        FIPS 140-3 Compliant Authentication Area
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
