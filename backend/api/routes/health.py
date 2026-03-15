from fastapi import APIRouter

router = APIRouter()

STALE_TIMEOUT_MINUTES = 30


@router.get("/queue")
async def queue_health():
    """Return Redis/worker connectivity status for the frontend banner."""
    redis_status = "unknown"
    try:
        import redis as redis_lib
        r = redis_lib.Redis.from_url("redis://redis:6379/0", socket_connect_timeout=2)
        if r.ping():
            redis_status = "connected"
        else:
            redis_status = "disconnected"
    except Exception:
        redis_status = "disconnected"

    return {
        "redis": redis_status,
        "stale_timeout_minutes": STALE_TIMEOUT_MINUTES,
    }
