# JARSH Chatbot - Quick Start Guide

## ✅ Current Status: WORKING - NO ERRORS

All tests passed. System is ready to use.

---

## What You Have Now

### 1. Production Chatbot (`jarsh_inference.py`)
- Uses fine-tuned DistilBERT model
- Generates responses from REAL scan data (no hardcoded values)
- Works WITHOUT Ollama at runtime
- Fetches data from PostgreSQL database

### 2. Training Pipeline
- `scan_aware_training.py` - Fetches your scans, generates questions, asks Ollama
- `knowledge_distillation.py` - Trains DistilBERT from Ollama's responses
- Creates model that understands YOUR specific security data

### 3. Full Integration
- Backend API fetches scan data from database
- Frontend sends scan_id with each question
- Responses are always scan-specific and up-to-date

---

## How to Use

### Option A: Use Without Training (Template Mode)
The chatbot works right now with keyword-based classification and dynamic responses from your database.

```powershell
# Start backend
cd TRINETRA
uvicorn backend.api.main:app --reload

# Start frontend (new terminal)
cd TRINETRA/frontend
npm run dev
```

Then:
1. Run a scan in your system
2. Open the scan details page
3. Click the chat button
4. Ask questions - responses will use REAL data from that scan

### Option B: Train Custom Model (Recommended)
Train DistilBERT on YOUR scan data for better responses.

```powershell
# 1. Start Ollama
ollama serve

# 2. Generate training data from your scans
cd TRINETRA
python backend/engine/ai/scan_aware_training.py

# 3. Train DistilBERT
python backend/engine/ai/knowledge_distillation.py --step train --data-path scan_training_data.json

# 4. Test it works
python test_jarsh_simple.py

# 5. Start your app (same as Option A)
uvicorn backend.api.main:app --reload
```

---

## Example Conversation

**User**: "What vulnerabilities were found?"

**System**:
1. Frontend sends: `{message: "What vulnerabilities were found?", scan_id: "scan-123"}`
2. Backend calls: `fetch_scan_data("scan-123")` → Gets from database
3. JARSH generates response using that scan's ACTUAL data
4. Response: 
   ```
   **Scan Analysis for example.com**
   
   **Scan ID**: scan-123
   **Risk Score**: 75/100
   
   **Vulnerabilities Found (2 total)**
   
   🔴 **Critical (1)**:
   • RSA-2048 on api.example.com - Quantum-vulnerable encryption
   
   🟠 **High (1)**:
   • TLS 1.1 on www.example.com - Deprecated protocol
   ```

**User**: "How do I fix these?"

**System**:
1. Classifies intent: "mitigation"
2. Generates fix steps for THOSE SPECIFIC vulnerabilities
3. Response:
   ```
   **Mitigation Plan for example.com**
   
   **Priority Issues (2)**
   
   1. RSA-2048 (critical severity)
      Asset: api.example.com
      ✓ Migrate to ML-KEM-768 (NIST PQC standard)
      ✓ Implement hybrid RSA + ML-KEM during transition
   
   2. TLS 1.1 (high severity)
      Asset: www.example.com
      ✓ Upgrade to TLS 1.3
      ✓ Disable legacy protocols
   
   **Estimated Timeline**: 4 weeks
   ```

---

## Key Features

### ✓ No Hardcoded Values
Every response is generated from the `scan_data` parameter, which comes from your database.

### ✓ Scan-Aware
The chatbot knows about YOUR specific scans, domains, vulnerabilities, and risk scores.

### ✓ Knowledge Distillation
- Training: Ollama (teacher) generates responses
- Production: DistilBERT (student) learned from Ollama
- Runtime: Only DistilBERT runs (fast, no external dependencies)

### ✓ Real-Time Database
Every question fetches fresh data from PostgreSQL. Always up-to-date.

---

## Files You Need to Know

```
TRINETRA/
├── backend/engine/ai/
│   ├── jarsh_inference.py          ← Production chatbot (THIS RUNS IN PROD)
│   ├── scan_aware_training.py      ← Generates training data (RUN ONCE)
│   └── knowledge_distillation.py   ← Trains model (RUN ONCE)
│
├── backend/api/routes/
│   └── chat.py                     ← API endpoint (fetches scan data)
│
├── test_jarsh_simple.py            ← Test script (verify it works)
└── SYSTEM_STATUS.md                ← Detailed explanation
```

---

## Verification

Run this to verify everything works:

```powershell
cd TRINETRA
python test_jarsh_simple.py
```

Expected output:
```
╔====================================================================╗
║               ✓ ALL TESTS PASSED!                              ║
╚====================================================================╝

✓ JARSH is working correctly
✓ No hardcoded values detected
✓ Responses generated from scan_data parameter
✓ All values are dynamic and scan-specific

The chatbot is ready to use with real database scans! 🚀
```

---

## What's Different from Before

| Before | After |
|--------|-------|
| Hardcoded "example.com" | Dynamic from database |
| Hardcoded "42%" risk | Real risk_score from scan |
| Hardcoded "RSA-2048 with ECDHE" | Actual vulnerabilities from scan |
| Generic responses | Scan-specific responses |
| No database integration | Full PostgreSQL integration |
| No training pipeline | Complete knowledge distillation |

---

## Need Help?

### Check Logs
```powershell
# Backend logs show what's happening
uvicorn backend.api.main:app --reload --log-level debug
```

### Test Individual Components
```powershell
# Test JARSH inference
python test_jarsh_simple.py

# Test database connection
python backend/db/sync_db.py

# Test Ollama connection
curl http://localhost:11434/api/generate -d '{"model":"mistral:7b","prompt":"test"}'
```

### Common Issues

**"Model not found"**
- This is OK! System falls back to keyword classification
- To fix: Run training (Option B above)

**"Database connection failed"**
- Check PostgreSQL is running
- Verify `.env` has correct DATABASE_URL

**"Ollama timeout"**
- Only affects training, not production
- Make sure Ollama is running: `ollama serve`
- Increase timeout in `scan_aware_training.py`

---

## Summary

✅ System is working with NO errors
✅ All responses from real scan data
✅ No hardcoded values
✅ Ready to use right now
✅ Optional training for better accuracy

You can start using the chatbot immediately. Training is optional but recommended for best results.

**To start**: Run backend + frontend, open a scan, click chat, ask questions! 🚀
