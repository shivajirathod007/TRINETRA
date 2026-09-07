import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const FiberFanConstellation = ({ className = '', nodeCount = 13 }) => {
    const { isDarkMode } = useTheme();

    // Generate fan stems
    const stems = [
        { angle: -65, length: 340, color: '#f59e0b', label: 'TLS 1.3' },
        { angle: -52, length: 380, color: '#fb923c', label: 'CT Logs' },
        { angle: -40, length: 420, color: '#ec4899', label: 'HNDL' },
        { angle: -28, length: 440, color: '#a855f7', label: 'ML-KEM' },
        { angle: -15, length: 460, color: '#6366f1', label: 'ML-DSA' },
        { angle: 0,   length: 470, color: '#38bdf8', label: 'Perimeter' },
        { angle: 15,  length: 460, color: '#34d399', label: 'CBOM' },
        { angle: 28,  length: 440, color: '#10b981', label: 'CycloneDX' },
        { angle: 40,  length: 420, color: '#6366f1', label: 'CNSA 2.0' },
        { angle: 52,  length: 380, color: '#8b5cf6', label: 'FIPS 203' },
        { angle: 65,  length: 340, color: '#f59e0b', label: 'SLH-DSA' },
    ];

    const originX = 500;
    const originY = 560;

    return (
        <div className={`relative w-full h-[480px] flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}>
            <svg
                viewBox="0 0 1000 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full max-w-4xl"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Radiating Curved Stems */}
                {stems.map((stem, i) => {
                    const rad = (stem.angle * Math.PI) / 180;
                    const targetX = originX + Math.sin(rad) * stem.length;
                    const targetY = originY - Math.cos(rad) * stem.length;

                    // Quadratic Bezier Control Point
                    const ctrlX = originX + Math.sin(rad * 0.4) * (stem.length * 0.5);
                    const ctrlY = originY - (stem.length * 0.6);

                    return (
                        <g key={i}>
                            {/* Stem line */}
                            <path
                                d={`M ${originX} ${originY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`}
                                stroke={isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.2)'}
                                strokeWidth="1.2"
                                fill="none"
                            />

                            {/* Luminous Starburst Node at Endpoint */}
                            <circle
                                cx={targetX}
                                cy={targetY}
                                r="18"
                                fill={stem.color}
                                fillOpacity={isDarkMode ? '0.15' : '0.12'}
                            />
                            <circle
                                cx={targetX}
                                cy={targetY}
                                r="4"
                                fill={isDarkMode ? '#ffffff' : stem.color}
                            />

                            {/* Tiny sparkle ring */}
                            <circle
                                cx={targetX}
                                cy={targetY}
                                r="9"
                                stroke={stem.color}
                                strokeWidth="0.75"
                                strokeOpacity={isDarkMode ? '0.6' : '0.4'}
                                fill="none"
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default FiberFanConstellation;
