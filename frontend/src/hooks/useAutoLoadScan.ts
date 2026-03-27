/**
 * useAutoLoadScan — Shared hook (Single Responsibility)
 * Automatically loads the most recent COMPLETED scan into the Zustand store
 * if no active scan is set yet. Never overwrites an already-active scan.
 */
import { useEffect, useState } from 'react';
import { useScanStore } from '../store';

export function useAutoLoadScan() {
  const { activeScanId, setActiveScan } = useScanStore();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (activeScanId || attempted) return;
    setAttempted(true);

    fetch('/api/v1/scans/?limit=20')
      .then(r => r.json())
      .then((scans: any[]) => {
        if (!Array.isArray(scans) || scans.length === 0) return;
        // Prefer the most recent completed scan; fall back to any scan
        const best =
          scans.find(s => s.status === 'completed') ?? scans[0];
        if (best?.scan_id && best?.domain) {
          setActiveScan(best.scan_id, best.domain);
        }
      })
      .catch(console.error);
  }, [activeScanId, setActiveScan, attempted]);
}
