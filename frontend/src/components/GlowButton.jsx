import React from 'react';

const GlowButton = ({ children, onClick, active = false, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
        relative px-6 py-3 font-bold text-sm tracking-widest uppercase transition-all duration-300
        border border-[#6366F1] rounded-md overflow-hidden group
        ${active ? 'bg-[#6366F1] text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-transparent text-[#6366F1] hover:text-white'}
        ${className}
      `}
        >
            {/* Background glow effect on hover */}
            <div className={`absolute inset-0 bg-[#6366F1] transition-all duration-300 ease-out z-0 
        ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            </div>

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center">
                {children}
            </span>
        </button>
    );
};

export default GlowButton;
