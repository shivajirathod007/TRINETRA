import re

# Cryptographic Algorithm Patterns
CRYPTO_PATTERNS = {
    "RSA": re.compile(r"RSA", re.IGNORECASE),
    "ECDSA": re.compile(r"ECDSA", re.IGNORECASE),
    "ECDHE": re.compile(r"ECDHE", re.IGNORECASE),
    "Kyber": re.compile(r"Kyber|ML-KEM", re.IGNORECASE),
    "Dilithium": re.compile(r"Dilithium|ML-DSA", re.IGNORECASE),
    "SPHINCS+": re.compile(r"SPHINCS|SLH-DSA", re.IGNORECASE),
}

# Legacy / Vulnerable Patterns
VULNERABILITY_PATTERNS = {
    "PKCS#1 v1.5": re.compile(r"PKCS#1|PKCS1", re.IGNORECASE),
    "MD5": re.compile(r"MD5", re.IGNORECASE),
    "SHA1": re.compile(r"SHA1|SHA-1", re.IGNORECASE),
    "DES": re.compile(r"DES|3DES", re.IGNORECASE),
}

# Implementation Details
IMPLEMENTATION_PATTERNS = {
    "LSB_FIRST": re.compile(r"LSB_FIRST|LITTLE_ENDIAN", re.IGNORECASE),
    "BIG_ENDIAN": re.compile(r"BIG_ENDIAN", re.IGNORECASE),
}
