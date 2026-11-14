from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    """A small in-process limiter for the local deployment.

    The app is single-instance and local-only, so an in-memory window is enough.
    Keys are scoped by endpoint and client identity; a successful login resets
    its key so ordinary use never counts against the failure budget.
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> None:
        events = self._events[key]
        cutoff = now - self.window_seconds
        while events and events[0] <= cutoff:
            events.popleft()
        if not events:
            self._events.pop(key, None)

    def _retry_after(self, key: str, now: float) -> int:
        events = self._events.get(key)
        if not events:
            return 1
        return max(1, int(self.window_seconds - (now - events[0])) + 1)

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            if len(self._events.get(key, ())) >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Wait a few minutes and try again.",
                    headers={"Retry-After": str(self._retry_after(key, now))},
                )

    def record(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            self._events[key].append(now)

    def check_and_record(self, key: str) -> None:
        self.check(key)
        self.record(key)

    def reset(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()


login_limiter = SlidingWindowLimiter(limit=5, window_seconds=300)
register_limiter = SlidingWindowLimiter(limit=5, window_seconds=3600)
refresh_limiter = SlidingWindowLimiter(limit=60, window_seconds=60)


def client_key(request: Request, scope: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{scope}:{host}"


def clear_rate_limits() -> None:
    login_limiter.clear()
    register_limiter.clear()
    refresh_limiter.clear()
