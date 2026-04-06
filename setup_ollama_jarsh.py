"""
Simple JARSH Setup with Ollama
No training required - uses Ollama directly
"""

import asyncio
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
    print("  JARSH Chatbot Setup (Ollama-Powered)")
    print("  Database-Aware AI Assistant")
    print("=" * 70)
    print()
    
    # Step 1: Check dependencies
    print("Step 1: Checking dependencies...")
    try:
        import aiohttp
        import sqlalchemy
        print("✓ All required packages installed")
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("\nInstall required packages:")
        print("  pip install aiohttp sqlalchemy asyncpg")
        return False
    
    # Step 2: Check Ollama
    print("\nStep 2: Checking Ollama server...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    models = [m['name'] for m in data.get('models', [])]
                    print("✓ Ollama server is running")
                    print(f"  Available models: {', '.join(models) if models else 'None'}")
                    
                    # Check for mistral
                    if not any('mistral' in m for m in models):
                        print("\n⚠ Mistral model not found. Pulling it now...")
                        print("  This may take a few minutes...")
                        import subprocess
                        result = subprocess.run(['ollama', 'pull', 'mistral:7b'], capture_output=True)
                        if result.returncode == 0:
                            print("✓ Mistral model downloaded")
                        else:
                            print("✗ Failed to download Mistral model")
                            print("  Run manually: ollama pull mistral:7b")
                            return False
                else:
                    print("✗ Ollama server returned error")
                    print("  Start Ollama: ollama serve")
                    return False
    except Exception as e:
        print(f"✗ Cannot connect to Ollama: {e}")
        print("\nPlease start Ollama:")
        print("  1. Install: https://ollama.ai/download")
        print("  2. Run: ollama serve")
        print("  3. Pull model: ollama pull mistral:7b")
        return False
    
    # Step 3: Check database
    print("\nStep 3: Checking database connection...")
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
    
    # Step 4: Test JARSH service
    print("\nStep 4: Testing JARSH service...")
    
    try:
        from engine.ai.jarsh_service import JARSHService
        
        jarsh = JARSHService()
        
        # Test Ollama connection
        if await jarsh._check_ollama():
            print("✓ JARSH service initialized successfully")
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
    print("  ✅ JARSH Chatbot Setup Complete!")
    print("=" * 70)
    print()
    print("Features enabled:")
    print("  ✓ Ollama-powered AI responses (Mistral 7B)")
    print("  ✓ PostgreSQL database integration for scan queries")
    print("  ✓ Generic PQC question answering")
    print("  ✓ Scan result summarization")
    print("  ✓ No hardcoded responses - all AI-generated")
    print()
    print("Next steps:")
    print("  1. Start the API server:")
    print("     cd backend && uvicorn api.main:app --reload")
    print()
    print("  2. Test the chatbot:")
    print("     python test_ollama_jarsh.py")
    print()
    print("  3. Try example queries:")
    print("     POST /api/chat/message")
    print("     {\"message\": \"What is Post-Quantum Cryptography?\"}")
    print()
    print("     POST /api/chat/message")
    print("     {\"message\": \"Show me my recent scans\"}")
    print()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
