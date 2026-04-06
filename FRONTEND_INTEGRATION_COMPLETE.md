# JARSH Frontend Integration - Complete ✅

## Status: FULLY INTEGRATED

The JARSH chatbot is **already connected** to the frontend! Here's what's in place:

---

## Current Setup

### Backend API
- **Endpoint**: `/api/v1/chat/message`
- **Router**: Registered in `backend/api/main.py`
- **Service**: `backend/engine/ai/jarsh_service.py` (uses fine-tuned `jarsh:latest`)
- **Database**: PostgreSQL integration for scan queries

### Frontend Component
- **Component**: `frontend/src/components/ChatBot/FloatingChatBot.tsx`
- **Type**: Floating chat button with expandable chat window
- **Framework**: React + TypeScript
- **Styling**: Inline styles with animations

### API Integration
```typescript
// In FloatingChatBot.tsx
const response = await axios.post('/api/v1/chat/message', {
  message: inputText,
  context: 'general'
})
```

---

## How to Test

### 1. Start Backend

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start FastAPI backend
cd TRINETRA/backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend

```bash
# Terminal 3: Start React frontend
cd TRINETRA/frontend
npm install  # If first time
npm run dev
```

### 3. Open Browser

```
http://localhost:5173  # Or whatever port Vite shows
```

### 4. Test Chat

1. Look for the **red floating "JARSH" button** in bottom-right corner
2. Click it to open chat window
3. Try these queries:
   - "What is Post-Quantum Cryptography?"
   - "Explain ML-KEM-768"
   - "Show me my recent scans"
   - "What is Harvest Now, Decrypt Later?"

---

## API Flow

```
User types in chat
    ↓
FloatingChatBot.tsx
    ↓
POST /api/v1/chat/message
    {
      "message": "What is PQC?",
      "context": "general"
    }
    ↓
backend/api/routes/chat.py
    ↓
backend/engine/ai/jarsh_service.py
    ↓
    ├─→ Generic Question → jarsh:latest (fine-tuned model)
    └─→ Scan Query → PostgreSQL + jarsh:latest summary
    ↓
Response
    {
      "response": "AI-generated answer...",
      "confidence": 0.90,
      "sources": ["JARSH AI"],
      "suggestions": ["Follow-up questions..."]
    }
    ↓
Display in chat window
```

---

## Features

### Chat UI
✅ Floating button with pulsing animation  
✅ Expandable chat window  
✅ Message history  
✅ Typing indicator  
✅ Timestamp on messages  
✅ Smooth animations  
✅ Responsive design  

### Backend Integration
✅ Connected to `/api/v1/chat/message`  
✅ Uses fine-tuned `jarsh:latest` model  
✅ Queries PostgreSQL for scan data  
✅ No hardcoded responses  
✅ Error handling  

---

## Configuration

### Backend URL

The frontend uses relative URLs (`/api/v1/chat/message`), which works when:

1. **Development**: Frontend proxy configured in `vite.config.ts`
2. **Production**: Both served from same domain

Check `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### CORS

Backend already configured in `backend/api/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Testing Scenarios

### Scenario 1: Generic PQC Question

**User Input:**
```
What is Post-Quantum Cryptography?
```

**Expected Response:**
```
Post-Quantum Cryptography (PQC) refers to cryptographic algorithms 
designed to be secure against attacks by both classical and quantum 
computers...

[Detailed explanation from fine-tuned jarsh:latest model]
```

### Scenario 2: Scan Query (No Scans)

**User Input:**
```
Show me my recent scans
```

**Expected Response:**
```
No scans found in the database. To get started:

1. Run a scan on your domain using the /scan endpoint
2. Wait for the scan to complete
3. Ask me about the results

Example: POST /api/scan with {"domain": "example.com"}
```

### Scenario 3: Scan Query (With Scans)

**User Input:**
```
Summarize my last scan
```

**Expected Response:**
```
**Scan Summary for example.com**

Status: COMPLETED
Completed: 2026-04-06 10:30 UTC
Assets Scanned: 12

**Risk Distribution:**
🔴 Critical: 3
🟠 High: 5
🟡 Medium: 2
🟢 Low: 1
✅ Safe: 1

**Organization Score:** 42.5/100

[Detailed summary from database + AI]
```

### Scenario 4: Technical Question

**User Input:**
```
Explain ML-KEM-768
```

**Expected Response:**
```
ML-KEM-768 (Module-Lattice-Based Key Encapsulation Mechanism) is 
the NIST-standardized post-quantum algorithm for secure key exchange...

[Detailed technical explanation from fine-tuned model]
```

---

## Troubleshooting

### Issue: Chat button not visible

**Check:**
1. Frontend is running: `npm run dev`
2. Component is imported in App.tsx
3. No CSS conflicts hiding the button

**Solution:**
```bash
cd frontend
npm run dev
# Open browser console, look for: "✅ JARSH ChatBot Component Mounted"
```

### Issue: "Network Error" when sending message

**Check:**
1. Backend is running: `http://localhost:8000/health`
2. Ollama is running: `ollama serve`
3. CORS is configured
4. Proxy is set up in vite.config.ts

**Solution:**
```bash
# Terminal 1
ollama serve

# Terminal 2
cd backend
uvicorn api.main:app --reload

# Terminal 3
cd frontend
npm run dev
```

### Issue: "Ollama server not running" response

**Check:**
1. Ollama is running: `curl http://localhost:11434/api/tags`
2. jarsh:latest model exists: `ollama list | grep jarsh`

**Solution:**
```bash
# Start Ollama
ollama serve

# Create model if needed
python create_jarsh_model.py
```

### Issue: Slow responses

**Causes:**
- Ollama model loading (first request)
- Large scan result sets
- CPU inference (no GPU)

**Solutions:**
- Wait for first response (model loads)
- Use GPU if available
- Reduce `num_predict` in model

---

## Customization

### Change Chat Button Position

Edit `FloatingChatBot.tsx`:

```typescript
// Change bottom/right values
style={{
  position: 'fixed',
  bottom: '20px',  // Change this
  right: '20px',   // Change this
  ...
}}
```

### Change Chat Window Size

Edit `FloatingChatBot.tsx`:

```typescript
style={{
  width: '420px',   // Change width
  height: '520px',  // Change height
  ...
}}
```

### Change Colors

Edit `FloatingChatBot.tsx`:

```typescript
// Button gradient
background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f97316 100%)'

// Chat window background
background: 'linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%)'

// User message background
background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
```

### Add Suggestions/Quick Replies

Edit `FloatingChatBot.tsx`:

```typescript
const quickReplies = [
  "What is PQC?",
  "Show my scans",
  "Explain quantum threats",
  "Migration guide"
]

// Render below input
{quickReplies.map(reply => (
  <button onClick={() => setInputText(reply)}>
    {reply}
  </button>
))}
```

---

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
# Creates: frontend/dist/
```

### Serve with Backend

Option 1: **Nginx**
```nginx
server {
    listen 80;
    
    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
    }
}
```

Option 2: **Docker Compose**
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - ollama
```

---

## API Documentation

### POST /api/v1/chat/message

**Request:**
```json
{
  "message": "string (required)",
  "context": "general | scan-specific | mitigation (optional)",
  "scan_id": "uuid (optional)",
  "asset_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "response": "string (AI-generated)",
  "confidence": "float (0-1)",
  "sources": ["array of source IDs"],
  "suggestions": ["array of follow-up questions"]
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is Post-Quantum Cryptography?",
    "context": "general"
  }'
```

### GET /api/v1/chat/health

**Response:**
```json
{
  "status": "healthy | degraded",
  "service": "JARSH Chatbot",
  "model": "Ollama (jarsh:latest)",
  "ollama_status": "connected | disconnected",
  "database": "PostgreSQL connected",
  "version": "2.0.0",
  "features": [...]
}
```

---

## Summary

✅ **Frontend Integration Complete**
- FloatingChatBot component exists
- Connected to `/api/v1/chat/message`
- Beautiful UI with animations
- Error handling

✅ **Backend Integration Complete**
- Fine-tuned `jarsh:latest` model
- PostgreSQL database queries
- No hardcoded responses
- Comprehensive error handling

✅ **Ready to Use**
```bash
# Start everything
ollama serve                              # Terminal 1
cd backend && uvicorn api.main:app --reload  # Terminal 2
cd frontend && npm run dev                # Terminal 3

# Open browser
http://localhost:5173

# Click JARSH button and chat!
```

**The chatbot is fully integrated and ready to use!** 🚀
