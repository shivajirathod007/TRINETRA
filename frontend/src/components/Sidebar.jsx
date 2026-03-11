import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileJson, ShieldCheck, History, BookOpen, Activity } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'CBOM Explorer', path: '/explorer', icon: FileJson },
        { name: 'Certificates', path: '/certificates', icon: ShieldCheck },
        { name: 'History', path: '/history', icon: History },
    ];

    return (
        <div className="w-16 md:w-64 h-screen bg-[#0A0D14] border-r border-[#1F2937] flex flex-col justify-between transition-all duration-300">
            <div>
                {/* Logo Section */}
                <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-[#1F2937]">
                    <Activity className="text-[#6366F1] flex-shrink-0" size={28} />
                    <span className="hidden md:ml-3 md:block font-bold text-lg tracking-wider">TRINETRA</span>
                </div>

                {/* Navigation */}
                <nav className="mt-6 flex flex-col gap-2 px-2 md:px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center justify-center md:justify-start px-2 md:px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-[#1e293b] text-[#F9FAFB]'
                                        : 'text-[#9CA3AF] hover:bg-[#111827] hover:text-[#F9FAFB]'
                                    }`
                                }
                                title={item.name}
                            >
                                <Icon size={20} className="flex-shrink-0" />
                                <span className="hidden md:block ml-3 font-medium text-sm">{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-[#1F2937]">
                <NavLink
                    to="/"
                    title="Docs"
                    className="flex items-center justify-center md:justify-start px-2 md:px-0 py-2 text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
                >
                    <BookOpen size={20} className="flex-shrink-0" />
                    <span className="hidden md:block ml-3 font-medium text-sm">Documentation</span>
                </NavLink>
            </div>
        </div>
    );
};

export default Sidebar;
