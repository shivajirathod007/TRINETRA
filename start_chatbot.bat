@echo off
echo ========================================
echo Starting TRINETRA JARSH Chatbot
echo ========================================
echo.

echo [1/4] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not running!
    echo Please start Ollama first: ollama serve
    pause
    exit /b 1
)
echo ✓ Ollama is running

echo.
echo [2/4] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Starting FastAPI backend...
echo Backend will start at http://localhost:8000
echo.
cd backend
start "TRINETRA Backend" cmd /k "uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"
cd ..

echo.
echo [4/4] Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo ✓ JARSH Chatbot is ready!
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo Chat Health: http://localhost:8000/api/v1/chat/health
echo.
echo To test the chatbot:
echo 1. Open your frontend at http://localhost:3000
echo 2. Click the JARSH button in the bottom-right
echo 3. Ask: "What is PQC?"
echo.
echo Press any key to check chatbot health...
pause >nul

curl http://localhost:8000/api/v1/chat/health

echo.
pause
