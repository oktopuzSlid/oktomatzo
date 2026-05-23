from fastapi import APIRouter, Depends, HTTPException
from ..database import get_connection
from ..auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/db-status")
def db_status(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as c FROM users")
    user_count = cur.fetchone()["c"]
    cur.execute("SELECT COUNT(*) as c FROM saved_states")
    save_count = cur.fetchone()["c"]
    cur.close(); conn.close()

    return {
        "database": "Supabase PostgreSQL",
        "users": user_count,
        "saves": save_count,
    }

@router.get("/users")
def list_users(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, created_at FROM users ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close(); conn.close()

    return [dict(r) for r in rows]
