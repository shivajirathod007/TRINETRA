# Requirements Document

## Introduction

This feature adds a `data_sensitivity_tier` field to every CBOM asset entry in TRINETRA.
The tier classifies how sensitive the data protected by a given cryptographic asset is —
Transaction, Authentication, or Static — and feeds directly into the HNDL timeline urgency
component of the QARS exposure score. This makes scores more defensible to regulators and
enterprise buyers by grounding the Mosca X factor (data shelf life) in the actual regulatory
retention obligations of the intercepted data, not just the certificate expiry window.

Research basis:
- QARS paper (MDPI Electronics, August 2025)
- Europol Quantum Safe Financial Forum framework (January 2026)
- Mosca's Theorem (Michele Mosca, 2018)
- NIST SP 1800-38B (2023): Cryptographic Discovery guidance

---

## Glossary

- **CBOM**: Cryptographic Bill of Materials — a CycloneDX 1.6 JSON document recording every
  cryptographic asset discovered during a TRINETRA scan.
- **Data_Sensitivity_Tier**: A classification of how sensitive the data protected by a
  cryptographic asset is. One of: `transaction`, `authentication`, or `static`.
- **HNDL_Engine**: The TRINETRA module (`hndl_engine.py`) that applies Mosca's theorem to
  compute per-asset migration deadlines.
- **Exposure_Scorer**: The TRINETRA module (`exposure_scorer.py`) that computes the QARS
  quantum exposure score using the formula:
  `Score = (Algorithm Risk × 40%) + (HNDL Timeline Urgency × 40%) + (Public Exposure × 20%)`.
- **Mosca_X**: The data shelf life input to Mosca's inequality — how long intercepted data
  must remain secret. Expressed in years.
- **CRQC**: Cryptographically Relevant Quantum Computer — the threat model for HNDL attacks.
- **Asset_Classifier**: The TRINETRA module (`asset_classifier.py`) that determines asset type
  from port scan results and HTTP fingerprinting.
- **Auto_Detector**: The sub-component responsible for inferring `data_sensitivity_tier` from
  asset metadata (FQDN, asset type, URL path, API findings) without human input.
- **ScannedAsset**: The PostgreSQL ORM model representing one discovered endpoint.
- **Scan_API**: The TRINETRA FastAPI backend that exposes scan results to the dashboard and
  external consumers.
- **Dashboard**: The TRINETRA React frontend that visualises scan results for bank security teams.

---

## Requirements

### Requirement 1: Data Sensitivity Tier Taxonomy

**User Story:** As a bank security analyst, I want each CBOM asset to carry a data sensitivity
tier, so that I can understand which assets protect the most sensitive data and prioritise
quantum migration accordingly.

#### Acceptance Criteria

1. THE Data_Sensitivity_Tier SHALL be one of exactly three values: `transaction`,
   `authentication`, or `static`.
2. THE Data_Sensitivity_Tier SHALL map to a regulated data shelf life in years:
   `transaction` → 7 years (RBI Master Directions / DPDP Act minimum), `authentication` → 1 year,
   `static` → 0 years (no regulated retention obligation).
3. THE shelf life values in criterion 2 SHALL be configurable defaults stored in a deployment
   configuration file (e.g., `config/sensitivity_defaults.yaml`), not hardcoded constants.
   The shipped defaults SHALL reflect RBI Master Directions and DPDP Act minimums. Individual
   bank deployments MAY override these values to reflect stricter internal retention policies
   without requiring a code release.
4. WHEN a Data_Sensitivity_Tier value is stored or transmitted, THE System SHALL reject any
   value outside the three permitted values and return a validation error.
5. THE System SHALL treat `static` as the default Data_Sensitivity_Tier when no other value
   can be determined.

---

### Requirement 2: CBOM Schema Extension

**User Story:** As a compliance officer, I want the CBOM document to include the data
sensitivity tier for each asset, so that the CBOM is auditable and defensible to regulators.

#### Acceptance Criteria

1. THE CBOM_Generator SHALL include a `data_sensitivity_tier` field in the `hndl` section of
   every per-asset CBOM entry.
2. THE CBOM_Generator SHALL include a `data_sensitivity_tier_source` field alongside it,
   recording whether the value was `auto_detected` or `manual_override`.
3. THE CBOM_Generator SHALL include a `data_shelf_life_years` field in the `hndl` section,
   recording the numeric shelf life value that was used in the Mosca X calculation.
4. WHEN an organisation-level CBOM is generated, THE CBOM_Generator SHALL include a
   `sensitivity_distribution` summary in `organization_summary`, counting assets per tier.
5. THE System SHALL store the `data_sensitivity_tier` and `data_sensitivity_tier_source` values
   in the `ScannedAsset` database record for each asset.

---

### Requirement 3: Auto-Detection of Data Sensitivity Tier

**User Story:** As a security engineer, I want TRINETRA to automatically infer the data
sensitivity tier from asset metadata, so that scans produce meaningful scores without requiring
manual classification of every asset.

#### Acceptance Criteria

1. WHEN an asset's FQDN or URL path contains any keyword from the `transaction` keyword list,
   THE Auto_Detector SHALL assign `data_sensitivity_tier = transaction`.
2. WHEN an asset's FQDN or URL path contains any keyword from the `authentication` keyword list,
   THE Auto_Detector SHALL assign `data_sensitivity_tier = authentication`.
3. THE keyword lists SHALL be stored in an external configuration file
   (e.g., `config/sensitivity_keywords.yaml`), not hardcoded in source code, so that adding
   a new keyword requires only a config file change and no code release.
4. THE shipped default `transaction` keyword list SHALL include at minimum: `payment`,
   `transaction`, `transfer`, `swift`, `sepa`, `fx`, `trade`, `clearing`, `settlement`,
   `core-banking`, `iso20022`, `rtgs`, `neft`, `imps`, `nostro`, `vostro`, `correspondent`,
   `reconciliation`, `custody`, `clearance`, `iban`, `bic`.
5. THE shipped default `authentication` keyword list SHALL include at minimum: `auth`, `login`,
   `sso`, `oauth`, `oidc`, `identity`, `iam`, `mfa`, `token`, `session`.
6. WHEN an asset's `asset_type` is `api_endpoint` and the asset carries a JWT algorithm
   detection (RS256, ES256, PS256, or equivalent), THE Auto_Detector SHALL assign
   `data_sensitivity_tier = authentication` if no higher-priority keyword match applies.
7. WHEN an asset's `asset_type` is `vpn_gateway`, THE Auto_Detector SHALL assign
   `data_sensitivity_tier = authentication`.
8. WHEN an asset's `asset_type` is `ssh_endpoint`, THE Auto_Detector SHALL assign
   `data_sensitivity_tier = authentication`.
9. WHEN no keyword match or asset-type rule produces a tier, THE Auto_Detector SHALL assign
   `data_sensitivity_tier = static`.
10. WHEN multiple keyword rules match the same asset, THE Auto_Detector SHALL apply the
    highest-priority tier in the order: `transaction` > `authentication` > `static`.
11. THE Auto_Detector SHALL record `data_sensitivity_tier_source = auto_detected` for all
    values it assigns.

---

### Requirement 4: Manual Override of Data Sensitivity Tier

**User Story:** As a bank security analyst, I want to manually override the auto-detected
sensitivity tier for any asset, so that I can correct misclassifications and ensure the score
reflects the bank's own data classification policy.

#### Acceptance Criteria

1. THE Scan_API SHALL expose a PATCH endpoint at
   `/api/v1/assets/{asset_id}/sensitivity-tier` that accepts a `data_sensitivity_tier` value
   and an optional `override_reason` string.
2. WHEN a valid override is submitted, THE Scan_API SHALL update the `data_sensitivity_tier`
   and set `data_sensitivity_tier_source = manual_override` on the `ScannedAsset` record.
3. WHEN a valid override is submitted, THE Scan_API SHALL synchronously re-compute the
   HNDL timeline urgency score and the QARS exposure score for that asset and return the
   updated scores in the response body. Bulk re-scoring jobs (e.g., when a threshold or rule
   changes across an asset class) SHALL use the Celery async pipeline instead.
4. WHEN a valid override is submitted, THE Scan_API SHALL update the `cbom_entry` JSON stored
   on the `ScannedAsset` record to reflect the new tier and recalculated scores.
5. IF an invalid `data_sensitivity_tier` value is submitted, THEN THE Scan_API SHALL return
   HTTP 422 with a descriptive validation error message.
6. IF the `asset_id` does not exist, THEN THE Scan_API SHALL return HTTP 404.
7. THE Scan_API SHALL record the `override_reason` in the `ScannedAsset` record when provided.

---

### Requirement 5: HNDL Timeline Urgency Calculation with Sensitivity Tier

**User Story:** As a risk analyst, I want the HNDL urgency score to reflect the data
sensitivity tier, so that payment APIs with 7-year retention obligations score higher urgency
than static assets with no retention obligation.

#### Acceptance Criteria

1. WHEN computing the HNDL timeline urgency score, THE HNDL_Engine SHALL use
   `Mosca_X = max(cert_expiry_years, data_shelf_life_years)` where `data_shelf_life_years`
   is the regulated shelf life for the asset's `data_sensitivity_tier`.
2. WHEN `data_sensitivity_tier = transaction`, THE HNDL_Engine SHALL use
   `data_shelf_life_years = 7.0` in the Mosca X calculation.
3. WHEN `data_sensitivity_tier = authentication`, THE HNDL_Engine SHALL use
   `data_shelf_life_years = 1.0` in the Mosca X calculation.
4. WHEN `data_sensitivity_tier = static`, THE HNDL_Engine SHALL use
   `data_shelf_life_years = 0.0` in the Mosca X calculation, making cert expiry the sole
   driver of Mosca X.
5. THE HNDL_Engine SHALL record the `data_shelf_life_years` value used in the
   `HNDLRiskResult` so it is visible in the CBOM and score breakdown.
6. WHEN `data_sensitivity_tier = transaction` and the CRQC moderate scenario is within
   7 years, THE HNDL_Engine SHALL set `mosca_act_now = True` regardless of cert expiry,
   unless the asset's algorithm risk score is 5 or below (PQC-safe).

---

### Requirement 6: Exposure Score Breakdown Transparency

**User Story:** As a regulator or enterprise buyer, I want the exposure score breakdown to
show the sensitivity tier and its effect on the HNDL component, so that I can audit how the
score was derived.

#### Acceptance Criteria

1. THE Exposure_Scorer SHALL include `data_sensitivity_tier` and `data_shelf_life_years` in
   the `score_breakdown` dict returned in `ExposureScoreResult`.
2. THE Exposure_Scorer SHALL include a `sensitivity_tier_impact` field in the breakdown,
   expressing the difference in HNDL timeline score between the actual tier and the `static`
   baseline (i.e., how many points the tier added to the HNDL component).
3. THE CBOM_Generator SHALL include the full `score_breakdown` dict — including sensitivity
   fields — in the `quantum_risk.score_breakdown` section of the CBOM entry.
4. THE System SHALL update the formula annotation in the CBOM to read:
   `"Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)"`.

---

### Requirement 7: API Response Schema

**User Story:** As a frontend developer or API consumer, I want the asset detail and CBOM
endpoints to return the sensitivity tier and its scoring impact, so that I can display it in
the dashboard and integrate it into downstream tooling.

#### Acceptance Criteria

1. THE Scan_API SHALL include `data_sensitivity_tier`, `data_sensitivity_tier_source`, and
   `data_shelf_life_years` in the asset detail response schema.
2. THE Scan_API SHALL include `sensitivity_tier_impact` from the score breakdown in the asset
   detail response.
3. WHEN the CBOM export endpoint is called, THE Scan_API SHALL return a CBOM document that
   includes `data_sensitivity_tier` and `data_sensitivity_tier_source` for every component.
4. THE Scan_API SHALL include a `sensitivity_distribution` summary (count per tier) in the
   scan summary and organisation CBOM responses.

---

### Requirement 8: Dashboard Visualisation

**User Story:** As a bank CISO, I want to see the data sensitivity tier displayed alongside
each asset's risk score in the dashboard, so that I can quickly identify which high-risk assets
also protect the most sensitive data.

#### Acceptance Criteria

1. THE Dashboard SHALL display the `data_sensitivity_tier` as a colour-coded badge on each
   asset row: `transaction` → red badge, `authentication` → amber badge, `static` → grey badge.
2. THE Dashboard SHALL display a tooltip or expandable detail showing `data_shelf_life_years`
   and `sensitivity_tier_impact` when a user hovers over or expands an asset's score breakdown.
3. THE Dashboard SHALL display a sensitivity distribution summary (count per tier) on the scan
   results overview page.
4. WHEN `data_sensitivity_tier_source = manual_override`, THE Dashboard SHALL display a visual
   indicator (e.g., pencil icon) to distinguish manually overridden tiers from auto-detected ones.
5. THE Dashboard SHALL provide a filter control allowing users to filter the asset list by
   `data_sensitivity_tier`.

---

### Requirement 9: Database Migration

**User Story:** As a platform engineer, I want the database schema to be updated via a
versioned Alembic migration, so that the new fields are added safely without data loss.

#### Acceptance Criteria

1. THE System SHALL add a `data_sensitivity_tier` column (String, nullable, default `static`)
   to the `scanned_assets` table via an Alembic migration.
2. THE System SHALL add a `data_sensitivity_tier_source` column (String, nullable,
   default `auto_detected`) to the `scanned_assets` table in the same migration.
3. THE System SHALL add a `sensitivity_override_reason` column (Text, nullable) to the
   `scanned_assets` table in the same migration.
4. WHEN the migration is applied to an existing database, THE System SHALL set
   `data_sensitivity_tier = static` and `data_sensitivity_tier_source = auto_detected` for
   all existing rows.
5. THE System SHALL add a database index on `data_sensitivity_tier` to support dashboard
   filter queries.

---

### Requirement 10: Sensitivity Tier in Migration Plan Output

**User Story:** As a bank security engineer, I want the migration plan for each asset to
reflect its data sensitivity tier, so that the migration steps and complexity rating are
appropriate for the data the asset protects.

#### Acceptance Criteria

1. THE PQC_Migration_Planner SHALL include the asset's `data_sensitivity_tier` in the
   migration plan output for every asset.
2. WHEN `data_sensitivity_tier = transaction`, THE PQC_Migration_Planner SHALL assign
   migration complexity `HIGH` and SHALL include the following additional steps in the
   migration template: encrypted transfer validation, full audit trail requirement, and
   rollback checkpoint verification.
3. WHEN `data_sensitivity_tier = authentication`, THE PQC_Migration_Planner SHALL assign
   migration complexity `MEDIUM` and SHALL use the standard migration template.
4. WHEN `data_sensitivity_tier = static`, THE PQC_Migration_Planner SHALL assign migration
   complexity `LOW` and SHALL use a lightweight migration template with no special handling.
5. THE migration plan output SHALL include a `tier_rationale` field explaining why the
   complexity rating was assigned, traceable to the asset's tier — so that every migration
   decision is auditable and not left to the engineer's judgment at migration time.
6. THE PQC_Migration_Planner SHALL read migration template definitions from the external
   configuration file (consistent with Requirement 1 criterion 3), so that template changes
   do not require a code release.

---

### Requirement 11: Round-Trip Consistency

**User Story:** As a QA engineer, I want the sensitivity tier to survive serialisation and
deserialisation through the CBOM pipeline without mutation, so that exported CBOMs are
consistent with what is stored in the database.

#### Acceptance Criteria

1. FOR ALL valid `data_sensitivity_tier` values, parsing a CBOM entry then re-serialising it
   SHALL produce a CBOM entry with an identical `data_sensitivity_tier` value (round-trip
   property).
2. FOR ALL valid `data_sensitivity_tier` values, the HNDL urgency score computed from a
   `ScannedAsset` record SHALL equal the score computed from the corresponding CBOM entry's
   `hndl` section (consistency property).
3. WHEN a `data_sensitivity_tier` override is applied and scores are recomputed, THE System
   SHALL store the updated `cbom_entry` such that re-reading the record and re-computing the
   score produces the same result (idempotence property).
