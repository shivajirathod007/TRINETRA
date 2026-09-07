import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ParametricRibbonFlow = ({ className = '' }) => {
    const { isDarkMode } = useTheme();

    const stages = [
        { x: 180, y: 160, label: 'Asset Discovery', desc: 'Continuous CT Mining' },
        { x: 380, y: 240, label: 'TLS Audit', desc: 'Cipher Negotiation' },
        { x: 620, y: 310, label: 'HNDL Mosca Matrix', desc: 'Quantum Deadline' },
        { x: 880, y: 220, label: 'CycloneDX 1.6', desc: 'CBOM Synthesis' },
        { x: 1120, y: 140, label: 'Post-Quantum Safe', desc: 'Remediation Ready' },
    ];

    return (
        <div className={`relative w-full h-[460px] overflow-hidden select-none ${className}`}>
            <svg
                viewBox="0 0 1300 460"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id="ribbonGradDark" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="35%" stopColor="#8b5cf6" />
                        <stop offset="70%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>

                    <linearGradient id="ribbonGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="35%" stopColor="#7c3aed" />
                        <stop offset="70%" stopColor="#db2777" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                </defs>

                {/* Dense Parametric Wave Lines (from Slide 3) */}
                {[...Array(28)].map((_, i) => {
                    const offset = (i - 14) * 5.5;
                    const opacity = isDarkMode 
                        ? (1 - Math.abs(i - 14) / 18) * 0.5 + 0.05
                        : (1 - Math.abs(i - 14) / 18) * 0.4 + 0.05;

                    return (
                        <path
                            key={i}
                            d={`M 60 ${190 + offset} 
                                C 260 ${90 + offset * 1.2}, 
                                  440 ${320 - offset * 0.8}, 
                                  660 ${340 + offset * 0.6} 
                                C 880 ${360 - offset * 1.1}, 
                                  1020 ${110 + offset * 0.9}, 
                                  1240 ${160 - offset * 0.4}`}
                            stroke={isDarkMode ? 'url(#ribbonGradDark)' : 'url(#ribbonGradLight)'}
                            strokeWidth="1.1"
                            strokeOpacity={opacity}
                            fill="none"
                        />
                    );
                })}

                {/* Stage Callout Nodes and Connecting Lines */}
                {stages.map((stage, idx) => (
                    <g key={idx}>
                        {/* Node point */}
                        <circle
                            cx={stage.x}
                            cy={stage.y}
                            r="5"
                            fill={isDarkMode ? '#ffffff' : '#4338ca'}
                        />
                        <circle
                            cx={stage.x}
                            cy={stage.y}
                            r="11"
                            stroke={isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(99, 102, 241, 0.3)'}
                            strokeWidth="1"
                            fill="none"
                        />

                        {/* Label Badge */}
                        <foreignObject x={stage.x - 75} y={stage.y - 50} width="150" height="42">
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className={`text-[11px] font-outfit font-bold tracking-wide ${
                                    isDarkMode ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : 'text-slate-900 font-semibold'
                                }`}>
                                    {stage.label}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">
                                    {stage.desc}
                                </span>
                            </div>
                        </foreignObject>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default ParametricRibbonFlow;
