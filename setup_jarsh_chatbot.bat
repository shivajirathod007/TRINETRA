@echo off
REM JARSH Chatbot Setup Script for Windows
REM This script automates the entire setup process

echo ============================================================
echo JARSH Chatbot Setup - Knowledge Distillation
echo ============================================================
echo.

REM Check if Ollama is installed
echo Step 1: Checking Ollama installation...
where ollama >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama is installed
) else (
    echo [ERROR] Ollama is not installed
    echo.
    echo Please install Ollama:
    echo   Download from https://ollama.ai
    echo.
    pause
    exit /b 1
)

REM Check if Ollama server is running
echo.
echo Step 2: Checking Ollama server...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama server is running
) else (
    echo [WARNING] Ollama server is not running
    echo.
    echo Please start Ollama server in another terminal:
    echo   ollama serve
    echo.
    echo Then press any key to continue...
    pause >nul
)

REM Check if Mistral model is available
echo.
echo Step 3: Checking Mistral 7B model...
ollama list | findstr "mistral:7b" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Mistral 7B model is available
) else (
    echo [WARNING] Mistral 7B model not found
    echo.
    echo Pulling Mistral 7B model (this will take 5-10 minutes)...
    ollama pull mistral:7b
    
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Mistral 7B model downloaded successfully
    ) else (
        echo [ERROR] Failed to download Mistral model
        pause
        exit /b 1
    )
)

REM Install Python dependencies
echo.
echo Step 4: Installing Python dependencies...
cd backend
pip install -q transformers torch datasets aiohttp

if %ERRORLEVEL% EQU 0 (
    echo [OK] Python dependencies installed
) else (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Run the setup script
echo.
echo Step 5: Running JARSH setup (this will take 20-30 minutes)...
echo.
cd engine\ai
python setup_jarsh.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] JARSH setup completed successfully!
) else (
    echo.
    echo [ERROR] JARSH setup failed
    pause
    exit /b 1
)

REM Test the model
echo.
echo Step 6: Testing the model...
python test_jarsh.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Model test passed!
) else (
    echo.
    echo [WARNING] Model test had issues (but setup is complete)
)

REM Final message
echo.
echo ============================================================
echo [OK] JARSH Chatbot Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Start your FastAPI server:
echo      cd backend
echo      uvicorn api.main:app --reload
echo.
echo   2. Test the API:
echo      curl -X POST http://localhost:8000/api/v1/chat/message ^
echo        -H "Content-Type: application/json" ^
echo        -d "{\"message\": \"What is PQC?\", \"context\": \"general\"}"
echo.
echo   3. Open the frontend and test the chatbot UI
echo.
echo Documentation:
echo   - Quick Start: backend\engine\ai\README.md
echo   - Technical: docs\jarsh_knowledge_distillation.md
echo   - Simple: docs\jarsh_simple_explanation.md
echo.
pause
