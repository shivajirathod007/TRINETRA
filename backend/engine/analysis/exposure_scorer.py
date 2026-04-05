"""
TRINETRA — Quantum Exposure Scorer
Implements the QARS (Quantum-Adjusted Risk Score) formula.

Score = (Algorithm Risk × 40%) + (HNDL Timeline × 40%) + (Public Exposure × 20%)

Research basis:
  - QARS paper: MDPI Electronics, August 2025
  - CARAF: Oxford Journal of Cybersecurity, 2021
  - Mosca's Theorem: Michele Mosca, 2018
  - Europol Quantum Safe Financial Forum, January 2026
"""

from dataclasses import dataclass
from typing import Optional

from core.constants import (
    SCORE_WEIGHTS,
    PQC_SAFE_ALGORITHMS,
    PQC_HYBRID_INDICATORS,
    get_algorithm_risk,
    get_hndl_urgency_score,
    get_hndl_deadline_label,
    get_hndl_urgency_label,
    get_exposure_score,
    get_risk_tier,
    CERT_TIER_VULNERABLE,
    CERT_TIER_READY,
    CERT_TIER_SAFE,
    MIGRATION_NIST_MAP,
)
from core.logging import get_logger

log = get_logger(__name__)


@dataclass
class ScoreBreakdown:
    algorithm_risk_raw: float       # 0-100 from constants
    hndl_timeline_raw: float        # 0-100 from Mosca formula
    public_exposure_raw: float      # 0-100 from exposure table
    algorithm_risk_weighted: float  # × 0.40
    hndl_timeline_weighted: float   # × 0.40
    public_exposure_weighted: float # × 0.20
    final_score: float              # sum of weighted components
    weights: dict                   # SCORE_WEIGHTS snapshot
    # Sensitivity tier fields (Requirement 6.1, 6.2)
    data_sensitivity_tier: str = "static"       # tier used in this scoring run
    data_shelf_life_years: float = 0.0          # shelf-life used in Mosca X
    sensitivity_tier_impact: float = 0.0        # HNDL score delta vs static baseline


@dataclass
class ExposureScoreResult:
    # Input echo
    asset_url: str
    algorithm: str
    asset_type: str
    cert_expiry_days: int
    crqc_year: int
    # Score
    score: float
    risk_level: str                 # CRITICAL | HIGH | MEDIUM | LOW | SAFE
    breakdown: ScoreBreakdown
    # HNDL
    hndl_deadline: str             # "Q2 2027"
    hndl_urgency: str              # IMMEDIATE | URGENT | PLANNED | MONITOR
    # PQC classification
    quantum_safe_status: str       # VULNERABLE | PQC_READY | FULLY_QUANTUM_SAFE
    # NIST recommendation
    nist_recommendation: Optional[str]


class ExposureScorer:
    """
    Computes quantum exposure score for a single asset.
    All inputs are plain Python values — no ORM objects.
    """

    def score(
        self,
        asset_url: str,
        algorithm: str,
        asset_type: str,
        cert_expiry_days: int,
        crqc_year: int = 2032,
        is_shadow_asset: bool = False,
        key_exchange: Optional[str] = None,
        jwt_algorithm: Optional[str] = None,
        data_sensitivity_tier: str = "static",
        custom_override_status: Optional[str] = None,
    ) -> ExposureScoreResult:
        """
        Main scoring function.

        Args:
            asset_url:        Full URL of the scanned asset
            algorithm:        Primary crypto algorithm (cert signature algo)
            asset_type:       web_portal | api_endpoint | vpn_gateway | etc.
            cert_expiry_days: Days until certificate expires
            crqc_year:        Estimated CRQC arrival year (from settings)
            is_shadow_asset:  True = CT-log-discovered, not in bank's known list
            key_exchange:     Key exchange method (overrides algorithm for KEX risk)
            jwt_algorithm:    JWT signing algo if detected (RS256, HS256, etc.)
            data_sensitivity_tier: "transaction" | "authentication" | "static"

        Returns:
            ExposureScoreResult with score, breakdown, deadline, NIST recommendation
        """
        # ── Determine effective algorithm for scoring ─────────────────────────
        # Use the worst (highest risk) algorithm found across all detection sources.
        # Key exchange is usually more relevant than cert signature for quantum risk.
        effective_algorithm = self._worst_algorithm(
            algorithm, key_exchange, jwt_algorithm
        )

        # ── Factor 1: Algorithm Risk (0-100) ──────────────────────────────────
        alg_risk = float(get_algorithm_risk(effective_algorithm))

        # ── Factor 2: HNDL Timeline Urgency (0-100) ───────────────────────────
        hndl_score = float(get_hndl_urgency_score(cert_expiry_days, crqc_year, data_sensitivity_tier))

        # Compute sensitivity_tier_impact = delta vs static baseline
        hndl_score_static_baseline = float(get_hndl_urgency_score(cert_expiry_days, crqc_year, "static"))
        sensitivity_tier_impact = round(hndl_score - hndl_score_static_baseline, 1)

        # Resolve shelf-life for breakdown transparency
        try:
            from engine.discovery.sensitivity_detector import SensitivityDetector
            _detector = SensitivityDetector()
            shelf_life_years = _detector.get_shelf_life(data_sensitivity_tier.lower())
        except Exception:
            from core.constants import DATA_SENSITIVITY_SHELF_LIFE_YEARS
            shelf_life_years = DATA_SENSITIVITY_SHELF_LIFE_YEARS.get(data_sensitivity_tier.lower(), 0.0)

        # ── Factor 3: Public Exposure (0-100) ─────────────────────────────────
        exposure = float(get_exposure_score(asset_type, is_shadow_asset))

        # ── Weighted Sum ──────────────────────────────────────────────────────
        w = SCORE_WEIGHTS
        alg_weighted      = alg_risk  * w["algorithm_risk"]
        hndl_weighted     = hndl_score * w["hndl_timeline"]
        exposure_weighted = exposure   * w["public_exposure"]

        raw_score = alg_weighted + hndl_weighted + exposure_weighted
        final_score = round(min(100.0, max(0.0, raw_score)), 1)

        breakdown = ScoreBreakdown(
            algorithm_risk_raw=alg_risk,
            hndl_timeline_raw=hndl_score,
            public_exposure_raw=exposure,
            algorithm_risk_weighted=round(alg_weighted, 1),
            hndl_timeline_weighted=round(hndl_weighted, 1),
            public_exposure_weighted=round(exposure_weighted, 1),
            final_score=final_score,
            weights=dict(w),
            data_sensitivity_tier=data_sensitivity_tier,
            data_shelf_life_years=round(shelf_life_years, 2),
            sensitivity_tier_impact=sensitivity_tier_impact,
        )

        # ── Derived fields ────────────────────────────────────────────────────
        risk_level       = get_risk_tier(int(final_score))
        hndl_deadline    = get_hndl_deadline_label(cert_expiry_days, crqc_year, data_sensitivity_tier)
        hndl_urgency     = get_hndl_urgency_label(int(hndl_score))
        if custom_override_status:
            quantum_status   = custom_override_status
        else:
            quantum_status   = self._quantum_status(effective_algorithm, key_exchange)
        nist_rec         = self._nist_recommendation(effective_algorithm, key_exchange)

        log.info(
            "asset_scored",
            url=asset_url,
            algorithm=effective_algorithm,
            score=final_score,
            risk_level=risk_level,
            deadline=hndl_deadline,
        )

        return ExposureScoreResult(
            asset_url=asset_url,
            algorithm=effective_algorithm,
            asset_type=asset_type,
            cert_expiry_days=cert_expiry_days,
            crqc_year=crqc_year,
            score=final_score,
            risk_level=risk_level,
            breakdown=breakdown,
            hndl_deadline=hndl_deadline,
            hndl_urgency=hndl_urgency,
            quantum_safe_status=quantum_status,
            nist_recommendation=nist_rec,
        )

    def score_organization(self, asset_scores: list[float]) -> float:
        """
        Computes organization-level aggregate score.
        Weighted average — CRITICAL assets weighted 3×, HIGH 2×, others 1×.
        """
        if not asset_scores:
            return 0.0

        total_weight = 0.0
        weighted_sum = 0.0

        for s in asset_scores:
            tier = get_risk_tier(int(s))
            weight = {"CRITICAL": 3.0, "HIGH": 2.0}.get(tier, 1.0)
            weighted_sum += s * weight
            total_weight += weight

        return round(weighted_sum / total_weight, 1) if total_weight > 0 else 0.0

    def _worst_algorithm(
        self,
        cert_algorithm: str,
        key_exchange: Optional[str],
        jwt_algorithm: Optional[str],
    ) -> str:
        """
        Returns the algorithm with the highest risk score across all sources.
        This ensures we surface the worst cryptographic weakness, not just the cert.
        """
        candidates = [cert_algorithm]
        if key_exchange:
            candidates.append(key_exchange)
        if jwt_algorithm:
            candidates.append(jwt_algorithm)

        return max(candidates, key=lambda a: get_algorithm_risk(a or "UNKNOWN"))

    def _quantum_status(
        self, algorithm: str, key_exchange: Optional[str]
    ) -> str:
        """
        Determines PQC certificate tier based on algorithm.
        FULLY_QUANTUM_SAFE > PQC_READY (hybrid) > VULNERABLE
        """
        alg_upper = algorithm.upper()
        kex_upper = (key_exchange or "").upper()

        # Fully quantum safe: 100% NIST PQC algorithms
        if alg_upper in {a.upper() for a in PQC_SAFE_ALGORITHMS}:
            return CERT_TIER_SAFE

        # PQC Ready: hybrid mode detected
        if any(h.upper() in alg_upper or h.upper() in kex_upper
               for h in PQC_HYBRID_INDICATORS):
            return CERT_TIER_READY

        if "KYBER" in kex_upper or "ML-KEM" in kex_upper:
            # Still check if it's hybrid or pure
            if any(v in kex_upper for v in ["ECDHE", "X25519", "P256"]):
                return CERT_TIER_READY
            return CERT_TIER_SAFE

        return CERT_TIER_VULNERABLE

    def _nist_recommendation(
        self, algorithm: str, key_exchange: Optional[str]
    ) -> Optional[str]:
        """Returns NIST FIPS recommendation string for migration."""
        alg_upper = algorithm.upper()

        for prefix, recommendation in MIGRATION_NIST_MAP.items():
            if prefix.upper() in alg_upper:
                return recommendation

        if key_exchange:
            kex_upper = key_exchange.upper()
            for prefix, recommendation in MIGRATION_NIST_MAP.items():
                if prefix.upper() in kex_upper:
                    return recommendation

        return "Evaluate against NIST FIPS 203/204/205 standards"
