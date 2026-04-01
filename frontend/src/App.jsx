import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// ChatBot
import { FloatingChatBot } from './components/ChatBot/FloatingChatBot';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Authenticated Pages — one file per responsibility (SOLID / SRP)
import HomePage           from './pages/HomePage';
import AssetInventoryPage from './pages/AssetInventoryPage';
import LiveScanPage       from './pages/LiveScanPage';
import DashboardPage   from './pages/DashboardPage';
import AssetDetailPage from './pages/AssetDetailPage';
import DiscoveryPage   from './pages/DiscoveryPage';
import CBOMPage        from './pages/CBOMPage';
import CertificatesPage from './pages/CertificatesPage';
import PosturePage     from './pages/PosturePage';
import RatingPage      from './pages/RatingPage';
import ReportingPage   from './pages/ReportingPage';
import HistoryPage     from './pages/HistoryPage';
import ScanHistoryPage from './pages/ScanHistoryPage';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* ── Public routes (no sidebar) ─────────────────────────── */}
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Authenticated routes (wrapped in sidebar layout) ───── */}
        <Route element={<DashboardLayout />}>
          <Route path="/home"           element={<HomePage />} />
          <Route path="/inventory"      element={<AssetInventoryPage />} />
          <Route path="/dashboard"      element={<DashboardPage />} />
          <Route path="/discovery"      element={<DiscoveryPage />} />
          <Route path="/cbom"           element={<CBOMPage />} />
          <Route path="/certificates"   element={<CertificatesPage />} />
          <Route path="/posture"        element={<PosturePage />} />
          <Route path="/rating"         element={<RatingPage />} />
          <Route path="/reporting"      element={<ReportingPage />} />
          <Route path="/history"        element={<ScanHistoryPage />} />
          <Route path="/history-old"    element={<HistoryPage />} />
          <Route path="/scan/:domain"   element={<LiveScanPage />} />
          <Route path="/asset/:id"      element={<AssetDetailPage />} />
        </Route>
      </Routes>
      <FloatingChatBot />
    </Router>
  );
}

export default App;
