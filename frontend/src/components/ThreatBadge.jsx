import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, ShieldAlert } from 'lucide-react';

const getBadgeConfig = (level) => {
    const normLevel = level.toUpperCase();
    if (normLevel.includes('CRITICAL')) {
        return {
            className: 'badge badge-critical animate-pulse-subtle',
            dotClassName: 'badge-dot badge-dot-critical',
            Icon: AlertOctagon,
        };
    }
    if (normLevel.includes('HIGH')) {
        return {
            className: 'badge badge-high',
            dotClassName: 'badge-dot',
            Icon: AlertTriangle,
        };
    }
    if (normLevel.includes('MEDIUM') || normLevel.includes('WARNING')) {
        return {
            className: 'badge badge-medium',
            dotClassName: 'badge-dot',
            Icon: AlertCircle,
        };
    }
    if (normLevel.includes('SHADOW')) {
        return {
            className: 'badge badge-shadow',
            dotClassName: 'badge-dot',
            Icon: ShieldAlert,
        };
    }
    if (normLevel.includes('PQC') || normLevel.includes('READY')) {
        return {
            className: 'badge badge-pqc glow-indigo',
            dotClassName: 'badge-dot',
            Icon: Info,
        };
    }
    if (normLevel.includes('SAFE')) {
        return {
            className: 'badge badge-safe glow-safe',
            dotClassName: 'badge-dot',
            Icon: ShieldCheck,
        };
    }

    // Default Neutral
    return {
        className: 'badge',
        style: { backgroundColor: 'var(--surface-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-divider)' },
        dotClassName: 'badge-dot',
        Icon: Info,
    };
};

// Standardizing icon since AlertOctagon wasn't imported from lucide above
const AlertOctagon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);

const ThreatBadge = ({ level, className = '' }) => {
    const config = getBadgeConfig(level);

    return (
        <div className={`${config.className} gap-2 ${className}`} style={config.style || {}}>
            <div className={config.dotClassName} style={!config.dotClassName.includes('critical') && !config.style ? { backgroundColor: 'currentColor' } : {}}></div>
            <span>{level}</span>
        </div>
    );
};

export default ThreatBadge;
