from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..database import get_connection
from ..schemas.models import HealthResponse, GenerateRequest, GenerateResponse
from ..auth import get_current_user
import time

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["projects"])

@router.get("/health", response_model=HealthResponse)
@limiter.limit("30/minute")
def health_check(request: Request):
    return HealthResponse(status="ok", version="1.0.0")

@router.post("/generate", response_model=GenerateResponse)
@limiter.limit("10/minute")
def generate(request: Request, req: GenerateRequest, user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        conn = get_connection()
        conn.execute(
            "INSERT INTO projects (slug, title, data, user_email) VALUES (?, ?, ?, ?)",
            (f"gen_{int(time.time())}", req.prompt[:50], req.prompt, user_email)
        )
        conn.commit()
        conn.close()
        return GenerateResponse(
            success=True,
            message="Prompt received. AI generation coming soon."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
