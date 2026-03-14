"""
TRINETRA — Custom Exception Hierarchy

All exceptions inherit from TRINETRAError so callers can catch
the entire family with a single except clause.
"""

from typing import Optional


class TRINETRAError(Exception):
    """Base exception for all TRINETRA errors."""
    def __init__(self, message: str, detail: Optional[str] = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


# ─── Scan Errors ─────────────────────────────────────────────────────────────

class ScanError(TRINETRAError):
    """Raised when a scan job fails."""

class ScanNotFoundError(ScanError):
    """Raised when a scan job ID does not exist in the database."""

class ScanAlreadyRunningError(ScanError):
    """Raised when a duplicate scan is submitted for the same domain."""

class ScanTimeoutError(ScanError):
    """Raised when a scan exceeds the configured timeout."""


# ─── Discovery Errors ────────────────────────────────────────────────────────

class DiscoveryError(TRINETRAError):
    """Raised when asset discovery fails."""

class CTLogError(DiscoveryError):
    """Raised when crt.sh API is unreachable or returns unexpected data."""

class DNSResolutionError(DiscoveryError):
    """Raised when DNS resolution fails for a discovered subdomain."""

class PortScanError(DiscoveryError):
    """Raised when port scanning fails."""


# ─── Scanner Errors ──────────────────────────────────────────────────────────

class ScannerError(TRINETRAError):
    """Base class for individual scanner failures."""

class TLSScanError(ScannerError):
    """Raised when TLS scanning via SSLyze fails."""

class CertAnalysisError(ScannerError):
    """Raised when certificate chain parsing fails."""

class VPNDetectionError(ScannerError):
    """Raised when VPN fingerprinting fails."""

class APIInspectionError(ScannerError):
    """Raised when HTTP API inspection fails."""

class SSHProbeError(ScannerError):
    """Raised when SSH host key extraction fails."""

class ScanBlockedError(ScannerError):
    """
    Raised when a WAF or load balancer blocks the scan.
    Asset is marked as 'scan_blocked' in CBOM — not silently skipped.
    """


# ─── Analysis Errors ─────────────────────────────────────────────────────────

class AnalysisError(TRINETRAError):
    """Raised when risk analysis computation fails."""

class CBOMGenerationError(AnalysisError):
    """Raised when CycloneDX CBOM generation fails."""

class ScoringError(AnalysisError):
    """Raised when exposure score calculation fails."""

class HNDLEngineError(AnalysisError):
    """Raised when HNDL deadline calculation fails."""


# ─── Output Errors ───────────────────────────────────────────────────────────

class OutputError(TRINETRAError):
    """Raised when output generation fails."""

class CertificateIssuanceError(OutputError):
    """Raised when PQC certificate signing fails."""

class ReportGenerationError(OutputError):
    """Raised when PDF report generation fails."""


# ─── Validation Errors ───────────────────────────────────────────────────────

class ValidationError(TRINETRAError):
    """Raised for invalid inputs."""

class InvalidDomainError(ValidationError):
    """Raised when the submitted domain fails validation."""

class RateLimitExceededError(ValidationError):
    """Raised when scan rate limit is exceeded."""


# ─── Asset Errors ────────────────────────────────────────────────────────────

class AssetNotFoundError(TRINETRAError):
    """Raised when an asset ID does not exist."""
