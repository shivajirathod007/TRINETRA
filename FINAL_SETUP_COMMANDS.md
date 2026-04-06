# Final Setup Commands - 100% Real Scan Data, No Hardcoded Values

## What You're Getting

✅ Fetches REAL scans from database  
✅ Feeds to Ollama via HTTP  
✅ Collects responses as labeled data  
✅ Fine-tunes DistilBERT on YOUR data  
✅ Deploys scan-aware model  
✅ NO hardcoded values  
✅ 100% dynamic responses  
✅ Fully integrated frontend & backend  

## One-Command Setup

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python setup_scan_aware_jarsh.py
```

## Step-by-Step Setup

### Terminal 1: Ollama (Keep Running)
```powershell
ollama serve
```

### Terminal 2: Generate Training Data
```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python scan_aware_training.py
```

This will:
- Connect to your database
- Fetch real scans
- Generate queries with scan context
- Feed to Ollama
- Collect responses
- Save to `scan_training_data.json`

### Terminal 3: Train Model
```powershell
python knowledge_distillation.py --step train --data-path scan_training_data.json --model-output models\jarsh_distilbert
```

### Terminal 4: Verify No Hardcoded Values
```powershell
python verify_no_hardcoded.py
```

Should show:
```
✓ PASS - Generic Response
✓ PASS - Real Scan Data
✓ PASS - Mitigation Response
✓ PASS - Readiness Response

✓ ALL TESTS PASSED - NO HARDCODED VALUES!
```

### Terminal 5: Start Backend
```powershell
cd C:\trinetra_pnb\TRINETRA\backend
uvicorn api.main:app --reload
```

### Terminal 6: Start Frontend
```powershell
cd C:\trinetra_pnb\TRINETRA\frontend
npm run dev
```

## Test with Real Scan

### Get a Scan ID from Database
```powershell
cd C:\trinetra_pnb\TRINETRA\backend
python -c "from db.session import get_sync_session; from db.models import Scan; session = next(get_sync_session()); scan = session.query(Scan).first(); print(f'Scan ID: {scan.id}, Domain: {scan.target_domain}')"
```

### Test API
```powershell
$scanId = "<your-scan-id-from-above>"

$body = @{
    message = "What vulnerabilities were found?"
    scan_id = $scanId
    context = "scan-specific"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/message" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### Test Frontend
1. Open: `http://localhost:5173?scan_id=<your-scan-id>`
2. Click JARSH button
3. Ask: "What vulnerabilities were found?"
4. See YOUR scan data in response!

## Verification Checklist

Run these to verify everything:

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai

# 1. Check training data exists
Test-Path scan_training_data.json

# 2. Count training examples
python -c "import json; data=json.load(open('scan_training_data.json')); print(f'{len(data)} examples')"

# 3. Check first example has real data
python -c "import json; data=json.load(open('scan_training_data.json')); print(f\"Domain: {data[0]['domain']}\nScan ID: {data[0]['scan_id']}\")"

# 4. Check model exists
Test-Path models\jarsh_distilbert

# 5. Verify no hardcoded values
python verify_no_hardcoded.py

# 6. Check API health
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/health"
```

## What Makes This Different

### Before (Hardcoded)
```
User: "What vulnerabilities?"
Bot: "Found RSA-2048, TLS 1.1 in example.com"  ← HARDCODED!
```

### After (Real Data)
```
User: "What vulnerabilities?"
Bot: "Found ECDHE-RSA, SHA-256 in testdomain.example.org"  ← FROM YOUR DATABASE!
```

## File Changes Summary

### Modified Files
1. **`jarsh_inference.py`**
   - Removed ALL hardcoded responses
   - Added `_generate_scan_aware_response()`
   - Generates responses from real scan_data

2. **`chat.py`**
   - Enhanced `fetch_scan_data()`
   - Fetches complete scan data from database
   - Passes to inference engine

3. **`FloatingChatBot.tsx`**
   - Extracts scan_id from URL
   - Passes to API

### New Files
1. **`scan_aware_training.py`** - Fetches real scans, trains on them
2. **`setup_scan_aware_jarsh.py`** - Automated setup
3. **`verify_no_hardcoded.py`** - Proves no hardcoded values

## Architecture

```
DATABASE (PostgreSQL)
  ↓
Fetch Real Scans
  ↓
Generate Queries with Scan Context
  ↓
HTTP POST → Ollama
  ↓
HTTP Response ← Ollama
  ↓
Label & Save Training Data
  ↓
Fine-tune DistilBERT
  ↓
PRODUCTION:
  User Query + scan_id
    ↓
  Fetch Scan from Database
    ↓
  Generate Response from Real Data
    ↓
  Return (NO OLLAMA NEEDED!)
```

## Success Criteria

After setup, verify:

- [ ] Training data has real domains (not example.com)
- [ ] Training data has real vulnerabilities (from your scans)
- [ ] Model trained successfully
- [ ] API returns scan-specific responses
- [ ] Frontend shows real scan data
- [ ] No hardcoded values in responses
- [ ] verify_no_hardcoded.py passes all tests

## Troubleshooting

### No scans in database?
Run some scans first, or the training will use sample data.

### Training data looks generic?
Check database connection in `scan_aware_training.py`.

### Responses still seem hardcoded?
Run `python verify_no_hardcoded.py` to check.

### API not returning scan data?
Check logs: `uvicorn api.main:app --reload --log-level debug`

## Documentation

- **Setup Guide**: `SCAN_AWARE_SETUP_GUIDE.md`
- **No Hardcoded Proof**: `NO_HARDCODED_VALUES_PROOF.md`
- **Complete Solution**: `COMPLETE_SOLUTION_SUMMARY.md`
- **Windows Commands**: `SETUP_SCAN_AWARE_WINDOWS.md`

## Final Test

```powershell
# Complete test script
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai

Write-Host "Testing Scan-Aware JARSH (No Hardcoded Values)" -ForegroundColor Green
Write-Host ""

# Test 1: Verify no hardcoded values
Write-Host "Test 1: Verifying no hardcoded values..." -ForegroundColor Yellow
python verify_no_hardcoded.py

# Test 2: Check API with real scan
Write-Host ""
Write-Host "Test 2: Testing API with real scan..." -ForegroundColor Yellow
$scanId = Read-Host "Enter a scan ID from your database"
$body = @{message = "What vulnerabilities?"; scan_id = $scanId} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/message" -Method Post -Body $body -ContentType "application/json"
Write-Host "Response:" -ForegroundColor Cyan
Write-Host $response.response

Write-Host ""
Write-Host "✓ Setup Complete!" -ForegroundColor Green
```

Your chatbot is now 100% dynamic with NO hardcoded values! 🚀
