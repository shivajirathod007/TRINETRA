import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

const HNDLCountdownCard = ({ deadline, urgency }) => {
    const isImmediate = urgency.toUpperCase() === 'IMMEDIATE';
    const isHigh = urgency.toUpperCase() === 'HIGH';

    const baseCard = 'glass-card hndl-card h-full flex flex-col justify-between';
    const urgencyClass = isImmediate ? 'hndl-immediate glow-critical' : isHigh ? 'hndl-high glow-high' : 'hndl-medium glow-medium';

    return (
        <div className={`${baseCard} ${urgencyClass} p-6 relative overflow-hidden`}>
            {/* Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-5">
                <Clock size={120} />
            </div>

            <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={20} className={isImmediate ? 'text-status-critical' : 'text-status-high'} />
                        <span className="font-bold text-sm tracking-wide text-primary">HNDL RISK</span>
                    </div>
                    <div className={`badge ${isImmediate ? 'badge-critical animate-pulse-subtle' : 'badge-high'}`}>
                        {urgency} ATTENTION
                    </div>
                </div>

                <h3 className="text-2xl font-bold font-mono text-primary mb-2">Harvest Now, Decrypt Later</h3>
                <p className="text-xs text-secondary leading-relaxed mb-6 max-w-[90%]">
                    Communications secured by vulnerable key exchanges (e.g., ECDHE) are subject to retroactive decryption by future CRQCs.
                </p>
            </div>

            <div className="relative z-10 bg-navy-black/50 border border-divider rounded-lg p-4 mt-auto">
                <div className="text-xs text-secondary uppercase tracking-widest mb-1 flex items-center justify-between">
                    <span>Migration Deadline</span>
                    <span className="text-primary font-bold">NIST FIPS 203/204</span>
                </div>
                <div className={`text-3xl font-mono font-bold ${isImmediate ? 'text-status-critical' : 'text-status-high'} mb-1`}>
                    {deadline}
                </div>
                <div className="w-full bg-surface-card rounded-full h-1.5 mt-2 overflow-hidden border border-divider">
                    <div
                        className="h-full bg-status-critical rounded-full"
                        style={{ width: '85%' }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default HNDLCountdownCard;
