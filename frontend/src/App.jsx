import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LiveScanPage from './pages/LiveScanPage';
import DashboardPage from './pages/DashboardPage';
import AssetDetailPage from './pages/AssetDetailPage';
import CBOMExplorer from './pages/CBOMExplorer';
import CertificatesPage from './pages/CertificatesPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Pages with Sidebar layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/scan/:domain" element={<LiveScanPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/asset/:id" element={<AssetDetailPage />} />
          <Route path="/cbom" element={<CBOMExplorer />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
