"""
Authentication dependencies for FastAPI routes.
All protected routes require valid JWT token.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from datetime import datetime, timedelta
from typing import Optional
import jwt

from core.config import settings
from core.logging import get_logger

log = get_logger(__name__)

security = HTTPBearer()

# JWT Configuration
SECRET_KEY = settings.secret_key or "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> str:
    """
    Verify JWT token and return authenticated user email.
    Raises HTTPException 401 if token is invalid or missing.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("sub")
        
        if user_email is None:
            log.warning("Token missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not logged in yet. Please go back to login.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_email
    
    except jwt.ExpiredSignatureError:
        log.warning("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except jwt.InvalidTokenError as e:
        log.warning(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not logged in yet. Please go back to login.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except Exception as e:
        log.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not logged in yet. Please go back to login.",
            headers={"WWW-Authenticate": "Bearer"},
        )
