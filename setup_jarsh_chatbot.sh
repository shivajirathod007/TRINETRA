#!/bin/bash

# JARSH Chatbot Setup Script
# This script automates the entire setup process

set -e  # Exit on error

echo "============================================================"
echo "JARSH Chatbot Setup - Knowledge Distillation"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Ollama is installed
echo "Step 1: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓${NC} Ollama is installed"
else
    echo -e "${RED}✗${NC} Ollama is not installed"
    echo ""
    echo "Please install Ollama:"
    echo "  macOS:   brew install ollama"
    echo "  Linux:   curl https://ollama.ai/install.sh | sh"
    echo "  Windows: Download from https://ollama.ai"
    echo ""
    exit 1
fi

# Check if Ollama server is running
echo ""
echo "Step 2: Checking Ollama server..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama server is running"
else
    echo -e "${YELLOW}⚠${NC} Ollama server is not running"
    echo ""
    echo "Starting Ollama server in background..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Ollama server started successfully"
    else
        echo -e "${RED}✗${NC} Failed to start Ollama server"
        echo "Please start it manually: ollama serve"
        exit 1
    fi
fi

# Check if Mistral model is available
echo ""
echo "Step 3: Checking Mistral 7B model..."
if ollama list | grep -q "mistral:7b"; then
    echo -e "${GREEN}✓${NC} Mistral 7B model is available"
else
    echo -e "${YELLOW}⚠${NC} Mistral 7B model not found"
    echo ""
    echo "Pulling Mistral 7B model (this will take 5-10 minutes)..."
    ollama pull mistral:7b
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Mistral 7B model downloaded successfully"
    else
        echo -e "${RED}✗${NC} Failed to download Mistral model"
        exit 1
    fi
fi

# Install Python dependencies
echo ""
echo "Step 4: Installing Python dependencies..."
cd backend
pip install -q transformers torch datasets aiohttp

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Python dependencies installed"
else
    echo -e "${RED}✗${NC} Failed to install dependencies"
    exit 1
fi

# Run the setup script
echo ""
echo "Step 5: Running JARSH setup (this will take 20-30 minutes)..."
echo ""
cd engine/ai
python setup_jarsh.py

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} JARSH setup completed successfully!"
else
    echo ""
    echo -e "${RED}✗${NC} JARSH setup failed"
    exit 1
fi

# Test the model
echo ""
echo "Step 6: Testing the model..."
python test_jarsh.py

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} Model test passed!"
else
    echo ""
    echo -e "${YELLOW}⚠${NC} Model test had issues (but setup is complete)"
fi

# Final message
echo ""
echo "============================================================"
echo -e "${GREEN}✓ JARSH Chatbot Setup Complete!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Start your FastAPI server:"
echo "     cd backend"
echo "     uvicorn api.main:app --reload"
echo ""
echo "  2. Test the API:"
echo "     curl -X POST http://localhost:8000/api/v1/chat/message \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"message\": \"What is PQC?\", \"context\": \"general\"}'"
echo ""
echo "  3. Open the frontend and test the chatbot UI"
echo ""
echo "Documentation:"
echo "  - Quick Start: backend/engine/ai/README.md"
echo "  - Technical: docs/jarsh_knowledge_distillation.md"
echo "  - Simple: docs/jarsh_simple_explanation.md"
echo ""
