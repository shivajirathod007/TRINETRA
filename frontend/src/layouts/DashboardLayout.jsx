import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="main-content relative">
                <div className="main-content-glow" aria-hidden />
                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
