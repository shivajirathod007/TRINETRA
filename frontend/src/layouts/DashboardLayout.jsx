import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="main-content relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-indigo filter blur-[150px] opacity-10 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
