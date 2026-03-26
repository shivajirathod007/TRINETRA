"""
TRINETRA — Sensitivity Detector
Infers data_sensitivity_tier from asset metadata (FQDN, URL path, asset type, JWT algorithm).

Tier values: "transaction" | "authentication" | "static"
Priority:    transaction > authentication > static

Config files (loaded at startup, no code release needed to update):
  config/sensitivity_keywords.yaml  — keyword lists per tier
  config/sensitivity_defaults.yaml  — shelf-life values per tier

Fallback: constants.DATA_SENSITIVITY_SHELF_LIFE_YEARS (if YAML missing/malformed)
"""

import os
from dataclasses import dataclass
from typing import Optional

import yaml

from core.constants import DATA_SENSITIVITY_SHELF_LIFE_YEARS
from core.logging import get_logger

log = get_logger(__name__)

# Resolve config paths relative to project root
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
DEFAULT_KEYWORDS_PATH = os.path.join(_PROJECT_ROOT, "config", "sensitivity_keywords.yaml")
DEFAULT_DEFAULTS_PATH = os.path.join(_PROJECT_ROOT, "config", "sensitivity_defaults.yaml")

# Asset types that always map to authentication tier (when no keyword match)
_AUTH_ASSET_TYPES = {"vpn_gateway", "ssh_endpoint"}


@dataclass
class SensitivityResult:
    tier: str                        # "transaction" | "authentication" | "static"
    source: str                      # always "auto_detected" from this detector
    shelf_life_years: float          # from config/sensitivity_defaults.yaml
    matched_keyword: Optional[str]   # first keyword that triggered the match, or None
    match_reason: str                # human-readable explanation for audit trail


class SensitivityDetector:
    """
    Single source of truth for data_sensitivity_tier assignment during a scan.
    Loaded once at startup; reads both YAML config files.
    Thread-safe for concurrent Celery workers (read-only after init).
    """

    def __init__(
        self,
        keywords_path: str = DEFAULT_KEYWORDS_PATH,
        defaults_path: str = DEFAULT_DEFAULTS_PATH,
    ) -> None:
        self._keywords: dict[str, list[str]] = self._load_keywords(keywords_path)
        self._shelf_life: dict[str, float] = self._load_shelf_life(defaults_path)

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def detect(
        self,
        fqdn: str,
        asset_url: str,
        asset_type: str,
        jwt_algorithm: Optional[str] = None,
    ) -> SensitivityResult:
        """
        Infers the data sensitivity tier for an asset.

        Priority chain (first match wins):
          1. transaction keyword in fqdn or asset_url
          2. authentication keyword in fqdn or asset_url
          3. asset_type in {vpn_gateway, ssh_endpoint}
          4. asset_type == api_endpoint AND jwt_algorithm is not None
          5. default → static

        Args:
            fqdn:          Fully-qualified domain name of the asset
            asset_url:     Full URL of the asset
            asset_type:    Asset type from AssetClassifier
            jwt_algorithm: JWT signing algorithm if detected (e.g. "RS256"), or None

        Returns:
            SensitivityResult with tier, source, shelf_life_years, matched_keyword, match_reason
        """
        haystack = f"{fqdn} {asset_url}".lower()

        # Step 1 — transaction keywords (highest priority)
        for kw in self._keywords.get("transaction", []):
            if kw.lower() in haystack:
                return self._result("transaction", kw, f"keyword '{kw}' matched in fqdn/url")

        # Step 2 — authentication keywords
        for kw in self._keywords.get("authentication", []):
            if kw.lower() in haystack:
                return self._result("authentication", kw, f"keyword '{kw}' matched in fqdn/url")

        # Step 3 — asset type rules (vpn_gateway, ssh_endpoint)
        if asset_type in _AUTH_ASSET_TYPES:
            return self._result(
                "authentication",
                None,
                f"asset_type '{asset_type}' implies authentication tier",
            )

        # Step 4 — api_endpoint with JWT detection
        if asset_type == "api_endpoint" and jwt_algorithm is not None:
            return self._result(
                "authentication",
                None,
                f"api_endpoint with jwt_algorithm '{jwt_algorithm}' detected",
            )

        # Step 5 — default
        return self._result("static", None, "no keyword or asset-type rule matched; defaulting to static")

    def get_shelf_life(self, tier: str) -> float:
        """Returns the configured shelf-life years for a given tier."""
        return self._shelf_life.get(tier, 0.0)

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _result(
        self,
        tier: str,
        matched_keyword: Optional[str],
        match_reason: str,
    ) -> SensitivityResult:
        return SensitivityResult(
            tier=tier,
            source="auto_detected",
            shelf_life_years=self._shelf_life.get(tier, 0.0),
            matched_keyword=matched_keyword,
            match_reason=match_reason,
        )

    def _load_keywords(self, path: str) -> dict[str, list[str]]:
        """
        Loads keyword lists from YAML. Falls back to empty lists on error.
        """
        try:
            with open(path, "r") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError("Expected a YAML mapping at top level")
            result: dict[str, list[str]] = {}
            for tier in ("transaction", "authentication"):
                raw = data.get(tier, [])
                if not isinstance(raw, list):
                    raise ValueError(f"Expected list for tier '{tier}', got {type(raw)}")
                result[tier] = [str(kw).lower() for kw in raw]
            log.info(
                "sensitivity_keywords_loaded",
                path=path,
                transaction_count=len(result.get("transaction", [])),
                authentication_count=len(result.get("authentication", [])),
            )
            return result
        except FileNotFoundError:
            log.critical("sensitivity_keywords_missing", path=path,
                         msg="Falling back to empty keyword lists — all assets will default to static")
            return {"transaction": [], "authentication": []}
        except Exception as exc:
            log.error("sensitivity_keywords_malformed", path=path, error=str(exc),
                      msg="Falling back to empty keyword lists")
            return {"transaction": [], "authentication": []}

    def _load_shelf_life(self, path: str) -> dict[str, float]:
        """
        Loads shelf-life values from YAML. Falls back to constants.py on error.
        """
        try:
            with open(path, "r") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, dict) or "shelf_life_years" not in data:
                raise ValueError("Expected 'shelf_life_years' mapping in YAML")
            raw = data["shelf_life_years"]
            result = {
                "transaction":    float(raw.get("transaction", 7.0)),
                "authentication": float(raw.get("authentication", 1.0)),
                "static":         float(raw.get("static", 0.0)),
            }
            log.info("sensitivity_defaults_loaded", path=path, values=result)
            return result
        except FileNotFoundError:
            log.critical("sensitivity_defaults_missing", path=path,
                         msg="Falling back to constants.DATA_SENSITIVITY_SHELF_LIFE_YEARS")
            return dict(DATA_SENSITIVITY_SHELF_LIFE_YEARS)
        except Exception as exc:
            log.error("sensitivity_defaults_malformed", path=path, error=str(exc),
                      msg="Falling back to constants.DATA_SENSITIVITY_SHELF_LIFE_YEARS")
            return dict(DATA_SENSITIVITY_SHELF_LIFE_YEARS)
