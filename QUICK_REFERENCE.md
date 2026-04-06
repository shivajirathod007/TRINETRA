# 🚀 JARSH Chatbot - Quick Reference

## Current Status: ✅ WORKING

- **Model:** Phi-3-mini (3.8B parameters)
- **Response Time:** ~15 seconds (AI queries), 0.3s (database queries)
- **Improvement:** 50% faster than Mistral 7B
- **Local:** 100% runs on your machine
- **Session:** Chat history persists across reloads

---

## Access Points

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:3000 | ✅ Running |
| Backend API | http://localhost:8000 | ✅ Running |
| Chat Health | http://localhost:8000/api/v1/chat/health | ✅ Healthy |
| Ollama | http://localhost:11434 | ✅ Connected |

---

## Quick Commands

### Check Services
```bash
# All Docker containers
docker ps --filter "name=trinetra"

# Chat health
curl http://localhost:8000/api/v1/chat/health

# Ollama status
ollama ps
```

### Test Chatbot
```powershell
# Quick test
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/message" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"message":"What is PQC?"}'
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart just API
docker-compose restart api

# Restart Ollama (Windows)
# Stop: Ctrl+C in Ollama terminal
# Start: ollama serve
```

---

## Sample Queries

### Generic PQC Questions (~15s)
- "What is PQC?"
- "Explain quantum threats"
- "What is HNDL?"
- "How does Shor's Algorithm work?"
- "What are NIST PQC standards?"

### Scan Queries (0.3s - instant)
- "Show my recent scans"
- "What vulnerabilities were found?"
- "Summarize scan results"
- "Show critical assets"

### Mitigation Queries (~15s with context)
- "How do I migrate to PQC?"
- "Show mitigation steps"
- "What's the migration timeline?"
- "Which assets need attention first?"

---

## Performance Metrics

| Query Type | Response Time | Source |
|------------|---------------|--------|
| Database queries | 0.3s | PostgreSQL |
| AI questions | ~15s | Ollama (Phi-3) |
| Greetings | ~15s | Ollama (Phi-3) |
| Mitigation (with context) | ~15s | DB + Ollama |

---

## Troubleshooting

### Problem: Slow responses (>30s)
**Solution:**
```bash
# Check if model is loaded
ollama ps

# If not loaded, first query loads it (slower)
# Subsequent queries will be faster
```

### Problem: "Ollama server not running"
**Solution:**
```bash
# Start Ollama
ollama serve

# Verify
curl http://localhost:11434/api/tags
```

### Problem: Chat history not saving
**Solution:**
- Open browser DevTools → Console
- Check for localStorage errors
- Clear browser cache and reload

### Problem: Frontend can't reach backend
**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in .env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Restart services
docker-compose restart
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `Modelfile.jarsh-phi3` | Phi-3 model configuration |
| `docker-compose.yml` | Service orchestration |
| `.env` | Environment variables |
| `backend/engine/ai/jarsh_service.py` | Chatbot logic |
| `frontend/src/components/ChatBot/FloatingChatBot.tsx` | UI component |

---

## Key Environment Variables

```bash
# Ollama Configuration
OLLAMA_HOST=http://host.docker.internal:11434  # Docker → Windows
OLLAMA_MODEL=jarsh-phi3                         # Model name

# Database
DATABASE_URL=postgresql+asyncpg://trinetra:trinetra_pass@localhost:5432/trinetra

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Model Information

```yaml
Name: jarsh-phi3
Base: phi3:mini (Microsoft)
Parameters: 3.8B
Context Window: 2048 tokens
Max Output: 150 tokens
Temperature: 0.7
Top-P: 0.9
```

---

## API Endpoints

### POST /api/v1/chat/message
Send a message to JARSH

**Request:**
```json
{
  "message": "What is PQC?",
  "context": "general",
  "scan_id": "optional-uuid",
  "domain": "optional-domain.com"
}
```

**Response:**
```json
{
  "response": "Post-Quantum Cryptography...",
  "confidence": 0.90,
  "sources": ["JARSH AI"],
  "suggestions": ["Tell me more", "Show my scans"]
}
```

### GET /api/v1/chat/health
Check chatbot health

**Response:**
```json
{
  "status": "healthy",
  "service": "JARSH Chatbot",
  "model": "Ollama (jarsh-phi3)",
  "ollama_status": "connected",
  "ollama_host": "http://host.docker.internal:11434",
  "database": "PostgreSQL connected"
}
```

---

## Session Persistence

Chat history is stored in browser localStorage:

- **Key:** `jarsh_chat_history`
- **Format:** JSON array of messages
- **Persistence:** Survives page reloads and browser restarts
- **Clear:** Click trash icon in chat UI

---

## What's Working

✅ Phi-3-mini model (3.8B params)  
✅ 50% faster responses (15s vs 27-30s)  
✅ 100% local execution  
✅ Session persistence  
✅ Beautiful markdown formatting  
✅ Database-aware responses  
✅ Intent classification  
✅ Keep-alive optimization (24h)  
✅ Docker integration  
✅ CORS configured  
✅ Health endpoints  

---

## What's NOT Fine-Tuning

We are using a **pre-trained model** (Microsoft's Phi-3-mini) with:
- Custom system prompt
- Few-shot examples
- Parameter optimization

We are NOT doing actual fine-tuning (weight updates), which would require:
- GPU with 24GB+ VRAM
- PyTorch training pipeline
- Hours of training time
- Thousands of training examples

See `THE_TRUTH.md` for full explanation.

---

## Next Steps (Optional)

1. **Test in browser:** http://localhost:3000
2. **Try different queries** to verify response quality
3. **Monitor performance** over multiple queries
4. **Check session persistence** by reloading page
5. **Review scan formatting** with real scan data

---

**Last Updated:** April 6, 2026  
**Status:** ✅ Production Ready  
**Model:** jarsh-phi3 (Phi-3-mini 3.8B)
