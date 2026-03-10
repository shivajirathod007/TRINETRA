# Algorithm risk weights dict mapping
# Rule: crypto_constants.py must include full algorithm risk weight dict:
# RSA-1024=100, RSA-2048=90, RSA-4096=75, ECDSA-256=85,
# AES-256=10, Kyber-768=2, Dilithium-3=2

ALGORITHM_RISK_WEIGHTS = {
    "RSA-1024": 100,
    "RSA-2048": 90,
    "RSA-4096": 75,
    "ECDSA-256": 85,
    "AES-256": 10,
    "Kyber-768": 2,
    "Dilithium-3": 2,
}
