from fastapi import APIRouter, Depends, HTTPException
from ..database import get_connection
from ..auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

def db_or_503():
    try:
        return get_connection()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@router.get("/db-status")
def db_status(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as c FROM users")
        user_count = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) as c FROM saved_states")
        save_count = cur.fetchone()["c"]
        cur.close(); conn.close()
        return {"database": "PostgreSQL", "users": user_count, "saves": save_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def list_users(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, created_at FROM users ORDER BY id DESC")
        rows = cur.fetchall()
        cur.close(); conn.close()
        return [dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
