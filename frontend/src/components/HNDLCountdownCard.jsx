import React from 'react';
import { Clock } from 'lucide-react';

const HNDLCountdownCard = ({ deadline, urgency = 'IMMEDIATE', title = 'HNDL RISK ACTIVE' }) => {
    const getUrgencyStyles = () => {
        switch (urgency) {
            case 'IMMEDIATE':
                return 'border-l-4 border-l-[#EF4444] bg-[#EF4444]/5 glow-critical';
            case 'HIGH':
                return 'border-l-4 border-l-[#F97316] bg-[#F97316]/5';
            default:
                return 'border-l-4 border-l-[#EAB308] bg-[#EAB308]/5';
        }
    };

    return (
        <div className={`p-4 rounded-r-lg border-y border-r border-[#1F2937] ${getUrgencyStyles()}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center font-bold text-[#EF4444] tracking-wider text-sm">
                    <span className="mr-2">⚠</span> {title}
                </div>
            </div>

            <div className="font-mono text-sm space-y-1 text-[#F9FAFB]">
                <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Algorithm:</span>
                    <span>RSA-2048</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Certificate expires:</span>
                    <span>2026-08-14 (156 days)</span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#374151]/50 text-[#9CA3AF] leading-relaxed">
                    Data intercepted TODAY becomes decryptable<br />
                    in approximately <span className="text-[#F9FAFB] font-bold">4.2 years</span>
                </div>

                <div className="mt-3 flex items-center text-[#EF4444] font-bold bg-[#EF4444]/10 p-2 rounded">
                    <Clock size={16} className="mr-2" />
                    <span>→ MIGRATE BY: {deadline}</span>
                </div>
            </div>
        </div>
    );
};

export default HNDLCountdownCard;
