import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RiskLevel, AssetType, CRQCScenario } from '@/types'

// ── Active Scan Store ─────────────────────────────────────────────────────────

interface ScanStore {
  activeScanId: string | null
  activeDomain: string | null
  setActiveScan: (scanId: string, domain: string) => void
  clearActiveScan: () => void
}

export const useScanStore = create<ScanStore>()(
  persist(
    (set) => ({
      activeScanId: null,
      activeDomain: null,
      setActiveScan: (scanId, domain) =>
        set({ activeScanId: scanId, activeDomain: domain }),
      clearActiveScan: () =>
        set({ activeScanId: null, activeDomain: null }),
    }),
    { name: 'trinetra-scan' }
  )
)

// ── Dashboard Filter Store ────────────────────────────────────────────────────

interface DashboardStore {
  filterRisk: RiskLevel | 'ALL'
  filterType: AssetType | 'ALL'
  filterShadow: boolean
  sortBy: 'score' | 'expiry' | 'fqdn'
  sortDir: 'desc' | 'asc'
  setFilterRisk: (r: RiskLevel | 'ALL') => void
  setFilterType: (t: AssetType | 'ALL') => void
  setFilterShadow: (v: boolean) => void
  setSortBy: (s: 'score' | 'expiry' | 'fqdn') => void
  toggleSortDir: () => void
  resetFilters: () => void
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  filterRisk: 'ALL',
  filterType: 'ALL',
  filterShadow: false,
  sortBy: 'score',
  sortDir: 'desc',
  setFilterRisk: (r) => set({ filterRisk: r }),
  setFilterType: (t) => set({ filterType: t }),
  setFilterShadow: (v) => set({ filterShadow: v }),
  setSortBy: (s) => set({ sortBy: s }),
  toggleSortDir: () => set((st) => ({ sortDir: st.sortDir === 'desc' ? 'asc' : 'desc' })),
  resetFilters: () => set({ filterRisk: 'ALL', filterType: 'ALL', filterShadow: false }),
}))

// ── Settings Store ────────────────────────────────────────────────────────────

interface SettingsStore {
  crqcScenario: CRQCScenario
  setCrqcScenario: (s: CRQCScenario) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      crqcScenario: 'moderate',
      setCrqcScenario: (s) => set({ crqcScenario: s }),
    }),
    { name: 'trinetra-settings' }
  )
)
