# Implementation Plan: CBOM Data Sensitivity Tier

## Overview

Add `data_sensitivity_tier` classification (`transaction` | `authentication` | `static`) to
every CBOM asset entry. The tier drives the Mosca X factor in the HNDL engine, grounding
migration urgency in regulatory data-retention obligations. Implementation follows the
dependency order: config → detector → DB → ORM → engine updates → schemas → API → tests → frontend.

## Tasks

- [x] 1. Create config files for sensitivity tier defaults and keywords
  - Create `config/sensitivity_defaults.yaml` with shelf-life values per tier
    (`transaction: 7.0`, `authentication: 1.0`, `static: 0.0`)
  - Create `config/sensitivity_keywords.yaml` with the full `transaction` and
    `authentication` keyword lists from the design document
  - _Requirements: 1.2, 1.3, 3.3, 3.4, 3.5, 10.6_

- [x] 2. Implement `SensitivityDetector` in `backend/engine/discovery/sensitivity_detector.py`
  - [x] 2.1 Implement `SensitivityResult` dataclass and `SensitivityDetector` class
    - Load both YAML config files in `__init__`; fall back to `constants.DATA_SENSITIVITY_SHELF_LIFE_YEARS`
      on missing/malformed YAML (log CRITICAL/ERROR, do not crash)
    - Implement `detect(fqdn, asset_url, asset_type, jwt_algorithm)` with the five-step
      priority chain from the design: transaction keywords → authentication keywords →
      vpn_gateway/ssh_endpoint type → api_endpoint+jwt → default static
    - Record `matched_keyword` and `match_reason` in the result
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [ ]* 2.2 Write property test for keyword detection assigns correct tier (Property 4)
    - **Property 4: Keyword Detection Assigns Correct Tier**
    - **Validates: Requirements 3.1, 3.2, 3.11**

  - [ ]* 2.3 Write property test for keyword priority ordering (Property 5)
    - **Property 5: Keyword Priority Ordering**
    - **Validates: Requirements 3.10**

  - [ ]* 2.4 Write property test for asset-type detection (Property 6)
    - **Property 6: Asset-Type Detection**
    - **Validates: Requirements 3.6, 3.7, 3.8**

- [x] 3. Add Alembic migration `002_add_sensitivity_tier.py`
  - Create `backend/db/migrations/versions/002_add_sensitivity_tier.py`
    with `down_revision = "001"`
  - `upgrade()`: add `data_sensitivity_tier` (String(20), server_default `'static'`),
    `data_sensitivity_tier_source` (String(20), server_default `'auto_detected'`),
    `sensitivity_override_reason` (Text, nullable) to `scanned_assets`
  - Backfill existing rows to `static` / `auto_detected`
  - Add index on `data_sensitivity_tier`
  - `downgrade()`: drop the three columns and index
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. Update `ScannedAsset` ORM model in `backend/db/models.py`
  - Add three `mapped_column` fields mirroring the migration:
    `data_sensitivity_tier`, `data_sensitivity_tier_source`, `sensitivity_override_reason`
  - _Requirements: 2.5, 9.1, 9.2, 9.3_

- [x] 5. Update `HNDLEngine` in `backend/engine/analysis/hndl_engine.py`
  - [x] 5.1 Add `data_shelf_life_years: float` field to `HNDLRiskResult`
    - Read shelf-life from `SensitivityDetector` config (or `constants.py` fallback)
      instead of inline dict lookup
    - Enforce forced `mosca_act_now = True` for transaction tier when
      `crqc_moderate - current_year <= 7` and `alg_risk > 5`
    - Populate `data_shelf_life_years` in the returned result
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.2 Write property test for Mosca X formula (Property 9)
    - **Property 9: Mosca X Formula**
    - **Validates: Requirements 5.1, 5.5**

  - [ ]* 5.3 Write property test for transaction tier forces mosca_act_now (Property 10)
    - **Property 10: Transaction Tier Forces mosca_act_now**
    - **Validates: Requirements 5.6**

- [x] 6. Update `ExposureScorer` in `backend/engine/analysis/exposure_scorer.py`
  - [x] 6.1 Add `data_sensitivity_tier`, `data_shelf_life_years`, and `sensitivity_tier_impact`
    fields to `ScoreBreakdown`
    - Compute `sensitivity_tier_impact` as
      `hndl_score_with_tier - hndl_score_with_static_baseline`
    - Populate all three fields in `ExposureScorer.score()`
    - _Requirements: 6.1, 6.2_

  - [ ]* 6.2 Write property test for score breakdown completeness (Property 11)
    - **Property 11: Score Breakdown Completeness**
    - **Validates: Requirements 6.1, 6.2**

- [x] 7. Update `CBOMGenerator` in `backend/engine/analysis/cbom_generator.py`
  - [x] 7.1 Add `data_sensitivity_tier_source` and `data_shelf_life_years` parameters to
    `generate_asset_entry()`
    - Populate `data_sensitivity_tier_source` and `data_shelf_life_years` in the `hndl`
      section alongside the existing `data_sensitivity_tier` field
    - Update the `formula` annotation in `quantum_risk.score_breakdown` to the
      sensitivity-adjusted string from the design
    - _Requirements: 2.1, 2.2, 2.3, 6.3, 6.4_

  - [x] 7.2 Add `sensitivity_distribution` to `generate_organization_cbom()`
    - Count assets per tier from `asset_entries` and add to `organization_summary`
    - _Requirements: 2.4_

  - [ ]* 7.3 Write property test for CBOM sensitivity fields completeness (Property 2)
    - **Property 2: CBOM Sensitivity Fields Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 7.4 Write property test for organisation CBOM sensitivity distribution (Property 3)
    - **Property 3: Organisation CBOM Sensitivity Distribution**
    - **Validates: Requirements 2.4**

  - [ ]* 7.5 Write property test for CBOM round-trip (Property 14)
    - **Property 14: CBOM Round-Trip**
    - **Validates: Requirements 11.1**

- [x] 8. Update `MigrationPlanner` in `backend/engine/analysis/migration_planner.py`
  - [x] 8.1 Add `data_sensitivity_tier: str = "static"` parameter to `plan()`
    - Add `data_sensitivity_tier` and `tier_rationale` fields to `MigrationPlan` dataclass
    - Implement tier-to-complexity override table: `transaction` → HIGH (with encrypted
      transfer validation, audit trail, rollback checkpoint steps), `authentication` → MEDIUM,
      `static` → LOW; override algorithm-based complexity when tier-driven complexity is higher
    - Populate `tier_rationale` with an auditable explanation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 8.2 Write property test for migration plan tier fields (Property 12)
    - **Property 12: Migration Plan Tier Fields**
    - **Validates: Requirements 10.1, 10.5**

  - [ ]* 8.3 Write property test for tier-to-complexity mapping (Property 13)
    - **Property 13: Tier-to-Complexity Mapping**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 9. Checkpoint — Ensure all engine-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Wire `SensitivityDetector` into the scan pipeline
  - In `backend/workers/tasks/analysis_tasks.py` (or wherever `AssetClassifier` results
    are consumed), instantiate `SensitivityDetector` and call `detect()` for each asset
  - Pass the resulting `tier` and `shelf_life_years` through to `HNDLEngine.calculate()`,
    `ExposureScorer.score()`, `CBOMGenerator.generate_asset_entry()`, and
    `MigrationPlanner.plan()`
  - Persist `data_sensitivity_tier`, `data_sensitivity_tier_source`, and
    `sensitivity_override_reason` on the `ScannedAsset` record
  - _Requirements: 2.5, 3.11_

- [x] 11. Add Pydantic schemas for the PATCH endpoint
  - In `backend/schemas/asset.py`, add:
    - `SensitivityTierOverride(BaseModel)` with `data_sensitivity_tier: Literal[...]`
      and `override_reason: Optional[str] = Field(None, max_length=500)`
    - `SensitivityTierOverrideResponse(BaseModel)` with `asset_id`, `data_sensitivity_tier`,
      `data_sensitivity_tier_source`, `quantum_exposure_score`, `risk_level`,
      `hndl_deadline`, `hndl_urgency`, `score_breakdown`, `mosca_x`, `mosca_act_now`
  - Update the asset list/detail response schemas to include `data_sensitivity_tier`,
    `data_sensitivity_tier_source`, `data_shelf_life_years`, and `sensitivity_tier_impact`
  - _Requirements: 1.4, 4.1, 7.1, 7.2_

  - [ ]* 11.1 Write property test for tier validation (Property 1)
    - **Property 1: Tier Validation**
    - **Validates: Requirements 1.1, 1.4**

- [x] 12. Implement PATCH endpoint in `backend/api/routes/assets.py`
  - Add `PATCH /api/v1/assets/{asset_id}/sensitivity-tier` route
  - Handler steps: load asset (404 if missing), validate tier via Pydantic Literal (422 if
    invalid), recompute scores synchronously with `ExposureScorer` + `HNDLEngine`,
    regenerate `cbom_entry` via `CBOMGenerator`, persist all updated fields in a single DB
    write (roll back on scorer failure), return `SensitivityTierOverrideResponse`
  - Update `GET /api/v1/assets/{asset_id}` response to include the three new sensitivity
    fields and `sensitivity_tier_impact`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.1, 7.2_

  - [ ]* 12.1 Write property test for PATCH override round-trip (Property 7)
    - **Property 7: PATCH Override Round-Trip**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 12.2 Write property test for invalid tier rejected with 422 (Property 8)
    - **Property 8: Invalid Tier Rejected with 422**
    - **Validates: Requirements 4.5**

  - [ ]* 12.3 Write property test for override idempotence (Property 16)
    - **Property 16: Override Idempotence**
    - **Validates: Requirements 11.3**

  - [ ]* 12.4 Write property test for score consistency (Property 15)
    - **Property 15: Score Consistency**
    - **Validates: Requirements 11.2**

- [x] 13. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement frontend `SensitivityBadge` component
  - Create `frontend/src/components/shared/SensitivityBadge.tsx`
  - Render a colour-coded pill: `transaction` → `#E24B4A`, `authentication` → `#EF9F27`,
    `static` → `#6B7280`
  - Show a pencil icon overlay when `source === "manual_override"`
  - _Requirements: 8.1, 8.4_

- [x] 15. Implement frontend `ScoreBreakdownTooltip` component
  - Create `frontend/src/components/shared/ScoreBreakdownTooltip.tsx`
  - Hover/expand tooltip showing `data_shelf_life_years`, `sensitivity_tier_impact`, and
    the updated formula annotation
  - _Requirements: 8.2_

- [x] 16. Implement frontend `SensitivityFilter` component and wire into asset list
  - Create `frontend/src/components/shared/SensitivityFilter.tsx`
  - Multi-select filter control that appends `data_sensitivity_tier` query param to the
    asset list request
  - Add `patchSensitivityTier(assetId, tier, reason)` function to `frontend/src/api/cbom.ts`
  - Integrate `SensitivityBadge`, `ScoreBreakdownTooltip`, and `SensitivityFilter` into
    `frontend/src/components/AssetCard.jsx` and the scan results page
  - _Requirements: 7.4, 8.3, 8.5_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property-based tests use Hypothesis with `settings(max_examples=100)` minimum
- Each property test must include the comment:
  `# Feature: cbom-data-sensitivity-tier, Property N: <property_text>`
- The `SensitivityDetector` is the single source of truth for tier assignment during a scan;
  the PATCH endpoint is the only path for post-scan manual overrides
- Bulk re-scoring (e.g., rule changes across an asset class) uses the existing Celery pipeline
  and is out of scope for this feature
