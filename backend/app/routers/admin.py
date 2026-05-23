from fastapi import APIRouter, Depends, HTTPException
from ..database import get_connection
from ..auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/db-status")
def db_status(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    project_count = conn.execute("SELECT COUNT(*) as c FROM projects").fetchone()["c"]
    db_path = conn.execute("PRAGMA database_list").fetchone()
    conn.close()

    return {
        "database": db_path["file"] if db_path else "unknown",
        "users": user_count,
        "projects": project_count,
    }

@router.get("/users")
def list_users(user_email: str = Depends(get_current_user)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    rows = conn.execute(
        "SELECT id, name, email, created_at FROM users ORDER BY id DESC"
    ).fetchall()
    conn.close()

    return [
        {"id": r["id"], "name": r["name"], "email": r["email"], "created_at": r["created_at"]}
        for r in rows
    ]
