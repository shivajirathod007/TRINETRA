#!/bin/bash
# TRINETRA — One-command dev setup
# Usage: ./scripts/setup.sh

set -e

echo "=== TRINETRA Setup ==="

# 1. Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env from .env.example — fill in SECRET_KEY and CERTIFICATE_SIGNING_KEY"
fi

# 2. Generate secret keys if placeholders still present
if grep -q "change_this" .env; then
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    CERT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/change_this_to_a_random_64_char_hex_string_before_production/$SECRET/" .env
    sed -i "s/change_this_to_another_random_64_char_hex_string/$CERT_SECRET/" .env
    echo "[OK] Generated SECRET_KEY and CERTIFICATE_SIGNING_KEY"
fi

# 3. Install Python deps
echo "[...] Installing Python dependencies"
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt --quiet
echo "[OK] Python dependencies installed"

# 4. Start Docker services
echo "[...] Starting Docker services (postgres + redis)"
docker compose up -d postgres redis
sleep 3

# 5. Run migrations
echo "[...] Running database migrations"
cd backend && python -m alembic upgrade head && cd ..
echo "[OK] Database schema created"

# 6. Install frontend deps
if [ -d "frontend" ]; then
    echo "[...] Installing frontend dependencies"
    cd frontend && npm install --silent && cd ..
    echo "[OK] Frontend dependencies installed"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start backend:  uvicorn backend.api.main:app --reload"
echo "Start worker:   celery -A backend.workers.celery_app worker --loglevel=info"
echo "Start frontend: cd frontend && npm run dev"
echo "Or run all:     docker compose up"
echo ""
echo "API docs:       http://localhost:8000/docs"
echo "Flower:         http://localhost:5555"
echo "Frontend:       http://localhost:3000"
