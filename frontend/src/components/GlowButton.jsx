import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const GlowButton = ({
    children,
    onClick,
    className = '',
    type = 'button',
    icon = <ArrowRight size={16} />,
    active = false
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            type={type}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`btn-glow ${active || isHovered ? 'active' : ''} ${className}`}
        >
            <div className="btn-glow-bg"></div>
            <div className="btn-glow-content gap-2">
                {children}
                <span style={{
                    transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease-in-out',
                    display: 'flex'
                }}>
                    {icon}
                </span>
            </div>
        </button>
    );
};

export default GlowButton;
