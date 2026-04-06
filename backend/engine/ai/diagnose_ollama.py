"""
Diagnostic script to check Ollama setup and connectivity
Run this if you're having issues with training data generation
"""

import asyncio
import aiohttp
import sys


async def check_ollama_connection():
    """Check if Ollama server is accessible"""
    print("=" * 70)
    print("Ollama Diagnostic Tool")
    print("=" * 70)
    print()
    
    # Test 1: Check if server is running
    print("Test 1: Checking Ollama server connection...")
    try:
        async with aiohttp.ClientSession() as session:
            timeout = aiohttp.ClientTimeout(total=5)
            async with session.get("http://localhost:11434/api/tags", timeout=timeout) as resp:
                if resp.status == 200:
                    print("✓ Ollama server is running")
                    data = await resp.json()
                    models = data.get('models', [])
                    print(f"  Available models: {len(models)}")
                    for model in models:
                        print(f"    - {model.get('name', 'unknown')}")
                else:
                    print(f"✗ Ollama server returned status {resp.status}")
                    return False
    except Exception as e:
        print(f"✗ Cannot connect to Ollama server: {e}")
        print()
        print("Solutions:")
        print("  1. Start Ollama server: ollama serve")
        print("  2. Check if port 11434 is available")
        print("  3. Restart Ollama service")
        return False
    
    print()
    
    # Test 2: Check if Mistral model is available
    print("Test 2: Checking Mistral 7B model...")
    try:
        async with aiohttp.ClientSession() as session:
            timeout = aiohttp.ClientTimeout(total=5)
            async with session.get("http://localhost:11434/api/tags", timeout=timeout) as resp:
                data = await resp.json()
                models = data.get('models', [])
                model_names = [m.get('name', '') for m in models]
                
                if any('mistral' in name.lower() for name in model_names):
                    print("✓ Mistral model is available")
                else:
                    print("✗ Mistral model not found")
                    print()
                    print("Solutions:")
                    print("  1. Pull the model: ollama pull mistral:7b")
                    print("  2. Wait for download to complete (~4.1GB)")
                    return False
    except Exception as e:
        print(f"✗ Error checking models: {e}")
        return False
    
    print()
    
    # Test 3: Try generating a simple response
    print("Test 3: Testing response generation...")
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": "mistral:7b",
                "prompt": "Say 'Hello, I am working!' in one sentence.",
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 50
                }
            }
            
            timeout = aiohttp.ClientTimeout(total=60)
            print("  Sending test query to Ollama (may take 10-30 seconds)...")
            
            async with session.post("http://localhost:11434/api/generate", json=payload, timeout=timeout) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    response_text = result.get('response', '').strip()
                    
                    if response_text:
                        print(f"✓ Response generation working!")
                        print(f"  Sample response: {response_text[:100]}...")
                    else:
                        print("✗ Received empty response")
                        return False
                else:
                    error_text = await resp.text()
                    print(f"✗ Generation failed with status {resp.status}")
                    print(f"  Error: {error_text}")
                    return False
                    
    except asyncio.TimeoutError:
        print("✗ Request timed out")
        print()
        print("Solutions:")
        print("  1. Ollama might be slow on your hardware")
        print("  2. Try running: ollama run mistral:7b")
        print("  3. Check CPU/RAM usage")
        return False
    except Exception as e:
        print(f"✗ Error during generation: {e}")
        return False
    
    print()
    
    # Test 4: Check response time
    print("Test 4: Measuring response time...")
    try:
        import time
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": "mistral:7b",
                "prompt": "What is 2+2?",
                "stream": False,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 20
                }
            }
            
            start_time = time.time()
            timeout = aiohttp.ClientTimeout(total=60)
            
            async with session.post("http://localhost:11434/api/generate", json=payload, timeout=timeout) as resp:
                if resp.status == 200:
                    await resp.json()
                    elapsed = time.time() - start_time
                    print(f"✓ Response time: {elapsed:.2f} seconds")
                    
                    if elapsed < 5:
                        print("  Performance: Excellent")
                    elif elapsed < 15:
                        print("  Performance: Good")
                    elif elapsed < 30:
                        print("  Performance: Acceptable (training will be slow)")
                    else:
                        print("  Performance: Slow (consider using a faster machine)")
                        
    except Exception as e:
        print(f"⚠ Could not measure response time: {e}")
    
    print()
    print("=" * 70)
    print("✓ All diagnostics passed!")
    print("=" * 70)
    print()
    print("Your Ollama setup is working correctly.")
    print("You can now run the training pipeline:")
    print("  python setup_jarsh.py")
    print()
    
    return True


async def test_batch_generation():
    """Test generating multiple responses"""
    print()
    print("=" * 70)
    print("Batch Generation Test (Optional)")
    print("=" * 70)
    print()
    print("Testing generation of 3 responses...")
    print("This simulates the training data generation process.")
    print()
    
    test_queries = [
        "What is quantum computing?",
        "How does encryption work?",
        "What is a security vulnerability?"
    ]
    
    success_count = 0
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(test_queries, 1):
            try:
                print(f"Query {i}/3: {query}")
                
                payload = {
                    "model": "mistral:7b",
                    "prompt": f"Answer in 2-3 sentences: {query}",
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 100
                    }
                }
                
                timeout = aiohttp.ClientTimeout(total=60)
                async with session.post("http://localhost:11434/api/generate", json=payload, timeout=timeout) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        response_text = result.get('response', '').strip()
                        
                        if response_text:
                            print(f"✓ Success: {response_text[:80]}...")
                            success_count += 1
                        else:
                            print("✗ Empty response")
                    else:
                        print(f"✗ Failed with status {resp.status}")
                        
            except Exception as e:
                print(f"✗ Error: {str(e)[:100]}")
            
            print()
    
    print(f"Batch test result: {success_count}/3 successful")
    
    if success_count == 3:
        print("✓ Batch generation working perfectly!")
    elif success_count >= 2:
        print("⚠ Mostly working, but some failures occurred")
        print("  Training may have some errors but should complete")
    else:
        print("✗ Batch generation has issues")
        print("  Training will likely fail")
        print()
        print("Recommendations:")
        print("  1. Restart Ollama server")
        print("  2. Check system resources (RAM/CPU)")
        print("  3. Try a smaller model if available")
    
    print()


if __name__ == "__main__":
    print()
    success = asyncio.run(check_ollama_connection())
    
    if success:
        print("Run batch test? (y/n): ", end="")
        try:
            choice = input().strip().lower()
            if choice == 'y':
                asyncio.run(test_batch_generation())
        except:
            pass
    else:
        print()
        print("Please fix the issues above before running the training pipeline.")
        sys.exit(1)
