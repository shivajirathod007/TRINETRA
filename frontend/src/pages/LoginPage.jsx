import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const LoginPage = () => {
    const [email, setEmail] = useState('shiva@gmail.com');
    const [password, setPassword] = useState('shiva@124');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { isAuthenticated, login } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/home');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            // Call backend login endpoint through Vite proxy
            const response = await axios.post('/api/v1/auth/login', {
                email,
                password
            });

            const { access_token, user, role } = response.data;
            
            // Store token, user, and role in auth context
            login(access_token, user, role);
            
            // Redirect to home
            navigate('/home');
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient p-4">
            
            {/* Background Map / Grid Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none" 
                style={{
                    backgroundImage: 'linear-gradient(to right, var(--grid-line, rgba(148, 163, 184, 0.1)) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line, rgba(148, 163, 184, 0.1)) 1px, transparent 1px)',
                    backgroundSize: '4rem 4rem',
                    opacity: isDarkMode ? 0.3 : 0.6
                }}
            />
            
            {/* Animated background blur orbs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-indigo rounded-full blur-[150px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary-indigo rounded-full blur-[120px] opacity-10 pointer-events-none" />

            <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fadeInUp backdrop-blur-xl border border-white border-opacity-10 shadow-2xl">
                
                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-indigo to-primary-indigo-hover border border-primary-indigo border-opacity-50 flex items-center justify-center mb-4 shadow-lg shadow-primary-indigo/30 animate-pulse">
                        <Fingerprint size={32} className="text-white" />
                    </div>
                    <div className="text-primary-indigo font-bold tracking-widest uppercase mb-2 flex items-center gap-2 text-sm">
                        TRINETRA
                    </div>
                    <h1 className="text-3xl font-bold font-outfit text-primary mb-3 text-center uppercase tracking-wider">
                        Secure Access
                    </h1>
                    <p className="text-sm text-secondary text-center leading-relaxed">
                        Sign in to the Quantum Exposure Intelligence Platform to view telemetry data.
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-500 via-red-500 to-red-600 bg-opacity-15 border-l-4 border-red-500 rounded-lg text-red-300 text-sm font-semibold animate-pulse backdrop-blur-sm shadow-lg shadow-red-500/20">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 bg-red-400 rounded-full flex-shrink-0 animate-pulse"></span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    
                    {/* Email Field */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest opacity-80">Email Address</label>
                        <div className="relative group">
                            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-indigo pointer-events-none transition-all duration-200 group-focus-within:scale-110 group-focus-within:text-primary-indigo" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isAuthenticating}
                                className="w-full bg-surface-card bg-opacity-40 text-primary border-2 border-glass-border rounded-xl py-3.5 pl-13 pr-5 focus:outline-none focus:border-primary-indigo focus:bg-opacity-60 focus:shadow-2xl focus:shadow-primary-indigo/30 transition-all duration-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-secondary placeholder:opacity-40 font-medium tracking-wide hover:border-primary-indigo hover:border-opacity-50"
                                placeholder="shiva@gmail.com"
                                required
                                autoComplete="email"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-indigo to-primary-indigo-hover opacity-0 group-focus-within:opacity-15 blur-xl transition-all duration-300 pointer-events-none -z-10"></div>
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-secondary uppercase tracking-widest opacity-80">Password</label>
                            <a href="#" className="text-xs text-primary-indigo hover:text-primary-indigo-hover transition-all duration-200 font-bold hover:underline hover:underline-offset-2">Forgot?</a>
                        </div>
                        <div className="relative group">
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-indigo pointer-events-none transition-all duration-200 group-focus-within:scale-110 group-focus-within:text-primary-indigo" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isAuthenticating}
                                className="w-full bg-surface-card bg-opacity-40 text-primary border-2 border-glass-border rounded-xl py-3.5 pl-13 pr-5 focus:outline-none focus:border-primary-indigo focus:bg-opacity-60 focus:shadow-2xl focus:shadow-primary-indigo/30 transition-all duration-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-secondary placeholder:opacity-40 font-medium tracking-widest hover:border-primary-indigo hover:border-opacity-50"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-indigo to-primary-indigo-hover opacity-0 group-focus-within:opacity-15 blur-xl transition-all duration-300 pointer-events-none -z-10"></div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6">
                        <button 
                            type="submit" 
                            disabled={isAuthenticating}
                            className="w-full relative py-4 px-4 rounded-xl font-bold uppercase tracking-wider text-white text-sm overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                            style={{
                                background: isAuthenticating 
                                    ? 'rgba(99, 102, 241, 0.6)' 
                                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
                                boxShadow: isAuthenticating 
                                    ? '0 4px 12px rgba(99, 102, 241, 0.3)' 
                                    : '0 10px 30px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isAuthenticating) {
                                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isAuthenticating) {
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isAuthenticating ? (
                                    <>
                                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        <span className="animate-pulse">Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </span>
                            {/* Button shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 translate-x-full group-hover:translate-x-0 transition-all duration-500"></div>
                        </button>
                    </div>

                    {/* Demo Credentials Hint */}
                    <div className="mt-7 p-4 bg-gradient-to-r from-primary-indigo via-primary-indigo to-primary-indigo-hover bg-opacity-8 border-2 border-primary-indigo border-opacity-30 rounded-xl text-center backdrop-blur-sm hover:border-opacity-50 transition-all duration-300 shadow-lg shadow-primary-indigo/10">
                        <p className="text-xs text-secondary font-semibold uppercase tracking-wider">
                            Demo Credentials:
                        </p>
                        <p className="text-sm text-primary-indigo font-bold mt-2 space-x-2">
                            <span className="block sm:inline">📧 shiva@gmail.com</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="block sm:inline">🔑 shiva@124</span>
                        </p>
                    </div>
                </form>

                {/* Footer Section */}
                <div className="mt-8 pt-6 border-t border-glass-border">
                    <div className="flex items-center justify-center gap-2 text-xs text-secondary font-mono">
                        <span className="w-2 h-2 bg-status-safe rounded-full animate-pulse"></span>
                        <span>FIPS 140-3 Compliant Authentication Area</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
