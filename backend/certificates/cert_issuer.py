from enum import Enum
from typing import Dict, Any

class CertType(str, Enum):
    QUANTUM_VULNERABLE = "QUANTUM_VULNERABLE"
    PQC_READY = "PQC_READY"
    FULLY_QUANTUM_SAFE = "FULLY_QUANTUM_SAFE"

def issue_certificate(asset_details: Dict[str, Any], score: float) -> Dict[str, Any]:
    """
    Issues PQC readiness certificates based on the generated exposure score.
    Rule: 3 certificate types: QUANTUM_VULNERABLE (red), PQC_READY (amber), FULLY_QUANTUM_SAFE (green)
    """
    # Simple logic threshold
    if score >= 70:
        cert_type = CertType.QUANTUM_VULNERABLE
        color = "red"
    elif score >= 30:
        cert_type = CertType.PQC_READY
        color = "amber"
    else:
        cert_type = CertType.FULLY_QUANTUM_SAFE
        color = "green"
        
    return {
        "asset_id": asset_details.get("id", "unknown"),
        "certificate_type": cert_type.value,
        "color": color,
        "score": score,
        "issued_by": "TRINETRA CA" # Dummy issuer
    }
