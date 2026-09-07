import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const SilkWaveHero = ({ className = '' }) => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`relative w-full h-full overflow-hidden pointer-events-none select-none ${className}`}>
            <svg
                viewBox="0 0 1440 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* Dark Mode Silk Gradients */}
                    <linearGradient id="silkCopperDark" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#b45309" stopOpacity="0.05" />
                    </linearGradient>

                    <linearGradient id="silkVioletDark" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.05" />
                    </linearGradient>

                    {/* Light Mode Silk Gradients */}
                    <linearGradient id="silkCopperLight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="silkVioletLight" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="#a855f7" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ede9fe" stopOpacity="0" />
                    </linearGradient>

                </defs>

                {/* Sinuous Ribbon Wave Mesh Bands */}
                {[...Array(24)].map((_, i) => {
                    const progress = i / 24;
                    const offset = i * 7;
                    const strokeColor = i % 2 === 0
                        ? (isDarkMode ? '#fb923c' : '#f59e0b')
                        : (isDarkMode ? '#818cf8' : '#6366f1');
                    const strokeOpacity = isDarkMode
                        ? Math.sin(progress * Math.PI) * 0.45 + 0.05
                        : Math.sin(progress * Math.PI) * 0.35 + 0.05;

                    return (
                        <path
                            key={i}
                            d={`M -80 ${440 + offset} 
                                C 280 ${360 + offset * 0.5}, 
                                  520 ${490 - offset * 0.4}, 
                                  820 ${380 + offset * 0.2} 
                                C 1120 ${270 - offset * 0.5}, 
                                  1320 ${430 + offset * 0.3}, 
                                  1520 ${350 + offset * 0.1}`}
                            stroke={strokeColor}
                            strokeWidth={1.2}
                            strokeOpacity={strokeOpacity}
                            fill="none"
                        />
                    );
                })}

                {/* Foreground Silk Crest Highlights */}
                <path
                    d="M 120 480 C 420 320, 780 490, 1140 330 C 1300 260, 1460 380, 1500 400"
                    stroke={isDarkMode ? 'rgba(251, 146, 60, 0.7)' : 'rgba(245, 158, 11, 0.5)'}
                    strokeWidth="2"
                    fill="none"
                />
                <path
                    d="M 0 450 C 360 300, 680 460, 1020 310 C 1200 230, 1380 340, 1480 360"
                    stroke={isDarkMode ? 'rgba(129, 140, 248, 0.75)' : 'rgba(99, 102, 241, 0.55)'}
                    strokeWidth="2.5"
                    fill="none"
                />
            </svg>
        </div>
    );
};

export default SilkWaveHero;
