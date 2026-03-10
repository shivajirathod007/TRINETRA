import React, { useState } from 'react';
import { trinetraApi } from '../api/trinetra';

const ScanInput = ({ onScanComplete }) => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);

    const handleScan = async (e) => {
        e.preventDefault();
        if (!domain) return;

        setLoading(true);
        try {
            // Initiate scan
            const { data: scanInit } = await trinetraApi.startScan(domain);
            // Wait / poll logic omitted for scaffolding
            // Fetch dummy summary logic
            const { data: summary } = await trinetraApi.getDashboardSummary(domain);

            onScanComplete(summary);
        } catch (err) {
            console.error(err);
            // Mock fallback for testing
            onScanComplete({ exposure_score: 82, domain });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="scan-input-form glass-panel" onSubmit={handleScan}>
            <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter bank domain (e.g., pnbindia.in)"
                className="domain-input"
                required
            />
            <button type="submit" disabled={loading} className="scan-btn">
                {loading ? 'Scanning...' : 'Analyze Quantum Risk'}
            </button>
        </form>
    );
};

export default ScanInput;
