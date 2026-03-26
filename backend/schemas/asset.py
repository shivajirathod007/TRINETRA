"""
TRINETRA — Asset Pydantic Schemas
Request/response models for asset endpoints.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Sensitivity Tier Override — PATCH /api/v1/assets/{asset_id}/sensitivity-tier
# ─────────────────────────────────────────────────────────────────────────────

class SensitivityTierOverride(BaseModel):
    """Request body for manually overriding an asset's data sensitivity tier."""
    data_sensitivity_tier: Literal["transaction", "authentication", "static"]
    override_reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional reason for the override, recorded for audit trail",
    )


class SensitivityTierOverrideResponse(BaseModel):
    """Response body after a successful sensitivity tier override."""
    asset_id: str
    data_sensitivity_tier: str
    data_sensitivity_tier_source: str       # always "manual_override"
    quantum_exposure_score: Optional[float]
    risk_level: Optional[str]
    hndl_deadline: Optional[str]
    hndl_urgency: Optional[str]
    mosca_x: Optional[float]
    mosca_act_now: Optional[bool]
    data_shelf_life_years: Optional[float]
    sensitivity_tier_impact: Optional[float]
    score_breakdown: Optional[dict]


# ─────────────────────────────────────────────────────────────────────────────
# Asset list / detail response extensions
# ─────────────────────────────────────────────────────────────────────────────

class AssetSensitivityFields(BaseModel):
    """Sensitivity tier fields included in asset list and detail responses."""
    data_sensitivity_tier: str = "static"
    data_sensitivity_tier_source: str = "auto_detected"
    data_shelf_life_years: float = 0.0
    sensitivity_tier_impact: Optional[float] = None
