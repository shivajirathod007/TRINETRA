"""
Complete Setup Verification Script
Checks that everything is working correctly
"""

import subprocess
import requests
import json
import sys
from pathlib import Path

def print_header(text):
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70 + "\n")

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_warning(text):
    print(f"⚠️  {text}")

def check_ollama():
    """Check if Ollama is running and has the fine-tuned model"""
    print_header("1. Checking Ollama")
    
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            print_success("Ollama is running")
            
            models = response.json().get('models', [])
            model_names = [m['name'] for m in models]
            
            if 'jarsh-finetuned:latest' in model_names:
                print_success("Fine-tuned model 'jarsh-finetuned' found")
                return True
            else:
                print_error("Fine-tuned model 'jarsh-finetuned' not found")
                print_warning("Available models: " + ", ".join(model_names))
                print_warning("Run: python finetune_jarsh.py")
                return False
        else:
            print_error(f"Ollama returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to Ollama: {e}")
        print_warning("Start Ollama with: ollama serve")
        return False

def check_docker():
    """Check if Docker containers are running"""
    print_header("2. Checking Docker Containers")
    
    try:
        result = subprocess.run(
            ["docker-compose", "ps"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            output = result.stdout
            
            services = {
                'trinetra_api': 'Backend API',
                'trinetra_frontend': 'Frontend',
                'trinetra_postgres': 'PostgreSQL',
                'trinetra_redis': 'Redis'
            }
            
            all_running = True
            for container, name in services.items():
                if container in output and 'Up' in output:
                    print_success(f"{name} is running")
                else:
                    print_error(f"{name} is not running")
                    all_running = False
            
            if not all_running:
                print_warning("Start services with: docker-compose up -d")
            
            return all_running
        else:
            print_error("Docker Compose not available")
            return False
    except Exception as e:
        print_error(f"Cannot check Docker: {e}")
        return False

def check_backend():
    """Check if backend API is responding"""
    print_header("3. Checking Backend API")
    
    try:
        # Check health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print_success("Backend API is responding")
        else:
            print_error(f"Backend returned status {response.status_code}")
            return False
        
        # Check chat health
        response = requests.get("http://localhost:8000/api/v1/chat/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Chat service is responding")
            
            if data.get('ollama_status') == 'connected':
                print_success(f"Ollama connected: {data.get('ollama_host')}")
            else:
                print_error("Ollama is disconnected")
                return False
            
            if 'jarsh-finetuned' in data.get('model', ''):
                print_success("Using fine-tuned model")
            else:
                print_warning(f"Using model: {data.get('model')}")
            
            return True
        else:
            print_error("Chat service not responding")
            return False
    except Exception as e:
        print_error(f"Cannot connect to backend: {e}")
        print_warning("Check if containers are running: docker-compose ps")
        return False

def check_frontend():
    """Check if frontend is accessible"""
    print_header("4. Checking Frontend")
    
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print_success("Frontend is accessible")
            return True
        else:
            print_error(f"Frontend returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to frontend: {e}")
        return False

def test_chat():
    """Test sending a message to the chatbot"""
    print_header("5. Testing Chatbot")
    
    try:
        payload = {
            "message": "What is PQC?",
            "context": "general"
        }
        
        print("Sending test message: 'What is PQC?'")
        print("(This may take 10-20 seconds for first request...)")
        
        response = requests.post(
            "http://localhost:8000/api/v1/chat/message",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('response', '')
            
            if len(response_text) > 50:
                print_success("Chatbot responded successfully!")
                print(f"\nResponse preview:\n{response_text[:200]}...\n")
                print(f"Confidence: {data.get('confidence', 'N/A')}")
                return True
            else:
                print_error("Response too short or empty")
                return False
        else:
            print_error(f"Chat returned status {response.status_code}")
            return False
    except requests.Timeout:
        print_error("Request timed out (>60s)")
        print_warning("This might be normal for first request")
        print_warning("Try again - subsequent requests should be faster")
        return False
    except Exception as e:
        print_error(f"Chat test failed: {e}")
        return False

def check_session_persistence():
    """Check if session persistence is configured"""
    print_header("6. Checking Session Persistence")
    
    chatbot_file = Path("frontend/src/components/ChatBot/FloatingChatBot.tsx")
    
    if not chatbot_file.exists():
        print_error("FloatingChatBot.tsx not found")
        return False
    
    content = chatbot_file.read_text()
    
    checks = {
        'localStorage': 'localStorage.getItem' in content,
        'saveChatHistory': 'saveChatHistory' in content,
        'loadChatHistory': 'loadChatHistory' in content,
        'clearHistory': 'clearHistory' in content,
        'Trash2 icon': 'Trash2' in content
    }
    
    all_good = True
    for feature, present in checks.items():
        if present:
            print_success(f"{feature} implemented")
        else:
            print_error(f"{feature} missing")
            all_good = False
    
    return all_good

def main():
    print_header("JARSH Complete Setup Verification")
    print("This script checks that everything is configured correctly.\n")
    
    results = {
        "Ollama & Fine-tuned Model": check_ollama(),
        "Docker Containers": check_docker(),
        "Backend API": check_backend(),
        "Frontend": check_frontend(),
        "Chatbot Functionality": test_chat(),
        "Session Persistence": check_session_persistence()
    }
    
    print_header("Verification Summary")
    
    passed = sum(results.values())
    total = len(results)
    
    for check, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check}")
    
    print(f"\nScore: {passed}/{total} checks passed")
    
    if passed == total:
        print_header("🎉 All Checks Passed!")
        print("Your JARSH chatbot is fully configured and working!\n")
        print("Next steps:")
        print("1. Open http://localhost:3000")
        print("2. Click the red JARSH button")
        print("3. Start chatting!")
        print("\nFeatures:")
        print("- Fine-tuned model with TRINETRA knowledge")
        print("- Session persistence (survives page reload)")
        print("- Optimized for 5-15 second responses")
        print("- Clear history button in chat header")
        return 0
    else:
        print_header("⚠️  Some Checks Failed")
        print("Please fix the issues above and run this script again.\n")
        print("Common fixes:")
        print("- Start Ollama: ollama serve")
        print("- Fine-tune model: python finetune_jarsh.py")
        print("- Start containers: docker-compose up -d")
        print("- Wait 30 seconds for services to start")
        return 1

if __name__ == "__main__":
    sys.exit(main())
