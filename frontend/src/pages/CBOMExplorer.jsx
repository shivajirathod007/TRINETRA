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
    { name: 'TLS 1.3', value: 16, color: '#22C55E' },
    { name: 'TLS 1.2', value: 18, color: '#EAB308' },
    { name: 'TLS 1.1', value: 3, color: '#F97316' },
    { name: 'TLS 1.0', value: 1, color: '#EF4444' },
];

const CBOMExplorer = () => {
    const [view, setView] = useState('table'); // 'table', 'json', 'summary'

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">

            {/* Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827] p-4 rounded-lg border border-[#1F2937]">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h1 className="text-xl font-bold">Cryptographic Bill of Materials</h1>
                    <div className="hidden md:block text-[#374151]">|</div>
                    <span className="text-[#9CA3AF] font-mono text-sm">Target: <span className="text-[#F9FAFB]">pnb.in</span></span>
                    <span className="text-[#9CA3AF] font-mono text-sm">Standard: <span className="text-[#F9FAFB]">CycloneDX 1.5</span></span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><FileJson size={14} /> Export JSON</button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><FileJson size={14} /> Export XML</button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><Download size={14} /> Export PDF</button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#374151] rounded hover:bg-[#1F2937] transition-colors"><Copy size={14} /> Copy</button>
                </div>
            </div>

            {/* View Toggles */}
            <div className="flex gap-2 border-b border-[#1F2937]">
                <button
                    onClick={() => setView('table')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${view === 'table' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                >
                    <Table size={16} /> Table View
                </button>
                <button
                    onClick={() => setView('json')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${view === 'json' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                >
                    <FileJson size={16} /> JSON View
                </button>
                <button
                    onClick={() => setView('summary')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${view === 'summary' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'}`}
                >
                    <BarChart2 size={16} /> Summary View
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 glass-card border-[#1F2937] flex flex-col overflow-hidden">

                {view === 'table' && (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1e293b] text-[#9CA3AF] text-xs uppercase font-semibold sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Asset URL</th>
                                    <th className="px-6 py-3">TLS</th>
                                    <th className="px-6 py-3">Cipher Suite</th>
                                    <th className="px-6 py-3">Key Exchange</th>
                                    <th className="px-6 py-3">Cert Algo</th>
                                    <th className="px-6 py-3">Expiry</th>
                                    <th className="px-6 py-3">Issuer</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {mockCboms.map(cbom => (
                                    <tr key={cbom.id} className="hover:bg-[#1e293b] transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium">{cbom.url}</td>
                                        <td className="px-6 py-4 font-mono">{cbom.tls}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{cbom.cipher}</td>
                                        <td className="px-6 py-4 font-mono">{cbom.kx}</td>
                                        <td className="px-6 py-4 font-mono">{cbom.cert}</td>
                                        <td className="px-6 py-4 font-mono text-[#9CA3AF]">{cbom.expiry}</td>
                                        <td className="px-6 py-4 text-[#9CA3AF]">{cbom.issuer}</td>
                                        <td className="px-6 py-4">
                                            <ThreatBadge level={cbom.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'json' && (
                    <div className="flex-1 overflow-auto p-4 bg-[#0A0D14]">
                        <pre className="font-mono text-xs md:text-sm text-[#9CA3AF] leading-relaxed">
                            <code dangerouslySetInnerHTML={{
                                __html: mockJson
                                    .replace(/"(.*?)":/g, '<span class="text-[#6366F1]">"$1"</span>:')
                                    .replace(/: "(.*?)"/g, ': <span class="text-[#22C55E]">"$1"</span>')
                                    .replace(/: ([0-9]+)/g, ': <span class="text-[#F97316]">$1</span>')
                            }} />
                        </pre>
                    </div>
                )}

                {view === 'summary' && (
                    <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6">
                            <h3 className="text-sm font-bold mb-6 text-[#9CA3AF] uppercase">Certificate Algorithm Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={algoData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0A0D14', border: '1px solid #1F2937', color: '#fff' }} />
                                        <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6">
                            <h3 className="text-sm font-bold mb-6 text-[#9CA3AF] uppercase">TLS Version Distribution</h3>
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
                                        <Tooltip contentStyle={{ backgroundColor: '#0A0D14', border: '1px solid #1F2937', color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Custom Legend */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                                    {tlsData.map(d => (
                                        <div key={d.name} className="flex items-center gap-2 text-sm font-mono">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                            <span className="text-[#F9FAFB]">{d.name}</span>
                                            <span className="text-[#9CA3AF] ml-2">({d.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6 lg:col-span-2">
                            <h3 className="text-sm font-bold mb-6 text-[#9CA3AF] uppercase">Issuer Breakdown</h3>
                            <div className="flex gap-4">
                                <div className="flex-1 bg-[#0A0D14] border border-[#1F2937] rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-[#F9FAFB] mb-1">24</div>
                                    <div className="text-xs text-[#9CA3AF] uppercase">DigiCert Inc</div>
                                </div>
                                <div className="flex-1 bg-[#0A0D14] border border-[#1F2937] rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-[#F9FAFB] mb-1">11</div>
                                    <div className="text-xs text-[#9CA3AF] uppercase">Let's Encrypt</div>
                                </div>
                                <div className="flex-1 bg-[#0A0D14] border border-[#1F2937] rounded p-4 text-center">
                                    <div className="text-3xl font-bold font-mono text-[#F9FAFB] mb-1">3</div>
                                    <div className="text-xs text-[#9CA3AF] uppercase">Self-Signed / Internal</div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};

export default CBOMExplorer;
