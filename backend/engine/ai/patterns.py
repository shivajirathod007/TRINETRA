import re

# Cryptographic Algorithm Patterns
CRYPTO_PATTERNS = {
    "RSA": re.compile(r"RSA", re.IGNORECASE),
    "ECDSA": re.compile(r"ECDSA", re.IGNORECASE),
    "ECDHE": re.compile(r"ECDHE", re.IGNORECASE),
    "Kyber": re.compile(r"Kyber|ML-KEM", re.IGNORECASE),
    "Dilithium": re.compile(r"Dilithium|ML-DSA", re.IGNORECASE),
    "SPHINCS+": re.compile(r"SPHINCS|SLH-DSA", re.IGNORECASE),
    # JWT/JWS signature algorithms. The letter-only lookbehind is deliberate:
    # it stops "ES256" matching inside "AES256" / "AES-256" while still allowing
    # a digit or delimiter to precede, as in "alg\":\"RS256".
    "RS256": re.compile(r"(?<![A-Za-z])RS(?:256|384|512)(?![A-Za-z])", re.IGNORECASE),
    "ES256": re.compile(r"(?<![A-Za-z])ES(?:256|384|512)(?![A-Za-z])", re.IGNORECASE),
    "PS256": re.compile(r"(?<![A-Za-z])PS(?:256|384|512)(?![A-Za-z])", re.IGNORECASE),
    "HS256": re.compile(r"(?<![A-Za-z])HS(?:256|384|512)(?![A-Za-z])", re.IGNORECASE),
}

# Legacy / Vulnerable Patterns
VULNERABILITY_PATTERNS = {
    "PKCS#1 v1.5": re.compile(r"PKCS#1|PKCS1", re.IGNORECASE),
    "MD5": re.compile(r"MD5", re.IGNORECASE),
    "SHA1": re.compile(r"SHA1|SHA-1", re.IGNORECASE),
    "DES": re.compile(r"DES|3DES", re.IGNORECASE),
    # Windows-integrated auth schemes seen in WWW-Authenticate
    "NTLM": re.compile(r"(?<![A-Za-z])NTLM(?![A-Za-z])", re.IGNORECASE),
    "Negotiate": re.compile(r"(?<![A-Za-z])Negotiate(?![A-Za-z])", re.IGNORECASE),
}

# Classical-Safe Patterns
# Algorithms that are not quantum-vulnerable in the Shor sense. These did not
# exist before: every pattern above maps to QUANTUM_VULNERABLE or PQC_READY via
# _create_detection, so the classifier had no way to emit a CLASSICAL_SAFE
# detection at all. Word boundaries are mandatory here -- the boundary-less
# "DES" pattern above is what matches "describes" and "Des Moines".
CLASSICAL_SAFE_PATTERNS = {
    #  will not fire against "_", so it misses AES inside
    # TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 -- cipher suites are exactly where these
    # algorithms matter most. Explicit alphanumeric lookarounds treat "_" and "-" as
    # delimiters while still refusing a match inside a longer word.
    "AES": re.compile(r"(?<![A-Za-z0-9])AES(?:[-_]?(?:128|192|256))?(?:[-_](?:GCM|CBC|CTR|CCM))?(?![A-Za-z0-9])", re.IGNORECASE),
    "SHA-2": re.compile(r"(?<![A-Za-z0-9])SHA[-_]?(?:256|384|512)(?![A-Za-z0-9])", re.IGNORECASE),
    "SHA-3": re.compile(r"(?<![A-Za-z0-9])SHA3(?:[-_]?(?:256|384|512))?(?![A-Za-z0-9])", re.IGNORECASE),
    "ChaCha20": re.compile(r"(?<![A-Za-z0-9])CHACHA20(?:[-_]POLY1305)?(?![A-Za-z0-9])", re.IGNORECASE),
    "Poly1305": re.compile(r"(?<![A-Za-z0-9])POLY1305(?![A-Za-z0-9])", re.IGNORECASE),
    "Ed25519": re.compile(r"(?<![A-Za-z0-9])ED25519(?![A-Za-z0-9])", re.IGNORECASE),
    "Ed448": re.compile(r"(?<![A-Za-z0-9])ED448(?![A-Za-z0-9])", re.IGNORECASE),
    "EdDSA": re.compile(r"(?<![A-Za-z0-9])EDDSA(?![A-Za-z0-9])", re.IGNORECASE),
    # The trailing lookahead stops this matching inside X25519Kyber768, which is PQC
    "X25519": re.compile(r"(?<![A-Za-z0-9])X25519(?![A-Za-z0-9])", re.IGNORECASE),
    "X448": re.compile(r"(?<![A-Za-z0-9])X448(?![A-Za-z0-9])", re.IGNORECASE),
    "HMAC-SHA2": re.compile(r"(?<![A-Za-z0-9])HS(?:256|384|512)(?![A-Za-z0-9])", re.IGNORECASE),
}

# Implementation Details
IMPLEMENTATION_PATTERNS = {
    "LSB_FIRST": re.compile(r"LSB_FIRST|LITTLE_ENDIAN", re.IGNORECASE),
    "BIG_ENDIAN": re.compile(r"BIG_ENDIAN", re.IGNORECASE),
}
