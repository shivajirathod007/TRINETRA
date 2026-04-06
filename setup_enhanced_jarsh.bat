@echo off
REM Enhanced JARSH Setup Script for Windows
REM Sets up database-aware chatbot with fine-tuned model

echo ======================================================================
echo   JARSH Enhanced Chatbot Setup
echo   Database-Aware AI Assistant with Fine-Tuned Model
echo ======================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

echo [1/6] Installing dependencies...
pip install transformers torch aiohttp sqlalchemy asyncpg --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo [2/6] Checking Ollama server...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ollama server not running
    echo.
    echo Please start Ollama:
    echo   1. Download from https://ollama.ai/download
    echo   2. Run: ollama serve
    echo   3. Pull model: ollama pull mistral:7b
    pause
    exit /b 1
)
echo [OK] Ollama server is running

echo.
echo [3/6] Running setup script...
python setup_enhanced_jarsh.py
if errorlevel 1 (
    echo [ERROR] Setup failed
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   Setup Complete!
echo ======================================================================
echo.
echo Next steps:
echo   1. Test: python test_enhanced_jarsh.py
echo   2. Start API: cd backend ^&^& uvicorn api.main:app --reload
echo   3. Try queries: POST /api/chat/message
echo.
pause
