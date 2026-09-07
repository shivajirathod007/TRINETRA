import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const BlossomFiberCluster = ({ className = '' }) => {
    const { isDarkMode } = useTheme();

    const nodeColors = ['#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#38bdf8', '#34d399', '#f59e0b', '#fb923c'];

    return (
        <div className={`relative w-full h-[220px] flex items-end justify-center overflow-hidden pointer-events-none select-none ${className}`}>
            <svg
                viewBox="0 0 900 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full max-w-4xl"
                preserveAspectRatio="xMidYMax meet"
            >
                {/* Base Anchor line */}
                <path
                    d="M 100 230 C 350 210, 550 210, 800 230"
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(99, 102, 241, 0.15)'}
                    strokeWidth="1.5"
                />

                {/* Dense Arching Stems radiating upward into 3 clusters */}
                {[...Array(36)].map((_, i) => {
                    const startX = 250 + (i * 11);
                    const targetX = 140 + (i * 17.5);
                    const archHeight = 40 + Math.sin((i / 36) * Math.PI) * 140;
                    const targetY = 220 - archHeight;
                    const color = nodeColors[i % nodeColors.length];

                    return (
                        <g key={i}>
                            {/* Curved stem line */}
                            <path
                                d={`M ${startX} 230 C ${startX} ${230 - archHeight * 0.5}, ${targetX} ${targetY + 30}, ${targetX} ${targetY}`}
                                stroke={isDarkMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(99, 102, 241, 0.18)'}
                                strokeWidth="0.9"
                                fill="none"
                            />

                            {/* Blossom Particle */}
                            <circle
                                cx={targetX}
                                cy={targetY}
                                r={i % 3 === 0 ? 12 : 7}
                                fill={color}
                                fillOpacity={isDarkMode ? '0.35' : '0.25'}
                            />
                            <circle
                                cx={targetX}
                                cy={targetY}
                                r={i % 3 === 0 ? 4 : 2.5}
                                fill={isDarkMode ? '#ffffff' : color}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default BlossomFiberCluster;
