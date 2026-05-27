from fastapi import APIRouter
from ..database import get_db, _resolve_url, raw_url
from ..models.api import HealthResponse
import traceback

router = APIRouter(prefix="/api", tags=["projects"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", version="1.0.0")

@router.get("/debug/db-test")
def debug_db():
    result = {"raw_url_prefix": raw_url[:35] + "..." if raw_url else "NOT SET"}
    try:
        resolved = _resolve_url()
        result["resolved_prefix"] = resolved[:45] + "..." if resolved else "NOT SET"
    except Exception as e:
        result["resolve_error"] = str(e)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT version()")
        v = cur.fetchone()
        cur.close()
        conn.close()
        result["connection"] = "OK"
        result["version"] = str(v)
    except Exception as e:
        result["connection"] = "FAILED"
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
    return result
