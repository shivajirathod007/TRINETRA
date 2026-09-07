import re

# Cryptographic Algorithm Patterns
# Word boundaries (\b) prevent false positives from common words
CRYPTO_PATTERNS = {
    # ── Asymmetric (Quantum Vulnerable) ──
    "RSA": re.compile(r"\bRSA[-_ ]?\d*\b", re.IGNORECASE),
    "ECDSA": re.compile(r"\bECDSA[-_ ]?\d*\b", re.IGNORECASE),
    "ECDHE": re.compile(r"\bECDHE[-_ ]?(?:P[-_ ]?\d+)?\b", re.IGNORECASE),
    "DH": re.compile(r"\b(?:DHE?|Diffie[-_ ]?Hellman)[-_ ]?\d*\b", re.IGNORECASE),
    "EdDSA": re.compile(r"\bEd(?:DSA|25519|448)\b", re.IGNORECASE),
    
    # ── Symmetric (Classical Safe, Quantum Safe with large keys) ──
    "AES": re.compile(r"\bAES[-_ ]?(?:128|192|256)?[-_ ]?(?:GCM|CBC|CCM)?\b", re.IGNORECASE),
    "ChaCha20": re.compile(r"\bChaCha20(?:[-_ ]?Poly1305)?\b", re.IGNORECASE),
    
    # ── Post-Quantum (Safe) ──
    "Kyber": re.compile(r"\b(Kyber|ML[-_ ]?KEM)[-_ ]?\d*\b", re.IGNORECASE),
    "Dilithium": re.compile(r"\b(Dilithium|ML[-_ ]?DSA)[-_ ]?\d*\b", re.IGNORECASE),
    "SPHINCS+": re.compile(r"\b(SPHINCS\+?|SLH[-_ ]?DSA)[-_ ]?\d*[sf]?\b", re.IGNORECASE),
    "FALCON": re.compile(r"\bFALCON[-_ ]?\d*\b", re.IGNORECASE),
    
    # ── JWT Algorithms ──
    "JWT_RS": re.compile(r"\bRS(?:256|384|512)\b", re.IGNORECASE),
    "JWT_ES": re.compile(r"\bES(?:256|384|512)\b", re.IGNORECASE),
    "JWT_PS": re.compile(r"\bPS(?:256|384|512)\b", re.IGNORECASE),
    "JWT_HS": re.compile(r"\bHS(?:256|384|512)\b", re.IGNORECASE),
    
    # ── Auth Protocols ──
    "NTLM": re.compile(r"\bNTLM(?:v1|v2)?\b", re.IGNORECASE),
    "Kerberos": re.compile(r"\bKerberos\b", re.IGNORECASE),
}

# Legacy / Vulnerable Patterns
VULNERABILITY_PATTERNS = {
    "PKCS#1 v1.5": re.compile(r"\bPKCS#?1(?:\s*v?1\.5)?\b", re.IGNORECASE),
    "MD5": re.compile(r"\bMD5\b", re.IGNORECASE),
    "SHA1": re.compile(r"\bSHA[-_ ]?1\b", re.IGNORECASE),
    "DES": re.compile(r"\b(3?DES|Triple[-_ ]?DES)\b", re.IGNORECASE),
    "RC4": re.compile(r"\bRC4\b", re.IGNORECASE),
}

# Implementation Details
IMPLEMENTATION_PATTERNS = {
    "LSB_FIRST": re.compile(r"\bLSB_FIRST\b|\bLITTLE_ENDIAN\b", re.IGNORECASE),
    "BIG_ENDIAN": re.compile(r"\bBIG_ENDIAN\b", re.IGNORECASE),
}
