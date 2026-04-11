"""
JARSH Chatbot Service - Database-Aware AI Assistant
Handles both generic PQC questions and scan-specific queries using Ollama
"""

import json
import logging
from typing import Optional, Dict, List, Tuple
import uuid
import aiohttp
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

# Import database models and repository
from db.models import ScanJob, ScannedAsset
from db.repository import ScanRepository

log = logging.getLogger(__name__)


class JARSHService:
    """
    JARSH Chatbot Service
    - Answers generic PQC questions using Ollama
    - Queries PostgreSQL for scan results
    - No hardcoded responses
    """
    
    def __init__(self, ollama_host: str = None, model: str = None):
        import os
        # Use environment variable or default to localhost
        self.ollama_host = ollama_host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "jarsh-phi3")
        self.system_prompt = ""  # Empty because model has it built-in
        
        # Keep model loaded in memory to avoid 40-60s reload time
        import asyncio
        try:
            asyncio.create_task(self._keep_model_alive())
        except RuntimeError:
            # If no event loop is running, skip keep_alive
            pass
    
    async def _keep_model_alive(self):
        """Keep Ollama model loaded in memory for 24 hours"""
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(
                    f"{self.ollama_host}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": "keep alive",
                        "keep_alive": "24h",
                        "stream": False,
                        "options": {"num_predict": 1}
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                )
                log.info(f"Ollama model {self.model} will stay loaded for 24 hours")
        except Exception as e:
            log.warning(f"Failed to set keep_alive (model will unload after 5min idle): {e}")
    
    async def _check_ollama(self) -> bool:
        """Check if Ollama server is available"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.ollama_host}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)  # FIX: Increased from 3s to 5s
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            log.warning(f"Ollama health check failed: {e}")
            return False
    
    def _classify_intent(self, query: str) -> Tuple[str, float]:
        """Classify user query intent using keywords"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["scan", "result", "vulnerability", "found", "history", "summarize"]):
            return "scan_analysis", 0.85
        elif any(word in query_lower for word in ["mitigation", "fix", "remediate", "how to", "migrate"]):
            return "mitigation", 0.85
        elif any(word in query_lower for word in ["quantum", "pqc", "crqc", "threat", "ml-kem", "ml-dsa", "nist", "harvest"]):
            return "quantum_threat", 0.85
        elif any(word in query_lower for word in ["readiness", "compliance", "posture", "score"]):
            return "readiness", 0.85
        elif any(word in query_lower for word in ["hello", "hi", "help", "what can you"]):
            return "greeting", 0.95
        else:
            return "general", 0.70
    
    async def _call_ollama(self, prompt: str, context: str = "") -> str:
        """Call Ollama API to generate response using fine-tuned JARSH model"""
        try:
            if not await self._check_ollama():
                return "⚠️ Ollama server is not running. Please start it with: ollama serve"
            
            # Build prompt with context if provided
            full_prompt = prompt
            if context:
                full_prompt = f"Context:\n{context}\n\nUser Question: {prompt}"
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_predict": 150,  # Reduced from 512 to 150 for faster responses
                        "num_ctx": 2048,     # Smaller context window for speed
                        "num_thread": 8      # Use more CPU threads
                    }
                }
                
                # FIX: Increased timeout from 30s to 120s — LLM responses can be slow
                timeout = aiohttp.ClientTimeout(total=120)
                async with session.post(
                    f"{self.ollama_host}/api/generate",
                    json=payload,
                    timeout=timeout
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        response_text = result.get('response', '').strip()
                        # FIX: Added check for empty response
                        if not response_text:
                            log.warning("Ollama returned empty response")
                            return "I was unable to generate a response. Please try again."
                        return response_text
                    else:
                        error_text = await resp.text()
                        log.error(f"Ollama API error {resp.status}: {error_text}")
                        return "I encountered an error generating a response. Please try again."
        
        except asyncio.TimeoutError:
            log.error("Ollama request timeout")
            return "The request took too long. Please try a simpler question or try again later."
        except Exception as e:
            log.error(f"Ollama call failed: {e}")
            return f"Error communicating with AI service: {str(e)}"
    
    async def get_response(
        self,
        query: str,
        db: AsyncSession,
        scan_id: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict:
        """
        Generate response based on query intent and database context
        """
        # FIX: Added input validation
        if not query or not query.strip():
            return {
                "response": "Please provide a question.",
                "confidence": 1.0,
                "sources": [],
                "suggestions": ["What is PQC?", "Show my scans", "Explain quantum threats"],
                "intent": "general"
            }

        intent, confidence = self._classify_intent(query)
        log.info(f"Query intent: {intent} (confidence: {confidence:.2f})")
        
        if intent == "scan_analysis":
            return await self._handle_scan_query(query, db, scan_id, domain)
        elif intent == "greeting":
            return await self._handle_greeting()
        elif intent == "quantum_threat":
            return await self._handle_pqc_question(query)
        elif intent == "mitigation":
            return await self._handle_mitigation_query(query, db, scan_id, domain)
        elif intent == "readiness":
            return await self._handle_readiness_query(query, db, domain)
        else:
            return await self._handle_general_query(query)
    
    async def _handle_scan_query(
        self,
        query: str,
        db: AsyncSession,
        scan_id: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict:
        """Handle scan-related queries by querying database"""
        repo = ScanRepository(db)
        
        scan = None
        if scan_id:
            try:
                scan_uuid = uuid.UUID(scan_id)
                scan = await repo.get_scan(scan_uuid)
            except (ValueError, AttributeError) as e:
                log.warning(f"Invalid scan_id format: {scan_id} — {e}")
                scan = None
        elif domain:
            scans = await repo.get_scans_by_domain(domain, limit=1)
            scan = scans[0] if scans else None
        else:
            scans = await repo.get_recent_scans(limit=1)
            scan = scans[0] if scans else None
        
        if not scan:
            return {
                "response": (
                    "No scans found in the database. To get started:\n\n"
                    "1. Run a scan on your domain using the /scan endpoint\n"
                    "2. Wait for the scan to complete\n"
                    "3. Ask me about the results\n\n"
                    "Example: POST /api/scan with {\"domain\": \"example.com\"}"
                ),
                "confidence": 0.95,
                "sources": [],
                "suggestions": [
                    "How do I run a scan?",
                    "What is PQC?",
                    "Explain quantum threats"
                ],
                "intent": "scan_analysis"
            }
        
        assets = await repo.get_assets_for_scan(scan.id)
        response = self._generate_scan_summary(scan, assets)
        
        return {
            "response": response,
            "confidence": 0.90,
            "sources": [str(scan.id)],
            "suggestions": [
                "Show mitigation steps",
                "Which assets are most critical?",
                "Generate CBOM report"
            ],
            "intent": "scan_analysis"
        }
    
    def _generate_scan_summary(self, scan: ScanJob, assets: List[ScannedAsset]) -> str:
        """Generate beautifully formatted scan summary"""
        from datetime import datetime
        
        # Header with domain
        summary = f"# 🔍 Scan Results: {scan.domain}\n\n"
        
        # Status badge
        status_emoji = {
            "COMPLETED": "✅",
            "RUNNING": "⏳",
            "FAILED": "❌",
            "PENDING": "⏸️"
        }
        summary += f"{status_emoji.get(scan.status, '❓')} **Status:** {scan.status}\n"
        
        # Completion time
        if scan.completed_at:
            time_str = scan.completed_at.strftime('%B %d, %Y at %H:%M UTC')
            summary += f"📅 **Completed:** {time_str}\n"
        else:
            summary += f"📅 **Started:** {scan.created_at.strftime('%B %d, %Y at %H:%M UTC')}\n"
        
        summary += f"🌐 **Assets Scanned:** {scan.assets_scanned or 0}\n\n"
        
        # Risk distribution with visual bars
        if scan.status == "COMPLETED":
            summary += "## 📊 Risk Distribution\n\n"
            
            total = (scan.critical_count or 0) + (scan.high_count or 0) + (scan.medium_count or 0) + (scan.low_count or 0) + (scan.safe_count or 0)
            
            if total > 0:
                def risk_bar(count, total, emoji):
                    percentage = (count / total) * 100
                    bar_length = int(percentage / 5)  # 20 chars max
                    bar = "█" * bar_length + "░" * (20 - bar_length)
                    return f"{emoji} **{count:2d}** {bar} {percentage:5.1f}%"
                
                summary += risk_bar(scan.critical_count or 0, total, "🔴 Critical") + "\n"
                summary += risk_bar(scan.high_count or 0, total, "🟠 High    ") + "\n"
                summary += risk_bar(scan.medium_count or 0, total, "🟡 Medium  ") + "\n"
                summary += risk_bar(scan.low_count or 0, total, "🟢 Low     ") + "\n"
                summary += risk_bar(scan.safe_count or 0, total, "✅ Safe    ") + "\n"
            
            summary += "\n"
            
            # Organization score with grade
            if scan.organization_score is not None:
                score = scan.organization_score
                if score >= 90:
                    grade, emoji = "A+", "🏆"
                elif score >= 80:
                    grade, emoji = "A", "⭐"
                elif score >= 70:
                    grade, emoji = "B", "👍"
                elif score >= 60:
                    grade, emoji = "C", "⚠️"
                else:
                    grade, emoji = "D", "🚨"
                
                summary += f"## {emoji} Organization Score: {score:.1f}/100 (Grade: {grade})\n\n"
            
            # Shadow assets warning
            if scan.shadow_assets_found and scan.shadow_assets_found > 0:
                summary += f"## ⚠️ Shadow Assets Detected\n\n"
                summary += f"Found **{scan.shadow_assets_found}** undocumented endpoints that require immediate attention.\n\n"
        
        # Critical assets table
        if assets:
            critical_assets = [a for a in assets if a.risk_level == "CRITICAL"][:5]
            if critical_assets:
                summary += "## 🚨 Critical Assets Requiring Immediate Action\n\n"
                summary += "| Asset | Score | Algorithm | Issues |\n"
                summary += "|-------|-------|-----------|--------|\n"
                
                for asset in critical_assets:
                    fqdn = asset.fqdn[:30] + "..." if len(asset.fqdn) > 30 else asset.fqdn
                    score = f"{asset.quantum_exposure_score:.0f}" if asset.quantum_exposure_score else "N/A"
                    algo = asset.cert_algorithm or "Unknown"
                    
                    if asset.vulnerabilities and len(asset.vulnerabilities) > 0:
                        issues = f"{len(asset.vulnerabilities)} issues"
                    else:
                        issues = "None"
                    
                    summary += f"| {fqdn} | {score} | {algo} | {issues} |\n"
                
                summary += "\n"
        
        # Action items
        if scan.critical_count and scan.critical_count > 0:
            summary += "## ⚡ Immediate Actions Required\n\n"
            summary += "1. 🔍 **Review** all critical and high-risk assets\n"
            summary += "2. 📋 **Plan** PQC migration for vulnerable endpoints\n"
            summary += "3. 🔐 **Implement** hybrid cryptography as interim solution\n"
            summary += "4. 📊 **Generate** CBOM report for compliance\n"
            summary += "5. 🎯 **Prioritize** assets with long data lifetimes\n\n"
        elif scan.status == "COMPLETED":
            summary += "## ✅ Good News!\n\n"
            summary += "No critical vulnerabilities found. Your infrastructure shows good quantum readiness.\n\n"
            summary += "**Recommendations:**\n"
            summary += "- Continue monitoring for new assets\n"
            summary += "- Plan proactive PQC migration\n"
            summary += "- Review medium and low-risk items\n\n"
        
        # Footer with next steps
        summary += "---\n\n"
        summary += "💬 **Ask me:**\n"
        summary += "- \"Show mitigation steps for critical assets\"\n"
        summary += "- \"Generate CBOM report\"\n"
        summary += "- \"What is the migration timeline?\"\n"
        
        return summary
        
        return summary
    
    async def _handle_greeting(self) -> Dict:
        """Handle greeting queries"""
        response = await self._call_ollama(
            "A user just greeted you. Introduce yourself as JARSH and briefly explain what you can help with."
        )
        
        return {
            "response": response,
            "confidence": 1.0,
            "sources": [],
            "suggestions": [
                "Show my recent scans",
                "What is PQC?",
                "Explain quantum threats",
                "How do I migrate to PQC?"
            ],
            "intent": "greeting"
        }
    
    async def _handle_pqc_question(self, query: str) -> Dict:
        """Handle generic PQC questions using Ollama"""
        response = await self._call_ollama(query)
        
        return {
            "response": response,
            "confidence": 0.90,
            "sources": ["JARSH AI"],
            "suggestions": [
                "Tell me more",
                "Show my scans",
                "How does this affect my assets?"
            ],
            "intent": "quantum_threat"
        }
    
    async def _handle_mitigation_query(
        self,
        query: str,
        db: AsyncSession,
        scan_id: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict:
        """Handle mitigation planning queries"""
        repo = ScanRepository(db)
        
        scan = None
        if scan_id:
            try:
                scan = await repo.get_scan(uuid.UUID(scan_id))
            except (ValueError, AttributeError) as e:
                log.warning(f"Invalid scan_id: {scan_id} — {e}")
                scan = None
        elif domain:
            scans = await repo.get_scans_by_domain(domain, limit=1)
            scan = scans[0] if scans else None
        else:
            scans = await repo.get_recent_scans(limit=1)
            scan = scans[0] if scans else None
        
        if not scan:
            response = await self._call_ollama(
                f"{query}\n\nNote: No scan data is available yet. Provide general mitigation guidance for PQC migration."
            )
            return {
                "response": response,
                "confidence": 0.75,
                "sources": [],
                "suggestions": ["How do I run a scan?", "What is PQC?"],
                "intent": "mitigation"
            }
        
        context = f"""Scan Results for {scan.domain}:
- Status: {scan.status}
- Critical Issues: {scan.critical_count}
- High Risk: {scan.high_count}
- Medium Risk: {scan.medium_count}
- Organization Score: {scan.organization_score if scan.organization_score is not None else 'N/A'}/100
- Completed: {scan.completed_at}"""
        
        # FIX: organization_score could be None — handled above with if/else
        response = await self._call_ollama(query, context)
        
        return {
            "response": response,
            "confidence": 0.85,
            "sources": [str(scan.id)],
            "suggestions": [
                "Show detailed steps",
                "What are the costs?",
                "Generate migration timeline"
            ],
            "intent": "mitigation"
        }
    
    async def _handle_readiness_query(
        self,
        query: str,
        db: AsyncSession,
        domain: Optional[str] = None
    ) -> Dict:
        """Handle PQC readiness assessment queries"""
        repo = ScanRepository(db)

        # FIX: get_recent_scans signature had domain kwarg missing in original call
        scans = await repo.get_recent_scans(limit=10, domain=domain)
        
        if not scans:
            return {
                "response": (
                    "No scan data available for readiness assessment. "
                    "Run scans on your domains to get started."
                ),
                "confidence": 0.85,
                "sources": [],
                "suggestions": ["How do I run a scan?", "What is PQC readiness?"],
                "intent": "readiness"
            }
        
        total_assets = sum(s.assets_scanned or 0 for s in scans)   # FIX: guard None with or 0
        safe_assets = sum(s.safe_count or 0 for s in scans)
        critical_assets = sum(s.critical_count or 0 for s in scans)
        
        readiness_score = (safe_assets / total_assets * 100) if total_assets > 0 else 0
        
        response = "**PQC Readiness Assessment**\n\n"
        response += f"📊 **Overall Readiness:** {readiness_score:.1f}%\n\n"
        response += "**Asset Breakdown:**\n"
        response += f"• Total Assets: {total_assets}\n"
        response += f"• PQC-Ready: {safe_assets}\n"
        response += f"• Vulnerable: {critical_assets}\n\n"
        
        if readiness_score < 50:
            response += "⚠️ **Status:** High Risk - Immediate action required\n"
        elif readiness_score < 80:
            response += "⚡ **Status:** Moderate Risk - Plan migration soon\n"
        else:
            response += "✅ **Status:** Good - Continue monitoring\n"
        
        return {
            "response": response,
            "confidence": 0.88,
            "sources": [str(s.id) for s in scans[:3]],
            "suggestions": [
                "Show migration plan",
                "Which assets need attention?",
                "Generate compliance report"
            ],
            "intent": "readiness"
        }
    
    async def _handle_general_query(self, query: str) -> Dict:
        """Handle general queries using Ollama"""
        response = await self._call_ollama(query)
        
        return {
            "response": response,
            "confidence": 0.75,
            "sources": ["JARSH AI"],
            "suggestions": [
                "Show my scans",
                "What is PQC?",
                "Explain quantum threats",
                "How do I get started?"
            ],
            "intent": "general"
        }