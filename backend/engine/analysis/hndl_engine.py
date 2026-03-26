"""
TRINETRA — HNDL Time-to-Risk Engine
Implements Mosca's theorem for per-asset migration deadline calculation.

Mosca's inequality: X + Y > Z → act now
  X = data shelf life (how long intercepted data must stay secret)
  Y = migration time (sprints to complete PQC upgrade)
  Z = years until CRQC arrives

For TRINETRA's banking context:
  X = certificate expiry window (data encrypted under this cert)
  Y = estimated migration sprints (from migration planner)
  Z = CRQC arrival year (configurable: pessimistic/moderate/optimistic)

Research basis:
  - Mosca (2018): "Cybersecurity in an Era with Quantum Computers"
  - NIST IR 8547 (2024): Algorithm transition guidance
  - NSA CNSA 2.0 (2022): Phase-out schedule
  - IBM Quantum Roadmap (2023): CRQC timeline estimates
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from core.config import settings
from core.constants import get_algorithm_risk
from core.logging import get_logger

log = get_logger(__name__)

# Estimated migration time in months per complexity tier
MIGRATION_TIME_MONTHS = {
    "simple":   2,   # Single endpoint, standard cipher change
    "moderate": 4,   # Multiple dependencies, config changes
    "complex":  8,   # Legacy systems, custom crypto, HSM changes
    "critical": 12,  # Core banking infrastructure, regulatory approval needed
}


@dataclass
class HNDLRiskResult:
    asset_url: str

    # Mosca inputs
    cert_expiry_days: int
    crqc_year_pessimistic: int
    crqc_year_moderate: int
    crqc_year_optimistic: int
    estimated_migration_months: int

    # Per-scenario deadlines
    deadline_pessimistic: str    # "Q2 2026" — based on 2028 CRQC
    deadline_moderate: str       # "Q2 2027" — based on 2032 CRQC
    deadline_optimistic: str     # "Q4 2028" — based on 2037 CRQC

    # Primary deadline (moderate scenario, default)
    primary_deadline: str
    days_until_deadline: int
    deadline_passed: bool

    # Mosca inequality result
    mosca_act_now: bool          # True = Mosca says migration is urgent
    mosca_x: float               # Data shelf life in years
    mosca_y: float               # Migration time in years
    mosca_z: float               # Years to CRQC (moderate)

    # Urgency
    urgency_level: str           # IMMEDIATE | URGENT | PLANNED | MONITOR
    urgency_message: str         # Human-readable explanation

    # Data sensitivity
    data_sensitivity_tier: str       # "transaction" | "authentication" | "static"
    data_shelf_life_years: float     # shelf-life used in Mosca X (from config)

    # Data at risk
    data_decryptable_in_years: Optional[float]   # Approx when intercepted traffic becomes readable
    hndl_active: bool            # True = adversaries likely storing traffic NOW


class HNDLEngine:
    """
    Calculates per-asset HNDL risk and migration deadlines.
    """

    def calculate(
        self,
        asset_url: str,
        algorithm: str,
        cert_expiry_days: int,
        asset_complexity: str = "moderate",
        crqc_pessimistic: Optional[int] = None,
        crqc_moderate: Optional[int] = None,
        crqc_optimistic: Optional[int] = None,
        data_sensitivity_tier: str = "static",
    ) -> HNDLRiskResult:
        """
        Calculates HNDL risk and deadlines for a single asset.

        Args:
            asset_url:          Asset URL for logging
            algorithm:          Primary cryptographic algorithm detected
            cert_expiry_days:   Days until certificate expires
            asset_complexity:   simple | moderate | complex | critical
            crqc_*:             Override CRQC year scenarios (defaults to settings)

        Returns:
            HNDLRiskResult with all three scenario deadlines + primary deadline
        """
        today = date.today()
        current_year = today.year

        # CRQC years — use settings defaults if not overridden
        crqc_p = crqc_pessimistic or settings.crqc_pessimistic_year   # 2028
        crqc_m = crqc_moderate    or settings.crqc_moderate_year       # 2032
        crqc_o = crqc_optimistic  or settings.crqc_optimistic_year     # 2037

        # Algorithm risk — if algorithm is already PQC-safe, deadlines are relaxed
        alg_risk = get_algorithm_risk(algorithm)
        is_pqc_safe = alg_risk <= 5

        # ── Mosca inputs ──────────────────────────────────────────────────────
        # Read shelf-life from SensitivityDetector config if available,
        # otherwise fall back to constants.DATA_SENSITIVITY_SHELF_LIFE_YEARS
        try:
            from engine.discovery.sensitivity_detector import SensitivityDetector
            _detector = SensitivityDetector()
            regulated_shelf_life = _detector.get_shelf_life(data_sensitivity_tier.lower())
        except Exception:
            from core.constants import DATA_SENSITIVITY_SHELF_LIFE_YEARS
            regulated_shelf_life = DATA_SENSITIVITY_SHELF_LIFE_YEARS.get(data_sensitivity_tier.lower(), 0.0)

        # X: data shelf life = max(cert expiry window, regulated shelf life)
        mosca_x = max(cert_expiry_days / 365.0, regulated_shelf_life)

        # Y: migration time in years
        migration_months = MIGRATION_TIME_MONTHS.get(asset_complexity, 4)
        mosca_y = migration_months / 12.0

        # Z: years to CRQC (moderate scenario)
        mosca_z = float(crqc_m - current_year)

        # Mosca inequality: X + Y > Z means act now
        mosca_act_now = (mosca_x + mosca_y) > mosca_z and not is_pqc_safe

        # Forced mosca_act_now for transaction tier:
        # When data shelf life is 7 years and CRQC moderate is within 7 years,
        # act now regardless of cert expiry — unless already PQC-safe (alg_risk <= 5)
        if (
            data_sensitivity_tier.lower() == "transaction"
            and (crqc_m - current_year) <= 7
            and alg_risk > 5
        ):
            mosca_act_now = True

        # ── Per-scenario deadlines ─────────────────────────────────────────────
        deadline_p = self._compute_deadline(today, mosca_x, crqc_p, migration_months)
        deadline_m = self._compute_deadline(today, mosca_x, crqc_m, migration_months)
        deadline_o = self._compute_deadline(today, mosca_x, crqc_o, migration_months)

        primary_deadline = deadline_m
        deadline_date = self._deadline_to_date(primary_deadline)
        days_until = (deadline_date - today).days if deadline_date else 0
        deadline_passed = days_until < 0

        # ── When will intercepted traffic become readable? ────────────────────
        # HNDL: traffic intercepted TODAY becomes decryptable when CRQC arrives
        data_decryptable_in_years = float(crqc_m - current_year) if not is_pqc_safe else None

        # HNDL is "active" if the asset uses quantum-vulnerable crypto
        hndl_active = alg_risk >= 70

        # ── Urgency classification ─────────────────────────────────────────────
        urgency_level, urgency_message = self._classify_urgency(
            days_until, mosca_act_now, is_pqc_safe, deadline_passed
        )

        result = HNDLRiskResult(
            asset_url=asset_url,
            cert_expiry_days=cert_expiry_days,
            crqc_year_pessimistic=crqc_p,
            crqc_year_moderate=crqc_m,
            crqc_year_optimistic=crqc_o,
            estimated_migration_months=migration_months,
            deadline_pessimistic=deadline_p,
            deadline_moderate=deadline_m,
            deadline_optimistic=deadline_o,
            primary_deadline=primary_deadline,
            days_until_deadline=max(days_until, 0),
            deadline_passed=deadline_passed,
            mosca_act_now=mosca_act_now,
            mosca_x=round(mosca_x, 2),
            mosca_y=round(mosca_y, 2),
            mosca_z=round(mosca_z, 2),
            urgency_level=urgency_level,
            urgency_message=urgency_message,
            data_decryptable_in_years=data_decryptable_in_years,
            hndl_active=hndl_active,
            data_sensitivity_tier=data_sensitivity_tier,
            data_shelf_life_years=round(regulated_shelf_life, 2),
        )

        log.info(
            "hndl_calculated",
            url=asset_url,
            algorithm=algorithm,
            deadline=primary_deadline,
            urgency=urgency_level,
            mosca_act_now=mosca_act_now,
        )
        return result

    def _compute_deadline(
        self,
        today: date,
        effective_x_years: float,
        crqc_year: int,
        migration_months: int,
    ) -> str:
        """
        Compute migration deadline for a specific CRQC scenario.

        Logic:
        - The migration must complete BEFORE the data shelf life ends
        - AND BEFORE CRQC arrives (quantum deadline)
        - We use whichever comes first, then subtract migration time

        Returns quarter string: "Q2 2027"
        """
        today_year = today.year
        years_to_crqc = crqc_year - today_year

        # Hard deadline = min(data shelf life, CRQC arrival)
        hard_deadline_years = min(effective_x_years, years_to_crqc)

        # Migration must start at: hard_deadline - migration_time
        start_migration_years = max(0, hard_deadline_years - (migration_months / 12.0))

        # Migration completes at hard_deadline → label it as completion target
        target_years = hard_deadline_years * 0.85  # 85% of window = target completion
        target_date = today + timedelta(days=target_years * 365)

        quarter = (target_date.month - 1) // 3 + 1
        return f"Q{quarter} {target_date.year}"

    def _deadline_to_date(self, deadline_str: str) -> Optional[date]:
        """Converts "Q2 2027" to approximate date (end of that quarter)."""
        try:
            parts = deadline_str.split()
            q = int(parts[0][1])
            year = int(parts[1])
            month = q * 3
            return date(year, month, 28)
        except Exception:
            return None

    def _classify_urgency(
        self,
        days_until: int,
        mosca_act_now: bool,
        is_pqc_safe: bool,
        deadline_passed: bool,
    ) -> tuple[str, str]:
        """Returns (urgency_level, urgency_message)."""

        if is_pqc_safe:
            return (
                "MONITOR",
                "Asset uses NIST-standardized PQC algorithms. Continue monitoring for standard updates."
            )

        if deadline_passed:
            return (
                "IMMEDIATE",
                "Migration deadline has passed. Asset is actively HNDL-exposed. Escalate to CISO immediately."
            )

        if days_until <= 180:
            return (
                "IMMEDIATE",
                f"Migration deadline in {days_until} days. HNDL exposure is active. Begin migration this sprint."
            )

        if days_until <= 365 or mosca_act_now:
            return (
                "URGENT",
                f"Migration deadline in {days_until // 30} months. Include in next security budget cycle."
            )

        if days_until <= 730:
            return (
                "PLANNED",
                f"Migration deadline in {days_until // 365:.1f} years. Include in technology roadmap."
            )

        return (
            "MONITOR",
            f"Migration deadline in {days_until // 365:.1f} years. Begin planning phase."
        )
