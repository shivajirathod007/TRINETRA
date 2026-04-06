"""
Complete JARSH Setup with Fine-Tuned Local Model
Creates a custom Ollama model with TRINETRA knowledge
"""

import asyncio
import subprocess
import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)


async def main():
    """Main setup workflow"""
    
    print("=" * 70)
    print("  JARSH Complete Setup - Fine-Tuned Local Model")
    print("  Database-Aware AI with TRINETRA-Specific Knowledge")
    print("=" * 70)
    print()
    
    # Step 1: Check dependencies
    print("Step 1: Checking Python dependencies...")
    try:
        import aiohttp
        import sqlalchemy
        print("✓ Python packages installed")
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("\nInstall required packages:")
        print("  pip install aiohttp sqlalchemy asyncpg")
        return False
    
    # Step 2: Check Ollama
    print("\nStep 2: Checking Ollama installation...")
    try:
        result = subprocess.run(['ollama', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Ollama installed: {result.stdout.strip()}")
        else:
            print("✗ Ollama not working")
            return False
    except FileNotFoundError:
        print("✗ Ollama not found")
        print("\nPlease install Ollama:")
        print("  Download from: https://ollama.ai/download")
        print("  Or: brew install ollama (macOS)")
        return False
    
    # Step 3: Start Ollama server
    print("\nStep 3: Checking Ollama server...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags", timeout=aiohttp.ClientTimeout(total=3)) as resp:
                if resp.status == 200:
                    print("✓ Ollama server is running")
                else:
                    print("✗ Ollama server error")
                    return False
    except:
        print("✗ Ollama server not running")
        print("\nPlease start Ollama in another terminal:")
        print("  ollama serve")
        return False
    
    # Step 4: Create fine-tuned JARSH model
    print("\nStep 4: Creating fine-tuned JARSH model...")
    print("  This creates a custom model with TRINETRA-specific knowledge")
    print("  The model will be saved locally (~4GB)")
    print()
    
    result = subprocess.run([sys.executable, 'create_jarsh_model.py'], capture_output=False)
    if result.returncode != 0:
        print("✗ Failed to create JARSH model")
        return False
    
    # Step 5: Verify model
    print("\nStep 5: Verifying JARSH model...")
    result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
    if 'jarsh' in result.stdout:
        print("✓ JARSH model created and available")
    else:
        print("✗ JARSH model not found")
        return False
    
    # Step 6: Check database
    print("\nStep 6: Checking database connection...")
    try:
        from db.session import get_async_session
        from sqlalchemy import text
        
        async for session in get_async_session():
            result = await session.execute(text("SELECT 1"))
            if result.scalar() == 1:
                print("✓ PostgreSQL database connected")
            break
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("\nCheck your .env file and ensure PostgreSQL is running")
        return False
    
    # Step 7: Test JARSH service
    print("\nStep 7: Testing JARSH service...")
    
    try:
        from engine.ai.jarsh_service import JARSHService
        
        jarsh = JARSHService()  # Uses jarsh:latest by default
        
        # Test Ollama connection
        if await jarsh._check_ollama():
            print("✓ JARSH service initialized with fine-tuned model")
        else:
            print("⚠ JARSH service initialized but Ollama not responding")
            return False
    except Exception as e:
        print(f"✗ JARSH service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Success!
    print("\n" + "=" * 70)
    print("  ✅ JARSH Setup Complete!")
    print("=" * 70)
    print()
    print("What was created:")
    print("  ✓ Fine-tuned 'jarsh:latest' model (~4GB, stored locally)")
    print("  ✓ Model includes TRINETRA-specific knowledge:")
    print("    - Post-Quantum Cryptography expertise")
    print("    - TRINETRA platform understanding")
    print("    - Vulnerability assessment knowledge")
    print("    - TLS/SSL security expertise")
    print("    - Migration planning capabilities")
    print()
    print("Features enabled:")
    print("  ✓ Generic PQC Q&A using fine-tuned local model")
    print("  ✓ PostgreSQL database integration for scan queries")
    print("  ✓ Scan result summarization with AI")
    print("  ✓ No hardcoded responses - all AI-generated")
    print("  ✓ Works offline (no external API calls)")
    print()
    print("Model location:")
    print("  ~/.ollama/models/jarsh:latest")
    print()
    print("Next steps:")
    print("  1. Test the model:")
    print("     ollama run jarsh:latest 'What is Post-Quantum Cryptography?'")
    print()
    print("  2. Test the chatbot:")
    print("     python test_finetuned_jarsh.py")
    print()
    print("  3. Start the API server:")
    print("     cd backend && uvicorn api.main:app --reload")
    print()
    print("  4. Try example queries:")
    print("     POST /api/chat/message")
    print("     {\"message\": \"What is ML-KEM-768?\"}")
    print()
    print("To share the model with others:")
    print("  ollama save jarsh:latest jarsh-model.tar")
    print("  # Others load it with: ollama load jarsh-model.tar")
    print()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
