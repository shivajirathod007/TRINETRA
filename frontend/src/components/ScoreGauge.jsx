import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ScoreGauge = ({ score }) => {
    const data = [
        { name: 'Risk', value: score },
        { name: 'Safe', value: 100 - score },
    ];

    // Colors based on risk levels
    const getRiskColor = (val) => {
        if (val >= 70) return '#ef4444'; // Red
        if (val >= 30) return '#f59e0b'; // Amber
        return '#10b981'; // Green
    };

    const COLORS = [getRiskColor(score), '#374151'];

    return (
        <div className="gauge-container" style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={0}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="gauge-label">
                <span className="gauge-score">{score}</span>
            </div>
        </div>
    );
};

export default ScoreGauge;
