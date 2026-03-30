import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scanApi, assetsApi, dashboardApi, cbomApi, certApi } from '@/api/client'
import { useScanStore } from '@/store'

// ── Scan hooks ────────────────────────────────────────────────────────────────

export function useScanStatus(scanId: string | null) {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => scanApi.getStatus(scanId!),
    enabled: !!scanId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      // Poll every 2s while running, stop when complete/failed
      return status === 'PENDING' || status === 'RUNNING' ? 2000 : false
    },
  })
}

export function useScanHistory(domain: string | null = null) {
  return useQuery({
    queryKey: ['scan-history', domain],
    queryFn: () => scanApi.list(domain || null),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const data = (query.state.data as any[]) ?? []
      const hasActive = data.some(s => {
        const st = s.status?.toUpperCase()
        return st === 'RUNNING' || st === 'PENDING'
      })
      return hasActive ? 3000 : false  // poll every 3s while active scans exist
    },
  })
}

export function useInitiateScan() {
  const qc = useQueryClient()
  const { setActiveScan } = useScanStore()
  return useMutation({
    mutationFn: ({ domain, crqc_scenario }: { domain: string; crqc_scenario?: string }) =>
      scanApi.initiate(domain, crqc_scenario),
    onSuccess: (data) => {
      setActiveScan(data.scan_id, data.domain)
      qc.invalidateQueries({ queryKey: ['scan-history'] })
    },
  })
}

// ── Asset hooks ───────────────────────────────────────────────────────────────

export function useAssets(scanId: string | null) {
  return useQuery({
    queryKey: ['assets', scanId],
    queryFn: () => assetsApi.getByScan(scanId!),
    enabled: !!scanId,
  })
}

export function useAssetDetail(assetId: string | null) {
  return useQuery({
    queryKey: ['asset-detail', assetId],
    queryFn: () => assetsApi.getDetail(assetId!),
    enabled: !!assetId,
  })
}

// ── Dashboard hooks ───────────────────────────────────────────────────────────

export function useDashboard(domain: string | null) {
  return useQuery({
    queryKey: ['dashboard', domain],
    queryFn: () => dashboardApi.getStats(domain!),
    enabled: !!domain,
  })
}

// ── CBOM hooks ────────────────────────────────────────────────────────────────

export function useCBOM(scanId: string | null) {
  return useQuery({
    queryKey: ['cbom', scanId],
    queryFn: () => cbomApi.get(scanId!),
    enabled: !!scanId,
  })
}

// ── Certificate hooks ─────────────────────────────────────────────────────────

export function useCertificates(scanId: string | null) {
  return useQuery({
    queryKey: ['certificates', scanId],
    queryFn: () => certApi.byScan(scanId!),
    enabled: !!scanId,
  })
}

export function useCertificateDetail(certId: string | null) {
  return useQuery({
    queryKey: ['certificate-detail', certId],
    queryFn: () => certApi.get(certId!),
    enabled: !!certId,
  })
}
