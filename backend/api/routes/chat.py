"""
Chat endpoint for JARVIS — Quantum Security AI Assistant
"""

from fastapi import APIRouter, HTTPException, status
from core.logging import get_logger
from schemas.chat import ChatMessageRequest, ChatMessageResponse, ChatHistoryRequest, ChatHistory
from typing import List
from datetime import datetime

log = get_logger(__name__)

router = APIRouter()


def generate_bot_response(user_message: str, context: str, scan_id: str = None) -> ChatMessageResponse:
    """
    Generate response from JARVIS.
    Currently returns templated responses. Will integrate with LLM (Ollama/HuggingFace) later.
    """
    
    # Conversational templates for now
    message_lower = user_message.lower()
    
    # Greeting & Help
    if any(word in message_lower for word in ["hello", "hi", "hey", "help"]):
        return ChatMessageResponse(
            response="Namaste! I'm JARVIS, your Quantum Security Intelligence Assistant. I can help you with:\n\n"
                    "1. **Scan Analysis** — Explain cryptographic weaknesses found\n"
                    "2. **Mitigation Planning** — Step-by-step remediation guides\n"
                    "3. **PQC Readiness** — Migration timelines and strategies\n"
                    "4. **Risk Comparison** — Compare security postures across domains\n"
                    "5. **Executive Reports** — Generate compliance summaries\n\n"
                    "What would you like help with?",
            confidence=1.0,
            suggestions=[
                "Analyze my last scan",
                "Show mitigation steps",
                "Compare two domains",
                "Generate report"
            ]
        )
    
    # Scan-related queries
    if context == "scan-specific" or "scan" in message_lower or scan_id:
        return ChatMessageResponse(
            response=f"Based on the scan analysis, here are the key findings:\n\n"
                    "**Critical Issues (3)**\n"
                    "• RSA-2048 with ECDHE fallback — Vulnerable to harvest now, decrypt later\n"
                    "• Missing OCSP stapling — Certificate transparency gap\n"
                    "• Outdated TLS 1.1 support — Not NIST-compliant\n\n"
                    "**Recommendations**\n"
                    "1. Upgrade to ML-KEM-768 (PQC) by Q4 2026\n"
                    "2. Implement hybrid RSA + ML-KEM\n"
                    "3. Enable OCSP stapling\n\n"
                    "Would you like detailed migration steps?",
            confidence=0.85,
            sources=[scan_id] if scan_id else [],
            suggestions=[
                "Show mitigation timeline",
                "What is ML-KEM-768?",
                "Export remediation plan"
            ]
        )
    
    # Mitigation queries
    if any(word in message_lower for word in ["mitigation", "fix", "remediate", "solve", "how to", "steps"]):
        return ChatMessageResponse(
            response="**Mitigation & Remediation Plan**\n\n"
                    "**Phase 1 — Assessment (Week 1-2)**\n"
                    "☐ Catalog all cryptographic endpoints\n"
                    "☐ Identify dependencies and blockers\n"
                    "☐ Create rollback procedures\n\n"
                    "**Phase 2 — Hybrid Implementation (Week 3-6)**\n"
                    "☐ Deploy hybrid RSA-2048 + ML-KEM-768\n"
                    "☐ Update certificate chains\n"
                    "☐ Test with client applications\n\n"
                    "**Phase 3 — Full PQC Migration (Week 7-12)**\n"
                    "☐ Deprecate RSA-only ciphers\n"
                    "☐ Monitor performance & compatibility\n"
                    "☐ Generate compliance certificate\n\n"
                    "Estimated timeline: 12 weeks | Risk reduction: 94%",
            confidence=0.88,
            suggestions=[
                "Show certificate generation guide",
                "What are the costs?",
                "Timeline for my specific assets"
            ]
        )
    
    # Quantum threat queries
    if any(word in message_lower for word in ["quantum", "pqc", "threat", "crqc", "harvest"]):
        return ChatMessageResponse(
            response="**Quantum Cryptography Threat Landscape**\n\n"
                    "**The Threat**\n"
                    "Cryptographically-Relevant Quantum Computers (CRQCs) are projected to break RSA/ECDSA by 2028–2037. "
                    "Data encrypted today can be decrypted retroactively (Harvest Now, Decrypt Later).\n\n"
                    "**Your Risk Window**\n"
                    "• Data collected today: Vulnerable for 20+ years\n"
                    "• Medical records, financial data: Permanent exposure\n"
                    "• Compliance deadline: 2030–2035 (varies by region)\n\n"
                    "**NIST Post-Quantum Standards** (Approved 2024)\n"
                    "🔐 ML-KEM-768 — Key encapsulation\n"
                    "🔐 ML-DSA-65 — Digital signatures\n"
                    "🔐 SLH-DSA-256 — Hash-based alternative\n\n"
                    "Your TRINETRA scans identify which assets need PQC migration.",
            confidence=0.92,
            suggestions=[
                "Which of my assets are at highest risk?",
                "How does hybrid crypto work?",
                "What's the compliance cost?"
            ]
        )
    
    # PQC readiness
    if any(word in message_lower for word in ["readiness", "posture", "compliance", "migration", "pqc"]):
        return ChatMessageResponse(
            response="**Your Post-Quantum Cryptography Readiness**\n\n"
                    "📊 **Current Status**: 42% Ready\n"
                    "├─ PQC Enabled: 2 of 12 domains\n"
                    "├─ Hybrid Mode: 5 of 12 domains\n"
                    "└─ Legacy Only: 5 of 12 domains\n\n"
                    "⏱ **Timeline to Full PQC**\n"
                    "→ 6 months: Critical infrastructure\n"
                    "→ 12 months: All public endpoints\n"
                    "→ 18 months: Internal systems\n\n"
                    "🎯 **Next Steps**\n"
                    "1. Run full asset inventory scan\n"
                    "2. Prioritize endpoints by data sensitivity\n"
                    "3. Begin hybrid cipher deployment\n\n"
                    "Your CBOM shows exactly what needs changing.",
            confidence=0.87,
            suggestions=[
                "Generate readiness report",
                "Priority by data type",
                "Budget estimate"
            ]
        )
    
    # Default response (fallback)
    return ChatMessageResponse(
        response="I'm here to help with quantum security and PQC migration. Could you be more specific? "
                "For example:\n"
                "• 'Analyze scan XYZ'\n"
                "• 'How do I migrate to PQC?'\n"
                "• 'Which domain is most at risk?'\n"
                "• 'Generate an executive report'\n\n"
                "What would you like to know?",
        confidence=0.65,
        suggestions=[
            "Analyze a scan",
            "Learn about PQC",
            "See mitigation steps",
            "Generate report"
        ]
    )


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest):
    """
    Send a message to JARVIS and get an AI-powered response.
    
    - **message**: User query
    - **context**: Type of query (general, scan-specific, mitigation, analysis)
    - **scan_id**: Optional—specific scan to analyze
    - **asset_id**: Optional—specific asset to discuss
    """
    try:
        log.info(
            "chat_message_received",
            message_length=len(request.message),
            context=request.context,
            scan_id=request.scan_id
        )
        
        # Generate response using templates (will be upgraded to LLM)
        response = generate_bot_response(
            user_message=request.message,
            context=request.context,
            scan_id=request.scan_id
        )
        
        log.info(
            "chat_response_generated",
            confidence=response.confidence,
            sources_count=len(response.sources or [])
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
    """Check if JARVIS is online"""
    return {
        "status": "healthy",
        "service": "JARVIS Chatbot",
        "model": "template-engine (LLM coming soon)",
        "version": "1.0.0"
    }
