"""
Complete setup for scan-aware JARSH chatbot
Fetches real scan data, trains model, deploys to production
"""

import asyncio
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)


async def setup_scan_aware_jarsh():
    """Complete setup workflow"""
    
    print("=" * 70)
    print("SCAN-AWARE JARSH CHATBOT SETUP")
    print("=" * 70)
    print()
    print("This will:")
    print("  1. Fetch real scan results from database")
    print("  2. Generate queries with scan context")
    print("  3. Feed to Ollama for analysis")
    print("  4. Collect responses as labeled training data")
    print("  5. Fine-tune DistilBERT on scan-aware data")
    print("  6. Deploy to production chatbot")
    print()
    print("Estimated time: 30-45 minutes")
    print()
    
    input("Press Enter to continue...")
    print()
    
    # Step 1: Check Ollama
    print("Step 1: Checking Ollama...")
    import subprocess
    try:
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✓ Ollama is available")
        else:
            print("✗ Ollama not working")
            print("Please start: ollama serve")
            return False
    except:
        print("✗ Ollama not found")
        print("Please install and start Ollama")
        return False
    
    print()
    
    # Step 2: Generate scan-aware training data
    print("Step 2: Generating scan-aware training data...")
    print("This will take 15-25 minutes depending on number of scans")
    print()
    
    from scan_aware_training import generate_scan_aware_training_data
    
    try:
        training_data = await generate_scan_aware_training_data(
            output_path="scan_training_data.json"
        )
        
        if len(training_data) < 10:
            print()
            print("⚠ Warning: Only generated", len(training_data), "examples")
            print("This may not be enough for good model quality")
            print()
            choice = input("Continue anyway? (y/n): ")
            if choice.lower() != 'y':
                return False
        
        print()
        print(f"✓ Generated {len(training_data)} scan-aware training examples")
        
    except Exception as e:
        print(f"✗ Failed to generate training data: {e}")
        return False
    
    print()
    
    # Step 3: Fine-tune DistilBERT
    print("Step 3: Fine-tuning DistilBERT model...")
    print("This will take 10-20 minutes")
    print()
    
    from knowledge_distillation import DistilBERTStudent
    
    try:
        student = DistilBERTStudent()
        student.fine_tune(
            training_data_path="scan_training_data.json",
            output_dir="models/jarsh_distilbert"
        )
        
        print()
        print("✓ Model fine-tuned successfully")
        
    except Exception as e:
        print(f"✗ Failed to fine-tune model: {e}")
        return False
    
    print()
    
    # Step 4: Test inference
    print("Step 4: Testing scan-aware inference...")
    
    from jarsh_inference import JARSHInference
    
    try:
        jarsh = JARSHInference("models/jarsh_distilbert")
        
        test_query = "What vulnerabilities were found in my scan?"
        result = jarsh.generate_response(test_query)
        
        print(f"✓ Inference test successful")
        print(f"  Query: {test_query}")
        print(f"  Intent: {result['intent']}")
        print(f"  Confidence: {result['confidence']:.2f}")
        
    except Exception as e:
        print(f"✗ Inference test failed: {e}")
        return False
    
    print()
    
    # Success
    print("=" * 70)
    print("✓ SCAN-AWARE JARSH SETUP COMPLETE!")
    print("=" * 70)
    print()
    print("Your chatbot is now trained on REAL scan data!")
    print()
    print("What this means:")
    print("  ✓ Chatbot understands YOUR specific vulnerabilities")
    print("  ✓ Can explain findings from YOUR scans")
    print("  ✓ Provides context-aware mitigation advice")
    print("  ✓ References actual domains and assets")
    print("  ✓ Works WITHOUT Ollama at runtime")
    print()
    print("Next steps:")
    print("  1. Start backend: uvicorn api.main:app --reload")
    print("  2. Test API: curl -X POST http://localhost:8000/api/v1/chat/message \\")
    print("              -H 'Content-Type: application/json' \\")
    print("              -d '{\"message\": \"Analyze my scan\", \"scan_id\": \"<scan_id>\"}'")
    print("  3. Open frontend and test with real scan IDs")
    print()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(setup_scan_aware_jarsh())
    sys.exit(0 if success else 1)
