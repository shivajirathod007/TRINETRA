# Running TRINETRA

To have **scans move from "Queued" to "Running" and then "Completed"**, three things must be running:

1. **PostgreSQL** — stores scan jobs and results  
2. **Redis** — message broker for the scan queue  
3. **Celery worker** — consumes the queue and runs the scan pipeline (discovery → TLS/API/VPN/SSH/SMTP scans → analysis)

## Quick start (Docker)

From the project root:

```bash
docker compose up -d postgres redis api worker
```

- **API**: http://localhost:8000  
- **Health**: http://localhost:8000/health  
- **Queue health** (Redis + worker hint): http://localhost:8000/api/v1/health/queue  

Frontend (Vite) should proxy `/api` to the API (see `frontend/vite.config.*`).

## Running without Docker

1. **PostgreSQL**: start locally, set `DATABASE_URL` and `DATABASE_URL_SYNC` in `.env`.  
2. **Redis**: start locally (e.g. `redis-server`), set `REDIS_URL` in `.env` (default `redis://localhost:6379/0`).  
3. **API**: from `backend/` run `uvicorn api.main:app --reload`.  
4. **Celery worker** (required for scans to run):

   From the **backend** directory:

   ```bash
   celery -A workers.celery_app worker -Q scans,discovery,analysis --loglevel=info --concurrency=4
   ```

   The worker must load the same app that enqueues tasks (`workers.celery_app`) and listen on the `scans` queue so that `orchestrator.run_full_scan` runs.

5. **Frontend**: from `frontend/` run `npm run dev` (or your build command).

## Why scans stay "Queued"

- **Redis not running or not reachable** — the API can create scan jobs, but tasks cannot be enqueued or the worker cannot connect. Fix: start Redis and set `REDIS_URL`.  
- **Celery worker not running** — tasks are enqueued but no process consumes them. Fix: start the worker with the command above.  
- **Worker listening on wrong queues** — the main scan task is routed to the `scans` queue. The worker must include `-Q scans,discovery,analysis` (or at least `scans`).

Check queue connectivity: **GET /api/v1/health/queue** returns `redis: "connected"` when Redis is reachable.

## Feature flow (high level)

| Feature | Depends on |
|--------|------------|
| Create scan (POST /scans/) | API + DB |
| Scan runs (Queued → Running → Completed) | API + Redis + Celery worker |
| Scan status / logs (GET /scans/:id) | API + DB |
| Dashboard, Assets, CBOM, Certificates | API + DB + at least one **completed** scan for the domain |
| History / Trends | API + DB; trend chart needs ≥2 **completed** scans |

After a scan **completes**, use **Dashboard** (or History → click a row) to set the active domain; then Dashboard, CBOM Explorer, and Certificates will show data for that scan.
