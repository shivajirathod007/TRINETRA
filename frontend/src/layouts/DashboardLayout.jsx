import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
    return (
        <div className="flex bg-[#0A0D14] min-h-screen text-[#F9FAFB] font-sans">
            <Sidebar />
            <div className="flex-1 overflow-x-hidden overflow-y-auto">
                <main className="p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
