"""
Test Fine-Tuned JARSH Model
Tests both generic PQC questions and database scan queries
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

import logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


async def test_jarsh():
    """Test JARSH chatbot with fine-tuned model"""
    
    print("=" * 70)
    print("  Testing Fine-Tuned JARSH Model")
    print("=" * 70)
    print()
    
    # Import dependencies
    try:
        from engine.ai.jarsh_service import JARSHService
        from db.session import get_async_session
    except ImportError as e:
        print(f"✗ Import error: {e}")
        print("Make sure you're in the TRINETRA directory")
        return
    
    # Initialize service
    print("Initializing JARSH service with fine-tuned model...")
    jarsh = JARSHService()  # Uses jarsh:latest by default
    
    # Check Ollama
    if not await jarsh._check_ollama():
        print("✗ Ollama server not running")
        print("Start it with: ollama serve")
        return
    
    print(f"✓ Using model: {jarsh.model}")
    print()
    
    # Get database session
    async for db in get_async_session():
        
        # Test cases
        test_queries = [
            {
                "query": "Hello, what can you help me with?",
                "description": "Greeting test",
                "expected_intent": "greeting"
            },
            {
                "query": "What is Post-Quantum Cryptography?",
                "description": "Generic PQC question (tests fine-tuned knowledge)",
                "expected_intent": "quantum_threat"
            },
            {
                "query": "Explain ML-KEM-768 in detail",
                "description": "Specific PQC algorithm (tests TRINETRA knowledge)",
                "expected_intent": "quantum_threat"
            },
            {
                "query": "What is Harvest Now, Decrypt Later?",
                "description": "Quantum threat explanation (tests fine-tuned expertise)",
                "expected_intent": "quantum_threat"
            },
            {
                "query": "Show me my recent scans",
                "description": "Database query - scan history",
                "expected_intent": "scan_analysis"
            },
            {
                "query": "What vulnerabilities were found in my last scan?",
                "description": "Database query - scan analysis",
                "expected_intent": "scan_analysis"
            },
            {
                "query": "How do I migrate to PQC?",
                "description": "Mitigation planning (tests migration knowledge)",
                "expected_intent": "mitigation"
            },
            {
                "query": "What is my PQC readiness score?",
                "description": "Readiness assessment",
                "expected_intent": "readiness"
            },
            {
                "query": "Explain NIST PQC standards",
                "description": "Standards knowledge (tests fine-tuned expertise)",
                "expected_intent": "quantum_threat"
            }
        ]
        
        for i, test in enumerate(test_queries, 1):
            print(f"Test {i}/{len(test_queries)}: {test['description']}")
            print(f"Query: '{test['query']}'")
            print("-" * 70)
            
            try:
                result = await jarsh.get_response(
                    query=test['query'],
                    db=db
                )
                
                print(f"Intent: {result['intent']} (expected: {test['expected_intent']})")
                print(f"Confidence: {result['confidence']:.2f}")
                print(f"\nResponse:")
                
                # Show first 500 chars
                response_preview = result['response'][:500]
                if len(result['response']) > 500:
                    response_preview += "..."
                print(response_preview)
                
                if result.get('sources'):
                    print(f"\nSources: {', '.join(result['sources'])}")
                
                if result.get('suggestions'):
                    print(f"Suggestions: {', '.join(result['suggestions'][:3])}")
                
                # Check intent matches
                if result['intent'] == test['expected_intent']:
                    print("\n✓ Test passed - Intent matched")
                else:
                    print(f"\n⚠ Intent mismatch (got {result['intent']}, expected {test['expected_intent']})")
                
            except Exception as e:
                print(f"✗ Test failed: {e}")
                import traceback
                traceback.print_exc()
            
            print()
            print()
        
        break  # Exit after first session
    
    print("=" * 70)
    print("  Testing Complete")
    print("=" * 70)
    print()
    print("Key observations:")
    print("  • All responses are generated by fine-tuned jarsh:latest model")
    print("  • Generic PQC questions use TRINETRA-specific knowledge")
    print("  • Scan queries return 'No scans found' if database is empty")
    print("  • Responses are contextual and use fine-tuned expertise")
    print("  • Model runs locally - no external API calls")
    print()
    print("Model details:")
    print(f"  Name: {jarsh.model}")
    print(f"  Location: ~/.ollama/models/")
    print(f"  Size: ~4GB")
    print(f"  Base: mistral:7b")
    print(f"  Fine-tuned: Yes (TRINETRA-specific)")
    print()
    print("To populate database with scans:")
    print("  1. Start API server: cd backend && uvicorn api.main:app --reload")
    print("  2. Run scan: POST /api/scan with {\"domain\": \"example.com\"}")
    print("  3. Test again to see scan-aware responses")
    print()
    print("To test model directly:")
    print("  ollama run jarsh:latest 'What is ML-KEM-768?'")
    print()


if __name__ == "__main__":
    asyncio.run(test_jarsh())
