import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LiveScanPage from './pages/LiveScanPage';
import DashboardPage from './pages/DashboardPage';
import AssetDetailPage from './pages/AssetDetailPage';
import CBOMExplorer from './pages/CBOMExplorer';
import CertificatesPage from './pages/CertificatesPage';
import HistoryPage from './pages/HistoryPage';
import { DiscoveryPage, RatingPage, ReportingPage } from './pages/OtherPages';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes without the Sidebar */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Pages wrapped in Sidebar Dashboard Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/scan/:domain" element={<LiveScanPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/asset/:id" element={<AssetDetailPage />} />
          <Route path="/cbom" element={<CBOMExplorer />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/rating" element={<RatingPage />} />
          <Route path="/reporting" element={<ReportingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
