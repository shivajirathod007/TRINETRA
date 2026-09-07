import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const GeodesicOrbitalSphere = ({ className = '', size = 380 }) => {
    const { isDarkMode } = useTheme();

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;

    return (
        <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id="sphereAuraDark" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="sphereAuraLight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>

                </defs>

                {/* Outer Perimeter Ring */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(99, 102, 241, 0.4)'}
                    strokeWidth="1.5"
                />

                {/* Concentric Latitude Rings */}
                {[0.25, 0.5, 0.75, 0.9].map((scale, i) => (
                    <ellipse
                        key={`lat-${i}`}
                        cx={cx}
                        cy={cy}
                        rx={r * Math.cos(Math.asin(scale))}
                        ry={r * scale * 0.45}
                        stroke={isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(99, 102, 241, 0.2)'}
                        strokeWidth="0.9"
                        strokeDasharray={i % 2 === 1 ? '4 3' : undefined}
                    />
                ))}

                {/* Concentric Longitude Ovals */}
                {[0.3, 0.6, 0.85].map((scale, i) => (
                    <ellipse
                        key={`lon-${i}`}
                        cx={cx}
                        cy={cy}
                        rx={r * scale}
                        ry={r}
                        stroke={isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(99, 102, 241, 0.2)'}
                        strokeWidth="0.9"
                    />
                ))}

                {/* Inclined Orbit Ring */}
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={r * 1.08}
                    ry={r * 0.38}
                    transform={`rotate(-28 ${cx} ${cy})`}
                    stroke={isDarkMode ? '#fb923c' : '#f59e0b'}
                    strokeWidth="1.2"
                    strokeOpacity="0.75"
                />

                {/* Core Target Center & Label */}
                <circle
                    cx={cx}
                    cy={cy}
                    r="28"
                    fill={isDarkMode ? '#0a0d1a' : '#ffffff'}
                    stroke={isDarkMode ? '#c084fc' : '#8b5cf6'}
                    strokeWidth="2"
                />
                <circle
                    cx={cx}
                    cy={cy}
                    r="6"
                    fill={isDarkMode ? '#c084fc' : '#8b5cf6'}
                />

                {/* Tiny orbiting satellite nodes */}
                <circle
                    cx={cx + r * 0.9}
                    cy={cy - r * 0.35}
                    r="4.5"
                    fill={isDarkMode ? '#ffffff' : '#4338ca'}
                    stroke="#a855f7"
                    strokeWidth="1.5"
                />
                <circle
                    cx={cx - r * 0.75}
                    cy={cy + r * 0.55}
                    r="3.5"
                    fill="#38bdf8"
                />
            </svg>
        </div>
    );
};

export default GeodesicOrbitalSphere;
