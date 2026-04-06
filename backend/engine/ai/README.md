# JARSH Chatbot - Quick Start Guide

## What is This?

JARSH uses **knowledge distillation** to create a smart chatbot:

1. **Ollama (Teacher)** generates training data with expert responses
2. **DistilBERT (Student)** learns from that data
3. **Production** runs only the small DistilBERT model (no Ollama needed!)

## Quick Setup

### 1. Install Ollama (one-time, for training only)

```bash
# macOS
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Windows - download from https://ollama.ai
```

### 2. Start Ollama and Pull Model

```bash
# Start server
ollama serve

# In another terminal, pull Mistral
ollama pull mistral:7b
```

### 3. Run Setup Script

```bash
cd backend/engine/ai
python setup_jarsh.py
```

This will:
- Generate training data (~5-10 min)
- Fine-tune DistilBERT (~10-20 min)
- Test the model

### 4. Done!

Your chatbot now works without Ollama. Start your FastAPI server and test:

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PQC?", "context": "general"}'
```

## Files

- `knowledge_distillation.py` - Training pipeline
- `jarsh_inference.py` - Production inference (no Ollama)
- `setup_jarsh.py` - Automated setup
- `models/jarsh_distilbert/` - Fine-tuned model (created after setup)

## How It Works

### Training (One-time)
```
User Queries → Ollama (Mistral 7B) → Expert Responses → Fine-tune DistilBERT
```

### Production (Runtime)
```
User Query → DistilBERT → Response (Fast, no Ollama!)
```

## Benefits

✅ Small model (~250MB vs 4GB)  
✅ Fast inference (50-200ms vs 2-5s)  
✅ No external dependencies  
✅ Production-ready  
✅ Ollama's intelligence "baked in"

## Troubleshooting

**Ollama not connecting?**
```bash
ollama serve
```

**Model not found?**
```bash
python setup_jarsh.py
```

**Need more details?**
See `docs/jarsh_knowledge_distillation.md`
