/**
 * UI Consistency Preservation Tests
 *
 * These tests assert that functional behavior is UNCHANGED after the fix.
 * They PASS on both unfixed and fixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SensitivityBadge } from '../components/shared/SensitivityBadge'
import { RiskBadge } from '../components/shared'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

// ── Test 1 — RiskBadge label text preserved ───────────────────────────────────
describe('RiskBadge label text preserved for all risk levels', () => {
  const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as const
  levels.forEach(level => {
    it(`renders label "${level}" for level="${level}"`, () => {
      const { getByText } = render(<RiskBadge level={level} />)
      expect(getByText(level)).toBeTruthy()
    })
  })
})

// ── Test 2 — SensitivityBadge label text preserved ───────────────────────────
describe('SensitivityBadge label text preserved', () => {
  it('renders "Transaction" for tier=transaction', () => {
    const { getByText } = render(<SensitivityBadge tier="transaction" />)
    expect(getByText('Transaction')).toBeTruthy()
  })

  it('renders "Auth" for tier=authentication', () => {
    const { getByText } = render(<SensitivityBadge tier="authentication" />)
    expect(getByText('Auth')).toBeTruthy()
  })

  it('renders "Static" for tier=static', () => {
    const { getByText } = render(<SensitivityBadge tier="static" />)
    expect(getByText('Static')).toBeTruthy()
  })

  it('shows pencil icon when source=manual_override', () => {
    const { container } = render(
      <SensitivityBadge tier="transaction" source="manual_override" />
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('does not show pencil icon when source is not manual_override', () => {
    const { container } = render(<SensitivityBadge tier="transaction" />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
