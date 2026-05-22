from fastapi import APIRouter, HTTPException, Depends, Request
from ..database import get_connection
from ..schemas.models import HealthResponse, GenerateRequest, GenerateResponse
from ..auth import get_current_user
import time

router = APIRouter(prefix="/api", tags=["projects"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", version="1.0.0")

@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest, user_email: str = Depends(get_current_user)):
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
