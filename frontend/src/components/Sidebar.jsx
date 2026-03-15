import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FileJson, ShieldCheck, History, Moon, Sun, Home } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'CBOM Explorer', path: '/cbom', icon: FileJson },
    { name: 'Certificates', path: '/certificates', icon: ShieldCheck },
    { name: 'History', path: '/history', icon: History },
];

const Sidebar = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <nav className="sidebar">
            <div>
                <Link to="/" className="sidebar-logo flex items-center gap-2 no-underline text-inherit hover:opacity-90 transition-opacity">
                    <img src="/logo.png" alt="TRINETRA" className="h-8 w-8 object-contain flex-shrink-0" />
                    <span className="font-semibold text-base tracking-[0.15em] uppercase sidebar-logo-text">
                        TRINETRA
                    </span>
                </Link>

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
                <button
                    onClick={toggleTheme}
                    className="sidebar-theme-btn flex justify-center md:hidden items-center p-2 mb-4 w-full rounded transition-colors"
                    title="Toggle Theme"
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="nav-text">
                    <button onClick={toggleTheme} className="sidebar-theme-btn flex items-center gap-2 p-2 mb-4 rounded w-full text-secondary transition-colors">
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <div className="font-mono mb-1">v1.2.0-beta</div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="badge-dot badge-dot-safe"></span> System Online
                    </div>
                </div>
            </div>
            <style>{`
        .sidebar-logo-text { display: none; }
        @media (min-width: 768px) {
          .sidebar-logo-text { display: block !important; }
        }
      `}</style>
        </nav>
    );
};

export default Sidebar;
