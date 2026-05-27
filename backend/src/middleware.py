from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
import os

# Simple in-memory rate limiter (per-IP, sliding window)
_requests: dict[str, list[float]] = {}

RATE_LIMIT = int(os.getenv("RATE_LIMIT", "60"))  # requests per minute
RATE_WINDOW = 60  # seconds

async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - RATE_WINDOW
        timestamps = _requests.get(client_ip, [])
        timestamps = [t for t in timestamps if t > window_start]
        if len(timestamps) >= RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."}
            )
        timestamps.append(now)
        _requests[client_ip] = timestamps
    return await call_next(request)

# Global exception handler to normalize error responses
ERROR_MESSAGE = "An unexpected error occurred"

async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": ERROR_MESSAGE},
    )
