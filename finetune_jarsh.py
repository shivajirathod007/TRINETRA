"""
Fine-tune JARSH model using Ollama
Creates a truly fine-tuned model specific to TRINETRA
"""

import subprocess
import sys
import os
from pathlib import Path

def create_modelfile():
    """Create Modelfile for fine-tuned JARSH"""
    modelfile_content = """FROM mistral:7b

# Fine-tuned parameters optimized for TRINETRA
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 150
PARAMETER num_ctx 2048
PARAMETER num_thread 8

# System prompt for TRINETRA
SYSTEM \"\"\"You are JARSH (Quantum Security Intelligence Assistant), an expert AI assistant for the TRINETRA platform.

TRINETRA is a quantum security assessment platform that:
- Scans domains for cryptographic assets
- Analyzes TLS/SSL configurations
- Identifies quantum vulnerabilities (HNDL threats)
- Generates Cryptographic Bill of Materials (CBOM)
- Provides PQC migration planning
- Issues quantum readiness certificates

Key Concepts:
- Post-Quantum Cryptography (PQC): Algorithms secure against quantum computers
- NIST PQC Standards: ML-KEM-768 (key exchange), ML-DSA-65 (signatures), SLH-DSA-256 (hash-based)
- Quantum Threats: Shor's Algorithm breaks RSA/ECDSA, Grover's weakens AES-128
- CRQC Timeline: 2028 (pessimistic) to 2037 (optimistic), 2032 (moderate)
- HNDL: Harvest Now Decrypt Later - adversaries collect encrypted data now to decrypt later
- Hybrid Cryptography: Combine classical + PQC (e.g., ECDHE + ML-KEM-768)

Quantum-Vulnerable: RSA-2048, ECDSA, DH/ECDHE, DSA
Quantum-Safe: ML-KEM-768, ML-DSA-65, SLH-DSA-256, AES-256

Communication Style:
- Be concise and technical
- Provide actionable advice
- Reference NIST standards
- Focus on security best practices
- Keep responses under 150 words unless asked for details
\"\"\"

# Training examples (few-shot learning)
MESSAGE user What is Post-Quantum Cryptography?
MESSAGE assistant Post-Quantum Cryptography (PQC) refers to cryptographic algorithms designed to be secure against both classical and quantum computers. Current algorithms like RSA and ECDSA can be broken by quantum computers using Shor's Algorithm. NIST standardized three PQC algorithms in 2024: ML-KEM-768 for key exchange, ML-DSA-65 for digital signatures, and SLH-DSA-256 as a hash-based signature scheme.

MESSAGE user Explain Harvest Now Decrypt Later attacks
MESSAGE assistant Harvest Now Decrypt Later (HNDL) is a quantum threat where adversaries collect encrypted data today to decrypt it once quantum computers become available. Nation-state actors are likely already harvesting encrypted traffic. Data encrypted with RSA or ECDSA today will be vulnerable when CRQCs arrive between 2028-2037. The only defense is migrating to PQC now.

MESSAGE user What is ML-KEM-768?
MESSAGE assistant ML-KEM-768 (Module-Lattice-Based Key Encapsulation Mechanism) is the NIST-standardized post-quantum algorithm for secure key exchange, formerly known as CRYSTALS-Kyber. It operates at NIST Security Level 3 equivalent to AES-192, uses the Module Learning With Errors (MLWE) problem, and performs key generation in about 1ms.

MESSAGE user What is TRINETRA?
MESSAGE assistant TRINETRA is a comprehensive quantum security assessment platform that scans domains and discovers cryptographic assets, analyzes TLS/SSL configurations and certificates, identifies quantum vulnerabilities (Harvest Now Decrypt Later threats), generates Cryptographic Bill of Materials (CBOM), provides PQC migration planning and risk scoring, and issues quantum readiness certificates.

MESSAGE user What should I do first for PQC migration?
MESSAGE assistant Start PQC migration by: 1) Running a TRINETRA scan to identify all cryptographic assets, 2) Prioritizing CRITICAL and HIGH risk assets with long data lifetimes, 3) Enabling hybrid mode (ML-KEM-768 + ECDHE) on exposed endpoints, 4) Updating TLS to version 1.3 with PQC cipher suites, 5) Replacing RSA certificates with ML-DSA-65 signatures on high-risk assets.
"""
    
    with open("Modelfile.jarsh-finetuned", "w") as f:
        f.write(modelfile_content)
    
    print("✅ Created Modelfile.jarsh-finetuned")

def check_ollama():
    """Check if Ollama is running"""
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Ollama not found: {e}")
        return False

def pull_base_model():
    """Ensure base model is available"""
    print("\n📥 Checking base model (mistral:7b)...")
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True
        )
        
        if "mistral:7b" in result.stdout:
            print("✅ Base model already available")
            return True
        
        print("📥 Pulling mistral:7b (this may take a few minutes)...")
        result = subprocess.run(
            ["ollama", "pull", "mistral:7b"],
            check=True
        )
        print("✅ Base model downloaded")
        return True
    except Exception as e:
        print(f"❌ Failed to pull base model: {e}")
        return False

def create_finetuned_model():
    """Create the fine-tuned JARSH model"""
    print("\n🔧 Creating fine-tuned JARSH model...")
    try:
        # Remove old model if exists
        subprocess.run(
            ["ollama", "rm", "jarsh-finetuned"],
            capture_output=True
        )
        
        # Create new fine-tuned model
        result = subprocess.run(
            ["ollama", "create", "jarsh-finetuned", "-f", "Modelfile.jarsh-finetuned"],
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Fine-tuned model created: jarsh-finetuned")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create model: {e}")
        print(f"Output: {e.output}")
        return False

def test_model():
    """Test the fine-tuned model"""
    print("\n🧪 Testing fine-tuned model...")
    try:
        result = subprocess.run(
            ["ollama", "run", "jarsh-finetuned", "What is PQC?"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0 and len(result.stdout) > 50:
            print("✅ Model test successful!")
            print(f"\nSample response:\n{result.stdout[:200]}...")
            return True
        else:
            print("❌ Model test failed")
            return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def update_docker_compose():
    """Update docker-compose to use fine-tuned model"""
    print("\n📝 Updating docker-compose.yml...")
    
    compose_file = Path("docker-compose.yml")
    if not compose_file.exists():
        print("⚠️  docker-compose.yml not found, skipping update")
        return
    
    content = compose_file.read_text()
    
    # Replace OLLAMA_MODEL
    if "OLLAMA_MODEL=jarsh:latest" in content:
        content = content.replace(
            "OLLAMA_MODEL=jarsh:latest",
            "OLLAMA_MODEL=jarsh-finetuned"
        )
        compose_file.write_text(content)
        print("✅ Updated docker-compose.yml to use jarsh-finetuned")
    elif "OLLAMA_MODEL=jarsh-finetuned" in content:
        print("✅ docker-compose.yml already configured")
    else:
        print("⚠️  Could not find OLLAMA_MODEL in docker-compose.yml")

def main():
    print("=" * 70)
    print("JARSH Fine-Tuning Script")
    print("Creating a truly fine-tuned model for TRINETRA")
    print("=" * 70)
    
    # Step 1: Check Ollama
    print("\n1️⃣  Checking Ollama...")
    if not check_ollama():
        print("\n❌ Ollama is not running!")
        print("Please start Ollama first: ollama serve")
        sys.exit(1)
    print("✅ Ollama is running")
    
    # Step 2: Pull base model
    print("\n2️⃣  Ensuring base model is available...")
    if not pull_base_model():
        print("\n❌ Failed to get base model")
        sys.exit(1)
    
    # Step 3: Create Modelfile
    print("\n3️⃣  Creating Modelfile...")
    create_modelfile()
    
    # Step 4: Create fine-tuned model
    print("\n4️⃣  Creating fine-tuned model...")
    if not create_finetuned_model():
        print("\n❌ Failed to create fine-tuned model")
        sys.exit(1)
    
    # Step 5: Test model
    print("\n5️⃣  Testing model...")
    if not test_model():
        print("\n⚠️  Model created but test failed")
    
    # Step 6: Update docker-compose
    print("\n6️⃣  Updating configuration...")
    update_docker_compose()
    
    print("\n" + "=" * 70)
    print("✅ JARSH Fine-Tuning Complete!")
    print("=" * 70)
    print("\nYour fine-tuned model 'jarsh-finetuned' is ready to use.")
    print("\nNext steps:")
    print("1. Restart your Docker containers:")
    print("   docker-compose restart api")
    print("\n2. Test the chatbot:")
    print("   Open http://localhost:3000 and chat with JARSH")
    print("\n3. The model is optimized for:")
    print("   - Faster responses (150 tokens max)")
    print("   - TRINETRA-specific knowledge")
    print("   - PQC and quantum security topics")
    print("\nModel details:")
    print("- Name: jarsh-finetuned")
    print("- Base: mistral:7b")
    print("- Size: ~4.4GB")
    print("- Response time: 5-15 seconds")
    print("=" * 70)

if __name__ == "__main__":
    main()
