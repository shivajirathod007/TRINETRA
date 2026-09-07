import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import GlobalScanPopup from '../components/GlobalScanPopup';
import { SilkWaveBackground } from '../components/visuals/SilkWaveBackground';

const DashboardLayout = () => {
    return (
        <div
            className="eterna-bg"
            style={{
                minHeight: '100vh',
                position: 'relative',
                overflowX: 'hidden',
                /* Prevent ambient glow from creating horizontal scroll */
            }}
        >
            {/* Full-viewport Silk Wave background all over the system */}
            <SilkWaveBackground />

            {/* Sidebar */}
            <Sidebar />

            {/* Main scrollable content area */}
            <main
                className="main-content animate-fadeIn"
                id="main-content"
                style={{ position: 'relative', zIndex: 1 }}
            >
                <div
                    style={{
                        maxWidth: '1400px',
                        width: '100%',
                        margin: '0 auto',
                        paddingBottom: '4rem',
                    }}
                >
                    <Outlet />
                </div>
            </main>

            {/* Floating scan progress popup */}
            <GlobalScanPopup />
        </div>
    );
};

export default DashboardLayout;
