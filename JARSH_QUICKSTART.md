# JARSH Chatbot - Quick Start Guide

## What is JARSH?

JARSH is an AI-powered chatbot that helps users understand quantum security threats and how to fix them. It uses **knowledge distillation** - a technique where a large AI (Ollama) teaches a small AI (DistilBERT) to be smart and fast.

## Why Knowledge Distillation?

Instead of calling a big, slow AI every time (Ollama - 4GB, 2-5 seconds), we:
1. Use Ollama once to generate training data
2. Train a small model (DistilBERT - 250MB) on that data
3. Deploy only the small model (50-200ms, no external dependencies)

Result: Fast, intelligent chatbot that works without Ollama at runtime!

## Quick Setup (3 Steps)

### Step 1: Install Ollama (One-Time)

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai

### Step 2: Start Ollama & Pull Model

```bash
# Start Ollama server
ollama serve

# In another terminal, pull Mistral
ollama pull mistral:7b
```

### Step 3: Run Setup Script

**macOS/Linux:**
```bash
./setup_jarsh_chatbot.sh
```

**Windows:**
```bash
setup_jarsh_chatbot.bat
```

This will:
- ✅ Check Ollama installation
- ✅ Generate training data (~10 min)
- ✅ Fine-tune DistilBERT (~20 min)
- ✅ Test the model

## That's It!

Your chatbot is now ready. The small model runs without Ollama.

## Testing

### Test the Model
```bash
cd backend/engine/ai
python test_jarsh.py
```

### Test the API
```bash
# Start server
cd backend
uvicorn api.main:app --reload

# Test endpoint
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PQC?", "context": "general"}'
```

### Test the Frontend
1. Open the application
2. Click JARSH button (bottom-right)
3. Ask: "What is Post-Quantum Cryptography?"

## How It Works

### Training (One-Time)
```
Questions → Ollama (Teacher) → Training Data → DistilBERT (Student) → Trained Model
```

### Production (Runtime)
```
User Question → DistilBERT Model → Fast Response (No Ollama!)
```

## Benefits

| Feature | Value |
|---------|-------|
| Model Size | 250 MB (vs 4 GB) |
| Response Time | 50-200 ms (vs 2-5 sec) |
| RAM Usage | 500 MB (vs 8-16 GB) |
| GPU Required | No (vs Yes) |
| External Dependency | None (vs Ollama server) |
| Production Ready | Yes ✅ |

## Documentation

- **Quick Start**: `backend/engine/ai/README.md`
- **Technical Details**: `docs/jarsh_knowledge_distillation.md`
- **Simple Explanation**: `docs/jarsh_simple_explanation.md`
- **Architecture**: `docs/jarsh_architecture_diagram.md`
- **Implementation Summary**: `JARSH_IMPLEMENTATION_SUMMARY.md`

## Troubleshooting

**Ollama not connecting?**
```bash
ollama serve
```

**Model not found?**
```bash
cd backend/engine/ai
python setup_jarsh.py
```

**Need help?**
Check `docs/jarsh_knowledge_distillation.md` for detailed troubleshooting.

## What Changed?

### Backend
- ✅ New AI inference engine
- ✅ Knowledge distillation pipeline
- ✅ Updated chat API
- ✅ Added dependencies

### Frontend
- ✅ No changes needed! Works as-is.

## Example Conversation

**User**: "What is Post-Quantum Cryptography?"

**JARSH**: 
```
Quantum Cryptography Threat Landscape

The Threat:
CRQCs will break RSA/ECDSA by 2028-2037.
Data encrypted today can be decrypted later.

NIST Post-Quantum Standards (2024):
🔐 ML-KEM-768 — Key encapsulation
🔐 ML-DSA-65 — Digital signatures
🔐 SLH-DSA-256 — Hash-based signatures

Confidence: 92%

Suggestions:
• Which assets are at highest risk?
• How does hybrid crypto work?
```

## Next Steps

1. ✅ Setup complete
2. Start FastAPI server
3. Test the chatbot
4. Deploy to production

Enjoy your intelligent, fast, production-ready chatbot! 🚀
