import React, { useEffect, useState } from 'react';

const ScoreGauge = ({ score, size = 120, strokeWidth = 10, animate = true }) => {
    const [currentScore, setCurrentScore] = useState(animate ? 0 : score);

    useEffect(() => {
        if (animate) {
            const timer = setTimeout(() => {
                setCurrentScore(score);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [score, animate]);

    const getColor = (val) => {
        if (val < 20) return '#EF4444'; // Red
        if (val < 40) return '#F97316'; // Orange
        if (val < 60) return '#EAB308'; // Yellow
        if (val < 80) return '#3B82F6'; // Blue
        return '#22C55E'; // Green
    };

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (currentScore / 100) * circumference;

    const color = getColor(score);

    return (
        <div className="relative inline-flex items-center justify-center font-mono" style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#1F2937"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 4px ${color}80)`
                    }}
                />
            </svg>
            {/* Absolute positioning for text */}
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color }}>{Math.round(currentScore)}</span>
                <span className="text-[10px] text-[#9CA3AF]">/ 100</span>
            </div>
        </div>
    );
};

export default ScoreGauge;
