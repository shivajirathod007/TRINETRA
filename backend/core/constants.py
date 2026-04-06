"""
TRINETRA — Core Constants
All scoring weights, algorithm mappings, and reference data live here.
One source of truth — nothing hardcoded elsewhere.

Sources:
  - NIST IR 8547 (2024) — algorithm security levels
  - NSA CNSA 2.0 (2022) — migration timeline
  - IBM Quantum Roadmap (2023) — CRQC estimates
  - NIST FIPS 203/204/205 (August 2024) — PQC standards
"""

from datetime import date


# ─────────────────────────────────────────────────────────────────────────────
# ALGORITHM RISK WEIGHTS (0–100)
# Higher = more quantum-vulnerable
# Source: NIST IR 8547, NSA CNSA 2.0 guidance
# ─────────────────────────────────────────────────────────────────────────────

ALGORITHM_RISK_WEIGHTS: dict[str, int] = {
    # ── Already classically broken ───────────────────────────────────────────
    "RSA-512":              100,
    "RSA-768":              100,
    "RSA-1024":             100,   # NIST deprecated in 2011
    "DH-512":               100,
    "DH-768":               100,
    "RC4":                  100,
    "DES":                  100,
    "3DES":                 100,
    "MD5":                  100,
    "CLEARTEXT":            100,   # No encryption at all
    "SHA1":                  95,

    # ── Quantum-vulnerable (will be broken by CRQC) ──────────────────────────
    "RSA-2048":              90,   # Most common in legacy banking systems
    "RSA-3072":              80,
    "RSA-4096":              75,
    "ECDSA-256":             85,   # Elliptic curve — quantum-vulnerable
    "ECDSA-384":             75,
    "ECDSA-521":             70,
    "ECDHE":                 85,   # Key exchange — quantum-vulnerable
    "ECDHE-P256":            85,
    "ECDHE-P384":            75,
    "DHE":                   80,   # Standard DH — quantum-vulnerable
    "DH-2048":               80,
    "DH-3072":               70,
    "ED25519":               65,   # Classically safe, NOT quantum-safe
    "ED448":                 60,   # Classically safe, NOT quantum-safe

    # ── JWT signing algorithms ────────────────────────────────────────────────
    "RS256":                 90,   # RSA-SHA256 signing
    "RS384":                 85,
    "RS512":                 80,
    "ES256":                 85,   # ECDSA-SHA256 signing
    "ES384":                 80,
    "ES512":                 75,
    "PS256":                 90,   # RSA-PSS signing
    "PS384":                 85,
    "PS512":                 80,

    # ── Auth protocols ────────────────────────────────────────────────────────
    "NTLM":                  95,   # No PQC migration path
    "KERBEROS":              80,   # Quantum-vulnerable, Microsoft roadmap pending

    # ── Symmetric — quantum-resistant with sufficient key length ──────────────
    "AES-256":               10,   # Grover: 128-bit effective — still safe
    "AES-256-GCM":           10,
    "AES-256-CBC":           10,
    "AES-128":               40,   # Grover: 64-bit effective — marginal
    "AES-128-GCM":           40,
    "CHACHA20":              10,
    "CHACHA20-POLY1305":     10,

    # ── Hash functions ────────────────────────────────────────────────────────
    "SHA-256":               15,
    "SHA-384":               10,
    "SHA-512":                5,
    "SHA3-256":               5,
    "SHA3-512":               3,
    "HS256":                 15,   # HMAC-SHA256 — symmetric, not quantum-broken
    "HS384":                 10,
    "HS512":                  8,

    # ── NIST PQC Standards (August 2024) — SAFE ───────────────────────────────
    "ML-KEM-512":             5,   # FIPS 203 — Kyber-512
    "ML-KEM-768":             2,   # FIPS 203 — Kyber-768 (recommended)
    "ML-KEM-1024":            1,   # FIPS 203 — Kyber-1024
    "KYBER-512":              5,
    "KYBER-768":              2,
    "KYBER-1024":             1,
    "ML-DSA-44":              5,   # FIPS 204 — Dilithium-2
    "ML-DSA-65":              2,   # FIPS 204 — Dilithium-3 (recommended)
    "ML-DSA-87":              1,   # FIPS 204 — Dilithium-5
    "DILITHIUM-2":            5,
    "DILITHIUM-3":            2,
    "DILITHIUM-5":            1,
    "SLH-DSA-128S":           3,   # FIPS 205 — SPHINCS+-SHA2-128s
    "SLH-DSA-128F":           3,
    "SLH-DSA-192S":           2,
    "SLH-DSA-256S":           1,
    "SPHINCS+":               3,
    "FALCON-512":             3,   # NIST round 4 — not yet standardized
    "FALCON-1024":            2,
}

# Normalize lookup — try uppercase
def get_algorithm_risk(algorithm: str) -> int:
    """
    Returns risk weight for a given algorithm name.
    Case-insensitive. Returns 50 (medium) for unknown algorithms.
    """
    key = algorithm.upper().replace(" ", "-")
    return ALGORITHM_RISK_WEIGHTS.get(key, 50)


# ─────────────────────────────────────────────────────────────────────────────
# QUANTUM SAFE STATUS CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

# Algorithms classified as FULLY quantum-safe (NIST FIPS 203/204/205)
PQC_SAFE_ALGORITHMS: set[str] = {
    "ML-KEM-512", "ML-KEM-768", "ML-KEM-1024",
    "KYBER-512", "KYBER-768", "KYBER-1024",
    "ML-DSA-44", "ML-DSA-65", "ML-DSA-87",
    "DILITHIUM-2", "DILITHIUM-3", "DILITHIUM-5",
    "SLH-DSA-128S", "SLH-DSA-128F",
    "SLH-DSA-192S", "SLH-DSA-192F",
    "SLH-DSA-256S", "SLH-DSA-256F",
    "SPHINCS+",
}

# Algorithms in hybrid mode detection (classical + PQC combined)
PQC_HYBRID_INDICATORS: set[str] = {
    "KYBER768-X25519", "KYBER-ECDHE", "ML-KEM-ECDHE",
    "X25519KYBER768", "P256-ML-KEM-768", "P384-ML-KEM-1024",
}

# Quantum-vulnerable key exchange — all of these in a cipher suite = vulnerable
VULNERABLE_KEX: set[str] = {
    "RSA", "RSA_KEX", "ECDHE", "DHE", "DH",
    "ECDH", "STATIC_RSA",
}


# ─────────────────────────────────────────────────────────────────────────────
# HNDL TIMELINE URGENCY SCORES (0–100)
# Based on Mosca's theorem: if cert expires before CRQC arrives,
# urgency is cert-expiry-driven; else CRQC-driven.
# ─────────────────────────────────────────────────────────────────────────────

DATA_SENSITIVITY_SHELF_LIFE_YEARS = {
    "transaction": 7.0,  # Financial regulations retention
    "authentication": 1.0,
    "static": 0.0,
}

def get_hndl_urgency_score(cert_expiry_days: int, crqc_year: int, data_sensitivity_tier: str = "static") -> int:
    """
    Calculates HNDL urgency score based on time available to migrate.
    cert_expiry_days: days until certificate expiry
    crqc_year: estimated year of CRQC arrival (from settings)
    data_sensitivity_tier: "transaction", "authentication", or "static"
    """
    from datetime import date
    years_to_crqc = crqc_year - date.today().year
    years_to_expiry = cert_expiry_days / 365.0
    
    regulated_shelf_life = DATA_SENSITIVITY_SHELF_LIFE_YEARS.get(data_sensitivity_tier.lower(), 0.0)
    effective_x = max(years_to_expiry, regulated_shelf_life)

    # Migration window = whichever deadline comes first
    urgency_window = min(effective_x, years_to_crqc)

    if urgency_window < 0:      return 100  # Already past deadline
    if urgency_window < 0.5:    return 95   # Under 6 months
    if urgency_window < 1.5:    return 80   # 6–18 months
    if urgency_window < 3.0:    return 60   # 18 months – 3 years
    if urgency_window < 6.0:    return 40   # 3–6 years
    return 20                               # 6+ years


def get_hndl_deadline_label(cert_expiry_days: int, crqc_year: int, data_sensitivity_tier: str = "static") -> str:
    """
    Returns human-readable migration deadline string.
    Example: "Q2 2027"
    """
    from datetime import date, timedelta
    today = date.today()
    years_to_crqc = crqc_year - today.year
    years_to_expiry = cert_expiry_days / 365.0
    
    regulated_shelf_life = DATA_SENSITIVITY_SHELF_LIFE_YEARS.get(data_sensitivity_tier.lower(), 0.0)
    effective_x = max(years_to_expiry, regulated_shelf_life)
    
    urgency_window = min(effective_x, years_to_crqc)

    if urgency_window < 0:
        return "OVERDUE"

    target_date = today + timedelta(days=urgency_window * 365 * 0.8)  # 80% of window
    quarter = (target_date.month - 1) // 3 + 1
    return f"Q{quarter} {target_date.year}"


def get_hndl_urgency_label(score: int) -> str:
    if score >= 90: return "IMMEDIATE"
    if score >= 75: return "URGENT"
    if score >= 50: return "PLANNED"
    return "MONITOR"


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC EXPOSURE SCORES (0–100)
# ─────────────────────────────────────────────────────────────────────────────

EXPOSURE_SCORES: dict[str, int] = {
    "web_portal":           100,   # Customer-facing web portal
    "api_public":            95,   # Public API, no auth
    "api_authenticated":     80,   # Authenticated banking API
    "vpn_gateway":           85,   # Customer VPN gateway
    "shadow_asset":          90,   # Forgotten asset — highest concern
    "staging":               75,   # Staging/UAT publicly accessible
    "mobile_backend":        80,   # Mobile app backend
    "ssh_endpoint":          70,   # SSH management endpoint
    "smtp_mta":              75,   # Email transport
    "unknown":               70,   # Default when type is uncertain
}

def get_exposure_score(asset_type: str, is_shadow: bool = False) -> int:
    if is_shadow:
        return 90
    return EXPOSURE_SCORES.get(asset_type, 70)


# ─────────────────────────────────────────────────────────────────────────────
# EXPOSURE SCORE FORMULA WEIGHTS
# Source: QARS paper (MDPI Electronics, August 2025)
# ─────────────────────────────────────────────────────────────────────────────

SCORE_WEIGHTS = {
    "algorithm_risk": 0.40,
    "hndl_timeline":  0.40,
    "public_exposure": 0.20,
}


# ─────────────────────────────────────────────────────────────────────────────
# RISK TIERS
# ─────────────────────────────────────────────────────────────────────────────

def get_risk_tier(score: int) -> str:
    if score >= 80: return "CRITICAL"
    if score >= 60: return "HIGH"
    if score >= 40: return "MEDIUM"
    if score >= 20: return "LOW"
    return "SAFE"

RISK_TIER_COLORS = {
    "CRITICAL": "#E24B4A",
    "HIGH":     "#EF9F27",
    "MEDIUM":   "#FAC775",
    "LOW":      "#97C459",
    "SAFE":     "#1D9E75",
}


# ─────────────────────────────────────────────────────────────────────────────
# TLS VERSION CLASSIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

DEPRECATED_TLS_VERSIONS = {"SSL_2_0", "SSL_3_0", "TLS_1_0", "TLS_1_1"}
ACCEPTABLE_TLS_VERSIONS  = {"TLS_1_2", "TLS_1_3"}
PREFERRED_TLS_VERSION    = "TLS_1_3"


# ─────────────────────────────────────────────────────────────────────────────
# VPN FINGERPRINTS
# ─────────────────────────────────────────────────────────────────────────────

VPN_FINGERPRINTS = {
    "cisco_anyconnect": {
        "paths":   ["/+CSCOE+/logon.html", "/+CSCOE+/portal.html"],
        "headers": ["X-AnyConnect-Identifier-Platform"],
        "body":    ["webvpn", "AnyConnect"],
        "cert":    ["anyconnect", "cisco-vpn", "webvpn"],
    },
    "fortinet_ssl": {
        "paths":   ["/remote/login", "/remote/logincheck"],
        "headers": ["Forti-Remote-Version"],
        "body":    ["Fortinet", "FortiGate"],
        "cert":    ["fortigate", "fortinet", "fgt-"],
    },
    "palo_alto_gp": {
        "paths":   ["/global-protect/login.esp", "/global-protect/prelogin.esp"],
        "headers": [],
        "body":    ["GlobalProtect", "PAN-"],
        "cert":    ["globalprotect", "palo-alto", "pan-vp"],
    },
    "openvpn": {
        "paths":   [],
        "headers": [],
        "body":    ["OpenVPN"],
        "cert":    ["openvpn", "ovpn", "vpn-server"],
        "ports":   [1194, 943],
    },
}

VPN_PORTS = [443, 8443, 4433, 10443, 1194, 943]


# ─────────────────────────────────────────────────────────────────────────────
# PQC CERTIFICATE TIERS
# ─────────────────────────────────────────────────────────────────────────────

CERT_TIER_VULNERABLE  = "QUANTUM_VULNERABLE"
CERT_TIER_READY       = "PQC_READY"
CERT_TIER_SAFE        = "FULLY_QUANTUM_SAFE"

CERT_TIER_COLORS = {
    CERT_TIER_VULNERABLE: "#E24B4A",  # Red
    CERT_TIER_READY:      "#EF9F27",  # Amber
    CERT_TIER_SAFE:       "#1D9E75",  # Green
}

CERT_VALIDITY_DAYS = 180  # Certificates expire after 6 months — triggers re-scan


# ─────────────────────────────────────────────────────────────────────────────
# NIST REFERENCES
# ─────────────────────────────────────────────────────────────────────────────

NIST_REFERENCES = {
    "ML-KEM":    "NIST FIPS 203 (August 2024)",
    "ML-DSA":    "NIST FIPS 204 (August 2024)",
    "SLH-DSA":   "NIST FIPS 205 (August 2024)",
    "KYBER":     "NIST FIPS 203 (August 2024)",
    "DILITHIUM": "NIST FIPS 204 (August 2024)",
    "SPHINCS+":  "NIST FIPS 205 (August 2024)",
}

MIGRATION_NIST_MAP = {
    "RSA":    "Replace with ML-DSA-65 (NIST FIPS 204)",
    "ECDSA":  "Replace with ML-DSA-65 (NIST FIPS 204)",
    "ECDHE":  "Replace with ML-KEM-768 (NIST FIPS 203)",
    "DHE":    "Replace with ML-KEM-768 (NIST FIPS 203)",
    "RS256":  "Replace with ML-DSA-65 JWT signing (NIST FIPS 204)",
    "ES256":  "Replace with ML-DSA-65 JWT signing (NIST FIPS 204)",
}
