# Design Document — CBOM Data Sensitivity Tier

## Overview

This feature adds a `data_sensitivity_tier` classification to every CBOM asset entry in TRINETRA.
The tier (`transaction`, `authentication`, or `static`) drives the Mosca X factor in the HNDL
engine, grounding migration urgency in the actual regulatory data-retention obligations of the
intercepted data rather than certificate expiry alone.

The change touches six backend layers (config, detection, DB, scoring, CBOM, API) and one
frontend layer (dashboard badges, filters, tooltips). All new behaviour is additive — no
existing scan pipeline steps are removed.

### Key Design Decisions

- **Config-driven defaults**: shelf-life values and keyword lists live in YAML files under
  `config/`, not in Python constants. This lets bank deployments override values without a
  code release.
- **Synchronous re-score on PATCH**: the override endpoint recomputes scores inline so the
  response immediately reflects the new tier. Bulk re-scoring (e.g., rule changes across an
  asset class) uses the existing Celery pipeline.
- **Default tier is `static`**: when no keyword or asset-type rule fires, the tier defaults
  to `static` (shelf life = 0), making cert expiry the sole Mosca X driver — the safest
  conservative default.
- **Priority order**: `transaction` > `authentication` > `static`. The first matching
  keyword at the highest priority wins.

---

## Architecture

```mermaid
flowchart TD
    subgraph Config
        KW[config/sensitivity_keywords.yaml]
        DEF[config/sensitivity_defaults.yaml]
    end

    subgraph Discovery
        AC[asset_classifier.py] --> SD[SensitivityDetector]
        KW --> SD
        DEF --> SD
    end

    subgraph Analysis
        SD -->|tier + shelf_life| HE[hndl_engine.py\nMosca_X = max\\(cert_expiry, shelf_life\\)]
        SD -->|tier| ES[exposure_scorer.py\nsensitivity_tier_impact]
        HE --> CG[cbom_generator.py]
        ES --> CG
        SD -->|tier| MP[migration_planner.py\ncomplexity from tier]
    end

    subgraph Persistence
        CG -->|cbom_entry| DB[(scanned_assets\n+3 new columns)]
        ES -->|score_breakdown| DB
    end

    subgraph API
        DB --> PATCH[PATCH /assets/{id}/sensitivity-tier\nsync re-score]
        DB --> GET[GET /assets/{id}\nreturns tier fields]
    end

    subgraph Frontend
        GET --> Badge[SensitivityBadge]
        GET --> Tooltip[ScoreBreakdownTooltip]
        GET --> Filter[SensitivityFilter]
        PATCH --> Badge
    end
```

The `SensitivityDetector` is the single point of truth for tier assignment during a scan.
The PATCH endpoint is the only path for manual overrides post-scan.

---

## Components and Interfaces

### 1. Config Files

**`config/sensitivity_defaults.yaml`**
```yaml
# Regulated data shelf-life values (years) per sensitivity tier.
# Defaults reflect RBI Master Directions and DPDP Act minimums.
# Override per deployment without a code release.
shelf_life_years:
  transaction: 7.0      # RBI Master Directions / DPDP Act minimum
  authentication: 1.0
  static: 0.0
```

**`config/sensitivity_keywords.yaml`**
```yaml
# Keyword lists for auto-detection of data sensitivity tier.
# Keywords are matched case-insensitively against FQDN and URL path.
# Add keywords here; no code release required.
transaction:
  - payment
  - transaction
  - transfer
  - swift
  - sepa
  - fx
  - trade
  - clearing
  - settlement
  - core-banking
  - iso20022
  - rtgs
  - neft
  - imps
  - nostro
  - vostro
  - correspondent
  - reconciliation
  - custody
  - clearance
  - iban
  - bic

authentication:
  - auth
  - login
  - sso
  - oauth
  - oidc
  - identity
  - iam
  - mfa
  - token
  - session
```

### 2. SensitivityDetector (`backend/engine/discovery/sensitivity_detector.py`)

New component. Loaded once at startup; reads both YAML config files.

```python
@dataclass
class SensitivityResult:
    tier: str                    # "transaction" | "authentication" | "static"
    source: str                  # "auto_detected"
    shelf_life_years: float      # from sensitivity_defaults.yaml
    matched_keyword: Optional[str]  # keyword that triggered the match, if any
    match_reason: str            # human-readable explanation

class SensitivityDetector:
    def __init__(self, keywords_path: str, defaults_path: str): ...
    def detect(
        self,
        fqdn: str,
        asset_url: str,
        asset_type: str,
        jwt_algorithm: Optional[str] = None,
    ) -> SensitivityResult: ...
```

Detection priority (first match wins):
1. Keyword scan of `fqdn + asset_url` for `transaction` keywords → `transaction`
2. Keyword scan of `fqdn + asset_url` for `authentication` keywords → `authentication`
3. `asset_type in ("vpn_gateway", "ssh_endpoint")` → `authentication`
4. `asset_type == "api_endpoint"` and `jwt_algorithm` is not None → `authentication`
5. Default → `static`

### 3. DB Schema Changes (`backend/db/models.py` + Alembic migration)

Three new columns on `ScannedAsset`:

| Column | Type | Default | Notes |
|---|---|---|---|
| `data_sensitivity_tier` | `String(20)` | `"static"` | `transaction` \| `authentication` \| `static` |
| `data_sensitivity_tier_source` | `String(20)` | `"auto_detected"` | `auto_detected` \| `manual_override` |
| `sensitivity_override_reason` | `Text` | `NULL` | Free-text reason for manual overrides |

Alembic migration: `backend/db/migrations/versions/002_add_sensitivity_tier.py`
- Adds the three columns with server-side defaults
- Backfills existing rows: `data_sensitivity_tier = 'static'`, `data_sensitivity_tier_source = 'auto_detected'`
- Adds index on `data_sensitivity_tier` for dashboard filter queries

### 4. HNDL Engine Changes (`backend/engine/analysis/hndl_engine.py`)

The `calculate()` method already accepts `data_sensitivity_tier` and reads
`DATA_SENSITIVITY_SHELF_LIFE_YEARS` from `constants.py`. The change is:

- Read shelf-life from the loaded `SensitivityDetector` config (or `constants.py` as fallback)
  so the value is config-driven, not hardcoded.
- Add `data_shelf_life_years` field to `HNDLRiskResult` so it is visible in CBOM output.
- Enforce: when `data_sensitivity_tier == "transaction"` and `crqc_moderate - current_year <= 7`
  and `alg_risk > 5`, force `mosca_act_now = True`.

```python
@dataclass
class HNDLRiskResult:
    ...
    data_shelf_life_years: float   # NEW — shelf life used in Mosca X
    ...
```

### 5. Exposure Scorer Changes (`backend/engine/analysis/exposure_scorer.py`)

Add three fields to `ScoreBreakdown`:

```python
@dataclass
class ScoreBreakdown:
    ...
    data_sensitivity_tier: str          # NEW
    data_shelf_life_years: float        # NEW
    sensitivity_tier_impact: float      # NEW — HNDL score delta vs static baseline
    ...
```

`sensitivity_tier_impact` is computed as:
```
hndl_score_with_tier - hndl_score_with_static_baseline
```
where `hndl_score_with_static_baseline` uses `data_sensitivity_tier="static"` and the same
`cert_expiry_days` and `crqc_year`.

### 6. CBOM Generator Changes (`backend/engine/analysis/cbom_generator.py`)

`generate_asset_entry()` gains two new parameters:
- `data_sensitivity_tier_source: str = "auto_detected"`
- `data_shelf_life_years: float = 0.0`

The `hndl` section gains three new fields:
```json
{
  "data_sensitivity_tier": "transaction",
  "data_sensitivity_tier_source": "auto_detected",
  "data_shelf_life_years": 7.0
}
```

The `quantum_risk.score_breakdown.formula` annotation changes to:
```
"Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)"
```

`generate_organization_cbom()` gains a `sensitivity_distribution` field in
`organization_summary`:
```json
{
  "sensitivity_distribution": {
    "transaction": 12,
    "authentication": 34,
    "static": 8
  }
}
```

### 7. Migration Planner Changes (`backend/engine/analysis/migration_planner.py`)

`plan()` gains a `data_sensitivity_tier: str = "static"` parameter.

`MigrationPlan` gains two new fields:
```python
@dataclass
class MigrationPlan:
    ...
    data_sensitivity_tier: str   # NEW
    tier_rationale: str          # NEW — auditable explanation of complexity assignment
    ...
```

Tier-to-complexity override table (applied after algorithm-based rule lookup):

| Tier | Complexity | Additional steps |
|---|---|---|
| `transaction` | `HIGH` | encrypted transfer validation, full audit trail requirement, rollback checkpoint verification |
| `authentication` | `MEDIUM` | standard template |
| `static` | `LOW` | lightweight template |

The tier complexity overrides the algorithm-based complexity when the tier-driven complexity
is higher. This ensures transaction assets are never rated below HIGH regardless of algorithm.

### 8. PATCH Endpoint (`backend/api/routes/assets.py`)

New route added to the existing assets router:

```
PATCH /api/v1/assets/{asset_id}/sensitivity-tier
```

Request body (Pydantic schema):
```python
class SensitivityTierOverride(BaseModel):
    data_sensitivity_tier: Literal["transaction", "authentication", "static"]
    override_reason: Optional[str] = None
```

Response body includes the updated asset fields:
```json
{
  "asset_id": "...",
  "data_sensitivity_tier": "transaction",
  "data_sensitivity_tier_source": "manual_override",
  "quantum_exposure_score": 87.4,
  "risk_level": "CRITICAL",
  "hndl_deadline": "Q1 2027",
  "hndl_urgency": "IMMEDIATE",
  "score_breakdown": { ... },
  "mosca_x": 7.0,
  "mosca_act_now": true
}
```

The handler:
1. Loads the `ScannedAsset` record (404 if not found)
2. Validates the tier value (422 if invalid — handled by Pydantic `Literal`)
3. Instantiates `ExposureScorer` and `HNDLEngine` inline
4. Recomputes scores synchronously
5. Regenerates `cbom_entry` via `CBOMGenerator`
6. Persists all updated fields in a single DB write
7. Returns the updated score fields

### 9. Frontend Components (`frontend/src/`)

Three new components, all in TypeScript/React:

**`SensitivityBadge.tsx`** (`frontend/src/components/shared/`)
- Renders a colour-coded pill badge
- `transaction` → red (`#E24B4A`), `authentication` → amber (`#EF9F27`), `static` → grey (`#6B7280`)
- Shows a pencil icon overlay when `source === "manual_override"`

**`ScoreBreakdownTooltip.tsx`** (`frontend/src/components/shared/`)
- Hover/expand tooltip on an asset's score
- Shows `data_shelf_life_years`, `sensitivity_tier_impact`, and the updated formula annotation

**`SensitivityFilter.tsx`** (`frontend/src/components/shared/`)
- Multi-select filter control for the asset list
- Filters by `data_sensitivity_tier` value
- Integrates with existing asset list query params

These components are consumed by the existing `AssetCard.jsx` and the scan results page.

---

## Data Models

### ScannedAsset (updated)

```python
# New columns on existing model
data_sensitivity_tier: Mapped[str] = mapped_column(
    String(20), nullable=True, default="static"
)
data_sensitivity_tier_source: Mapped[str] = mapped_column(
    String(20), nullable=True, default="auto_detected"
)
sensitivity_override_reason: Mapped[Optional[str]] = mapped_column(
    Text, nullable=True
)
```

### SensitivityResult (new dataclass)

```python
@dataclass
class SensitivityResult:
    tier: str                       # "transaction" | "authentication" | "static"
    source: str                     # always "auto_detected" from detector
    shelf_life_years: float         # from config
    matched_keyword: Optional[str]  # first keyword that matched, or None
    match_reason: str               # e.g. "keyword 'payment' in fqdn"
```

### CBOM hndl section (updated shape)

```json
{
  "hndl_active": true,
  "primary_deadline": "Q1 2027",
  "data_sensitivity_tier": "transaction",
  "data_sensitivity_tier_source": "auto_detected",
  "data_shelf_life_years": 7.0,
  "mosca": {
    "act_now": true,
    "x_data_shelf_life_years": 7.0,
    "y_migration_time_years": 0.33,
    "z_years_to_crqc": 6.0
  }
}
```

### SensitivityTierOverride schema (new Pydantic model)

```python
class SensitivityTierOverride(BaseModel):
    data_sensitivity_tier: Literal["transaction", "authentication", "static"]
    override_reason: Optional[str] = Field(None, max_length=500)
```

### MigrationPlan (updated)

```python
@dataclass
class MigrationPlan:
    ...
    data_sensitivity_tier: str   # "transaction" | "authentication" | "static"
    tier_rationale: str          # e.g. "transaction tier → HIGH complexity (RBI 7-year retention)"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions
of a system — essentially, a formal statement about what the system should do. Properties
serve as the bridge between human-readable specifications and machine-verifiable correctness
guarantees.*

### Property 1: Tier Validation

*For any* string submitted as a `data_sensitivity_tier` value, the system shall accept it if
and only if it is one of `"transaction"`, `"authentication"`, or `"static"`. All other strings
shall be rejected with a validation error.

**Validates: Requirements 1.1, 1.4**

---

### Property 2: CBOM Sensitivity Fields Completeness

*For any* asset with any valid `data_sensitivity_tier`, the CBOM entry generated by
`CBOMGenerator.generate_asset_entry()` shall contain `data_sensitivity_tier`,
`data_sensitivity_tier_source`, and `data_shelf_life_years` fields in the `hndl` section.

**Validates: Requirements 2.1, 2.2, 2.3**

---

### Property 3: Organisation CBOM Sensitivity Distribution

*For any* list of asset CBOM entries with known tier values, the `sensitivity_distribution`
dict in the organisation-level CBOM shall contain counts that exactly match the number of
assets per tier in the input list.

**Validates: Requirements 2.4**

---

### Property 4: Keyword Detection Assigns Correct Tier

*For any* FQDN or URL that contains a keyword from the `transaction` keyword list,
`SensitivityDetector.detect()` shall return `tier = "transaction"` and
`source = "auto_detected"`. Likewise, for any FQDN or URL containing only an
`authentication` keyword (and no `transaction` keyword), the detector shall return
`tier = "authentication"`.

**Validates: Requirements 3.1, 3.2, 3.11**

---

### Property 5: Keyword Priority Ordering

*For any* FQDN or URL that contains keywords from both the `transaction` and `authentication`
lists, `SensitivityDetector.detect()` shall return `tier = "transaction"` (higher priority
wins).

**Validates: Requirements 3.10**

---

### Property 6: Asset-Type Detection

*For any* asset with `asset_type` in `{"vpn_gateway", "ssh_endpoint"}` and no keyword match,
`SensitivityDetector.detect()` shall return `tier = "authentication"`. For any
`api_endpoint` asset with a non-null `jwt_algorithm` and no keyword match, the detector
shall also return `tier = "authentication"`.

**Validates: Requirements 3.6, 3.7, 3.8**

---

### Property 7: PATCH Override Round-Trip

*For any* existing asset and any valid tier value, submitting a PATCH override shall result
in the stored `data_sensitivity_tier` equalling the submitted value,
`data_sensitivity_tier_source` equalling `"manual_override"`, and the response body
containing updated `quantum_exposure_score` and `hndl_deadline` values.

**Validates: Requirements 4.2, 4.3**

---

### Property 8: Invalid Tier Rejected with 422

*For any* string that is not one of the three valid tier values, submitting it to the PATCH
endpoint shall return HTTP 422 and the asset record shall remain unchanged.

**Validates: Requirements 4.5**

---

### Property 9: Mosca X Formula

*For any* `cert_expiry_days` value and any valid `data_sensitivity_tier`, the `mosca_x`
field in `HNDLRiskResult` shall equal
`max(cert_expiry_days / 365.0, shelf_life_years[tier])` where `shelf_life_years` is read
from `sensitivity_defaults.yaml`.

**Validates: Requirements 5.1, 5.5**

---

### Property 10: Transaction Tier Forces mosca_act_now

*For any* asset with `data_sensitivity_tier = "transaction"`, a non-PQC-safe algorithm
(risk score > 5), and a CRQC moderate year within 7 years of today,
`HNDLEngine.calculate()` shall return `mosca_act_now = True`.

**Validates: Requirements 5.6**

---

### Property 11: Score Breakdown Completeness

*For any* scored asset, the `ScoreBreakdown` returned by `ExposureScorer.score()` shall
contain `data_sensitivity_tier`, `data_shelf_life_years`, and `sensitivity_tier_impact`
fields with non-null values.

**Validates: Requirements 6.1, 6.2**

---

### Property 12: Migration Plan Tier Fields

*For any* asset passed to `MigrationPlanner.plan()` with a valid `data_sensitivity_tier`,
the returned `MigrationPlan` shall contain a non-empty `data_sensitivity_tier` field and a
non-empty `tier_rationale` string.

**Validates: Requirements 10.1, 10.5**

---

### Property 13: Tier-to-Complexity Mapping

*For any* asset with `data_sensitivity_tier = "transaction"`, the migration plan complexity
shall be `"HIGH"` and the steps list shall include encrypted transfer validation, audit trail,
and rollback checkpoint steps. For `"authentication"`, complexity shall be `"MEDIUM"`. For
`"static"`, complexity shall be `"LOW"`.

**Validates: Requirements 10.2, 10.3, 10.4**

---

### Property 14: CBOM Round-Trip

*For any* valid `data_sensitivity_tier` value, serialising a CBOM entry to JSON and then
deserialising it shall produce a dict with an identical `data_sensitivity_tier` value in the
`hndl` section.

**Validates: Requirements 11.1**

---

### Property 15: Score Consistency

*For any* `ScannedAsset` record, recomputing the HNDL urgency score using the
`data_sensitivity_tier` and `cert_expiry_days` stored in the record shall produce the same
value as the `hndl_timeline_raw` stored in `score_breakdown`.

**Validates: Requirements 11.2**

---

### Property 16: Override Idempotence

*For any* asset after a sensitivity-tier override has been applied, submitting the same
override a second time shall produce identical `quantum_exposure_score`, `hndl_deadline`,
and `cbom_entry` values as the first application.

**Validates: Requirements 11.3**

---

## Error Handling

| Scenario | Component | Behaviour |
|---|---|---|
| YAML config file missing at startup | `SensitivityDetector.__init__` | Log `CRITICAL`, fall back to hardcoded defaults from `constants.py`; do not crash the worker |
| YAML config file malformed | `SensitivityDetector.__init__` | Log `ERROR` with parse exception, fall back to hardcoded defaults |
| Unknown tier value in DB record | `HNDLEngine.calculate` | Treat as `"static"` (log `WARNING`); never raise |
| Invalid `asset_id` UUID format | PATCH endpoint | HTTP 400 |
| `asset_id` not found | PATCH endpoint | HTTP 404 |
| Invalid tier in PATCH body | PATCH endpoint | HTTP 422 (Pydantic `Literal` validation) |
| Score recomputation fails during PATCH | PATCH endpoint | HTTP 500, DB write rolled back, original record preserved |
| `cert_expiry_days` is None during scoring | `HNDLEngine` | Treat as 0 days (most conservative) |

---

## Testing Strategy

### Unit Tests

Focus on specific examples, edge cases, and error conditions:

- `SensitivityDetector`: test each keyword from the default lists, test asset-type rules,
  test priority ordering with conflicting keywords, test fallback to `static`.
- `HNDLEngine`: test Mosca X formula for each tier with known cert expiry values, test
  `mosca_act_now` forced-true condition for transaction tier.
- `ExposureScorer`: test `sensitivity_tier_impact` is zero for `static` baseline, positive
  for `transaction`.
- `CBOMGenerator`: test that all three new fields appear in the `hndl` section, test
  `sensitivity_distribution` counts in org CBOM.
- `MigrationPlanner`: test complexity override per tier, test `tier_rationale` is non-empty.
- PATCH endpoint: test 404 on missing asset, test 422 on invalid tier, test response body
  contains updated scores.

### Property-Based Tests

Using **Hypothesis** (Python). Each property test runs a minimum of **100 iterations**.
Each test is tagged with a comment referencing the design property.

```
# Feature: cbom-data-sensitivity-tier, Property N: <property_text>
```

| Property | Test description |
|---|---|
| P1 — Tier Validation | Generate arbitrary strings; assert only the three valid values pass `SensitivityTierOverride` validation |
| P2 — CBOM Fields Completeness | Generate random `ClassifiedAsset` + valid tier; assert all three sensitivity fields present in CBOM `hndl` section |
| P3 — Org CBOM Distribution | Generate random lists of assets with random valid tiers; assert `sensitivity_distribution` counts match |
| P4 — Keyword Detection | Generate FQDNs by embedding random keywords from the loaded lists; assert correct tier returned |
| P5 — Keyword Priority | Generate FQDNs containing both transaction and authentication keywords; assert `transaction` wins |
| P6 — Asset-Type Detection | Generate assets with `vpn_gateway`/`ssh_endpoint`/`api_endpoint` types and no keyword matches; assert `authentication` |
| P7 — PATCH Round-Trip | Generate valid asset records and valid tier values; assert stored tier matches submitted value after PATCH |
| P8 — Invalid Tier → 422 | Generate strings not in the valid set; assert PATCH returns 422 |
| P9 — Mosca X Formula | Generate random `cert_expiry_days` (0–3650) and valid tiers; assert `mosca_x == max(days/365, shelf_life[tier])` |
| P10 — Transaction mosca_act_now | Generate transaction-tier assets with non-PQC algorithms and CRQC year ≤ today+7; assert `mosca_act_now = True` |
| P11 — Score Breakdown Completeness | Generate random valid scoring inputs; assert all three sensitivity fields present in breakdown |
| P12 — Migration Plan Fields | Generate random assets with valid tiers; assert `data_sensitivity_tier` and `tier_rationale` non-empty |
| P13 — Tier-to-Complexity | Generate assets per tier; assert complexity and step content match tier rules |
| P14 — CBOM Round-Trip | Generate CBOM entries with random valid tiers; assert `json.loads(json.dumps(entry))["hndl"]["data_sensitivity_tier"]` equals original |
| P15 — Score Consistency | Generate `ScannedAsset`-like dicts; assert recomputed HNDL score equals stored `hndl_timeline_raw` |
| P16 — Override Idempotence | Apply same override twice; assert scores and `cbom_entry` are identical both times |

Each property-based test must be implemented as a **single** Hypothesis `@given` test.
Minimum `settings(max_examples=100)` per test.
