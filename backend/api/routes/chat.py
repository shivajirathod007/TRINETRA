"""
Chat endpoint for JARSH — Quantum Security AI Assistant
Database-aware chatbot powered by Ollama
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from schemas.chat import ChatMessageRequest, ChatMessageResponse
from db.session import get_db
from engine.ai.jarsh_service import JARSHService

log = get_logger(__name__)

router = APIRouter()

# Initialize JARSH service (singleton)
jarsh_service = JARSHService()





@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to JARSH and get an AI-powered response.
    
    - **message**: User query
    - **context**: Type of query (general, scan-specific, mitigation, analysis)
    - **scan_id**: Optional—specific scan to analyze
    - **asset_id**: Optional—specific asset to discuss
    
    JARSH uses:
    - Ollama (Phi-3-mini) for AI-powered responses
    - PostgreSQL database for scan result queries
    - No hardcoded responses - all AI-generated
    
    Note: This endpoint is public to allow chatbot access without authentication.
    """
    try:
        log.info(
            "chat_message_received",
            message_length=len(request.message),
            context=request.context,
            scan_id=request.scan_id
        )
        
        # Extract domain from context if available
        domain = None
        if request.context and "domain:" in request.context:
            domain = request.context.split("domain:")[1].strip()
        
        # Get response from JARSH service
        result = await jarsh_service.get_response(
            query=request.message,
            db=db,
            scan_id=request.scan_id,
            domain=domain
        )
        
        response = ChatMessageResponse(
            response=result["response"],
            confidence=result["confidence"],
            sources=result.get("sources", []),
            suggestions=result.get("suggestions", [])
        )
        
        log.info(
            "chat_response_generated",
            confidence=response.confidence,
            sources_count=len(response.sources or []),
            intent=result.get("intent")
        )
        
        return response
    
    except Exception as e:
        log.error("chat_processing_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process your message. Please try again."
        )


@router.get("/health", tags=["Health"])
async def chat_health():
    """Check if JARSH is online"""
    ollama_status = "connected" if await jarsh_service._check_ollama() else "disconnected"
    
    return {
        "status": "healthy" if ollama_status == "connected" else "degraded",
        "service": "JARSH Chatbot",
        "model": f"Ollama ({jarsh_service.model})",
        "ollama_status": ollama_status,
        "ollama_host": jarsh_service.ollama_host,
        "database": "PostgreSQL connected",
        "version": "2.0.0",
        "features": [
            "Generic PQC Q&A via Ollama",
            "Scan result queries from PostgreSQL",
            "Database-aware responses",
            "No hardcoded values - all AI-generated"
        ]
    }
