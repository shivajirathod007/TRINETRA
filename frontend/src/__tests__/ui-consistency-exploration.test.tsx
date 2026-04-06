/**
 * UI Consistency Bug Condition Exploration Tests
 *
 * These tests assert the FIXED / expected behavior.
 * They FAIL on unfixed code (confirming bugs exist) and PASS after the fix.
 *
 * Validates: Requirements 1.1, 1.2, 1.5, 1.6, 1.8
 */

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { SensitivityBadge } from '../components/shared/SensitivityBadge'
import { RiskBadge } from '../components/shared'
import { AssetTable } from '../components/dashboard'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// ── Test 1 — Badge shape: shared RiskBadge must use rounded-full ──────────────
// Bug: AssetInventoryPage local RiskBadge uses `rounded` (not `rounded-full`).
// Fix: Remove local RiskBadge; all usages use shared component with `rounded-full`.
// After fix: AssetInventoryPage no longer defines a local RiskBadge with `rounded`.

describe('Test 1 — AssetInventoryPage local RiskBadge removed (uses shared rounded-full)', () => {
  it('shared RiskBadge renders with rounded-full class for CRITICAL', () => {
    const { container } = render(<RiskBadge level="CRITICAL" />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('rounded-full')
  })

  it('AssetInventoryPage source no longer contains a local RiskBadge with rounded (not rounded-full)', () => {
    // After fix: the local RiskBadge component (which uses `rounded` without `rounded-full`)
    // should be removed from AssetInventoryPage.tsx.
    // We verify by checking the source does not contain the local inline-style RiskBadge pattern.
    const src = readFileSync(
      resolve(__dirname, '../pages/AssetInventoryPage.tsx'),
      'utf-8'
    )
    // The local RiskBadge uses: className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
    // After fix this component should be deleted. Assert the local definition is gone.
    expect(src).not.toContain("px-2 py-0.5 rounded text-xs font-bold")
  })
})

// ── Test 2 — SensitivityBadge: no inline backgroundColor after fix ────────────
// Bug: SensitivityBadge uses style={{ backgroundColor: '#E24B4A' }} inline hex.
// Fix: Replace with Tailwind classes (bg-risk-critical/20 etc.), no inline style.
// This test FAILS on unfixed code (style.backgroundColor is '#E24B4A').
// It PASSES after fix (no inline backgroundColor).

describe('Test 2 — SensitivityBadge uses no inline backgroundColor style', () => {
  it('SensitivityBadge tier=transaction has no inline backgroundColor style', () => {
    const { container } = render(<SensitivityBadge tier="transaction" />)
    const badge = container.querySelector('span')!
    // After fix: backgroundColor should be empty (Tailwind class used instead)
    expect(badge.style.backgroundColor).toBe('')
  })

  it('SensitivityBadge tier=authentication has no inline backgroundColor style', () => {
    const { container } = render(<SensitivityBadge tier="authentication" />)
    const badge = container.querySelector('span')!
    expect(badge.style.backgroundColor).toBe('')
  })

  it('SensitivityBadge tier=static has no inline backgroundColor style', () => {
    const { container } = render(<SensitivityBadge tier="static" />)
    const badge = container.querySelector('span')!
    expect(badge.style.backgroundColor).toBe('')
  })
})

// ── Test 3 — AssetTable header tr has bg-surface-card-hover ──────────────────
// Bug: dashboard/index.tsx AssetTable header <tr> has no bg-surface-card-hover.
// Fix: Add bg-surface-card-hover to the header <tr>.
// This test FAILS on unfixed code (class is absent).
// It PASSES after fix (class is present).

describe('Test 3 — AssetTable header tr has bg-surface-card-hover', () => {
  const mockAssets = [
    {
      id: 'a1',
      fqdn: 'example.com',
      asset_type: 'web_portal',
      quantum_exposure_score: 75,
      risk_level: 'CRITICAL',
      quantum_safe_status: 'QUANTUM_VULNERABLE',
      hndl_deadline: '2030-01-01',
      cert_algorithm: 'RSA-SHA256',
      cert_expiry_days: 30,
      is_shadow_asset: false,
    },
  ]

  it('AssetTable header <tr> has bg-surface-card-hover class', () => {
    const { container } = render(<AssetTable assets={mockAssets as any} />)
    const thead = container.querySelector('thead')!
    const headerRow = thead.querySelector('tr')!
    expect(headerRow.className).toContain('bg-surface-card-hover')
  })
})

// ── Test 4 — DiscoveryPage DomainsTable td uses px-4 (not px-5) ──────────────
// Bug: DiscoveryPage DomainsTable <td> elements use px-5 py-3.5 (non-canonical).
// Fix: Change to px-4 py-3 (canonical scale).
// DomainsTable is not exported, so we inspect the source file directly.
// This test FAILS on unfixed code (source contains px-5 py-3.5 on td elements).
// It PASSES after fix (source uses px-4 py-3).

describe('Test 4 — DiscoveryPage DomainsTable td uses canonical px-4 py-3 padding', () => {
  it('DiscoveryPage source does not contain px-5 py-3.5 on td elements', () => {
    const src = readFileSync(
      resolve(__dirname, '../pages/DiscoveryPage.tsx'),
      'utf-8'
    )
    // After fix: all <td> padding changed from px-5 py-3.5 to px-4 py-3
    expect(src).not.toContain('px-5 py-3.5')
  })

  it('DiscoveryPage source contains px-4 py-3 on td elements after fix', () => {
    const src = readFileSync(
      resolve(__dirname, '../pages/DiscoveryPage.tsx'),
      'utf-8'
    )
    // After fix: canonical padding px-4 py-3 is used
    expect(src).toContain('px-4 py-3')
  })
})
