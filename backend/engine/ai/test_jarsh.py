"""
Test script for JARSH chatbot
Run this to verify the chatbot is working correctly
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from engine.ai.jarsh_inference import get_jarsh_inference


def test_jarsh():
    """Test JARSH inference with sample queries"""
    
    print("=" * 70)
    print("JARSH Chatbot Test")
    print("=" * 70)
    print()
    
    # Initialize JARSH
    print("Loading JARSH model...")
    jarsh = get_jarsh_inference()
    
    if jarsh.model is None:
        print("⚠️  Fine-tuned model not found. Using template fallback.")
        print("   Run 'python setup_jarsh.py' to train the model.")
    else:
        print("✅ Fine-tuned model loaded successfully")
    
    print()
    
    # Test queries
    test_queries = [
        "Hello, what can you help me with?",
        "What vulnerabilities were found in my scan?",
        "How do I fix the RSA vulnerability?",
        "What is the quantum threat?",
        "Am I ready for quantum attacks?",
        "Explain Post-Quantum Cryptography",
    ]
    
    print("Testing queries:")
    print("-" * 70)
    print()
    
    for i, query in enumerate(test_queries, 1):
        print(f"Query {i}: {query}")
        
        result = jarsh.generate_response(query)
        
        print(f"Intent: {result['intent']}")
        print(f"Confidence: {result['confidence']:.2f}")
        print(f"Response Preview: {result['response'][:150]}...")
        print(f"Suggestions: {', '.join(result['suggestions'][:2])}")
        print()
        print("-" * 70)
        print()
    
    print("✅ All tests completed successfully!")
    print()
    print("Next steps:")
    print("  1. Start FastAPI server: uvicorn api.main:app --reload")
    print("  2. Test API: curl -X POST http://localhost:8000/api/v1/chat/message \\")
    print("              -H 'Content-Type: application/json' \\")
    print("              -d '{\"message\": \"What is PQC?\", \"context\": \"general\"}'")
    print("  3. Open frontend and test the chatbot UI")
    print()


if __name__ == "__main__":
    try:
        test_jarsh()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
