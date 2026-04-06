# Scan-Aware JARSH Chatbot - Complete Setup Guide

## What This Does

Creates a chatbot that:
- ✅ Fetches REAL scan results from your database
- ✅ Feeds scan data to Ollama for analysis
- ✅ Collects Ollama's responses as training data
- ✅ Fine-tunes DistilBERT on YOUR scan data
- ✅ Deploys scan-aware model to production
- ✅ Chatbot understands YOUR specific vulnerabilities

## The Flow

```
YOUR DATABASE
    ↓
Fetch Scans (domains, vulnerabilities, certificates)
    ↓
Generate Queries ("Analyze scan for example.com with RSA-2048...")
    ↓
HTTP POST → Ollama → HTTP Response (Analysis)
    ↓
Label Responses (scan_analysis, mitigation, etc.)
    ↓
Training Data: {query, response, label, scan_context}
    ↓
Fine-tune DistilBERT
    ↓
Deploy to Chatbot
    ↓
USER: "What's wrong with my scan?"
    ↓
CHATBOT: "Your scan of example.com found RSA-2048 (high severity)..."
```

## Prerequisites

1. **Ollama installed and running**
   ```powershell
   ollama serve
   ollama pull mistral:7b
   ```

2. **Database with scan data**
   - At least 5-10 scans in database
   - Scans should have vulnerabilities
   - Assets and certificates populated

3. **Python dependencies**
   ```powershell
   pip install transformers torch datasets aiohttp sqlalchemy
   ```

## Setup Steps

### Option A: Automated Setup (Recommended)

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python setup_scan_aware_jarsh.py
```

This will:
1. Check Ollama
2. Fetch scans from database
3. Generate training data (15-25 min)
4. Fine-tune model (10-20 min)
5. Test inference

### Option B: Manual Setup

#### Step 1: Generate Scan-Aware Training Data

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python scan_aware_training.py
```

This will:
- Connect to your database
- Fetch recent scans
- Generate queries like:
  - "Analyze scan for example.com with vulnerabilities: RSA-2048, TLS 1.1"
  - "Explain RSA-2048 vulnerability found in example.com"
  - "What should I fix first for example.com?"
- Feed each query to Ollama
- Collect responses
- Save to `scan_training_data.json`

**Expected output:**
```
Processing scan 1/10: scan-001 - example.com
  Generated 8 queries for this scan
  Query 1/8: Analyze scan for example.com...
  ✓ Generated scan-aware example 1
  ...
✓ Saved 75 scan-aware training examples
```

#### Step 2: Fine-Tune DistilBERT

```powershell
python knowledge_distillation.py --step train --data-path scan_training_data.json --model-output models/jarsh_distilbert
```

This trains DistilBERT on YOUR scan data.

#### Step 3: Test Inference

```powershell
python test_jarsh.py
```

Should show scan-aware responses.

## What Gets Created

### Training Data (scan_training_data.json)

```json
[
  {
    "query": "Analyze scan for example.com. Found: RSA-2048 (high), TLS 1.1 (medium). Risk: 75",
    "response": "The scan of example.com reveals critical quantum vulnerabilities. RSA-2048 is highly vulnerable to quantum attacks and should be migrated to ML-KEM-768 immediately. TLS 1.1 is deprecated...",
    "label": "scan_analysis",
    "scan_id": "scan-001",
    "domain": "example.com",
    "context": "{\"scan_id\": \"scan-001\", \"domain\": \"example.com\", ...}"
  },
  {
    "query": "Explain RSA-2048 vulnerability in example.com. Severity: high",
    "response": "RSA-2048 found in example.com is vulnerable to Shor's algorithm on quantum computers. With CRQCs expected by 2028-2037, this poses immediate risk...",
    "label": "scan_analysis",
    "scan_id": "scan-001",
    "domain": "example.com"
  }
]
```

### Fine-Tuned Model

```
models/jarsh_distilbert/
├── pytorch_model.bin        ← Trained on YOUR scan data
├── config.json
├── tokenizer.json
└── label_mapping.json
```

## Using the Scan-Aware Chatbot

### Backend API

The chatbot now fetches scan data automatically:

```python
# User asks: "What's wrong with my scan?"
# With scan_id: "scan-123"

# Backend:
1. Fetches scan data from database
2. Passes to inference engine
3. Model classifies intent
4. Generates response WITH scan context
5. Returns: "Your scan of example.com found RSA-2048 (high severity)..."
```

### Frontend

Pass scan_id in URL or request:

```typescript
// Option 1: URL parameter
// http://localhost:5173?scan_id=scan-123

// Option 2: Explicit in request
axios.post('/api/v1/chat/message', {
  message: "What vulnerabilities were found?",
  scan_id: "scan-123",
  context: "scan-specific"
})
```

### Example Conversations

**Without scan_id (general):**
```
User: "What is RSA-2048?"
Bot: "RSA-2048 is a public-key cryptosystem vulnerable to quantum attacks..."
```

**With scan_id (scan-aware):**
```
User: "What vulnerabilities were found?"
Bot: "Scan Analysis for example.com

Risk Score: 75/100

Vulnerabilities Found (3):
• RSA-2048 (high severity)
• TLS 1.1 (medium severity)
• Missing OCSP stapling (low severity)

Quantum Threat Assessment:
These vulnerabilities expose your infrastructure to quantum attacks.
Immediate action recommended for high-severity issues.

Would you like detailed mitigation steps?"
```

## Testing

### Test with Real Scan ID

```powershell
# Get a scan ID from your database
# Then test:

curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Analyze my scan\", \"scan_id\": \"<your-scan-id>\", \"context\": \"scan-specific\"}"
```

### Test in Frontend

1. Start backend:
   ```powershell
   cd backend
   uvicorn api.main:app --reload
   ```

2. Start frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

3. Open: `http://localhost:5173?scan_id=<your-scan-id>`

4. Click JARSH button and ask:
   - "What vulnerabilities were found?"
   - "What should I fix first?"
   - "Show me mitigation steps"

## Verification

Run this to verify everything works:

```powershell
cd backend\engine\ai
python verify_pipeline.py
```

Should show:
- ✓ Ollama HTTP Generation
- ✓ Response Labeling
- ✓ Training Data Creation (with scan context)
- ✓ DistilBERT Fine-Tuning (on scan data)
- ✓ Production Inference (scan-aware)

## Benefits

### Before (Generic Chatbot)
```
User: "What vulnerabilities were found?"
Bot: "I can help analyze vulnerabilities. Please provide scan details."
```

### After (Scan-Aware Chatbot)
```
User: "What vulnerabilities were found?"
Bot: "Your scan of example.com found:
     • RSA-2048 (high severity) - Quantum vulnerable
     • TLS 1.1 (medium severity) - Deprecated
     Risk Score: 75/100
     
     Immediate action needed for RSA-2048..."
```

## Troubleshooting

### No scans in database?

Add sample scans or wait for real scans to be created.

### Training data generation fails?

Check:
1. Ollama is running: `ollama serve`
2. Database connection works
3. Scans have vulnerabilities

### Model doesn't seem scan-aware?

Verify:
1. Training data has scan context: `cat scan_training_data.json`
2. Model trained on scan data: `ls models/jarsh_distilbert`
3. API passes scan_id: Check logs

### Frontend doesn't pass scan_id?

Add to URL: `?scan_id=<scan-id>`

Or modify FloatingChatBot.tsx to get scan_id from props.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRAINING PHASE                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Database → Fetch Scans → Generate Queries              │
│                              ↓                           │
│  "Analyze example.com with RSA-2048..."                 │
│                              ↓                           │
│  HTTP POST → Ollama → HTTP Response                     │
│                              ↓                           │
│  "example.com has critical quantum vulnerabilities..."  │
│                              ↓                           │
│  Label + Save → scan_training_data.json                 │
│                              ↓                           │
│  Fine-tune DistilBERT → Scan-Aware Model                │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION PHASE                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User: "What's wrong with my scan?"                     │
│  scan_id: "scan-123"                                    │
│                              ↓                           │
│  Backend: Fetch scan data from database                 │
│                              ↓                           │
│  DistilBERT: Classify intent + Generate response        │
│  (Using scan context)                                   │
│                              ↓                           │
│  Response: "Your scan of example.com found RSA-2048..." │
│                                                          │
│  NO OLLAMA NEEDED! ✓                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Summary

✅ Fetches REAL scan data from database  
✅ Feeds to Ollama for expert analysis  
✅ Collects responses as labeled training data  
✅ Fine-tunes DistilBERT on YOUR scans  
✅ Deploys scan-aware model  
✅ Chatbot understands YOUR vulnerabilities  
✅ Context-aware responses  
✅ Works without Ollama at runtime  

Your chatbot is now trained on YOUR actual security data! 🚀
