import React from 'react';

const MigrationPlan = ({ steps }) => {
    const defaultSteps = [
        "1. Audit systems dependent on RSA-2048.",
        "2. Identify hybrid key exchange support (e.g., X25519Kyber768Draft00).",
        "3. Update infrastructure to use NIST recommended algorithms."
    ];

    const renderSteps = steps || defaultSteps;

    return (
        <div className="migration-plan glass-panel">
            <h3>Recommended Remediation Steps</h3>
            <ul className="step-list">
                {renderSteps.map((step, idx) => (
                    <li key={idx} className="step-item">{step}</li>
                ))}
            </ul>
        </div>
    );
};

export default MigrationPlan;
