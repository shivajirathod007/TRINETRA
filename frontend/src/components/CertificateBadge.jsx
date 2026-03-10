import React from 'react';

const CertificateBadge = ({ score }) => {
    let certType = "FULLY_QUANTUM_SAFE";
    let colorClass = "badge-green";

    if (score >= 70) {
        certType = "QUANTUM_VULNERABLE";
        colorClass = "badge-red";
    } else if (score >= 30) {
        certType = "PQC_READY";
        colorClass = "badge-amber";
    }

    return (
        <span className={`cert-badge ${colorClass}`}>
            {certType.replace(/_/g, ' ')}
        </span>
    );
};

export default CertificateBadge;
