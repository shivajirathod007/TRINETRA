# Quick Fix for Ollama Training Errors

## What's Happening

Ollama is failing to generate responses for some queries. This is usually due to:
1. Ollama server being slow/overloaded
2. Timeout issues
3. Connection problems

## Immediate Fix - Run These Commands

### Step 1: Stop Current Training

Press `Ctrl+C` to stop the current training process.

### Step 2: Run Diagnostics

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python diagnose_ollama.py
```

This will tell you exactly what's wrong.

### Step 3: Test Ollama Manually

```powershell
ollama run mistral:7b "Say hello in one sentence"
```

**If this works**: Ollama is fine, just slow. Continue to Step 4.

**If this fails**: Restart Ollama:
1. Close the Ollama window
2. Run: `ollama serve`
3. Try again

### Step 4: Restart Training with Fixed Code

The code has been updated with:
- ✓ Better error handling
- ✓ Retry logic (3 attempts per query)
- ✓ Longer timeouts (2 minutes instead of 1)
- ✓ Better logging

Run training again:

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
python setup_jarsh.py
```

### Step 5: Monitor Progress

You should see:
```
Processing query 1/50: Hello, what can you help with?...
✓ Generated training example 1/50
Processing query 2/50: Hi JARSH, I need assistance...
✓ Generated training example 2/50
...
```

**It's OK if some fail!** As long as you get 20-30 successful examples, the model will work.

## Alternative: Quick Training with Fewer Queries

If Ollama is too slow, train with fewer queries:

### Option A: Generate What You Can

Let the current training run. Even if only 20-30 queries succeed, that's enough!

The script will continue and use whatever data it generated.

### Option B: Manual Training

1. **Check if you have any training data**:
   ```powershell
   cd C:\trinetra_pnb\TRINETRA\backend\engine\ai
   dir training_data.json
   ```

2. **If file exists, check how many examples**:
   ```powershell
   python -c "import json; data=json.load(open('training_data.json')); print(f'{len(data)} examples')"
   ```

3. **If you have 15+ examples, train the model**:
   ```powershell
   python knowledge_distillation.py --step train --data-path training_data.json
   ```

## Expected Results

### Good Results (Ideal)
```
Successfully generated 45 training examples out of 50 queries
```
90%+ success rate - Excellent!

### Acceptable Results
```
Successfully generated 25 training examples out of 50 queries
```
50%+ success rate - Good enough to train!

### Poor Results (Need to Fix)
```
Successfully generated 5 training examples out of 50 queries
```
<20% success rate - Need to troubleshoot Ollama.

## If Training Keeps Failing

### Quick Solution: Use Template Mode

The chatbot works WITHOUT the fine-tuned model! It will use template-based responses.

Just start the server:

```powershell
cd C:\trinetra_pnb\TRINETRA\backend
uvicorn api.main:app --reload
```

The chatbot will work with fallback templates (less intelligent but functional).

### Better Solution: Fix Ollama

1. **Restart Ollama completely**:
   - Close all Ollama windows
   - Open Task Manager (Ctrl+Shift+Esc)
   - End any "ollama" processes
   - Run: `ollama serve`

2. **Test with a simple query**:
   ```powershell
   ollama run mistral:7b "What is 2+2?"
   ```

3. **If still slow, use quantized model**:
   ```powershell
   ollama pull mistral:7b-q4_0
   ```
   
   Then edit `knowledge_distillation.py` line 28:
   ```python
   def __init__(self, model: str = "mistral:7b-q4_0", ...):
   ```

## Current Status Check

Run this to see what you have:

```powershell
cd C:\trinetra_pnb\TRINETRA\backend\engine\ai

# Check if training data exists
if (Test-Path training_data.json) {
    python -c "import json; data=json.load(open('training_data.json')); print(f'Training data: {len(data)} examples')"
} else {
    Write-Host "No training data yet"
}

# Check if model exists
if (Test-Path models\jarsh_distilbert) {
    Write-Host "Model: Trained ✓"
} else {
    Write-Host "Model: Not trained yet"
}
```

## Next Steps Based on Status

### If you have 20+ training examples:
```powershell
python knowledge_distillation.py --step train
```

### If you have <20 examples:
```powershell
# Try generating more
python knowledge_distillation.py --step generate
```

### If nothing works:
```powershell
# Use template mode (no training needed)
cd ..\..\..\backend
uvicorn api.main:app --reload
```

## Summary

1. ✓ Code has been fixed with better error handling
2. ✓ Run diagnostics: `python diagnose_ollama.py`
3. ✓ Restart training: `python setup_jarsh.py`
4. ✓ Even 20-30 examples is enough!
5. ✓ Chatbot works without training (template mode)

You're not stuck - multiple paths forward! 🚀
