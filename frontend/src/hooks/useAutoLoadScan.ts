/**
 * useAutoLoadScan — Shared hook (Single Responsibility)
 * Automatically loads the most recent COMPLETED scan into the Zustand store
 * if no active scan is set yet. Never overwrites an already-active scan.
 */
import { useEffect, useState } from 'react';
import { useScanStore } from '../store';
import { scanApi } from '../api/client';

export function useAutoLoadScan() {
  const { activeScanId, setActiveScan } = useScanStore();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (activeScanId || attempted) return;
    setAttempted(true);

    scanApi.list(null, 20)
      .then((scans) => {
        if (!Array.isArray(scans) || scans.length === 0) return;
        const best =
          scans.find(s => String(s.status || '').toLowerCase() === 'completed') ?? scans[0];
        if (best?.scan_id && best?.domain) {
          setActiveScan(best.scan_id, best.domain);
        }
      })
      .catch(console.error);
  }, [activeScanId, setActiveScan, attempted]);
}
