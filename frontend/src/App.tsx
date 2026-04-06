import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { FloatingChatBot } from '@/components/ChatBot/FloatingChatBot'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import { AssetDetailPage } from '@/pages/AssetDetail'
import { CBOMPage, DiscoveryPage } from '@/pages/OtherPages'
import CertificatesPage from '@/pages/CertificatesPage'
import ScanHistoryPage from '@/pages/ScanHistoryPage'
import PosturePage from '@/pages/PosturePage'

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/asset/:id" element={<AssetDetailPage />} />
                    <Route path="/cbom" element={<CBOMPage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/discovery" element={<DiscoveryPage />} />
                    <Route path="/history" element={<ScanHistoryPage />} />
                    <Route path="/posture" element={<PosturePage />} />
                </Routes>
            </Layout>
            <FloatingChatBot />
        </BrowserRouter>
    )
}
