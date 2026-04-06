@echo off
echo ========================================
echo JARSH Chatbot Diagnostic Tool
echo ========================================
echo.

echo [Test 1] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Ollama is running
    curl -s http://localhost:11434/api/tags | findstr "jarsh"
    if %errorlevel% equ 0 (
        echo ✓ jarsh:latest model found
    ) else (
        echo ✗ jarsh:latest model NOT found
        echo   Run: ollama pull mistral:7b
        echo   Then: ollama create jarsh -f Modelfile.jarsh
    )
) else (
    echo ✗ Ollama is NOT running
    echo   Start it with: ollama serve
)

echo.
echo [Test 2] Checking Backend API...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend API is running
) else (
    echo ✗ Backend API is NOT running
    echo   Start it with: cd backend ^&^& uvicorn api.main:app --reload
)

echo.
echo [Test 3] Checking Chat Endpoint...
curl -s http://localhost:8000/api/v1/chat/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Chat endpoint is accessible
    curl -s http://localhost:8000/api/v1/chat/health
) else (
    echo ✗ Chat endpoint is NOT accessible
)

echo.
echo [Test 4] Checking PostgreSQL...
docker ps | findstr trinetra_postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ PostgreSQL container is running
) else (
    echo ✗ PostgreSQL is NOT running
    echo   Start it with: docker-compose up -d postgres
)

echo.
echo [Test 5] Checking Redis...
docker ps | findstr trinetra_redis >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Redis container is running
) else (
    echo ✗ Redis is NOT running
    echo   Start it with: docker-compose up -d redis
)

echo.
echo ========================================
echo Diagnostic Complete
echo ========================================
echo.
pause
