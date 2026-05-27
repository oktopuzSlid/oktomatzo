from fastapi import APIRouter, Depends, HTTPException
from ..database import get_db
from ..repositories import count_users, count_saves, list_all_users
from ..auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/db-status")
def db_status(current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    try:
        users = count_users(conn)
        saves = count_saves(conn)
        return {"database": "PostgreSQL", "users": users, "saves": saves, "version": "1.0.0"}
    except HTTPException:
        raise
    finally:
        conn.close()

@router.get("/users")
def list_users(current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    try:
        return list_all_users(conn)
    finally:
        conn.close()
