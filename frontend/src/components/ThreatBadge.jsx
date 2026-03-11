import React from 'react';

const ThreatBadge = ({ level, className = '' }) => {
    const styles = {
        CRITICAL: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/50 animate-pulse-subtle glow-critical',
        HIGH: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/50',
        MEDIUM: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/50',
        PQC_READY: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/50',
        SAFE: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/50',
        SHADOW: 'bg-[#F97316]/20 text-[#F97316] border-[#F97316] font-bold' // Special Orange
    };

    const getStyle = () => {
        switch (level?.toUpperCase()) {
            case 'CRITICAL': return styles.CRITICAL;
            case 'HIGH': return styles.HIGH;
            case 'MEDIUM': return styles.MEDIUM;
            case 'PQC READY': return styles.PQC_READY;
            case 'QUANTUM SAFE': return styles.SAFE;
            case 'SHADOW ASSET': return styles.SHADOW;
            default: return 'bg-gray-800 text-gray-300 border-gray-600';
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}>
            {level?.toUpperCase() === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mr-1.5"></span>}
            {level?.toUpperCase() === 'SHADOW ASSET' && <span className="mr-1.5">⚠</span>}
            {level}
        </span>
    );
};

export default ThreatBadge;
