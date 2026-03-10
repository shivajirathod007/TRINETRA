import React from 'react';

const CBOMViewer = ({ cbom }) => {
    // Mock CBOM if none provided
    const components = cbom?.components || [
        { name: "RSA-2048 cert", type: "cryptographic-asset", version: "1.0" },
        { name: "AES-256-GCM session", type: "cryptographic-asset", version: "TLS 1.2" }
    ];

    return (
        <div className="cbom-viewer">
            <table className="cbom-table">
                <thead>
                    <tr>
                        <th>Component Name</th>
                        <th>Type</th>
                        <th>Details/Version</th>
                    </tr>
                </thead>
                <tbody>
                    {components.map((c, i) => (
                        <tr key={i}>
                            <td>{c.name}</td>
                            <td>{c.type}</td>
                            <td>{c.version}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CBOMViewer;
