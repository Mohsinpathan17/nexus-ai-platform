import os

import redis

REDIS_URL = os.getenv("REDIS_URL")
client = redis.Redis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None


def redis_health() -> dict:
    if not client:
        return {"status": "not_configured"}

    try:
        client.ping()
        return {"status": "ok", "url": REDIS_URL}
    except Exception as exc:  # pragma: no cover - runtime-only health probe
        return {"status": "error", "url": REDIS_URL, "error": str(exc)}
