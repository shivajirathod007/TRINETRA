import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileJson, ShieldCheck, History, Activity } from 'lucide-react';

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'CBOM Explorer', path: '/cbom', icon: FileJson },
    { name: 'Certificates', path: '/certificates', icon: ShieldCheck },
    { name: 'History', path: '/history', icon: History },
];

const Sidebar = () => {
    return (
        <nav className="sidebar">
            <div>
                <div className="sidebar-logo">
                    <div className="flex items-center gap-2">
                        <Activity className="text-primary-indigo animate-pulse-subtle" size={24} />
                        {/* Hide text on mobile */}
                        <span className="font-bold text-lg tracking-widest uppercase md-block" style={{ display: 'none' }}>
                            TRINETRA
                        </span>
                    </div>
                </div>

                <div className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={item.name}
                            >
                                <Icon size={20} className="nav-icon" />
                                <span className="nav-text">{item.name}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            <div className="sidebar-footer text-xs text-secondary text-center">
                <div className="nav-text">
                    <div className="font-mono mb-1">v1.2.0-beta</div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="badge-dot badge-dot-safe"></span> System Online
                    </div>
                </div>
            </div>
            {/* Inline styles for responsive typography missing from base CSS */}
            <style>{`
        @media (min-width: 768px) {
          .md-block { display: block !important; }
        }
      `}</style>
        </nav>
    );
};

export default Sidebar;
