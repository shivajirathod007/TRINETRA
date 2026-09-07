import re

# Cryptographic Algorithm Patterns
# Word boundaries (\b) prevent false positives from common words
# (e.g., "description" matching DES, "universal" matching RSA)
CRYPTO_PATTERNS = {
    "RSA": re.compile(r"\bRSA[-_ ]?\d*\b", re.IGNORECASE),
    "ECDSA": re.compile(r"\bECDSA[-_ ]?\d*\b", re.IGNORECASE),
    "ECDHE": re.compile(r"\bECDHE[-_ ]?\d*\b", re.IGNORECASE),
    "Kyber": re.compile(r"\b(Kyber|ML-KEM)[-_ ]?\d*\b", re.IGNORECASE),
    "Dilithium": re.compile(r"\b(Dilithium|ML-DSA)[-_ ]?\d*\b", re.IGNORECASE),
    "SPHINCS+": re.compile(r"\b(SPHINCS\+?|SLH-DSA)[-_ ]?\d*\b", re.IGNORECASE),
}

# Legacy / Vulnerable Patterns
VULNERABILITY_PATTERNS = {
    "PKCS#1 v1.5": re.compile(r"\bPKCS#?1(?:\s*v?1\.5)?\b", re.IGNORECASE),
    "MD5": re.compile(r"\bMD5\b", re.IGNORECASE),
    "SHA1": re.compile(r"\bSHA[-_ ]?1\b", re.IGNORECASE),
    "DES": re.compile(r"\b(3?DES|Triple[-_ ]?DES)\b", re.IGNORECASE),
}

# Implementation Details
IMPLEMENTATION_PATTERNS = {
    "LSB_FIRST": re.compile(r"\bLSB_FIRST\b|\bLITTLE_ENDIAN\b", re.IGNORECASE),
    "BIG_ENDIAN": re.compile(r"\bBIG_ENDIAN\b", re.IGNORECASE),
}
