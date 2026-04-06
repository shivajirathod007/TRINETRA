"""
Create Fine-Tuned JARSH Model with Ollama
Builds a custom model with TRINETRA-specific knowledge
"""

import subprocess
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def create_modelfile():
    """Create Ollama Modelfile with TRINETRA knowledge"""
    
    # Note: SYSTEM command content should NOT be wrapped in triple quotes
    modelfile_content = """# JARSH - Quantum Security Intelligence Assistant
# Fine-tuned for TRINETRA platform

FROM mistral:7b

# Set custom parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 512

# System prompt with TRINETRA-specific knowledge
SYSTEM You are JARSH (Quantum Security Intelligence Assistant), an expert AI assistant for the TRINETRA platform. You are an expert in Post-Quantum Cryptography (PQC), quantum threats, TLS/SSL security, vulnerability assessment, and migration planning. TRINETRA is a comprehensive quantum security assessment platform that scans domains, analyzes TLS/SSL configurations, identifies quantum vulnerabilities (Harvest Now Decrypt Later threats), generates Cryptographic Bill of Materials (CBOM), and provides PQC migration planning. You understand NIST PQC Standards including ML-KEM-768 for key exchange, ML-DSA-65 for digital signatures, and SLH-DSA-256 for hash-based signatures. You know about quantum threats like Shors Algorithm that breaks RSA and ECDSA, Grovers Algorithm that weakens symmetric encryption, and CRQC (Cryptographically-Relevant Quantum Computer) projected for 2028-2037. You understand HNDL (Harvest Now Decrypt Later) attacks where adversaries collect encrypted data today to decrypt later when quantum computers are available. You provide technical but accessible explanations, concise and actionable recommendations, and always prioritize security best practices. When users ask about their scans or assets, they refer to TRINETRA scan results. You help organizations transition to quantum-safe cryptography and understand their quantum security posture.
"""

    return modelfile_content


def save_modelfile(content: str, path: str = "Modelfile.jarsh"):
    """Save Modelfile to disk"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    log.info(f"✓ Modelfile saved to {path}")
    return path


def create_ollama_model(modelfile_path: str, model_name: str = "jarsh:latest"):
    """Create custom Ollama model from Modelfile"""
    try:
        log.info(f"Creating Ollama model '{model_name}' from {modelfile_path}...")
        log.info("This may take 5-10 minutes...")
        
        result = subprocess.run(
            ['ollama', 'create', model_name, '-f', modelfile_path],
            capture_output=True,
            text=True,
            check=True
        )
        
        log.info(f"✓ Model '{model_name}' created successfully!")
        log.info(result.stdout)
        return True
        
    except subprocess.CalledProcessError as e:
        log.error(f"✗ Failed to create model: {e}")
        log.error(e.stderr)
        return False
    except FileNotFoundError:
        log.error("✗ Ollama not found. Please install Ollama first:")
        log.error("  Download from: https://ollama.ai/download")
        return False


def test_model(model_name: str = "jarsh:latest"):
    """Test the created model"""
    try:
        log.info(f"\nTesting model '{model_name}'...")
        
        test_prompt = "What is Post-Quantum Cryptography?"
        
        result = subprocess.run(
            ['ollama', 'run', model_name, test_prompt],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            log.info("✓ Model test successful!")
            log.info(f"\nTest Query: {test_prompt}")
            log.info(f"\nResponse:\n{result.stdout[:500]}...")
            return True
        else:
            log.error(f"✗ Model test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        log.error("✗ Model test timeout")
        return False
    except Exception as e:
        log.error(f"✗ Model test error: {e}")
        return False


def main():
    """Main workflow"""
    
    print("=" * 70)
    print("  JARSH Model Creation - Fine-Tuned for TRINETRA")
    print("=" * 70)
    print()
    
    # Step 1: Check Ollama
    print("Step 1: Checking Ollama installation...")
    try:
        result = subprocess.run(['ollama', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Ollama installed: {result.stdout.strip()}")
        else:
            print("✗ Ollama not working properly")
            return False
    except FileNotFoundError:
        print("✗ Ollama not found")
        print("\nPlease install Ollama:")
        print("  Download from: https://ollama.ai/download")
        return False
    
    # Step 2: Check base model
    print("\nStep 2: Checking base model (mistral:7b)...")
    result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
    if 'mistral' in result.stdout:
        print("✓ Mistral base model found")
    else:
        print("⚠ Mistral model not found. Pulling it now...")
        print("  This may take 5-10 minutes (4GB download)...")
        pull_result = subprocess.run(['ollama', 'pull', 'mistral:7b'], capture_output=True, text=True)
        if pull_result.returncode == 0:
            print("✓ Mistral model downloaded")
        else:
            print("✗ Failed to download Mistral model")
            print("  Run manually: ollama pull mistral:7b")
            return False
    
    # Step 3: Create Modelfile
    print("\nStep 3: Creating JARSH Modelfile...")
    modelfile_content = create_modelfile()
    modelfile_path = save_modelfile(modelfile_content)
    
    # Step 4: Create custom model
    print("\nStep 4: Creating fine-tuned JARSH model...")
    print("  This creates a custom model with TRINETRA-specific knowledge")
    print("  The model will be saved locally on your laptop")
    print()
    
    if not create_ollama_model(modelfile_path, "jarsh:latest"):
        return False
    
    # Step 5: Test model
    print("\nStep 5: Testing JARSH model...")
    if not test_model("jarsh:latest"):
        print("⚠ Model created but test failed. You can still use it.")
    
    # Success!
    print("\n" + "=" * 70)
    print("  ✅ JARSH Model Created Successfully!")
    print("=" * 70)
    print()
    print("Model Details:")
    print(f"  Name: jarsh:latest")
    print(f"  Base: mistral:7b")
    print(f"  Size: ~4GB (stored locally)")
    print(f"  Location: ~/.ollama/models/")
    print()
    print("The model includes:")
    print("  ✓ TRINETRA platform knowledge")
    print("  ✓ Post-Quantum Cryptography expertise")
    print("  ✓ Vulnerability assessment understanding")
    print("  ✓ TLS/SSL security knowledge")
    print("  ✓ Migration planning capabilities")
    print()
    print("Next steps:")
    print("  1. Test: ollama run jarsh:latest 'What is ML-KEM-768?'")
    print("  2. Start API: cd backend && uvicorn api.main:app --reload")
    print("  3. Start frontend: cd frontend && npm run dev")
    print()
    print("To share with others:")
    print("  ollama save jarsh:latest jarsh-model.tar")
    print("  # Others can load it with: ollama load jarsh-model.tar")
    print()
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
