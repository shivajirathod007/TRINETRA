import React, { useState } from 'react';
import ScanInput from './ScanInput';
import ScoreGauge from './ScoreGauge';
import AssetCard from './AssetCard';
import CBOMViewer from './CBOMViewer';

const Dashboard = () => {
    const [scanData, setScanData] = useState(null);

    const handleScanComplete = (data) => {
        setScanData(data);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>TRINETRA</h1>
                <p className="subtitle">Quantum Exposure Intelligence Platform</p>
            </header>

            <div className="content-wrapper">
                <ScanInput onScanComplete={handleScanComplete} />

                {scanData && (
                    <div className="results-grid">
                        <div className="score-section glass-panel">
                            <h2>Exposure Score</h2>
                            <ScoreGauge score={scanData.exposure_score || 75} />
                        </div>

                        <div className="assets-section">
                            <h2>Vulnerable Assets</h2>
                            <div className="asset-list">
                                <AssetCard asset={{ id: "A1", hostname: "vpn.bank.com", score: 85 }} />
                                <AssetCard asset={{ id: "A2", hostname: "api.bank.com", score: 45 }} />
                            </div>
                        </div>

                        <div className="cbom-section glass-panel">
                            <h2>Cryptographic Bill of Materials</h2>
                            <CBOMViewer cbom={scanData.cbom} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
