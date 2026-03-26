import React from 'react';
import CertificateBadge from './CertificateBadge';
import { SensitivityBadge } from './shared/SensitivityBadge';
import { ScoreBreakdownTooltip } from './shared/ScoreBreakdownTooltip';

const AssetCard = ({ asset }) => {
    return (
        <div className="asset-card glass-panel">
            <div className="asset-header">
                <h3>{asset.hostname || asset.url}</h3>
                <div className="flex items-center gap-2">
                    <SensitivityBadge
                        tier={asset.data_sensitivity_tier || 'static'}
                        source={asset.data_sensitivity_tier_source}
                    />
                    <CertificateBadge score={asset.score} />
                </div>
            </div>
            <div className="asset-details">
                <p>
                    Exposure Score:{' '}
                    <ScoreBreakdownTooltip
                        score={asset.score}
                        breakdown={asset.score_breakdown}
                    >
                        <strong>{asset.score}/100</strong>
                    </ScoreBreakdownTooltip>
                </p>
            </div>
        </div>
    );
};

export default AssetCard;
