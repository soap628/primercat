"""Simple in-process token-bucket rate limiter for FastAPI routes.

No external dependencies (no Redis).  Each unique client IP gets its own
bucket tracked in a module-level dict.  Buckets older than 5 minutes are
pruned to avoid unbounded memory growth.

Usage::

    from app.core.rate_limit import rate_limit_dependency

    @router.post("/design")
    async def my_endpoint(
        req: MyRequest,
        _: None = Depends(rate_limit_dependency(rpm=3)),
    ):
        ...
"""

import time
from threading import Lock
from typing import Callable

from fastapi import Depends, HTTPException, Request, status


class _TokenBucket:
    """Token bucket for a single IP address."""

    __slots__ = ("tokens", "last_refill", "capacity", "refill_rate")

    def __init__(self, capacity: int, refill_rate: float) -> None:
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens: float = float(capacity)
        self.last_refill: float = time.monotonic()

    def consume(self) -> bool:
        """Try to consume one token.  Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


_buckets: dict[tuple[str, str], tuple[_TokenBucket, float]] = {}
_lock = Lock()
_PRUNE_INTERVAL = 300.0  # seconds between pruning sweeps
_last_prune: float = 0.0


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _get_or_create_bucket(
    ip: str,
    route_key: str,
    capacity: int,
    refill_rate: float,
) -> _TokenBucket:
    global _last_prune
    now = time.monotonic()
    with _lock:
        if now - _last_prune > _PRUNE_INTERVAL:
            cutoff = now - _PRUNE_INTERVAL
            stale = [k for k, (_, ts) in _buckets.items() if ts < cutoff]
            for k in stale:
                del _buckets[k]
            _last_prune = now

        key = (ip, route_key)
        entry = _buckets.get(key)
        if entry is None:
            bucket = _TokenBucket(capacity=capacity, refill_rate=refill_rate)
            _buckets[key] = (bucket, now)
            return bucket
        bucket, _ = entry
        _buckets[key] = (bucket, now)
        return bucket


def rate_limit_dependency(rpm: int) -> Callable:
    """Return a FastAPI dependency that enforces *rpm* requests per minute per IP.

    Args:
        rpm: Maximum number of requests allowed per minute for a single IP.
    """
    capacity = rpm
    refill_rate = rpm / 60.0

    async def _check(request: Request) -> None:
        ip = _get_client_ip(request)
        route_key = f"{request.method}:{request.url.path}"
        bucket = _get_or_create_bucket(ip, route_key, capacity, refill_rate)
        if not bucket.consume():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: maximum {rpm} requests per minute. "
                    "Please wait a moment before retrying."
                ),
            )

    return Depends(_check)
