"""Chat message schemas for JARVIS chatbot"""

from pydantic import BaseModel
from typing import Optional, List


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
    sources: Optional[List[str]] = None  # References to scans/docs
    suggestions: Optional[List[str]] = None  # Follow-up questions

    class Config:
        json_schema_extra = {
            "example": {
                "response": "Your last scan revealed 3 critical vulnerabilities...",
                "confidence": 0.92,
                "sources": ["scan-123"],
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
