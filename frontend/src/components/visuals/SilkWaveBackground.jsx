import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const SilkWaveBackground = ({ className = '' }) => {
    const { isDarkMode } = useTheme();

    return (
        <div 
            className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700 ${className}`} 
            aria-hidden="true"
            style={{ opacity: isDarkMode ? 0.45 : 0.60 }}
        >
            <svg
                viewBox="0 0 1920 1080"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
            >
                {/* ── Upper Harmonic Ribbon Flow ──────────────────────────────── */}
                {[...Array(18)].map((_, i) => {
                    const progress = i / 18;
                    const offset = i * 7.5;
                    const strokeColor = i % 2 === 0
                        ? (isDarkMode ? '#fb923c' : '#f59e0b')
                        : (isDarkMode ? '#818cf8' : '#6366f1');
                    const strokeOpacity = isDarkMode
                        ? Math.sin(progress * Math.PI) * 0.22 + 0.03
                        : Math.sin(progress * Math.PI) * 0.18 + 0.03;

                    return (
                        <path
                            key={`upper-${i}`}
                            d={`M -100 ${180 + offset} 
                                C 360 ${90 + offset * 0.6}, 
                                  760 ${260 - offset * 0.4}, 
                                  1180 ${130 + offset * 0.5} 
                                C 1480 ${40 - offset * 0.3}, 
                                  1720 ${210 + offset * 0.3}, 
                                  2040 ${120 + offset * 0.1}`}
                            stroke={strokeColor}
                            strokeWidth="1.0"
                            strokeOpacity={strokeOpacity}
                            fill="none"
                        />
                    );
                })}

                {/* Upper delicate crest lines */}
                <path
                    d="M -40 140 C 400 60, 800 240, 1220 110 C 1500 30, 1740 190, 2040 120"
                    stroke={isDarkMode ? 'rgba(129, 140, 248, 0.40)' : 'rgba(99, 102, 241, 0.30)'}
                    strokeWidth="1.8"
                    fill="none"
                />
                <path
                    d="M 40 170 C 460 110, 840 270, 1260 140 C 1540 60, 1780 220, 2040 150"
                    stroke={isDarkMode ? 'rgba(251, 146, 60, 0.35)' : 'rgba(245, 158, 11, 0.25)'}
                    strokeWidth="1.6"
                    fill="none"
                />

                {/* ── Primary Sinuous Silk Wave Bands (Main Figure) ─────────────── */}
                {[...Array(28)].map((_, i) => {
                    const progress = i / 28;
                    const offset = i * 8;
                    const strokeColor = i % 2 === 0
                        ? (isDarkMode ? '#fb923c' : '#f59e0b')
                        : (isDarkMode ? '#818cf8' : '#6366f1');
                    const strokeOpacity = isDarkMode
                        ? Math.sin(progress * Math.PI) * 0.45 + 0.05
                        : Math.sin(progress * Math.PI) * 0.36 + 0.05;

                    return (
                        <path
                            key={`main-${i}`}
                            d={`M -120 ${680 + offset} 
                                C 320 ${540 + offset * 0.5}, 
                                  660 ${740 - offset * 0.4}, 
                                  1080 ${560 + offset * 0.2} 
                                C 1460 ${390 - offset * 0.5}, 
                                  1740 ${660 + offset * 0.3}, 
                                  2040 ${520 + offset * 0.1}`}
                            stroke={strokeColor}
                            strokeWidth="1.2"
                            strokeOpacity={strokeOpacity}
                            fill="none"
                        />
                    );
                })}

                {/* Main Amber Silk Crest Highlight */}
                <path
                    d="M 100 730 C 480 500, 940 740, 1420 510 C 1660 400, 1880 580, 2040 550"
                    stroke={isDarkMode ? 'rgba(251, 146, 60, 0.70)' : 'rgba(245, 158, 11, 0.55)'}
                    strokeWidth="2.4"
                    fill="none"
                />

                {/* Main Blue/Indigo Silk Crest Highlight */}
                <path
                    d="M -40 690 C 420 460, 840 700, 1300 470 C 1540 360, 1800 540, 2040 490"
                    stroke={isDarkMode ? 'rgba(129, 140, 248, 0.75)' : 'rgba(99, 102, 241, 0.60)'}
                    strokeWidth="2.8"
                    fill="none"
                />

                {/* ── Lower Subtle Grounding Ripple ────────────────────────────── */}
                {[...Array(10)].map((_, i) => {
                    const offset = i * 10;
                    return (
                        <path
                            key={`lower-${i}`}
                            d={`M -80 ${920 + offset} 
                                C 440 ${860 + offset * 0.3}, 
                                  980 ${960 - offset * 0.2}, 
                                  1520 ${880 + offset * 0.2} 
                                C 1780 ${840 - offset * 0.2}, 
                                  1940 ${930 + offset * 0.1}, 
                                  2040 ${900}`}
                            stroke={isDarkMode ? 'rgba(129, 140, 248, 0.12)' : 'rgba(99, 102, 241, 0.08)'}
                            strokeWidth="1.0"
                            fill="none"
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default SilkWaveBackground;
