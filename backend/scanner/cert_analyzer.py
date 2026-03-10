from cryptography import x509
from cryptography.hazmat.backends import default_backend
from typing import Dict, Any

def analyze_certificate(cert_pem_bytes: bytes) -> Dict[str, Any]:
    """
    Parses a PEM encoded certificate and extracts key info for logic/AI processing.
    """
    try:
        cert = x509.load_pem_x509_certificate(cert_pem_bytes, default_backend())
        
        subject = cert.subject.rfc4514_string()
        issuer = cert.issuer.rfc4514_string()
        public_key = cert.public_key()
        
        # We can extract the algorithm length/type
        key_size = getattr(public_key, "key_size", None)
        pub_key_type = type(public_key).__name__
        
        return {
            "status": "success",
            "subject": subject,
            "issuer": issuer,
            "not_valid_before": cert.not_valid_before.isoformat(),
            "not_valid_after": cert.not_valid_after.isoformat(),
            "public_key_type": pub_key_type,
            "key_size": key_size,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
