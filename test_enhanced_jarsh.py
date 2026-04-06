"""
Test Enhanced JARSH Chatbot
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
    """Test JARSH chatbot functionality"""
    
    print("=" * 70)
    print("  Testing Enhanced JARSH Chatbot")
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
    print("Initializing JARSH service...")
    jarsh = JARSHService()
    
    if jarsh.model is None:
        print("⚠ Warning: Model not loaded, running in fallback mode")
        print("Run setup_enhanced_jarsh.py to train the model")
    else:
        print("✓ Model loaded successfully")
    
    print()
    
    # Get database session
    async for db in get_async_session():
        
        # Test cases
        test_queries = [
            {
                "query": "Hello, what can you help me with?",
                "description": "Greeting test"
            },
            {
                "query": "What is Post-Quantum Cryptography?",
                "description": "Generic PQC question"
            },
            {
                "query": "Explain the quantum threat",
                "description": "Generic quantum threat question"
            },
            {
                "query": "Show me my recent scans",
                "description": "Database query - scan history"
            },
            {
                "query": "What vulnerabilities were found in my last scan?",
                "description": "Database query - scan analysis"
            },
            {
                "query": "How do I migrate to PQC?",
                "description": "Mitigation planning"
            },
            {
                "query": "What is my PQC readiness score?",
                "description": "Readiness assessment"
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
                
                print(f"Intent: {result['intent']}")
                print(f"Confidence: {result['confidence']:.2f}")
                print(f"Response:\n{result['response'][:300]}...")
                
                if result.get('sources'):
                    print(f"Sources: {', '.join(result['sources'])}")
                
                if result.get('suggestions'):
                    print(f"Suggestions: {', '.join(result['suggestions'][:3])}")
                
                print("✓ Test passed")
                
            except Exception as e:
                print(f"✗ Test failed: {e}")
                import traceback
                traceback.print_exc()
            
            print()
        
        break  # Exit after first session
    
    print("=" * 70)
    print("  Testing Complete")
    print("=" * 70)
    print()
    print("Key observations:")
    print("  • Generic PQC questions should use trained knowledge")
    print("  • Scan queries should return 'No scans found' if database is empty")
    print("  • All responses should be dynamic (no hardcoded values)")
    print()
    print("To populate database with scans:")
    print("  1. Start API server: uvicorn api.main:app --reload")
    print("  2. Run scan: POST /api/scan with {\"domain\": \"example.com\"}")
    print("  3. Test again to see scan-aware responses")
    print()


if __name__ == "__main__":
    asyncio.run(test_jarsh())
