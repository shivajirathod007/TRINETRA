import hmac
import hashlib

def sign_payload(payload: str, secret: str) -> str:
    """
    Signs a given payload with HMAC SHA256.
    """
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature
