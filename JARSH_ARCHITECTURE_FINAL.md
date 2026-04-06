# JARSH Chatbot - Final Architecture

## What You Actually Have (No Fine-Tuning)

Your chatbot uses **Ollama with a custom system prompt**, NOT a fine-tuned model.

### Architecture:

```
User Question
     ↓
Frontend (React)
     ↓
Backend API (FastAPI)
     ↓
JARSHService (jarsh_service.py)
     ↓
Ollama API (http://host.docker.internal:11434)
     ↓
jarsh:latest = Mistral 7B + Custom System Prompt
     ↓
AI Response
```

---

## What is jarsh:latest?

**jarsh:latest is NOT fine-tuned.** It's just:
- Base model: Mistral 7B (4.4GB, Q4_K_M quantization)
- Custom system prompt with TRINETRA knowledge
- Custom parameters (temperature, top_p, etc.)

Created via `Modelfile.jarsh`:
```dockerfile
FROM mistral:7b

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_predict 512

SYSTEM """
You are JARSH (Quantum Security Intelligence Assistant)...
[Custom instructions about PQC, TRINETRA, etc.]
"""
```

This is called **prompt engineering**, not fine-tuning.

---

## Fine-Tuning vs Prompt Engineering

### What You Have (Prompt Engineering):
- ✅ Fast to set up (5 minutes)
- ✅ No training required
- ✅ Easy to update (just edit Modelfile)
- ✅ Uses full Mistral 7B capabilities
- ❌ Slower responses (10-20s)
- ❌ Uses more resources (4.4GB RAM)

### What Was Mentioned (Fine-Tuning DistilBERT):
- ❌ Complex setup (hours)
- ❌ Requires training data generation
- ❌ Requires GPU for training
- ❌ Harder to update
- ✅ Faster responses (1-2s)
- ✅ Smaller model (250MB)
- ❌ Lower quality responses

**Decision: Stick with prompt engineering (what you have now)**

---

## Why Ollama Loads Model Every Time

Ollama has a **5-minute idle timeout**. After 5 minutes of no requests:
- Model is unloaded from RAM
- Next request: 40-60s (reload model)
- Subsequent requests: 10-20s (model in memory)

### Solution: Keep Model Loaded

Set Ollama to keep the model in memory for 24 hours:

```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"jarsh:latest","prompt":"keep alive","keep_alive":"24h","stream":false}'
```

Or add to backend startup.

---

## Current Implementation

### Backend (jarsh_service.py):
```python
class JARSHService:
    def __init__(self):
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = "jarsh:latest"  # Mistral 7B + custom prompt
    
    async def _call_ollama(self, prompt: str) -> str:
        # Calls Ollama API for EVERY request
        # No local model, no caching
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 150  # Optimized for speed
                }
            }
            # Send to Ollama, wait for response
```

### Frontend (FloatingChatBot.tsx):
```typescript
// Now with session persistence
const loadChatHistory = () => {
  const stored = localStorage.getItem('jarsh_chat_history')
  return stored ? JSON.parse(stored) : [initialMessage]
}

const saveChatHistory = (messages) => {
  localStorage.setItem('jarsh_chat_history', JSON.stringify(messages))
}
```

---

## Features Implemented

✅ **Ollama Integration:** Uses Mistral 7B via Ollama API  
✅ **Custom System Prompt:** TRINETRA-specific knowledge  
✅ **Database Queries:** Fetches scan results from PostgreSQL  
✅ **Intent Classification:** Routes questions appropriately  
✅ **Session Persistence:** Chat history saved in localStorage  
✅ **Optimized Speed:** Reduced tokens from 512 to 150  
✅ **No Authentication:** Public chatbot access  

---

## Files Structure

```
backend/engine/ai/
├── jarsh_service.py          # Main chatbot logic (USED)
├── Modelfile.jarsh            # Ollama model definition (USED)
├── knowledge_distillation.py # Fine-tuning code (NOT USED)
├── classifier.py              # DistilBERT code (NOT USED)
└── setup_jarsh.py             # Training script (NOT USED)

backend/api/routes/
└── chat.py                    # API endpoint (USED)

frontend/src/components/ChatBot/
└── FloatingChatBot.tsx        # UI component (USED)
```

---

## What to Keep vs Remove

### Keep (Currently Used):
- `jarsh_service.py` - Core chatbot logic
- `Modelfile.jarsh` - Model definition
- `chat.py` - API routes
- `FloatingChatBot.tsx` - Frontend UI

### Can Remove (Not Used):
- `knowledge_distillation.py` - Fine-tuning code
- `classifier.py` - DistilBERT classifier
- `setup_jarsh.py` - Training scripts
- `finetune_ollama.py` - Ollama fine-tuning
- All `*_training.py` files
- All `test_*_jarsh.py` files (except basic tests)

---

## Performance Optimization

### Current Settings:
```python
"options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_predict": 150,    # Reduced from 512
    "num_ctx": 2048,       # Smaller context
    "num_thread": 8        # More CPU threads
}
```

### Keep Model Loaded:
Add to `jarsh_service.py` `__init__`:
```python
async def __init__(self):
    # Keep model loaded for 24 hours
    await self._keep_alive()

async def _keep_alive(self):
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": "keep alive",
                    "keep_alive": "24h",
                    "stream": False
                }
            )
    except Exception as e:
        log.warning(f"Failed to set keep_alive: {e}")
```

---

## Session Persistence

### Frontend Implementation:
```typescript
// Load from localStorage on mount
const [messages, setMessages] = useState<Message[]>(loadChatHistory())

// Save to localStorage on every change
useEffect(() => {
  saveChatHistory(messages)
}, [messages])

// Clear history button
const clearHistory = () => {
  localStorage.removeItem('jarsh_chat_history')
  setMessages([initialMessage])
}
```

### Features:
- ✅ Chat persists across page reloads
- ✅ Stored in browser localStorage
- ✅ Clear history button
- ✅ No backend storage needed

---

## Summary

**Your chatbot is simple and effective:**

1. **No fine-tuning** - Uses Ollama with custom prompt
2. **No training** - Just configure the system prompt
3. **No complex ML** - Ollama handles everything
4. **Session persistence** - localStorage in frontend
5. **Keep model loaded** - Avoid 40-60s reload time

**This is the right approach for your use case!**

Fine-tuning would add complexity without significant benefits. The current setup is:
- Easy to maintain
- Easy to update prompts
- Good quality responses
- Reasonable speed (10-20s)

---

## Next Steps

1. ✅ Session persistence implemented
2. ⏳ Add keep_alive to prevent model unloading
3. ⏳ Add clear history button to UI
4. ⏳ Consider using smaller model (phi3) for 3-5s responses
5. ⏳ Remove unused fine-tuning code to clean up repo

---

## Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FloatingChatBot.tsx                                   │ │
│  │  - Renders chat UI                                     │ │
│  │  - Stores history in localStorage                      │ │
│  │  - Sends POST to /api/v1/chat/message                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Docker)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  chat.py                                               │ │
│  │  - Receives user message                              │ │
│  │  - Calls JARSHService.get_response()                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  jarsh_service.py                                      │ │
│  │  - Classifies intent (scan/mitigation/general)        │ │
│  │  - Queries PostgreSQL if needed                       │ │
│  │  - Calls Ollama API                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                  Ollama (Host Machine)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  jarsh:latest                                          │ │
│  │  = Mistral 7B + Custom System Prompt                  │ │
│  │  - Loads model into RAM (4.4GB)                       │ │
│  │  - Generates AI response                              │ │
│  │  - Returns text                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**No fine-tuning. No training. Just Ollama + custom prompt.**
