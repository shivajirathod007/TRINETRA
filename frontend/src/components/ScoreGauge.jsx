import React from 'react';

const ScoreGauge = ({ score, size = 180, strokeWidth = 12 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s) => {
        if (s >= 75) return 'var(--status-critical)';
        if (s >= 50) return 'var(--status-high)';
        if (s >= 25) return 'var(--status-medium)';
        return 'var(--status-safe)';
    };

    const color = getColor(score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Track */}
            <svg className="absolute inset-0" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border-highlight)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * 0.25} // Quarter open at bottom
                    strokeLinecap="round"
                    style={{ transform: 'rotate(135deg)', transformOrigin: '50% 50%' }}
                />
            </svg>

            {/* Progress Arc */}
            <svg className="absolute inset-0" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * 0.25 + offset * 0.75} // Scale offset for 270deg arc
                    strokeLinecap="round"
                    style={{
                        transform: 'rotate(135deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dashoffset 1s ease-in-out',
                        filter: `drop-shadow(0 0 8px ${color})`
                    }}
                />
            </svg>

            {/* Score Text */}
            <div className="flex flex-col items-center justify-center text-center mt-4">
                <span className="text-4xl font-bold font-mono tracking-tighter" style={{ color }}>
                    {score}
                </span>
                <span className="text-xs text-secondary uppercase tracking-widest mt-1">
                    {score >= 75 ? 'Critical' : score >= 50 ? 'High' : score >= 25 ? 'Medium' : 'Low'}
                </span>
            </div>
        </div>
    );
};

export default ScoreGauge;
