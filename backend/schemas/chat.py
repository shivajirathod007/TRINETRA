"""Chat message schemas for JARVIS chatbot"""

from pydantic import BaseModel
from typing import Any, Optional, List


class ChatMessageRequest(BaseModel):
    """Incoming chat message from user"""
    message: str
    context: Optional[str] = "general"  # general, scan-specific, mitigation, analysis
    scan_id: Optional[str] = None
    asset_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "message": "What are the critical vulnerabilities in my last scan?",
                "context": "scan-specific",
                "scan_id": "scan-123"
            }
        }


class ChatMessageResponse(BaseModel):
    """Response from JARVIS"""
    response: str
    confidence: Optional[float] = None
    # Structured scan references: {"scan_id", "domain", "completed_at"}.
    # Generic (non-scan) answers still return plain string labels, e.g. "JARSH AI".
    sources: Optional[List[Any]] = None
    # Flat string form, kept for backward compatibility with existing clients
    sources_display: Optional[List[str]] = None
    suggestions: Optional[List[str]] = None  # Follow-up questions

    class Config:
        json_schema_extra = {
            "example": {
                "response": "Your last scan revealed 3 critical vulnerabilities...",
                "confidence": 0.92,
                "sources": [
                    {
                        "scan_id": "3f2b1c9e-0000-4a11-9c33-2b7d5e8f1a04",
                        "domain": "example.com",
                        "completed_at": "2026-09-01T12:04:11+00:00"
                    }
                ],
                "sources_display": ["3f2b1c9e-0000-4a11-9c33-2b7d5e8f1a04"],
                "suggestions": [
                    "Show me the mitigation steps",
                    "Compare with other domains"
                ]
            }
        }


class ChatHistoryRequest(BaseModel):
    """Request to retrieve chat history"""
    limit: int = 50
    offset: int = 0


class ChatHistory(BaseModel):
    """Chat history record"""
    user_message: str
    bot_response: str
    context: str
    timestamp: str
    scan_id: Optional[str] = None
