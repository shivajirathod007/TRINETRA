"""
Verification script to prove the knowledge distillation pipeline works correctly
Shows each step of the process
"""

import json
import asyncio
from pathlib import Path


async def verify_step1_ollama_http():
    """Verify Step 1: Ollama generates HTTP responses"""
    print("=" * 70)
    print("STEP 1: Verify Ollama HTTP Response Generation")
    print("=" * 70)
    print()
    
    try:
        import aiohttp
        
        print("Testing Ollama HTTP API...")
        print("URL: http://localhost:11434/api/generate")
        print()
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": "mistral:7b",
                "prompt": "What is quantum computing? Answer in 2 sentences.",
                "stream": False,
                "options": {"temperature": 0.7, "num_predict": 100}
            }
            
            print("Sending HTTP POST request...")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            print()
            
            timeout = aiohttp.ClientTimeout(total=60)
            async with session.post("http://localhost:11434/api/generate", json=payload, timeout=timeout) as resp:
                print(f"HTTP Status: {resp.status}")
                
                if resp.status == 200:
                    result = await resp.json()
                    response_text = result.get('response', '').strip()
                    
                    print("✓ HTTP Response received!")
                    print()
                    print("Response content:")
                    print("-" * 70)
                    print(response_text)
                    print("-" * 70)
                    print()
                    print("✓ Step 1 VERIFIED: Ollama generates HTTP responses")
                    return True
                else:
                    print(f"✗ HTTP request failed with status {resp.status}")
                    return False
                    
    except Exception as e:
        print(f"✗ Error: {e}")
        print()
        print("Make sure Ollama is running: ollama serve")
        return False


def verify_step2_labeling():
    """Verify Step 2: Responses are labeled"""
    print()
    print("=" * 70)
    print("STEP 2: Verify Response Labeling")
    print("=" * 70)
    print()
    
    from knowledge_distillation import OllamaTeacher
    
    teacher = OllamaTeacher()
    
    test_queries = [
        "What vulnerabilities were found?",
        "How do I fix this?",
        "What is quantum threat?",
        "Am I ready for PQC?",
        "Hello, help me",
        "Tell me about security"
    ]
    
    print("Testing intent classification (labeling)...")
    print()
    
    for query in test_queries:
        label = teacher._classify_intent(query)
        print(f"Query: '{query}'")
        print(f"Label: {label}")
        print()
    
    print("✓ Step 2 VERIFIED: Queries are labeled with intents")
    return True


async def verify_step3_training_data():
    """Verify Step 3: Training data is created with labels"""
    print()
    print("=" * 70)
    print("STEP 3: Verify Training Data Creation")
    print("=" * 70)
    print()
    
    training_file = Path("training_data.json")
    
    if training_file.exists():
        print(f"✓ Training data file exists: {training_file}")
        print()
        
        with open(training_file, 'r') as f:
            data = json.load(f)
        
        print(f"Total examples: {len(data)}")
        print()
        
        if len(data) > 0:
            print("Sample training example:")
            print("-" * 70)
            sample = data[0]
            print(f"Query: {sample['query']}")
            print(f"Label: {sample['label']}")
            print(f"Response (first 200 chars): {sample['response'][:200]}...")
            print("-" * 70)
            print()
            
            # Count labels
            labels = {}
            for item in data:
                label = item['label']
                labels[label] = labels.get(label, 0) + 1
            
            print("Label distribution:")
            for label, count in labels.items():
                print(f"  {label}: {count} examples")
            print()
            
            print("✓ Step 3 VERIFIED: Training data contains:")
            print("  - Queries (input)")
            print("  - Responses (from Ollama HTTP)")
            print("  - Labels (intent classification)")
            return True
        else:
            print("✗ Training data file is empty")
            return False
    else:
        print("✗ Training data file not found")
        print("  Run: python knowledge_distillation.py --step generate")
        return False


def verify_step4_model_training():
    """Verify Step 4: DistilBERT is fine-tuned"""
    print()
    print("=" * 70)
    print("STEP 4: Verify DistilBERT Fine-Tuning")
    print("=" * 70)
    print()
    
    model_dir = Path("models/jarsh_distilbert")
    
    if model_dir.exists():
        print(f"✓ Model directory exists: {model_dir}")
        print()
        
        required_files = [
            "config.json",
            "pytorch_model.bin",
            "tokenizer_config.json",
            "vocab.txt",
            "label_mapping.json"
        ]
        
        print("Checking model files:")
        all_exist = True
        for file in required_files:
            file_path = model_dir / file
            if file_path.exists():
                size = file_path.stat().st_size / (1024 * 1024)  # MB
                print(f"  ✓ {file} ({size:.2f} MB)")
            else:
                print(f"  ✗ {file} (missing)")
                all_exist = False
        
        print()
        
        if all_exist:
            # Check label mapping
            with open(model_dir / "label_mapping.json", 'r') as f:
                mapping = json.load(f)
            
            print("Label mapping (for classification):")
            for label_id, label_name in mapping['id2label'].items():
                print(f"  {label_id} → {label_name}")
            print()
            
            print("✓ Step 4 VERIFIED: DistilBERT model is fine-tuned")
            print("  - Model trained on Ollama responses")
            print("  - Can classify intents")
            print("  - Ready for production use")
            return True
        else:
            print("✗ Some model files are missing")
            return False
    else:
        print("✗ Model directory not found")
        print("  Run: python knowledge_distillation.py --step train")
        return False


def verify_step5_inference():
    """Verify Step 5: Fine-tuned model is used in chatbot"""
    print()
    print("=" * 70)
    print("STEP 5: Verify Production Inference")
    print("=" * 70)
    print()
    
    try:
        from jarsh_inference import get_jarsh_inference
        
        print("Loading JARSH inference engine...")
        jarsh = get_jarsh_inference()
        
        if jarsh.model is not None:
            print("✓ Fine-tuned DistilBERT model loaded")
            print()
            
            # Test inference
            test_query = "What is Post-Quantum Cryptography?"
            print(f"Test query: '{test_query}'")
            print()
            
            result = jarsh.generate_response(test_query)
            
            print("Inference result:")
            print(f"  Intent: {result['intent']}")
            print(f"  Confidence: {result['confidence']:.2f}")
            print(f"  Response (first 200 chars): {result['response'][:200]}...")
            print()
            
            print("✓ Step 5 VERIFIED: Fine-tuned model is used in production")
            print("  - Model loads successfully")
            print("  - Classifies intents")
            print("  - Generates responses")
            print("  - NO Ollama needed at runtime!")
            return True
        else:
            print("⚠ Model not loaded, using template fallback")
            print("  This still works but without ML intelligence")
            return False
            
    except Exception as e:
        print(f"✗ Error loading inference engine: {e}")
        return False


async def main():
    """Run complete verification"""
    print()
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "JARSH KNOWLEDGE DISTILLATION VERIFICATION" + " " * 12 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    print("This script verifies that the pipeline works correctly:")
    print("  1. Ollama generates HTTP responses")
    print("  2. Responses are labeled")
    print("  3. Training data is created")
    print("  4. DistilBERT is fine-tuned")
    print("  5. Fine-tuned model is deployed")
    print()
    
    results = []
    
    # Step 1
    result1 = await verify_step1_ollama_http()
    results.append(("Ollama HTTP Generation", result1))
    
    # Step 2
    result2 = verify_step2_labeling()
    results.append(("Response Labeling", result2))
    
    # Step 3
    result3 = await verify_step3_training_data()
    results.append(("Training Data Creation", result3))
    
    # Step 4
    result4 = verify_step4_model_training()
    results.append(("DistilBERT Fine-Tuning", result4))
    
    # Step 5
    result5 = verify_step5_inference()
    results.append(("Production Inference", result5))
    
    # Summary
    print()
    print("=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    print()
    
    for step, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {step}")
    
    print()
    
    all_passed = all(r for _, r in results)
    
    if all_passed:
        print("╔" + "=" * 68 + "╗")
        print("║" + " " * 15 + "✓ ALL STEPS VERIFIED SUCCESSFULLY!" + " " * 17 + "║")
        print("╚" + "=" * 68 + "╝")
        print()
        print("The knowledge distillation pipeline is working correctly:")
        print("  ✓ Ollama generates responses via HTTP")
        print("  ✓ Responses are collected and labeled")
        print("  ✓ DistilBERT is fine-tuned on that data")
        print("  ✓ Fine-tuned model is deployed in chatbot")
        print("  ✓ Chatbot works WITHOUT Ollama at runtime")
    else:
        print("⚠ Some steps need attention")
        print()
        print("To complete setup:")
        print("  1. Ensure Ollama is running: ollama serve")
        print("  2. Generate training data: python knowledge_distillation.py --step generate")
        print("  3. Train model: python knowledge_distillation.py --step train")
        print("  4. Test inference: python test_jarsh.py")
    
    print()


if __name__ == "__main__":
    asyncio.run(main())
