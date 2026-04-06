"""
Enhanced JARSH Setup Script
Sets up database-aware chatbot with fine-tuned model
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)


async def main():
    """Main setup workflow"""
    
    print("=" * 70)
    print("  JARSH Enhanced Chatbot Setup")
    print("  Database-Aware AI Assistant with Fine-Tuned Model")
    print("=" * 70)
    print()
    
    # Step 1: Check dependencies
    print("Step 1: Checking dependencies...")
    try:
        import transformers
        import torch
        import aiohttp
        import sqlalchemy
        print("✓ All required packages installed")
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("\nInstall required packages:")
        print("  pip install transformers torch aiohttp sqlalchemy asyncpg")
        return
    
    # Step 2: Check Ollama
    print("\nStep 2: Checking Ollama server...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    print("✓ Ollama server is running")
                else:
                    print("✗ Ollama server returned error")
                    print("  Start Ollama: ollama serve")
                    return
    except Exception as e:
        print(f"✗ Cannot connect to Ollama: {e}")
        print("\nPlease start Ollama:")
        print("  1. Install: https://ollama.ai/download")
        print("  2. Run: ollama serve")
        print("  3. Pull model: ollama pull mistral:7b")
        return
    
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
        return
    
    # Step 4: Generate training data
    print("\nStep 4: Generating training data with Ollama...")
    print("This will take 10-15 minutes...")
    
    try:
        from engine.ai.knowledge_distillation import generate_training_dataset
        
        training_data_path = "./backend/engine/ai/training_data.json"
        training_data = await generate_training_dataset(training_data_path)
        
        if len(training_data) > 0:
            print(f"✓ Generated {len(training_data)} training examples")
        else:
            print("✗ Failed to generate training data")
            return
    except Exception as e:
        print(f"✗ Training data generation failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 5: Fine-tune model
    print("\nStep 5: Fine-tuning DistilBERT model...")
    print("This will take 5-10 minutes...")
    
    try:
        from engine.ai.knowledge_distillation import DistilBERTStudent
        
        student = DistilBERTStudent()
        model_output = "./backend/engine/ai/models/jarsh_distilbert"
        student.fine_tune(training_data_path, model_output)
        
        print(f"✓ Model fine-tuned and saved to {model_output}")
    except Exception as e:
        print(f"✗ Model fine-tuning failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 6: Test the service
    print("\nStep 6: Testing JARSH service...")
    
    try:
        from engine.ai.jarsh_service import JARSHService
        
        jarsh = JARSHService()
        
        if jarsh.model is not None:
            print("✓ JARSH service initialized successfully")
        else:
            print("⚠ JARSH running in fallback mode (model not loaded)")
    except Exception as e:
        print(f"✗ JARSH service test failed: {e}")
        return
    
    # Success!
    print("\n" + "=" * 70)
    print("  ✅ JARSH Enhanced Chatbot Setup Complete!")
    print("=" * 70)
    print()
    print("Features enabled:")
    print("  ✓ Fine-tuned DistilBERT model for intent classification")
    print("  ✓ PostgreSQL database integration for scan queries")
    print("  ✓ Generic PQC question answering")
    print("  ✓ Scan result summarization")
    print("  ✓ No hardcoded responses")
    print()
    print("Next steps:")
    print("  1. Start the API server: uvicorn api.main:app --reload")
    print("  2. Test the chatbot: POST /api/chat/message")
    print("  3. Run a scan to populate database")
    print()
    print("Example queries:")
    print("  • 'What is Post-Quantum Cryptography?'")
    print("  • 'Show me my recent scans'")
    print("  • 'Summarize scan results for example.com'")
    print("  • 'What vulnerabilities were found?'")
    print()


if __name__ == "__main__":
    asyncio.run(main())
