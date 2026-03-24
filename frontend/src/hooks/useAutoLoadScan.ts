/**
 * useAutoLoadScan — Shared hook (Single Responsibility)
 * Automatically loads the most recent scan into the Zustand store
 * if no active scan is set yet.
 */
import { useEffect, useState } from 'react';
import { useScanStore } from '../store';
import { scanApi } from '../api/client';

export function useAutoLoadScan() {
  const { activeScanId, setActiveScan } = useScanStore();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!activeScanId && !attempted) {
      setAttempted(true);
      scanApi.list('', 1)
        .then(res => {
          if (res && res.length > 0) setActiveScan(res[0].scan_id, res[0].domain);
        })
        .catch(console.error);
    }
  }, [activeScanId, setActiveScan, attempted]);
}
