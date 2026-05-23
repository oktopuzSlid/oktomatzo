from fastapi import APIRouter, HTTPException, Depends
from ..database import get_connection
from ..schemas.models import HealthResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api", tags=["projects"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", version="1.0.0")
