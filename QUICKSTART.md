# JARSH Chatbot - Quick Start

## 3-Step Setup

### Step 1: Fine-Tune Model (5 minutes)
```bash
cd TRINETRA
python finetune_jarsh.py
```

### Step 2: Start Services (2 minutes)
```bash
docker-compose up -d
```

### Step 3: Test (1 minute)
```bash
python verify_complete_setup.py
```

## Done!

Open http://localhost:3000 and click the red JARSH button.

---

## What You Get

✅ Fine-tuned AI model (jarsh-finetuned)  
✅ Session persistence (chat survives reload)  
✅ Fast responses (5-15 seconds)  
✅ No authentication needed  
✅ Clear history button  

---

## Quick Test

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PQC?", "context": "general"}'
```

Should respond in 5-15 seconds with AI-generated answer.

---

## Troubleshooting

**Ollama not running?**
```bash
ollama serve
```

**Services not starting?**
```bash
docker-compose down
docker-compose up -d
```

**Model not found?**
```bash
python finetune_jarsh.py
```

---

## Full Documentation

- **Complete Setup:** `COMPLETE_SETUP.md`
- **Implementation Details:** `FINAL_IMPLEMENTATION.md`
- **Verification:** `python verify_complete_setup.py`
