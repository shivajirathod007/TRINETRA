# Speed Up JARSH Chatbot

## Current Performance Issue

Your chatbot is slow because:
- **Model Size:** 4.4GB Mistral 7B model
- **Token Generation:** Was generating 512 tokens (now reduced to 200)
- **CPU Processing:** No GPU acceleration
- **Hardware:** Depends on your CPU/RAM

**Typical Response Times:**
- Fast PC (16GB RAM, modern CPU): 5-10 seconds
- Average PC (8GB RAM): 10-20 seconds  
- Slow PC (4GB RAM, old CPU): 20-40 seconds

---

## Quick Fixes (Already Applied)

### ✅ Fix 1: Reduced Response Length
Changed `num_predict` from 512 to 200 tokens.

**Impact:** 40-50% faster responses

**What changed:**
- Before: ~400 word responses (20-30 seconds)
- After: ~150 word responses (10-15 seconds)

---

## Additional Speed Improvements

### Option 1: Use Quantized Model (Recommended)

Quantized models are 2-3x faster with minimal quality loss.

**Step 1: Pull quantized Mistral**
```bash
ollama pull mistral:7b-q4_0
```

**Step 2: Create faster JARSH model**
```bash
# Create Modelfile.jarsh-fast
cat > Modelfile.jarsh-fast << 'EOF'
FROM mistral:7b-q4_0

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_predict 200

SYSTEM """You are JARSH (Just Another Readable Security Helper), an AI assistant specializing in Post-Quantum Cryptography (PQC) and quantum security threats. You provide clear, concise answers about:

- Post-Quantum Cryptography (PQC) algorithms
- Quantum computing threats to current encryption
- NIST PQC standards (ML-KEM, ML-DSA, SLH-DSA)
- Cryptographic migration strategies
- Security scan results and vulnerabilities

Keep responses brief and technical. Focus on actionable information."""
EOF

# Create the model
ollama create jarsh-fast -f Modelfile.jarsh-fast
```

**Step 3: Update docker-compose.yml**
```yaml
api:
  environment:
    - OLLAMA_MODEL=jarsh-fast
```

**Step 4: Restart**
```bash
docker-compose restart api
```

**Expected Speed:** 5-10 seconds per response

---

### Option 2: Use Smaller Model (Fastest)

Use a 3B parameter model instead of 7B.

**Step 1: Pull smaller model**
```bash
ollama pull phi3:mini
```

**Step 2: Create JARSH with phi3**
```bash
cat > Modelfile.jarsh-mini << 'EOF'
FROM phi3:mini

PARAMETER temperature 0.7
PARAMETER num_predict 150

SYSTEM """You are JARSH, a PQC security assistant. Provide brief, technical answers about quantum cryptography, PQC algorithms, and security threats."""
EOF

ollama create jarsh-mini -f Modelfile.jarsh-mini
```

**Step 3: Update docker-compose.yml**
```yaml
api:
  environment:
    - OLLAMA_MODEL=jarsh-mini
```

**Expected Speed:** 2-5 seconds per response

**Trade-off:** Slightly less detailed responses

---

### Option 3: Optimize Ollama Settings

**Step 1: Set Ollama to use more CPU threads**

Windows:
```powershell
$env:OLLAMA_NUM_THREADS = "8"
ollama serve
```

Linux/Mac:
```bash
export OLLAMA_NUM_THREADS=8
ollama serve
```

**Step 2: Increase context window efficiency**

Update `jarsh_service.py`:
```python
"options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_predict": 150,  # Even shorter
    "num_ctx": 2048,     # Smaller context window
    "num_thread": 8      # Use more CPU threads
}
```

---

### Option 4: Enable Streaming (Best UX)

Instead of waiting for the full response, stream it word-by-word.

**Update jarsh_service.py:**

```python
async def _call_ollama_stream(self, prompt: str, context: str = "") -> AsyncGenerator[str, None]:
    """Stream Ollama response for faster perceived performance"""
    full_prompt = f"Context:\n{context}\n\nUser Question: {prompt}" if context else prompt
    
    async with aiohttp.ClientSession() as session:
        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": True,  # Enable streaming
            "options": {
                "temperature": 0.7,
                "num_predict": 200
            }
        }
        
        async with session.post(
            f"{self.ollama_host}/api/generate",
            json=payload
        ) as resp:
            async for line in resp.content:
                if line:
                    data = json.loads(line)
                    if 'response' in data:
                        yield data['response']
```

**Update chat.py route:**
```python
from fastapi.responses import StreamingResponse

@router.post("/message/stream")
async def send_chat_message_stream(request: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    async def generate():
        async for chunk in jarsh_service._call_ollama_stream(request.message):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Update frontend:**
```typescript
const eventSource = new EventSource('/api/v1/chat/message/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Append chunk to message
};
```

**Impact:** Response appears to start in 1-2 seconds, builds gradually

---

## Performance Comparison

| Solution | Response Time | Quality | Setup Difficulty |
|----------|--------------|---------|------------------|
| Current (512 tokens) | 20-30s | Excellent | ✅ Done |
| Reduced tokens (200) | 10-15s | Very Good | ✅ Done |
| Quantized model | 5-10s | Very Good | Easy |
| Smaller model (3B) | 2-5s | Good | Easy |
| Streaming | 1-2s start | Excellent | Medium |
| GPU acceleration | 1-3s | Excellent | Hard |

---

## Recommended Setup (Best Balance)

**For Development:**
```bash
# 1. Pull quantized model
ollama pull mistral:7b-q4_0

# 2. Create fast JARSH
ollama create jarsh-fast -f Modelfile.jarsh-fast

# 3. Update docker-compose.yml
# Change OLLAMA_MODEL=jarsh-fast

# 4. Restart
docker-compose restart api
```

**Expected Result:** 5-10 second responses with good quality

---

## Quick Test

After making changes, test the speed:

```bash
# Time a request
time curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PQC?", "context": "general"}'
```

**Target:** Under 10 seconds

---

## Hardware Recommendations

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 10GB free

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB
- Disk: 20GB free
- GPU: NVIDIA with 8GB+ VRAM (optional)

**With GPU:**
- Install CUDA toolkit
- Use `ollama` with GPU support
- Response time: 1-3 seconds

---

## Monitoring Performance

**Check Ollama performance:**
```bash
# Windows
Get-Process ollama | Select-Object CPU, WorkingSet

# Linux/Mac
top -p $(pgrep ollama)
```

**Check response time in logs:**
```bash
docker-compose logs api | grep "chat_response_generated"
```

---

## Current Status After Fix

✅ Reduced token generation from 512 to 200  
⏱️ Expected improvement: 40-50% faster  
📊 New response time: 10-15 seconds (was 20-30s)  

**Next Step:** Install quantized model for another 2x speedup

---

## Apply Quantized Model Now

Run this to get 2-3x faster responses:

```bash
# Pull quantized model
ollama pull mistral:7b-q4_0

# Update docker-compose.yml
# Change: OLLAMA_MODEL=mistral:7b-q4_0

# Restart
docker-compose restart api

# Test
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "context": "general"}'
```

Should respond in 5-10 seconds instead of 20-30 seconds!
