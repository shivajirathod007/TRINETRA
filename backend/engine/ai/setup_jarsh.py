"""
Setup script for JARSH chatbot using knowledge distillation
Run this to generate training data and fine-tune the model
"""

import asyncio
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
log = logging.getLogger(__name__)


def check_ollama_installed():
    """Check if Ollama is installed and running"""
    import subprocess
    
    try:
        result = subprocess.run(
            ['ollama', 'list'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def check_ollama_model(model_name: str = "mistral:7b"):
    """Check if required Ollama model is available"""
    import subprocess
    
    try:
        result = subprocess.run(
            ['ollama', 'list'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return model_name in result.stdout
    except:
        return False


def install_dependencies():
    """Install required Python packages"""
    import subprocess
    
    packages = [
        "transformers",
        "datasets",
        "torch",
        "aiohttp",
    ]
    
    log.info("Installing required packages...")
    for package in packages:
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", package],
                check=True,
                capture_output=True
            )
            log.info(f"✅ Installed {package}")
        except subprocess.CalledProcessError as e:
            log.error(f"❌ Failed to install {package}: {e}")
            return False
    
    return True


async def setup_jarsh():
    """Main setup workflow"""
    
    print("=" * 70)
    print("JARSH Chatbot Setup - Knowledge Distillation Pipeline")
    print("=" * 70)
    print()
    
    # Step 1: Check Ollama
    print("Step 1: Checking Ollama installation...")
    if not check_ollama_installed():
        print("❌ Ollama is not installed or not running")
        print()
        print("Please install Ollama:")
        print("  macOS:   brew install ollama")
        print("  Linux:   curl https://ollama.ai/install.sh | sh")
        print("  Windows: Download from https://ollama.ai")
        print()
        print("Then start Ollama server:")
        print("  ollama serve")
        print()
        return False
    
    print("✅ Ollama is installed")
    
    # Step 2: Check model
    print("\nStep 2: Checking Mistral model...")
    if not check_ollama_model("mistral:7b"):
        print("❌ Mistral 7B model not found")
        print()
        print("Please pull the model:")
        print("  ollama pull mistral:7b")
        print()
        print("This will download ~4.1GB and take 5-10 minutes")
        return False
    
    print("✅ Mistral 7B model is available")
    
    # Step 3: Install dependencies
    print("\nStep 3: Installing Python dependencies...")
    if not install_dependencies():
        print("❌ Failed to install dependencies")
        return False
    
    print("✅ All dependencies installed")
    
    # Step 4: Generate training data
    print("\nStep 4: Generating training data with Ollama...")
    print("This will take 5-10 minutes depending on your hardware")
    print()
    
    from knowledge_distillation import generate_training_dataset
    
    data_path = Path(__file__).parent / "training_data.json"
    
    try:
        training_data = await generate_training_dataset(str(data_path))
        print(f"✅ Generated {len(training_data)} training examples")
        print(f"   Saved to: {data_path}")
    except Exception as e:
        print(f"❌ Failed to generate training data: {e}")
        return False
    
    # Step 5: Fine-tune model
    print("\nStep 5: Fine-tuning DistilBERT model...")
    print("This will take 10-20 minutes depending on your hardware")
    print()
    
    from knowledge_distillation import DistilBERTStudent
    
    model_output = Path(__file__).parent / "models" / "jarsh_distilbert"
    
    try:
        student = DistilBERTStudent()
        student.fine_tune(str(data_path), str(model_output))
        print(f"✅ Model fine-tuned successfully")
        print(f"   Saved to: {model_output}")
    except Exception as e:
        print(f"❌ Failed to fine-tune model: {e}")
        return False
    
    # Step 6: Test inference
    print("\nStep 6: Testing inference...")
    
    from jarsh_inference import JARSHInference
    
    try:
        jarsh = JARSHInference(str(model_output))
        
        test_query = "What are the quantum threats to my infrastructure?"
        result = jarsh.generate_response(test_query)
        
        print(f"✅ Inference test successful")
        print(f"   Query: {test_query}")
        print(f"   Intent: {result['intent']}")
        print(f"   Confidence: {result['confidence']:.2f}")
    except Exception as e:
        print(f"❌ Inference test failed: {e}")
        return False
    
    # Success
    print()
    print("=" * 70)
    print("✅ JARSH Setup Complete!")
    print("=" * 70)
    print()
    print("Your chatbot is now ready to use with the fine-tuned model.")
    print("The model runs locally without calling Ollama at runtime.")
    print()
    print("Next steps:")
    print("  1. Start your FastAPI server")
    print("  2. Test the chatbot at /api/v1/chat/message")
    print("  3. The frontend will automatically use the new model")
    print()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(setup_jarsh())
    sys.exit(0 if success else 1)
