import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
    const [email, setEmail] = useState('shiva@gmail.com');
    const [password, setPassword] = useState('shiva@124');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    useEffect(() => {
        if (localStorage.getItem('trinetra_auth') === 'true') {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        setIsAuthenticating(true);

        // Mock authentication process
        setTimeout(() => {
            localStorage.setItem('trinetra_auth', 'true');
            localStorage.setItem('trinetra_user', email);
            setIsAuthenticating(false);
            navigate('/home');
        }, 800);
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
            
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-indigo rounded-full blur-[150px] opacity-20 pointer-events-none" />

            <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fadeInUp">
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-surface-card border border-glass-border flex items-center justify-center mb-4 shadow-lg">
                        <Fingerprint size={32} className="text-primary-indigo" />
                    </div>
                    <div className="text-primary-indigo font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                        TRINETRA
                    </div>
                    <h1 className="text-2xl font-bold font-outfit text-primary mb-2 text-center">
                        Secure Access
                    </h1>
                    <p className="text-sm text-secondary text-center">
                        Sign in to the Quantum Exposure Intelligence Platform to view telemetry data.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                        <div className="relative flex items-center">
                            <Mail size={18} className="absolute left-3 text-secondary" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-input text-primary border border-glass-border rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all text-sm"
                                placeholder="analyst@trinetra.io"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Password</label>
                            <a href="#" className="text-xs text-primary-indigo hover:text-primary-indigo-hover transition-colors font-medium">Forgot Password?</a>
                        </div>
                        <div className="relative flex items-center">
                            <Lock size={18} className="absolute left-3 text-secondary" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-input text-primary border border-glass-border rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-primary-indigo focus:ring-1 focus:ring-primary-indigo transition-all text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <GlowButton type="submit" className="w-full py-3.5 bg-primary-indigo text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-indigo-hover transition-colors">
                            {isAuthenticating ? (
                                <span className="animate-pulse">Authenticating...</span>
                            ) : (
                                <>Sign In <ArrowRight size={18} /></>
                            )}
                        </GlowButton>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-glass-border">
                    <div className="flex items-center justify-center gap-2 text-xs text-secondary font-mono">
                        <ShieldCheck size={16} className="text-status-safe" />
                        <span>FIPS 140-3 Compliant Authentication Area</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
