# JARSH Chatbot Troubleshooting Guide

## Quick Diagnosis

Run this command to check all components:
```bash
diagnose_chatbot.bat
```

## Common Issues & Solutions

### Issue 1: "Cannot connect to backend" or "Network Error"

**Symptoms:**
- Frontend shows error message
- Chat button doesn't respond
- Console shows connection refused

**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it:
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Issue 2: "Ollama server is not running"

**Symptoms:**
- Chat health shows "ollama_status": "disconnected"
- Responses say "Ollama server is not running"

**Solution:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags

# Check if jarsh model exists
ollama list

# If jarsh:latest is missing, create it:
ollama pull mistral:7b
ollama create jarsh -f Modelfile.jarsh
```

### Issue 3: "No scans found in database"

**Symptoms:**
- Chatbot says "No scans found"
- Can't query scan results

**Solution:**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run a test scan via API
curl -X POST http://localhost:8000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

### Issue 4: Backend starts but crashes immediately

**Symptoms:**
- Server starts then exits
- Database connection errors

**Solution:**
```bash
# Start required services
docker-compose up -d postgres redis

# Wait 10 seconds for services to be ready
timeout /t 10

# Check database connection
curl http://localhost:8000/api/v1/health/queue

# If still failing, check logs:
docker-compose logs postgres
```

### Issue 5: "Request timeout" or very slow responses

**Symptoms:**
- Chat takes 30+ seconds to respond
- Timeout errors

**Solution:**

1. **Check Ollama performance:**
```bash
# Test Ollama speed
ollama run jarsh "Hello"
```

2. **If slow, use quantized model:**
```bash
ollama pull mistral:7b-q4_0
# Update .env: OLLAMA_MODEL=mistral:7b-q4_0
```

3. **Increase timeout in jarsh_service.py** (already set to 120s)

### Issue 6: Frontend can't find chatbot component

**Symptoms:**
- No chat button appears
- Console shows import errors

**Solution:**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Issue 7: "Empty response" from chatbot

**Symptoms:**
- Chatbot responds but message is blank
- No error shown

**Causes & Solutions:**

1. **Ollama returned empty response:**
```bash
# Test Ollama directly
ollama run jarsh "What is PQC?"

# If empty, recreate model:
ollama rm jarsh
ollama create jarsh -f Modelfile.jarsh
```

2. **Model not properly configured:**
Check `.env` file has:
```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=jarsh:latest
```

## Complete Startup Sequence

### Option 1: Automated (Recommended)
```bash
start_chatbot.bat
```

### Option 2: Manual

1. **Start Ollama:**
```bash
ollama serve
```

2. **Start infrastructure:**
```bash
docker-compose up -d postgres redis
```

3. **Start backend:**
```bash
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

4. **Start frontend:**
```bash
cd frontend
npm run dev
```

5. **Test chatbot:**
```bash
curl http://localhost:8000/api/v1/chat/health
```

## Health Check Endpoints

```bash
# Overall API health
curl http://localhost:8000/health

# Chat service health
curl http://localhost:8000/api/v1/chat/health

# Queue health (Redis/Celery)
curl http://localhost:8000/api/v1/health/queue

# Ollama health
curl http://localhost:11434/api/tags
```

## Expected Health Response

When everything is working, `/api/v1/chat/health` should return:

```json
{
  "status": "healthy",
  "service": "JARSH Chatbot",
  "model": "Ollama (jarsh:latest)",
  "ollama_status": "connected",
  "ollama_host": "http://localhost:11434",
  "database": "PostgreSQL connected",
  "version": "2.0.0",
  "features": [
    "Generic PQC Q&A via Ollama",
    "Scan result queries from PostgreSQL",
    "Database-aware responses",
    "No hardcoded values - all AI-generated"
  ]
}
```

## Testing the Chatbot

### Test 1: Generic PQC Question
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PQC?", "context": "general"}'
```

### Test 2: Scan Query (requires scans in DB)
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Show my recent scans", "context": "scan_analysis"}'
```

### Test 3: Frontend Test
1. Open http://localhost:3000
2. Click JARSH button (bottom-right)
3. Type: "What is quantum computing?"
4. Should get AI-generated response

## Still Not Working?

### Run Full Diagnostic
```bash
# Windows
diagnose_chatbot.bat

# Or manually check each component:
curl http://localhost:11434/api/tags          # Ollama
curl http://localhost:8000/health             # Backend
curl http://localhost:8000/api/v1/chat/health # Chat
docker ps                                      # Containers
```

### Check Logs
```bash
# Backend logs (if running in terminal, check that window)

# Docker logs
docker-compose logs postgres
docker-compose logs redis

# Ollama logs (check the ollama serve window)
```

### Environment Variables
Verify `.env` file has:
```env
DATABASE_URL=postgresql+asyncpg://trinetra:trinetra_pass@localhost:5432/trinetra
REDIS_URL=redis://localhost:6379/0
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=jarsh:latest
```

## Performance Optimization

If chatbot is slow:

1. **Use quantized model:**
```bash
ollama pull mistral:7b-q4_0
# Update .env: OLLAMA_MODEL=mistral:7b-q4_0
```

2. **Reduce response length** in `jarsh_service.py`:
```python
"num_predict": 256  # Instead of 512
```

3. **Close other applications** to free RAM

4. **Check system resources:**
- Ollama needs 4-8GB RAM
- PostgreSQL needs 512MB RAM
- Redis needs 256MB RAM

## Success Indicators

✓ Ollama responds to `ollama list`  
✓ Backend returns 200 from `/health`  
✓ Chat health shows "ollama_status": "connected"  
✓ Frontend shows JARSH button  
✓ Clicking button opens chat window  
✓ Sending message gets AI response  

## Contact Support

If none of these solutions work:
1. Run `diagnose_chatbot.bat`
2. Save the output
3. Check backend terminal for error messages
4. Share with your team
