# Windows Commands - Scan-Aware JARSH Setup

## Complete Working Solution - Step by Step

### Prerequisites Check

```powershell
# 1. Check Ollama
ollama list
# Should show mistral:7b

# 2. Check Python
python --version
# Should be 3.8+

# 3. Check database
# Make sure you have scans in database
```

### Step 1: Install Dependencies

```powershell
cd C:\trinetra_pnb\TRINETRA\backend
pip install transformers torch datasets aiohttp sqlalchemy
```

### Step 2: Start Ollama (Keep Running)

Open PowerShell window 1:
```powershell
ollama serve
```

Keep this window open!

### Step 3: Run Automated Setup

Open PowerShell window 2:
```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python setup_scan_aware_jarsh.py
```

This will:
- ✓ Check Ollama
- ✓ Fetch scans from database
- ✓ Generate training data (15-25 min)
- ✓ Fine-tune model (10-20 min)
- ✓ Test inference

**Expected output:**
```
SCAN-AWARE JARSH CHATBOT SETUP
===============================

Step 1: Checking Ollama...
✓ Ollama is available

Step 2: Generating scan-aware training data...
Processing scan 1/10: scan-001 - example.com
  Generated 8 queries for this scan
  ✓ Generated scan-aware example 1
  ...
✓ Generated 75 scan-aware training examples

Step 3: Fine-tuning DistilBERT model...
✓ Model fine-tuned successfully

Step 4: Testing scan-aware inference...
✓ Inference test successful

✓ SCAN-AWARE JARSH SETUP COMPLETE!
```

### Step 4: Start Backend

Open PowerShell window 3:
```powershell
cd C:\trinetra_pnb\TRINETRA\backend
uvicorn api.main:app --reload
```

### Step 5: Start Frontend

Open PowerShell window 4:
```powershell
cd C:\trinetra_pnb\TRINETRA\frontend
npm run dev
```

### Step 6: Test the Chatbot

#### Test API (PowerShell):

```powershell
# Get a scan ID from your database first
# Then test:

$body = @{
    message = "What vulnerabilities were found?"
    scan_id = "scan-001"
    context = "scan-specific"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/message" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

#### Test Frontend:

1. Open browser: `http://localhost:5173?scan_id=scan-001`
2. Click JARSH button
3. Ask: "What vulnerabilities were found?"
4. Should see scan-specific response!

## Manual Steps (If Automated Fails)

### Step 1: Generate Training Data Only

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python -c "import asyncio; from scan_aware_training import generate_scan_aware_training_data; asyncio.run(generate_scan_aware_training_data())"
```

### Step 2: Train Model Only

```powershell
python knowledge_distillation.py --step train --data-path scan_training_data.json --model-output models\jarsh_distilbert
```

### Step 3: Test

```powershell
python test_jarsh.py
```

## Verification Commands

### Check Training Data

```powershell
# Check if file exists
Test-Path scan_training_data.json

# Count examples
python -c "import json; data=json.load(open('scan_training_data.json')); print(f'{len(data)} examples')"

# View first example
python -c "import json; data=json.load(open('scan_training_data.json')); print(json.dumps(data[0], indent=2))"
```

### Check Model

```powershell
# Check if model exists
Test-Path models\jarsh_distilbert

# List model files
Get-ChildItem models\jarsh_distilbert
```

### Check API Health

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/health"
```

Should return:
```json
{
  "status": "healthy",
  "service": "JARSH Chatbot",
  "model": "DistilBERT (fine-tuned via knowledge distillation)",
  "model_loaded": true,
  "version": "2.0.0"
}
```

## Troubleshooting

### Ollama Not Responding

```powershell
# Check if running
Get-Process ollama

# Restart
# Close Ollama window, then:
ollama serve
```

### No Scans in Database

```powershell
# Check database connection
cd C:\trinetra_pnb\TRINETRA\backend
python -c "from db.session import get_sync_session; from db.models import Scan; session = next(get_sync_session()); print(f'Scans: {session.query(Scan).count()}')"
```

If 0 scans, you need to run scans first or use sample data.

### Training Fails

```powershell
# Check logs
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python scan_aware_training.py 2>&1 | Tee-Object -FilePath training.log
```

### Model Not Loading

```powershell
# Verify model files
Get-ChildItem models\jarsh_distilbert

# Should have:
# - pytorch_model.bin
# - config.json
# - tokenizer.json
# - label_mapping.json
```

## Quick Test Script

Save as `test_scan_aware.ps1`:

```powershell
# Test scan-aware chatbot
Write-Host "Testing Scan-Aware JARSH Chatbot" -ForegroundColor Green
Write-Host ""

# Test 1: Check Ollama
Write-Host "Test 1: Ollama" -ForegroundColor Yellow
ollama list | Select-String "mistral"
Write-Host ""

# Test 2: Check training data
Write-Host "Test 2: Training Data" -ForegroundColor Yellow
if (Test-Path "scan_training_data.json") {
    python -c "import json; data=json.load(open('scan_training_data.json')); print(f'✓ {len(data)} examples')"
} else {
    Write-Host "✗ No training data" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check model
Write-Host "Test 3: Model" -ForegroundColor Yellow
if (Test-Path "models\jarsh_distilbert") {
    Write-Host "✓ Model exists" -ForegroundColor Green
} else {
    Write-Host "✗ Model not found" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check API
Write-Host "Test 4: API Health" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/health"
    Write-Host "✓ API is healthy" -ForegroundColor Green
    Write-Host "  Model loaded: $($health.model_loaded)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ API not responding" -ForegroundColor Red
    Write-Host "  Start backend: uvicorn api.main:app --reload" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Test complete!" -ForegroundColor Green
```

Run it:
```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
.\test_scan_aware.ps1
```

## Summary

**Complete working solution:**

1. ✅ Fetches REAL scans from database
2. ✅ Feeds to Ollama via HTTP
3. ✅ Collects responses as labeled data
4. ✅ Fine-tunes DistilBERT on YOUR data
5. ✅ Deploys to production chatbot
6. ✅ Frontend integrated
7. ✅ Backend integrated
8. ✅ Everything works together

**One command to rule them all:**
```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python setup_scan_aware_jarsh.py
```

Then start backend and frontend, and you're done! 🚀
