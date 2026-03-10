import React from 'react';
import CertificateBadge from './CertificateBadge';

const AssetCard = ({ asset }) => {
    return (
        <div className="asset-card glass-panel">
            <div className="asset-header">
                <h3>{asset.hostname}</h3>
                <CertificateBadge score={asset.score} />
            </div>
            <div className="asset-details">
                <p>Exposure Score: <strong>{asset.score}/100</strong></p>
            </div>
        </div>
    );
};

export default AssetCard;
