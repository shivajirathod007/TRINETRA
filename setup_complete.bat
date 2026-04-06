@echo off
echo ========================================
echo JARSH Complete Setup Script
echo ========================================
echo.

echo This script will:
echo 1. Fine-tune JARSH model with TRINETRA knowledge
echo 2. Configure Docker containers
echo 3. Start all services
echo 4. Verify everything works
echo.
pause

echo.
echo [1/5] Checking prerequisites...
echo.

REM Check Ollama
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not running!
    echo Please start Ollama first: ollama serve
    pause
    exit /b 1
)
echo ✓ Ollama is running

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed!
    echo Please install Docker Desktop
    pause
    exit /b 1
)
echo ✓ Docker is installed

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python 3.8+
    pause
    exit /b 1
)
echo ✓ Python is installed

echo.
echo [2/5] Fine-tuning JARSH model...
echo This may take 5-10 minutes...
echo.

python finetune_jarsh.py
if %errorlevel% neq 0 (
    echo ERROR: Fine-tuning failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Starting Docker services...
echo.

docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services!
    pause
    exit /b 1
)

echo.
echo [4/5] Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo [5/5] Verifying setup...
echo.

REM Test backend
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend API is running
) else (
    echo ✗ Backend API is not responding
)

REM Test chat
curl -s http://localhost:8000/api/v1/chat/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Chat service is running
) else (
    echo ✗ Chat service is not responding
)

REM Test frontend
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend is running
) else (
    echo ✗ Frontend is not responding
)

echo.
echo ========================================
echo ✓ Setup Complete!
echo ========================================
echo.
echo Your JARSH chatbot is ready!
echo.
echo Features:
echo - Fine-tuned model: jarsh-finetuned
echo - Session persistence: Chat history survives reloads
echo - Optimized speed: 5-15 second responses
echo.
echo Access points:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - Chat Health: http://localhost:8000/api/v1/chat/health
echo.
echo Next steps:
echo 1. Open http://localhost:3000 in your browser
echo 2. Click the red JARSH button (bottom-right)
echo 3. Start chatting!
echo.
echo To test:
echo - Ask: "What is PQC?"
echo - Reload page - history persists!
echo - Click trash icon to clear history
echo.
pause
