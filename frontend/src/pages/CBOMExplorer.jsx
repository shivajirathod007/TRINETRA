import React, { useState } from 'react';
import { Download, Copy, Table, FileJson, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ThreatBadge from '../components/ThreatBadge';

const mockCboms = [
    { id: 1, url: 'netbanking.pnb.in', tls: '1.2', cipher: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', kx: 'ECDHE', cert: 'RSA-2048', expiry: '2026-08-14', issuer: 'DigiCert Inc', status: 'CRITICAL' },
    { id: 2, url: 'api-legacy.pnb.in', tls: '1.0', cipher: 'TLS_RSA_WITH_AES_128_CBC_SHA', kx: 'RSA', cert: 'RSA-1024', expiry: '2025-11-20', issuer: 'Let\'s Encrypt', status: 'CRITICAL' },
    { id: 3, url: 'vpn.pnb.in', tls: '1.2', cipher: 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384', kx: 'ECDHE', cert: 'ECDSA-256', expiry: '2027-02-10', issuer: 'DigiCert Inc', status: 'HIGH' },
    { id: 4, url: 'test-payments.pnb.in', tls: '1.1', cipher: 'TLS_RSA_WITH_AES_256_CBC_SHA', kx: 'RSA', cert: 'RSA-2048', expiry: '2026-01-15', issuer: 'Let\'s Encrypt', status: 'CRITICAL' },
    { id: 5, url: 'quantum.pnb.in', tls: '1.3', cipher: 'TLS_AES_256_GCM_SHA384', kx: 'ML-KEM-768', cert: 'ML-DSA-65', expiry: '2026-09-11', issuer: 'TRINETRA CA', status: 'QUANTUM SAFE' },
];

const mockJson = `{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79",
  "version": 1,
  "metadata": {
    "timestamp": "2026-03-11T14:34:22Z",
    "component": {
      "type": "application",
      "name": "pnb.in-infrastructure"
    }
  },
  "components": [
    {
      "type": "cryptographic-asset",
      "name": "netbanking.pnb.in",
      "cryptoProperties": {
        "assetType": "certificate",
        "algorithmProperties": {
          "name": "RSA",
          "keySize": 2048,
          "cryptoFunctions": ["sign", "verify"]
        },
        "certificateProperties": {
          "issuerName": "CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1",
          "notAfter": "2026-08-14T23:59:59Z",
          "signatureAlgorithm": "sha256WithRSAEncryption"
        }
      }
    }
  ]
}`;

const algoData = [
    { name: 'RSA-2048', count: 18 },
    { name: 'ECDSA-256', count: 12 },
    { name: 'RSA-1024', count: 2 },
    { name: 'ML-DSA-65', count: 3 },
    { name: 'Dilithium-3', count: 3 },
];

const tlsData = [
    { name: 'TLS 1.3', value: 16, color: 'var(--status-safe)' },
    { name: 'TLS 1.2', value: 18, color: 'var(--status-medium)' },
    { name: 'TLS 1.1', value: 3, color: 'var(--status-high)' },
    { name: 'TLS 1.0', value: 1, color: 'var(--status-critical)' },
];

const CBOMExplorer = () => {
    const [view, setView] = useState('table'); // 'table', 'json', 'summary'

    return (
        <div className="flex flex-col gap-6 h-full min-h-[calc(100vh-6rem)]">

            {/* Header Bar */}
            <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 bg-surface-card p-4 rounded-lg border">
                <div className="flex flex-col md-flex-row md-items-center gap-2 md-gap-4">
                    <h1 className="text-xl font-bold">Cryptographic Bill of Materials</h1>
                    <div className="hidden md-block text-border-highlight">|</div>
                    <span className="text-secondary font-mono text-sm">Target: <span className="text-primary">pnb.in</span></span>
                    <span className="text-secondary font-mono text-sm">Standard: <span className="text-primary">CycloneDX 1.5</span></span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button className="action-btn"><FileJson size={14} /> Export JSON</button>
                    <button className="action-btn"><FileJson size={14} /> Export XML</button>
                    <button className="action-btn"><Download size={14} /> Export PDF</button>
                    <button className="action-btn"><Copy size={14} /> Copy</button>
                </div>
            </div>

            {/* View Toggles */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setView('table')}
                    className={`tab-btn ${view === 'table' ? 'active' : ''}`}
                >
                    <Table size={16} /> Table View
                </button>
                <button
                    onClick={() => setView('json')}
                    className={`tab-btn ${view === 'json' ? 'active' : ''}`}
                >
                    <FileJson size={16} /> JSON View
                </button>
                <button
                    onClick={() => setView('summary')}
                    className={`tab-btn ${view === 'summary' ? 'active' : ''}`}
                >
                    <BarChart2 size={16} /> Summary View
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 glass-card border flex flex-col overflow-hidden w-full">

                {view === 'table' && (
                    <div className="table-container flex-1">
                        <table className="data-table">
                            <thead className="sticky top-0">
                                <tr>
                                    <th>Asset URL</th>
                                    <th>TLS</th>
                                    <th>Cipher Suite</th>
                                    <th>Key Exchange</th>
                                    <th>Cert Algo</th>
                                    <th>Expiry</th>
                                    <th>Issuer</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockCboms.map(cbom => (
                                    <tr key={cbom.id}>
                                        <td className="font-mono font-medium">{cbom.url}</td>
                                        <td className="font-mono">{cbom.tls}</td>
                                        <td className="font-mono text-xs max-w-xs overflow-hidden text-ellipsis">{cbom.cipher}</td>
                                        <td className="font-mono">{cbom.kx}</td>
                                        <td className="font-mono">{cbom.cert}</td>
                                        <td className="font-mono text-secondary">{cbom.expiry}</td>
                                        <td className="text-secondary">{cbom.issuer}</td>
                                        <td>
                                            <ThreatBadge level={cbom.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'json' && (
                    <div className="flex-1 overflow-auto p-4 bg-navy-black">
                        <pre className="font-mono text-xs md-text-sm text-secondary leading-relaxed">
                            <code dangerouslySetInnerHTML={{
                                __html: mockJson
                                    .replace(/"(.*?)":/g, '<span class="text-primary-indigo">"$1"</span>:')
                                    .replace(/: "(.*?)"/g, ': <span class="text-status-safe">"$1"</span>')
                                    .replace(/: ([0-9]+)/g, ': <span class="text-status-high">$1</span>')
                            }} />
                        </pre>
                    </div>
                )}

                {view === 'summary' && (
                    <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg-grid-cols-2 gap-8 w-full">
                        <div className="bg-surface-card border rounded-lg p-6">
                            <h3 className="text-sm font-bold mb-6 text-secondary uppercase">Certificate Algorithm Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={algoData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'var(--surface-card-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-navy-black)', border: '1px solid var(--border-divider)', color: '#fff' }} />
                                        <Bar dataKey="count" fill="var(--primary-indigo)" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-surface-card border rounded-lg p-6">
                            <h3 className="text-sm font-bold mb-6 text-secondary uppercase">TLS Version Distribution</h3>
                            <div className="h-64 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tlsData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {tlsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-navy-black)', border: '1px solid var(--border-divider)', color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Custom Legend */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                                    {tlsData.map(d => (
                                        <div key={d.name} className="flex items-center gap-2 text-sm font-mono">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                            <span className="text-primary">{d.name}</span>
                                            <span className="text-secondary ml-2">({d.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-card border rounded-lg p-6 lg-col-span-2">
                            <h3 className="text-sm font-bold mb-6 text-secondary uppercase">Issuer Breakdown</h3>
                            <div className="flex flex-col md-flex-row gap-4">
                                <div className="flex-1 bg-navy-black border rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-primary mb-1">24</div>
                                    <div className="text-xs text-secondary uppercase">DigiCert Inc</div>
                                </div>
                                <div className="flex-1 bg-navy-black border rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-primary mb-1">11</div>
                                    <div className="text-xs text-secondary uppercase">Let's Encrypt</div>
                                </div>
                                <div className="flex-1 bg-navy-black border rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-primary mb-1">3</div>
                                    <div className="text-xs text-secondary uppercase">Self-Signed / Internal</div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
            <style>{`
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          font-weight: 500;
          font-size: 0.875rem;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        .tab-btn:hover { color: var(--text-primary); }
        .tab-btn.active {
          border-bottom-color: var(--primary-indigo);
          color: var(--primary-indigo);
        }
        
        .bg-navy-black { background-color: var(--bg-navy-black); }
        .text-primary-indigo { color: var(--primary-indigo); }
        
        @media(min-width: 768px) {
          .md-flex-row { flex-direction: row !important; }
          .md-items-center { align-items: center !important; }
          .md-gap-4 { gap: 1rem !important; }
          .md-block { display: block !important; }
          .md-text-sm { font-size: 0.875rem !important; }
        }
        @media(min-width: 1024px) {
          .lg-grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .lg-col-span-2 { grid-column: span 2 / span 2 !important; }
        }
      `}</style>
        </div>
    );
};

export default CBOMExplorer;
