"""
Authentication routes for login and token management.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from core.logging import get_logger
from api.dependencies import create_access_token

log = get_logger(__name__)

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    token_type: str = "bearer"
    user: str
    role: str


# Simple in-memory credentials (in production, use database with hashed passwords)
VALID_CREDENTIALS = {
    "shiva@gmail.com": "shiva@124",
    "analyst@trinetra.io": "password123",
    "admin@trinetra.io": "admin123",
}

# Role mapping per user
USER_ROLES = {
    "admin@trinetra.io": "Admin",
    "analyst@trinetra.io": "Analyst",
    "shiva@gmail.com": "Analyst",
}


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT token.
    
    **Valid credentials:**
    - Email: shiva@gmail.com, Password: shiva@124
    - Email: analyst@trinetra.io, Password: password123
    - Email: admin@trinetra.io, Password: admin123
    """
    # Add email/password validation
    if request.email not in VALID_CREDENTIALS or VALID_CREDENTIALS[request.email] != request.password:
        log.warning(f"Failed login attempt for email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    log.info(f"User logged in: {request.email}")
    
    # Create access token
    access_token = create_access_token(data={"sub": request.email})
    
    role = USER_ROLES.get(request.email, "Analyst")

    return LoginResponse(
        access_token=access_token,
        user=request.email,
        role=role,
    )


@router.post("/logout")
async def logout():
    """Logout endpoint (client should discard token)."""
    log.info("Logout request received")
    return {"message": "Successfully logged out"}


@router.get("/verify")
async def verify_token(email: str = None):
    """Simple endpoint to verify token validity (for debugging)."""
    return {
        "status": "valid",
        "message": "Token is valid and you are authenticated"
    }
