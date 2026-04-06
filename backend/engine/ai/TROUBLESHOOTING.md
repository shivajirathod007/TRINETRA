# JARSH Training Troubleshooting Guide

## Error: "Failed to generate example for query"

This error means Ollama is having trouble generating responses. Here's how to fix it:

### Step 1: Run Diagnostics

```bash
cd backend/engine/ai
python diagnose_ollama.py
```

This will check:
- ✓ Ollama server connection
- ✓ Mistral model availability
- ✓ Response generation
- ✓ Performance metrics

### Step 2: Common Fixes

#### Fix 1: Restart Ollama Server

**Windows:**
```powershell
# Close the Ollama window, then restart
ollama serve
```

**macOS/Linux:**
```bash
# Kill existing process
pkill ollama

# Start fresh
ollama serve
```

#### Fix 2: Test Ollama Manually

```bash
# Test if Ollama responds
ollama run mistral:7b "Say hello in one sentence"
```

If this works, Ollama is fine. If not:
- Reinstall Ollama
- Check system resources (need 4-8GB free RAM)
- Try a smaller model: `ollama pull mistral:7b-q4_0`

#### Fix 3: Increase Timeout

Edit `knowledge_distillation.py` line ~60:

```python
# Change from:
timeout = aiohttp.ClientTimeout(total=120)

# To:
timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes
```

#### Fix 4: Reduce Batch Size

If your computer is slow, process fewer queries at once.

Edit `knowledge_distillation.py` and reduce `TRAINING_QUERIES` to just 20-30 queries instead of 50+.

### Step 3: Check System Resources

**Windows:**
```powershell
# Check RAM usage
Get-Process ollama | Select-Object CPU, WorkingSet

# Check if Ollama is running
Get-Process ollama
```

**Requirements:**
- RAM: 4-8GB free
- CPU: Any modern CPU (will be slow on old CPUs)
- Disk: 5GB free space

### Step 4: Alternative - Use Smaller Dataset

If Ollama keeps failing, you can train with fewer examples:

```bash
cd backend/engine/ai
python knowledge_distillation.py --step generate --data-path training_data.json
```

Even if only 20-30 examples succeed, you can still train:

```bash
python knowledge_distillation.py --step train --data-path training_data.json
```

The model will work, just with slightly lower accuracy.

## Error: "Ollama timeout after all retries"

**Cause**: Your computer is too slow or Ollama is overloaded.

**Solutions:**

1. **Use quantized model** (smaller, faster):
   ```bash
   ollama pull mistral:7b-q4_0
   ```
   
   Then edit `knowledge_distillation.py`:
   ```python
   def __init__(self, model: str = "mistral:7b-q4_0", ...):
   ```

2. **Close other programs** to free up RAM

3. **Process queries one at a time** (slower but more reliable)

## Error: "No training data generated"

**Cause**: Ollama failed for all queries.

**Solutions:**

1. **Check Ollama is actually running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   
   Should return JSON with model list.

2. **Verify Mistral model**:
   ```bash
   ollama list
   ```
   
   Should show `mistral:7b`.

3. **Test manually**:
   ```bash
   ollama run mistral:7b
   ```
   
   Type a question. If this doesn't work, Ollama installation is broken.

## Error: "aiohttp not installed"

**Solution:**
```bash
pip install aiohttp
```

## Error: "transformers not installed"

**Solution:**
```bash
pip install transformers torch datasets
```

## Performance Issues

### Ollama is very slow (>30 seconds per response)

**Solutions:**

1. **Use quantized model**:
   ```bash
   ollama pull mistral:7b-q4_0
   ```

2. **Reduce response length** in `knowledge_distillation.py`:
   ```python
   "options": {
       "num_predict": 200,  # Reduce from 500
   }
   ```

3. **Use a faster computer** or cloud instance with GPU

### Training takes too long

**Expected times:**
- Fast computer (16GB RAM, modern CPU): 20-30 minutes
- Average computer (8GB RAM): 45-60 minutes
- Slow computer (4GB RAM, old CPU): 2-3 hours

**Speed up:**
1. Use fewer training queries (20 instead of 50)
2. Use quantized Ollama model
3. Reduce epochs in fine-tuning (2 instead of 3)

## Still Having Issues?

### Option 1: Skip Training, Use Templates

The chatbot works without the fine-tuned model! It will use template-based responses (less intelligent but functional).

Just start the server:
```bash
cd backend
uvicorn api.main:app --reload
```

The chatbot will work with fallback templates.

### Option 2: Use Pre-generated Training Data

If someone else has already generated training data, you can use it:

1. Get `training_data.json` from a teammate
2. Place it in `backend/engine/ai/`
3. Run only the training step:
   ```bash
   python knowledge_distillation.py --step train
   ```

### Option 3: Contact Support

If nothing works:
1. Run diagnostics: `python diagnose_ollama.py`
2. Save the output
3. Share with your team

## Quick Reference

```bash
# Diagnose issues
python diagnose_ollama.py

# Test Ollama manually
ollama run mistral:7b "Hello"

# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
# Windows: Close window and run: ollama serve
# Linux/Mac: pkill ollama && ollama serve

# Generate training data only
python knowledge_distillation.py --step generate

# Train model only (if you have training_data.json)
python knowledge_distillation.py --step train

# Test the model
python test_jarsh.py
```

## Success Indicators

✓ Ollama responds to manual test  
✓ At least 20 training examples generated  
✓ Model training completes without errors  
✓ Test script shows responses  

Even with partial success (20-30 examples), the chatbot will work!
